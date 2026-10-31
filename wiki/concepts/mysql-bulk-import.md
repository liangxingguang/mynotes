---
id: wiki-concept-mysql-bulk-import
type: concept
title: MySQL 大批量导入优化（Bulk Import Optimization）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - concept
  - database
  - mysql
  - performance
sources:
  - raw/sources/architecture/2026-10-28-mysql-10b-bulk-import-guide.md
related:
  - wiki/concepts/table-sharding-migration.md
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/hot-cold-data-separation.md
  - wiki/concepts/expand-migrate-contract.md
  - wiki/sources/mysql-10b-bulk-import-guide.md
---
# MySQL 大批量导入优化（Bulk Import Optimization）

## Definition（定义）

把海量数据（十亿~百亿行级）写入 MySQL 的系统化提速方法，核心不变量是 **"攒批 + 并行 + 少刷盘"**：把逐条写入的 N 次网络往返、N 次 SQL 解析、N 次 fsync 刷盘、N 遍索引维护，合并成一次。不是单点优化，而是按"一算、二拆、三批量、四调参、五并发、六收尾"六步走完整链路的工程体系。

## Why It Matters（为什么重要）

同一份 100 亿行数据，逐条 INSERT 参考耗时约 231 天，组合优化后可压到 3.5 小时以内——差距来自是否消除了"N 次"中的重复开销。磁盘 IOPS 是天花板：逐条写时每行一次 fsync 一次索引维护，单机批量写入极限仅 1 万~5 万行/秒。这是面试高频场景题，也是离线历史回灌、数据迁移、数仓落库等生产任务的真实刚需。

## Core Characteristics（核心特征）

1. **B+ 树算账（为什么必须拆）**：InnoDB 聚簇索引数据页 16KB，按 1KB 行/8B 主键估算——叶子每页约 16 行，非叶子 16384÷14B≈1170 扇出，三层树约 **2190 万行**（"单表别超 2000 万"经验的出处），四层约 256 亿行。超 2000 万后树高变四层，每次查询多一次磁盘 IO，性能断崖下跌。100 亿须拆成 500~2000 张千万级分表。
2. **真批量（灵魂参数）**：`rewriteBatchedStatements=true` 是 MySQL JDBC 批量的灵魂参数——不配它，`addBatch()` 是"假批量"（驱动把 batch 拆成逐条独立 INSERT，RTT 一次没少）。开启后驱动把 N 条重写成 `INSERT ... VALUES (...),(...)` 多值插入，RTT 砍 90%。配套必须 `useServerPrepStmts=false`（服务端预编译与批量重写冲突）。每 2000~10000 行小步提交，防 undo 膨胀与 fsync 打满。
3. **LOAD DATA INFILE（裸数据灌入）**：MySQL 服务端直接读文件、批量写存储引擎，跳过 SQL 解析/优化器/权限校验/逐行事务，比批量 INSERT 快 3~5 倍、比逐条快 10~50 倍。三个前置坑：文件须落 `secure_file_priv` 目录（LOCAL 版须服务端 `local_infile=1` + 驱动 `allowLoadLocalInfile=true` 两边都开）；分隔符/换行/编码严格对齐（统一 UTF-8 + `CHARACTER SET utf8mb4`）；关 `unique_checks`/`foreign_key_checks` 前先确认源数据干净。
4. **导入期临时调参（导完必须恢复）**：`innodb_flush_log_at_trx_commit=2`（每秒刷盘而非每次提交 fsync）、`sync_binlog=0`、调大 `innodb_buffer_pool_size`（物理内存 60%~80%）/`innodb_log_file_size`（4G）/`bulk_insert_buffer_size`（512M）/`max_allowed_packet`（256M）。本质是拿"崩溃可能丢 1 秒数据"的可靠性换吞吐，属一次性离线场景取舍；导完必须恢复双 1（`=1`+`=1`），把临时调参当线上配置推荐是事故。
5. **索引策略（先灌后建）**：插入时维护二级索引是大量随机 IO + 页分裂；导完统一建索引是顺序扫描 + 排序，快一个数量级（比边插边建快 30%+）。在线重建用 `ALGORITHM=INPLACE, LOCK=NONE`，或 gh-ost / pt-online-schema-change。
6. **分片并行（并发落在分片维度）**：每个分片一个文件/一条连接/一个事务，天然无锁冲突，失败只重跑该分片；单机并发控制在 16~32（连接数上去后 `innodb_thread_concurrency` 争抢，吞吐不升反降）；所有线程按主键升序写（防页分裂+防死锁）；多机并行别依赖数据库自增 ID（自增锁串行化），ID 应用侧预生成（雪花/号段）。
7. **收尾四件套（幂等/断点/对账/切换）**：① 幂等键（`shard_id + biz_id` 唯一）+ `ON DUPLICATE KEY UPDATE`/`INSERT IGNORE` 让重跑安全；② 水位表 `import_checkpoint`（batch_id/start_id/end_id/offset/status）记录分片位点，宕机恢复从位点继续，配合幂等可无限重试、可重入；③ 对账——总量 `count`/`sum` 比对 + 抽样校验 + 关键批次 MD5/checksum 指纹复核；④ 影子表 + `RENAME TABLE` 原子切换（先建 `t_shadow` 拆二级索引→灌数据→在线重建索引→校验通过后 `RENAME TABLE t TO t_bak, t_shadow TO t`），秒级完成、失败随时回滚。

## Structure（结构）

各写法耗时对比（100 亿行，普通 SSD 参考量级，量级关系稳定）：

| 段位 | 写入方式 | 参考速度 | 100 亿耗时 |
|---|---|---|---|
| 青铜 | 逐条 INSERT + 自动提交 | 500~1000 行/秒 | 115~231 天 |
| 白银 | JDBC Batch + 手动事务 | 2 万~5 万行/秒 | 2.4~6 天 |
| 黄金 | MyBatis BatchExecutor | 8 万行/秒 | 约 1.5 天 |
| 铂金 | `LOAD DATA INFILE` | 10 万~50 万行/秒 | 5.5~28 小时 |
| 钻石 | MyISAM 中转再转 InnoDB | 80 万行/秒 | 约 3.5 小时 |
| 王者 | 分库分表 + 多机并行 + LOAD DATA | 100 万~200 万行/秒 | 3.5 小时以内 |

MyISAM 中转仅适合"导坏了可重来"的纯离线场景（无事务、`DISABLE KEYS`/`ENABLE KEYS` 延迟维护非唯一索引，灌完 `ALTER TABLE ... ENGINE=InnoDB` 整体转），生产在线库老实 InnoDB。

## How It Works（运作方式）

六步链路：① **算**——先反问六题（数据源/一次性还是增量/单条大小/导入期是否对外查询/停机窗口与丢数容忍/去重幂等要求），再算容量（100 亿≈2~10TB，建索引后最高 15TB+）；② **拆**——分库分表 1000 片，单表压到千万级以内，路由键高基数取模（`user_id % 64`），防倾斜用哈希取模/一致性哈希/预分片动态路由；③ **批量**——优先 `LOAD DATA INFILE`，退而求其次多值 INSERT + 手动事务，连接串必加 `rewriteBatchedStatements=true`；④ **调参**——关 `unique_checks`、`innodb_flush_log_at_trx_commit=2`、调大 buffer pool，导完恢复；⑤ **并发**——分片多线程、按主键顺序写、导入期不建二级索引；⑥ **收尾**——建索引、对账校验、影子表切流量。最后补一句：冷数据其实不该放 MySQL。

## Relationships（关系）

### Related Concepts（相关概念）

- [[table-sharding-migration|分表平滑迁移策略]]：本概念的"拆"是分库分表的容量前提；分表迁移讲"已有大表→分表"的双写双读切换，本概念讲"海量新数据→分表"的批量灌入，互补。
- [[idempotency-design|幂等设计]]：本概念的收尾幂等键 + `ON DUPLICATE KEY UPDATE`/`INSERT IGNORE` 是幂等设计在批量导入重跑场景的实例——重试与幂等共生，重跑安全以唯一键为前提。
- [[durable-execution|持久执行]]：水位表 `import_checkpoint` 是"checkpoint + 幂等重放"不变量在数据库批量导入领域的落地——状态推进（offset）与可重放位点原子落库，宕机从位点继续，与持久执行的 checkpoint 同构。
- [[hot-cold-data-separation|冷热分离]]：本概念"MySQL 只留热数据""冷数据不该放 MySQL"是冷热分离的立论前提；批量导入的容量压力常由未归档的冷数据堆叠造成。
- [[expand-migrate-contract|Expand/Migrate/Contract]]：本概念的"影子表 + RENAME"是 EMC 中"先建兼容结构→回填→原子切换"思路在数据表层面的特化——影子表灌数据 + 校验 + `RENAME` 原子切换，等价于数据层的蓝绿切换。

### Distinctions（区分）

- 与"逐条 INSERT + 调大连接池"的区别：后者只消除了网络等待，每行仍一次 fsync + 一次索引维护，磁盘 IOPS 瓶颈未破；本概念从"合并 N 次为 1 次"入手，是量级差异而非参数微调。
- 与"只调 MySQL 参数"的区别：调参（第四步）只是链路一环，单独调参不拆表、不真批量、不建索引策略，收益有限；本概念强调六步协同，缺一不可。

## Evolution（演进）

- 2026-10-31：[[mysql-10b-bulk-import-guide|100 亿条数据如何快速写入 MySQL]] 单信源立页：确立"攒批+并行+少刷盘"核心不变量、B+ 树算账推导、`rewriteBatchedStatements` 灵魂参数、LOAD DATA 三前置坑、导入期调参取舍、先灌后建索引、分片并行三保命细节、收尾四件套（幂等/水位表/对账/影子表 RENAME）。

## Open Questions（开放问题）

- 跨分片对账（count/sum/checksum）在部分分片失败重跑后的一致性保障机制？信源只给出对账三手段，未展开部分失败的收敛协议。
- 影子表 + RENAME 切换与在线 DDL（如扩列）叠加时的排序与回滚策略？信源未覆盖。
- 流式持续写入（Kafka 削峰 + 批量消费）与一次性文件批导的边界判据？信源只给方向（场景决定方案）。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-mysql-10b-bulk-import-guide.md`（六步链路、B+ 树算账、rewriteBatchedStatements、LOAD DATA 三前置、调参速查表、先灌后建索引、分片并行代码、收尾四件套、MyISAM 中转、ID 生成方案对比）

## Related Knowledge（相关知识）

- [[mysql-10b-bulk-import-guide|信源：100 亿条数据如何快速写入 MySQL]]
- [[table-sharding-migration|分表平滑迁移策略（概念页）]]
- [[idempotency-design|幂等设计（概念页）]]
- [[durable-execution|持久执行（概念页）]]
- [[hot-cold-data-separation|冷热分离（概念页）]]
- [[expand-migrate-contract|Expand/Migrate/Contract（概念页）]]
