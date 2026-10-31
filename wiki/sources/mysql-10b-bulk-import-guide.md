---
id: wiki-source-mysql-10b-bulk-import-guide
type: source
title: 100 亿条数据如何快速写入 MySQL？从 231 天到 3.5 小时
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - source
  - mysql
  - database
  - performance
  - java
sources:
  - raw/sources/architecture/2026-10-28-mysql-10b-bulk-import-guide.md
related:
  - wiki/concepts/mysql-bulk-import.md
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/table-sharding-migration.md
  - wiki/concepts/hot-cold-data-separation.md
---
# 100 亿条数据如何快速写入 MySQL？从 231 天到 3.5 小时

## Overview（概览）

面试场景题的工程落地版：以 100 亿行写 MySQL 为题，按"一算、二拆、三批量、四调参、五并发、六收尾"六步口诀，把逐条 INSERT 的 231 天压到 3.5 小时以内。是 [[mysql-bulk-import|MySQL 大批量导入优化]] 概念的来源信源，覆盖 B+ 树算账、真批量参数、LOAD DATA、导入期调参、分片并行、幂等断点续传与影子表切换全链路。

## Key Facts（关键事实）

- 容量算账：100 亿行≈2~10TB（按 500B/行约 4.55TB），建索引后最高 15TB+；单机批量写入极限 1 万~5 万行/秒。
- 六段位耗时对比：逐条 INSERT 231 天 → JDBC Batch 2.4~6 天 → MyBatis BatchExecutor 约 1.5 天 → LOAD DATA 5.5~28 小时 → MyISAM 中转约 3.5 小时 → 分库分表+并行 3.5 小时以内。
- B+ 树算账：16KB 页÷1KB 行≈16 行/页，非叶子 16384÷14B≈1170 扇出，三层≈2190 万行（"单表 2000 万"出处），四层≈256 亿行。
- 灵魂参数 `rewriteBatchedStatements=true`：不配则 `addBatch()` 是假批量（驱动拆成逐条 INSERT），配后重写成多值 INSERT，RTT 砍 90%；必须配套 `useServerPrepStmts=false`。
- 事务甜点区：每 2000~10000 行提交一次；事务太大（上亿行）undo log 膨胀 OOM + 主从延迟 8 小时，太小（一条一提交）fsync 打满 IOPS。
- LOAD DATA 三前置坑：文件落 `secure_file_priv`（LOCAL 须服务端+驱动两边开）；分隔符/换行/编码严格对齐（UTF-8 + utf8mb4）；关 `unique_checks`/`foreign_key_checks` 前先确认源数据干净。
- 导入期调参：`innodb_flush_log_at_trx_commit=2`、`sync_binlog=0`、buffer pool 60%~80%、redo 4G、`bulk_insert_buffer_size=512M`、`max_allowed_packet=256M`；拿"崩溃丢 1 秒"换吞吐，导完恢复双 1。
- 先灌后建索引：插入时维护二级索引是随机 IO+页分裂，导完统一建索引（顺序扫描+排序）快一个数量级；在线建用 `ALGORITHM=INPLACE, LOCK=NONE`。
- 分片并行：单机并发 16~32（超了吞吐不升反降）；每分片一文件/一连接/一事务；按主键升序写防页分裂+死锁；ID 应用侧预生成（雪花/号段，禁用 UUID 主键）。
- 收尾四件套：幂等键（`shard_id+biz_id` 唯一）+ `ON DUPLICATE KEY UPDATE`/`INSERT IGNORE`；水位表 `import_checkpoint`（batch_id/start_id/end_id/offset/status）断点续传；count/sum/抽样/MD5 对账；影子表 + `RENAME TABLE` 原子切换。
- ID 生成方案对比：数据库自增（单点瓶颈）/UUID（无序页分裂，别做主键）/雪花（有序高性能，时钟回拨）/号段（Leaf，ID 不连续）。

## Important Claims（重要论断）

### Claim 1：快插的本质 = 攒批 + 并行 + 少刷盘

把逐条写入的 N 次网络往返、N 次解析、N 次 fsync、N 遍索引维护，合并成一次。磁盘 IOPS 是天花板，不是参数问题。

### Claim 2：rewriteBatchedStatements 是 JDBC 批量的灵魂参数

不配它，`addBatch()` 是"假批量"——驱动默认把 batch 拆成逐条独立 INSERT，网络往返一次没少。这是 90% 的人踩过的坑。

### Claim 3：临时调参是拿可靠性换吞吐，导完必须恢复

导入期调参本质是"崩溃可能丢 1 秒数据"的一次性离线取舍；把临时调优参数当成线上配置推荐，是面试减分项、实际工作中的事故。

### Claim 4：敢质疑前提——100 亿不一定适合 MySQL

冷数据归档/日志/时序数据可能压根不该进 MySQL；MySQL 的舒适区是"分片后的热数据和在线事务"。面试时敢质疑题设是最大加分项。

## Concepts Introduced（引入的概念）

- [[mysql-bulk-import|MySQL 大批量导入优化（Bulk Import Optimization）]]

## Entities Mentioned（提及的实体）

- MySQL / InnoDB / MyISAM / ShardingSphere / Vitess / MyCat / ClickHouse / Doris / HBase / TiDB（均为技术组件，未单独立页；MySQL 为本文主题对象）

## Implications（影响／启示）

- "攒批+并行+少刷盘"的合并思路可迁移到一切批量写入场景（Kafka 批量生产、ES bulk、Redis pipeline）——核心都是把 N 次副作用合并成 1 次（解读）。
- "先算账再动手"的工程纪律（B+ 树推导容量、六反问澄清前提）适用于任何海量数据场景，避免"上来就写代码"（解读）。

## Limitations（局限）

- 数字为参考量级（普通 SSD），随硬件/分片/数据格式/调参浮动，非普适收益。
- 仅单一信源，六步链路的各环节细节（如跨分片对账收敛协议、影子表与在线 DDL 叠加）未展开。
- MyISAM 中转仅适用可重跑离线场景，生产在线库不适用。

## Related Knowledge（相关知识）

- [[mysql-bulk-import|MySQL 大批量导入优化（概念页）]]
- [[table-sharding-migration|分表平滑迁移策略（概念页）]]（拆是前提）
- [[idempotency-design|幂等设计（概念页）]]（收尾幂等键+UPSERT）
- [[durable-execution|持久执行（概念页）]]（水位表=checkpoint 实例）
- [[hot-cold-data-separation|冷热分离（概念页）]]（MySQL 只留热数据）

## Source（信源）

- `raw/sources/architecture/2026-10-28-mysql-10b-bulk-import-guide.md`
