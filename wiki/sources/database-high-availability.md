---
id: wiki-source-database-high-availability
type: source
title: 当我谈数据库高可用时是在谈些什么（京东技术：五层主线全景）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - database
  - mysql
  - high-availability
  - architecture
sources:
  - raw/sources/architecture/2026-10-22-database-high-availability.md
related:
  - wiki/sources/db-table-sharding-practice.md
  - wiki/sources/elasticsearch-interview-deep-dive.md
---
# 当我谈数据库高可用时是在谈些什么（京东技术：五层主线全景）

## Overview（概览）

京东技术团队的数据库高可用体系科普（MySQL 语境），以五层主线串起完整图景：单机崩溃可恢复 → 主备复制 → GTID → 安全切换 → Orchestrator 自动化容错，最后延伸到应用侧协同降级。三个反面案例（GitHub 脑裂 24h、AWS RDS 单 AZ 未开 failover、阿里云香港 2022 >15h）开篇点题：高可用是数据库与应用的双向奔赴。

## Key Facts（关键事实）

- 五层主线各回答一个问题：①单机（断电已提交事务还在吗：WAL/2PC/崩溃恢复）②复制（怎么到备库、丢多少：异步/半同步/RPO）③GTID（切换后备库怎么知道缺哪些：全局事务号/auto-position）④切换（怎么换才能不丢不脑裂：追平/fencing/PRS/ERS）⑤自动化（谁发现谁决策谁执行：选主/probe-agent）。
- 三种日志分工：redo log（InnoDB 引擎层物理日志，崩溃前滚，循环覆盖）/ undo log（回滚+MVCC 快照读）/ binlog（Server 层逻辑日志，持续追加，复制与 PITR 靠它）。**redo 是引擎内部账本，binlog 是对外广播的变更流**。
- WAL：先顺序写 redo 再刷数据页——提交只等顺序落盘不等随机落盘；2PC 顺序 `redo-prepare → binlog-write → redo-commit`，**以 binlog 是否落盘裁决 prepare 事务命运**，保证主库恢复结果与备库视角永远一致。
- 双 1 参数：`innodb_flush_log_at_trx_commit=1` + `sync_binlog=1` = 单机不丢已提交事务的前提；代价是每次提交两次 fsync。
- 半同步的坑：超时后悄悄退化为异步；京东现网核心库把 `rpl_semi_sync_master_timeout` 设为 8640000ms 视为"不退化"，叠加三机房实现 RPO=0；`AFTER_SYNC` 比 `AFTER_COMMIT` 更少幽灵读。
- GTID = server_uuid:事务号，终身不变；auto-position 自动对齐、幂等跳过重放。
- 切换安全：fencing 防老主诈尸脑裂；PRS（计划内切换）近零 RTO，ERS（紧急切换）优先防脑裂。
- Orchestrator 反证法：`UnreachableMaster`（orc 连不上 master 但 replica 还连着它）**不切换**，`DeadMaster`（双方都失联）才切——避免网络抖动误切。
- probe-agent 部署在 DB 主机本地，心跳区分"DB 死 vs 网络断"，本地负载/大事务 GTID 差/磁盘/真实写探测是远端探测看不到的眼睛和手。
- 选主四要素：GTID 集合最全、promotion rule（must/prefer/neutral/prefer_not/must_not）、candidate 登记、同机房且版本兼容。
- 应用侧协同：DB 必有数十秒不可写窗口，应用需 MQ 异步削峰、最终一致性、读降级走备库、写降级兜底回放、快速失败+熔断。
- 反面案例细节：GitHub 主备同时可写、自动切换脚本失效、人工 24h 恢复（官方承认"HA 机制没起作用"）；阿里云香港 2022-12-18 因代理与实例同 AZ 导致切换流程起不来，澳门金管局等客户中招，阿里云自认"运营十多年来持续时间最长的大规模故障"。

## Important Claims（重要论断）

### Claim 1：高可用不是单一技术，而是层层叠加的保证

每一层完成一定程度的保证，全部叠加才是完整状态（信源主线）。

### Claim 2：数据库高可用是数据库与应用的双向奔赴

切换必有不可写窗口，应用侧没有削峰/降级/熔断配合，数据库侧做得再好也会表现为业务故障（信源收尾）。

## Concepts Introduced（引入的概念）

（无——既有概念（WAL/2PC/GTID/fencing）的体系化串讲，未立新页）

## Entities Mentioned（提及的实体）

- MySQL/InnoDB、Orchestrator、GitHub/AWS RDS/阿里云（案例主体）——均单一信源提及，不立实体页。

## Implications（影响／启示）

- "以 binlog 落盘裁决事务命运"与 [[elasticsearch|ES]] translog、Kafka PageCache 同属"顺序日志是一切可靠性地基"的大家族（解读）。
- orc 的"双方失联才判死"与分布式系统"多数派判活"思想同构——单视角探测必然误切（解读）。

## Limitations（局限）

- MySQL 语境，PG/分布式数据库未覆盖；案例细节为转述公开事后报告。

## Related Knowledge（相关知识）

- [[db-table-sharding-practice|大表治理分表实践（信源页）]]（同为京东数据库工程实践）
- [[elasticsearch-interview-deep-dive|ES 面试深拆（信源页）]]（translog/刷盘策略的对照阅读）

## Source（信源）

- `raw/sources/architecture/2026-10-22-database-high-availability.md`
