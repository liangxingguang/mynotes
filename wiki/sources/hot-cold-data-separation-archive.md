---
id: wiki-source-hot-cold-data-separation-archive
type: source
title: 微服务架构落地：大表治理与冷热分离——历史单据到底怎么存？
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: high
tags:
  - 数据库
  - 大表治理
  - 冷热分离
sources:
  - raw/sources/architecture/2026-10-28-hot-cold-data-separation-archive.md
related:
  - wiki/concepts/hot-cold-data-separation.md
---
# 微服务架构落地：大表治理与冷热分离——历史单据到底怎么存？

## Overview（概览）

公众号「架构落地笔记」的大宗商品销采运储系统六层架构连载（数据持久层）之一。核心论点：冷热分离不是省磁盘，而是给数据库做「减负手术」。文章给出大表四大痛点、冷热划分标准（时间 + 状态）、热/温/冷三层存储架构、平滑归档落地方案与三条红线。

## Key Facts（关键事实）

- 大宗商品系统三年后单表几千万~上亿行，约 80% 是无人查询的历史单据。
- 历史大表污染 InnoDB Buffer Pool，热数据查询从 10ms 飙到 500ms；上亿行使 B+ 树从 3 层变 4 层，每次查询多一次磁盘 IO。
- 交易单据、财务凭证按《会计档案管理办法》须保留 10~30 年，不能直接 DELETE，只能分离。
- 热库只留近 3 个月，单表 ≤500 万行；温库存 3 个月~1 年，普通 HDD 归档 MySQL；冷库走 OSS（CSV/Parquet，纯合规）或 ES/ClickHouse（需检索）。
- 冷数据划分公式：`状态 IN ('FINISHED','CANCELLED') AND 完结时间 < NOW() - 3个月`。

## Important Claims（重要论断）

### Claim 1：状态维度比时间维度更精准

没走完流程的单据放多久都是热数据；冷热划分应先看状态（流转中/待审核 vs 已完结/已作废/已红冲），再叠加完结时间。

### Claim 2：严禁长事务大 DELETE

归档必须「先复制、后删除」，凌晨低峰调度，分批 Batch + 每批 sleep 几十毫秒限 TPS；一条 `DELETE FROM ... WHERE create_time < ...` 大事务会让主从延迟瞬间飙升甚至拖垮库。

### Claim 3：统计报表严禁业务库跨热冷实时聚合

数据进冷库后业务库 `SELECT COUNT(*)` 不准；统计走数仓离线 T+1。冷查询接口须加超时（如 3 秒）+ Sentinel 限流。

## Concepts Introduced（引入的概念）

- [[hot-cold-data-separation|冷热分离（Hot/Cold Data Separation）]]

## Entities Mentioned（提及的实体）

- MySQL/InnoDB、Elasticsearch、ClickHouse、ShardingSphere、Sentinel、OSS/COS/MINIO（均无独立页面）

## Implications（影响／启示）

- 冷热分离与分库分表是大表治理的互补手段：分表解决单表规模，分离解决时间维度上的数据温度，两者常组合使用（热库本身即分库分表）。
- 归档链路的工程风险集中在 binlog 洪峰与主从延迟，限速设计是必选项而非优化项。

## Limitations（局限）

- 单一信源（公众号连载），数字（10ms→500ms、≤500 万行）为作者经验值，未见基准报告佐证。
- 未讨论归档过程中的数据一致性校验与回滚机制；温库到冷库的二次沉降只一笔带过。

## Related Knowledge（相关知识）

- [[table-sharding-migration|分表平滑迁移策略]]（大表治理组合拳的另一环）
- [[db-table-sharding-practice|大表治理之分表实践]]
- [[mysql-replication-lag-optimization|MySQL 主从延迟优化]]（归档限速的下游背景）

## Source（信源）

- `raw/sources/architecture/2026-10-28-hot-cold-data-separation-archive.md`
