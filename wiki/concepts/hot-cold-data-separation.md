---
id: wiki-concept-hot-cold-data-separation
type: concept
title: 冷热分离（Hot/Cold Data Separation）
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: medium
tags:
  - concept
  - database
  - archiving
sources:
  - raw/sources/architecture/2026-10-28-hot-cold-data-separation-archive.md
related:
  - wiki/concepts/table-sharding-migration.md
  - wiki/sources/hot-cold-data-separation-archive.md
  - wiki/concepts/mysql-bulk-import.md
---
# 冷热分离（Hot/Cold Data Separation）

## Definition（定义）

按数据的「温度」（访问频率与业务活跃度）把单一大表拆到热、温、冷三层异构存储中：热库留在线 MySQL 保响应速度，温库用低成本归档实例，冷库走对象存储或检索引擎——让冷数据「查得到但不碍事」。

## Why It Matters（为什么重要）

大表 80% 是无人查询的历史数据，却持续污染 InnoDB Buffer Pool（信源经验值：热查询 10ms→500ms）、加深 B+ 树（上亿行 3 层变 4 层，多一次 IO）、放大备份与 DDL 成本（几百 GB 全量备份数小时、ALTER TABLE 锁表几十分钟）；而合规（如《会计档案管理办法》要求单据留 10~30 年）又禁止直接 DELETE，分离成为唯一出路。

## Core Characteristics（核心特征）

1. **划分标准双维度**：时间维度（热 ≤3 个月 / 温 3 个月~1 年 / 冷 >1 年）最常用；状态维度（已完结/已作废/已红冲 且 完结超 3 个月才算冷）更精准——流程没走完放多久都是热数据。
2. **三层异构存储**：热 = MySQL 分库分表（单表 ≤500 万行）；温 = 独立归档 MySQL 实例（HDD 容忍延迟）；冷 = OSS/Parquet（纯合规）或 ES/ClickHouse（需检索，只读接口）。
3. **先复制后删除**：归档任务凌晨低峰调度，分批 Batch + 每批 sleep 限 TPS，严禁长事务大 DELETE。
4. **查询侧路由**：应用层先热后冷兜底，或 ShardingSphere 按时间条件强制路由到归档数据源。

## Structure（结构）

```text
热库（MySQL 分库分表，≤3 个月，≤500万行/表）
  ↓ 归档任务（先复制后删除，分批限速）
温库（归档 MySQL，3 个月~1 年，HDD）
  ↓ 二次沉降
冷库（OSS/Parquet 纯合规 ｜ ES/ClickHouse 可检索只读）
```

## How It Works（运作方式）

- 冷数据判定公式：`状态 IN ('FINISHED','CANCELLED') AND 完结时间 < NOW() - 3个月`。
- 归档限速防 binlog 洪峰：写太快导致从库回放跟不上，读请求会读到「正在被删的数据」。
- 冷查询防护：接口超时控制（如 3 秒）+ 前端 Loading + Sentinel 限流。
- 统计口径隔离：数据入冷后业务库聚合失真，报表走数仓离线 T+1，严禁业务库跨热冷实时聚合。

## Relationships（关系）

### Related Concepts（相关概念）

- [[table-sharding-migration|分表平滑迁移策略]]：大表治理组合拳的姊妹手段——分表解决单表横向规模，冷热分离解决时间纵向温度；信源中热库本身即分库分表形态。

### Distinctions（区分）

- 与「删数据」的区别：合规红线（10~30 年留存）使 DELETE 不可行，冷热分离是「搬不走就分开住」而非「扔掉」。
- 与数仓的区别：冷库服务在线只读检索（单票查询），数仓服务离线统计分析（T+1），两者不互相替代（信源红线）。

## Evolution（演进）

- 2026-10-28：[[hot-cold-data-separation-archive|大表治理与冷热分离]] 立页：状态+时间双维划分、热/温/冷三层异构存储、先复制后删除分批限速、报表走数仓 T+1。
- 2026-10-31：[[mysql-10b-bulk-import-guide]] 信源印证"MySQL 舒适区是分片后的热数据和在线事务"——冷数据归档/日志/时序数据不该硬塞 MySQL，是冷热分离立论的前提侧证据。

## Open Questions（开放问题）

- 归档「先复制后删除」两阶段之间的一致性校验与失败补偿机制？信源未展开。
- 温库到冷库二次沉降的触发条件与工具链？信源只给出方向。
- 跨冷热的事务性写入（如对历史单据红冲产生新热数据）如何路由？信源未覆盖。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-hot-cold-data-separation-archive.md`

## Related Knowledge（相关知识）

- [[hot-cold-data-separation-archive|信源：大表治理与冷热分离——历史单据到底怎么存？]]
- [[db-table-sharding-practice|大表治理之分表实践]]
