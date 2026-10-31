---
id: wiki-concept-cursor-sharding
type: concept
title: 游标分片（Keyset Pagination 批扫）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - database
  - batch-processing
sources:
  - raw/sources/architecture/2026-10-31-batch-push-sharding-threadpool.md
related:
  - wiki/concepts/batch-message-push.md
  - wiki/concepts/mysql-bulk-import.md
  - wiki/sources/batch-push-sharding-threadpool.md
  - wiki/sources/db-table-sharding-practice.md
---
# 游标分片（Keyset Pagination 批扫）

## Definition（定义）

用「上一批最大主键」作游标逐批拉取数据的批处理技术：`WHERE id > lastId LIMIT size`，按主键升序一批批处理，任何时刻内存中只有一批数据。本质是 Keyset Pagination（键集分页）在流式批处理上的应用，与深分页 `LIMIT offset, size` 相对。

## Why It Matters（为什么重要）

百万级批处理（推送、导入、导出、对账）的第一性约束是内存：全量加载即 OOM。游标分片把「全量驻留」换成「常数驻留」，性能恒定不随已处理数据量增长，且天然支持断点续跑（记住 lastId 即可从断点继续）。

## Core Characteristics（核心特征）

1. 性能恒定：每批都是 `WHERE id > lastId LIMIT size`，执行代价与 offset 无关；`LIMIT offset` 深分页随 offset 增大线性恶化。
2. 内存常数：批大小即内存上界（示例每批 1000 条）。
3. 依赖递增主键：要求有稳定递增的主键作游标；主键分布不均匀时批间大小不均（解读：极端倾斜时批耗时方差大）。
4. 可断点续跑：失败后记录 lastId，重跑时从断点继续，已处理批次不重复。
5. 四种分片方式对比（信源表）：

| 分片方式 | 实现 | 适用场景 |
|---|---|---|
| ID 范围 | `WHERE id BETWEEN ? AND ?` | 自增主键，数据分布均匀 |
| 分页 | `LIMIT offset, size` | 通用，但深分页慢 |
| **游标** | `WHERE id > lastId LIMIT size` | 推荐，性能恒定 |
| 哈希 | `WHERE MOD(id, N) = ?` | 需要并行处理，互不干扰 |

6. 哈希分片可多路并行：`MOD(id, N)` 把数据切成互不重叠的 N 份，各 worker 独立扫自己的分片（解读：代价是各分片进度不均时存在尾部延迟）。

## Structure（结构）

```
loop:
  batch = SELECT * FROM t WHERE id > lastId ORDER BY id LIMIT size
  if batch is empty: break
  process(batch)            // 处理当前批
  lastId = batch.max(id)    // 推进游标
```

## How It Works（运作方式）

首次执行时 lastId = 0（或最小主键），按主键升序取第一批；处理完记录该批最大 id 作为下一批游标；循环直至空批。中途失败时，lastId 即断点——重跑时从 lastId 继续，避免已处理数据重复（前提是处理本身幂等，见 [[idempotency-design|幂等设计]]）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[batch-message-push|批量消息推送]]（example-of：百万级短信推送的核心组件）
- [[mysql-bulk-import|MySQL 大批量导入优化]]（related：批量场景的并行分片共性；导入侧还涉及攒批/少刷盘）
- [[consumer-lag-governance|消费积压治理]]（related：Kafka 消费端的并行消费与游标（offset）推进是同类思想在 MQ 侧的体现）

### Dependencies（依赖项）

- 递增主键（隐式依赖）；处理幂等性（断点续跑不重复的前提是单批处理可重复）

### Distinctions（区分）

- 与 [[table-sharding-migration|分表平滑迁移]]/[[db-table-sharding-practice|大表治理之分表实践]] 的不同之处：分表是存储层的横向切分（一张表拆多张表，解决单表容量/写入瓶颈）；游标分片是查询/批处理层的顺序扫描技术（仍是一张表），两者正交，常组合使用（分表后每张分表内再游标批扫）。
- 与 `LIMIT offset` 分页的不同之处：见核心特征 1/5；深分页是其主要反面案例。
- 与 ES `search_after` 的关系：同为键集游标思想（[[elasticsearch-interview-deep-dive|ES 面试长文]] 覆盖深分页话题），实现细节不同（ES 以 sort 值作游标，支持非主键排序）。

## Evolution（演进）

- 单信源（公众号教程，2026-10-31 摄入）：从 OOM 事故复盘引出，给出四方式对比表并选定游标分片。
- 解读：该技术是数据库批处理的成熟通用模式（Keyset Pagination），信源仅给应用侧叙述；多数据库/多信源的系统化梳理尚缺。

## Open Questions（开放问题）

- 主键倾斜（hot key）下的批大小自适应策略，信源未讨论。
- 游标分片与 [[hot-cold-data-separation|冷热分离]] 结合的批处理优先级（先热后冷还是按时间窗）未见信源。
- 删除/更新并发场景下 lastId 有效性（行被删除导致漏处理）信源未覆盖。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-batch-push-sharding-threadpool.md`

## Related Knowledge（相关知识）

- [[batch-push-sharding-threadpool|第70篇：批量消息推送优化（信源页）]]
