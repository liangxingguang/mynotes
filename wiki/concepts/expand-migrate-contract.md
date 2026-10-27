---
id: wiki-concept-expand-migrate-contract
type: concept
title: Expand/Migrate/Contract（Schema 跨版本演进）
status: active
created: 2026-10-27
updated: 2026-10-27
confidence: high
tags:
  - concept
  - database
  - release-engineering
  - schema-migration
sources:
  - raw/sources/architecture/2026-10-27-k8s-blue-green-release-trading.md
related:
  - wiki/concepts/blue-green-deployment.md
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/table-sharding-migration.md
---
# Expand/Migrate/Contract（Schema 跨版本演进）

## Definition（定义）

一种把数据库 Schema 变更拆到多个 release 实施的演进模式：Release N **Expand**（只新增兼容结构，如可空列）；Release N+1 **Migrate**（双读双写 + 可限速、可暂停、可续跑的回填）；Release N+2 **Contract**（回退窗口关闭、旧代码下线后，才删除遗留结构或加 NOT NULL 等破坏性约束）。核心约束：Schema 变更绝不与应用切流放在同一个不可逆动作里。

## Why It Matters（为什么重要）

应用回退 ≠ 数据回退：流量切回旧版本只意味着新请求重新进入旧代码，并不撤销新版本已写入的数据。若应用回退的同时执行过破坏性 DDL（如 Contract 提前），旧代码将无法读库，一次应用回退会扩大为数据库事故。该模式让"任意时刻任意版本可回退"成为结构性保证，而非靠运气。

## Core Characteristics（核心特征）

1. **Expand 只做加法**：新增结构对所有在役版本兼容（可空/默认值），Blue/Green 都能读写。
2. **Migrate 可控回填**：按主键区间分批（如每批 5000 行）、限速、可暂停续跑；双读双写期间新旧结构并存。
3. **Contract 最后且可推迟**：仅在回退窗口关闭、旧版本彻底离场后执行；事故复盘案例中明确"本次不做 Contract，保留兼容窗口"。
4. **migration ID 可追踪**：每次变更登记 migration ID，进入发布证据链，支撑审计与回退决策。

## Structure（结构）

```
Release N     Expand:   add compatible structure（如 ALTER TABLE ADD COLUMN 可空列）
Release N+1   Migrate:  dual read/write + throttled backfill（分批限速回填）
Release N+2   Contract: remove legacy structure after rollback window closes（加 NOT NULL / 删列）
```

## How It Works（运作方式）

以订单服务新增 `risk_level` 字段为例：Release N 执行 `ALTER TABLE orders ADD COLUMN risk_level VARCHAR(16)`（可空，Blue/Green 均兼容）；回填按 `id > :last_id AND id <= :last_id + 5000` 的键区间分批推进；直到 Release N+2 旧代码离场、回退窗口关闭，才 `ALTER COLUMN risk_level SET NOT NULL`。配套的写路径把订单记录、幂等键、Outbox 事件放同一事务，消费者侧用 Inbox/去重表吸收至少一次投递——与 [[idempotency-design|幂等设计]] 的同事务铁律是同一条不变量。

## Relationships（关系）

### Related Concepts（相关概念）

- [[blue-green-deployment|蓝绿发布]]：EMC 是蓝绿/金丝雀安全回退的数据前提；四种回退（流量/应用/数据/业务）边界由它划清。
- [[idempotency-design|幂等设计]]：回退与重试不造成二次业务执行，与数据兼容互为前提。
- [[table-sharding-migration|分表平滑迁移策略]]：双写双读+回填在分表场景的特化形态。

### Distinctions（区分）

- 与"随发布一次性改 Schema"的区别：后者把数据回退能力绑定在应用回退上，回退窗口内执行 Contract 会让旧版本无法读库；EMC 把不可逆动作推迟到回退窗口关闭之后。

## Evolution（演进）

- 2026-10-27：[[k8s-blue-green-release-trading|日千万级交易系统蓝绿实战]] 立页：四种回退边界图 + `risk_level` 三 release SQL 示例 + 事故复盘（Blue 能读 Green 数据正因 Expand 阶段保持可空兼容）。

## Open Questions（开放问题）

- 多分片集群中回填与分片迁移叠加时的排序与限速策略，现有信源未覆盖。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-k8s-blue-green-release-trading.md`（三阶段定义、SQL 示例、回填批大小 5000、事故复盘中的兼容窗口决策）

## Related Knowledge（相关知识）

- [[blue-green-deployment|蓝绿发布（概念页）]]
- [[idempotency-design|幂等设计（概念页）]]
- [[table-sharding-migration|分表平滑迁移策略（概念页）]]
