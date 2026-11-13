---
id: wiki-concept-stream-load
type: concept
title: Stream Load（Doris HTTP 批量导入）
status: active
created: 2026-11-13
updated: 2026-11-13
confidence: medium
tags:
  - concept
  - doris
  - stream-load
  - bulk-import
sources:
  - raw/sources/architecture/2026-11-13-springboot-doris-stream-load.md
related:
  - wiki/sources/springboot-doris-stream-load.md
  - wiki/sources/mysql-10b-bulk-import-guide.md
  - wiki/concepts/mysql-bulk-import.md
---
# Stream Load（Doris HTTP 批量导入）

## Definition（定义）

Stream Load 是 Apache Doris 的 HTTP 批量数据导入接口：客户端直接向 FE 的 `/api/{db}/{table}/_stream_load`（默认端口 8030）发起 `PUT` 请求，以 Basic 认证鉴权，以 JSON 或 CSV 格式提交数据，Doris 返回包含事务 ID、行数与各阶段耗时的 LoadResponse。它是 Doris 的主要数据导入通道之一，用于海量数据实时更新等场景。

## Why It Matters（为什么重要）

以 HTTP 直连方式做批量写入，绕开 JDBC 逐条 SQL 往返的瓶颈，使海量数据更新在应用层可行；接口为普通 HTTP，应用侧可灵活叠加分批、多线程并行、压缩、退避重试与结果监控，且导入过程的各阶段耗时可通过响应观测，便于调优与排障。

## Core Characteristics（核心特征）

1. HTTP 接口直连 Doris FE（默认端口 8030），Basic 认证（username:password 的 Base64 编码）。
2. 支持 JSON 与 CSV 两种格式：JSON 用 `strip_outer_array: true` 头；CSV 用 `column_separator`、`line_delimiter` 头（默认 `\x01`/`\n`），null 值写作 `\N`。
3. 支持 GZIP 压缩传输（`compress_type: gz`，实体带 `Content-Encoding: gzip`）。
4. 响应 LoadResponse 字段丰富：行数（NumberTotalRows / NumberLoadedRows / NumberFilteredRows / NumberUnselectedRows）、字节数（LoadBytes）、各阶段耗时（LoadTimeMs、BeginTxnTimeMs、StreamLoadPutTimeMs、ReadDataTimeMs、WriteDataTimeMs、ReceiveDataTimeMs、CommitAndPublishTimeMs），另有 TxnId、Label、Status、Message 等。
5. 集群侧可调参数：`streaming_load_max_mb`（单次导入 BE 内存限制）、`max_running_txn_num_per_db`（单库最大运行事务数），以 `SET GLOBAL` 设置。

## Structure（结构）

请求侧：`PUT /api/{db}/{table}/_stream_load` + Authorization 头 + 格式相关头（format / column_separator / line_delimiter / strip_outer_array / compress_type）+ 请求体（JSON/CSV，可 GZIP 压缩）。

服务端处理阶段（各阶段耗时可由 LoadResponse 观测）：开启事务（BeginTxn）→ 接收请求并写入内存（StreamLoadPut）→ 读取数据（ReadData）→ 写入存储引擎（WriteData / ReceiveData）→ 提交事务并发布版本（CommitAndPublish）。

## How It Works（运作方式）

本文信源（[[springboot-doris-stream-load]]）的 Spring Boot 实现展示了完整的应用侧流水线：

1. 字段映射：`@DorisField` 注解（value 重命名 / order 顺序 / ignore 排除）+ `DorisMapper` 反射生成有序 LinkedHashMap，Date 字段格式化为 `yyyy-MM-dd HH:mm:ss`。
2. 分批：Guava `Lists.partition` 按 batchSize 将数据列表切分为批次。
3. 并行推送：`CompletableFuture.allOf` + 固定线程池（maxParallel 线程）并行发送各批次。
4. 重试：失败按指数退避 `delay = 1000 × 2^retryCount` 毫秒重试，超过 maxRetries 抛错。
5. 结果监控：解析 LoadResponse，记录 NumberLoadedRows / LoadTimeMs，状态非 Success 即抛错。

配置项（前缀 `doris.stream-load`）：url / username / password / connect-timeout / socket-timeout / batch-size / max-retries / compression / max-parallel / column-separator / line-separator。

调优建议（信源）：batch-size 50000（按集群性能调整）、max-parallel 约 CPU 核数×2、启用 GZIP、大数据量场景延长 connect-timeout / socket-timeout。

## Relationships（关系）

### Related Concepts（相关概念）

- [[mysql-bulk-import|MySQL 大批量导入优化]]：批量导入的同源思路——均以"攒批 + 并行"把 N 次副作用合并为一次，磁盘 IOPS 是天花板（mysql 大批量导入信源页明确该思路可迁移到一切批量写入场景）。

### Dependencies（依赖项）

- 应用侧实现依赖：Spring Boot、Apache HttpClient、Guava、Jackson（完整依赖清单见 [[springboot-doris-stream-load]]）。

### Distinctions（区分）

- 与 JDBC 批量写入的不同：Stream Load 是 HTTP 批量导入接口，绕开逐条 SQL 往返；信源宣称较 JDBC 批量更新性能提升 20-50 倍（信源断言，无基准数据）。
- 与其他系统批量通道（Kafka 批量生产、ES bulk、Redis pipeline）的不同：各为所属系统的批量写入通道，思路可互相迁移（解读，见 [[mysql-bulk-import]] 的影响／启示）。

## Evolution（演进）

- 2026-11-13 — 随微信公众号文章《SpringBoot+Doris Stream Load 海量数据实时更新方案》（单一信源）提出：确立接口形态、应用侧流水线（字段映射→分批→并行推送→退避重试→结果监控）与配置/调优项。

## Open Questions（开放问题）

- 20-50 倍性能提升为信源断言，无基准数据与测试条件，量级未经验证。
- 机制细节（如响应中的 TwoPhaseCommit 两阶段提交字段）仅在响应字段中列出，未展开说明，需对照 Doris 官方文档核实。
- 目前为单一信源，待官方文档或多信源实践印证。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-13-springboot-doris-stream-load.md`

## Related Knowledge（相关知识）

- [[springboot-doris-stream-load|SpringBoot+Doris Stream Load 海量数据实时更新方案]]（信源页）
- [[mysql-10b-bulk-import-guide|100 亿条数据如何快速写入 MySQL？]]（信源页，批量导入思路跨系统印证）
