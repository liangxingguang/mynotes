---
id: wiki-concept-local-message-table
type: concept
title: 本地消息表（Local Message Table）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - concept
  - architecture
  - distributed-transaction
  - reliability
sources:
  - raw/sources/architecture/2026-10-28-local-message-table-distributed-transaction.md
  - raw/sources/architecture/2026-10-23-async-idempotency-local-message-table.md
  - raw/sources/architecture/2026-10-22-distributed-transaction-six-solutions.md
related:
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/durable-execution.md
  - wiki/entities/rocketmq.md
  - wiki/sources/async-idempotency-local-message-table.md
  - wiki/sources/distributed-transaction-six-solutions.md
---
# 本地消息表（Local Message Table）

## Definition（定义）

本地消息表（Local Message Table）是一种分布式事务最终一致性方案：把业务数据与待发送的消息记录封装在**同一个本地数据库事务**中提交，借助单库事务的原子性保证"业务写成功则消息必落库"，再由后台定时任务扫描消息表、重试投递下游，以重试机制保证可靠性。本质是用"单库事务原子性 + 重试可靠性"替代跨库分布式事务的复杂度。

## Why It Matters（为什么重要）

商城交易链路中，下单后发短信、预创建物流、更新热度统计等链路只要求最终一致、允许短暂不一致。这类场景若上 Seata AT 等重型分布式事务框架，大促压测下热点商品全局锁争用爆发、事务超时飙升、下单失败。本地消息表以轻量、可控、易排查的优势成为这类场景性价比最高的方案。但工程暗坑极多——消息丢失、重复执行、重试风暴、数据库击穿，任一上线即资损，必须配套重试退避、幂等与死信兜底。

## Core Characteristics（核心特征）

1. **同事务原子性**：业务写库与消息写库在同一本地事务提交，同生共死；事务内禁止任何远程调用，只做数据库写操作。
2. **重试可靠性**：后台定时任务扫描待发送消息重试投递；消费成功标记 SUCCESS、失败 FAIL + retry_count++、达上限转死信 DEAD。
3. **至少一次投递**：消息表只保证至少投递一次，无法杜绝重试的重复执行——幂等必须由消费端业务逻辑自行保证。
4. **轻量可控**：不引入额外中间件协调者，依赖单库事务，易排查；代价是事务窗口拉长、依赖单库。

## Structure（结构）

消息状态流转（四态）：

| 流转阶段 | 状态 | 说明 |
|---|---|---|
| 业务事务提交 | INIT（待发送） | 消息随业务数据一同入库 |
| 消费成功 | INIT → SUCCESS | 更新状态 |
| 消费失败 | INIT → FAIL | retry_count += 1，等下轮重试 |
| 达最大重试 | FAIL → DEAD | 死信，实时触发告警 |

消息表须含 `retry_count` 字段（每次重试 +1），仅靠状态字段无法控制重试次数。

## How It Works（运作方式）

1. 业务事务内同时写入业务数据与消息记录（INIT），单库事务保证原子性。
2. 定时任务扫描 INIT/FAIL 消息，投递下游（短信、物流、统计等）。
3. 消费成功 → SUCCESS；消费失败 → FAIL + retry_count++，指数退避后重试。
4. retry_count 达最大值（8 次）→ DEAD 死信，实时告警人工介入。
5. 幂等：以业务唯一流水号作幂等 Key，消费逻辑第一步先校验幂等记录。

## Relationships（关系）

### Related Concepts（相关概念）

- [[idempotency-design|幂等设计]]：本地消息表只保证至少一次投递，幂等是消费端必备配套约束；同事务铁律完全一致。
- [[durable-execution|持久执行]]：消息表 + 状态机 + 后台重试扫描，与持久执行的"状态落盘 + 后台恢复"同构。

### Distinctions（区分）

- 与 Seata AT：Seata 用全局锁保证跨库强一致，热点场景全局锁争用打垮吞吐；本地消息表只保最终一致、无跨库协调者，适合允许短暂不一致的同库场景。
- 与 RocketMQ 事务消息：RocketMQ 把"扫描消息表"从业务方移到中间件（Prepare/Confirm + 回查）；本地消息表由业务方自建消息表扫描。千万级超高吞吐时本地消息表的 DB 消息表成瓶颈，应上 RocketMQ 事务消息。

## Evolution（演进）

- 2026-10-22：[[distributed-transaction-six-solutions|分布式事务 6 方案]] 将本地消息表列为六方案之一，定位"业务写库+写消息表同事务 + 后台重传 MQ + 消费端 ACK + 判重表"的最终一致组合。
- 2026-10-23：[[async-idempotency-local-message-table|异步链路幂等实战]] 以重复扣券事故补全幂等侧证据：本地消息表重试是异步重复流量三大来源之一，幂等记录须与业务数据同事务提交。
- 2026-10-31：本信源以三故障案例 + 状态流转表 + 退避参数 + 选型边界 + 6 条红线，补全本地消息表方案自身的完整工程画像。

## Open Questions（开放问题）

- 跨库场景（业务数据与消息表不同库）无法用单库事务保证原子性时，本地消息表的替代方案（如 Seata/TCC/对账）的选型细化，现有信源未给出确立答案。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-local-message-table-distributed-transaction.md`（三故障案例、状态流转表、退避参数 1/3/10/30min、8 次上限、选型边界、6 条红线）
- Source: `raw/sources/architecture/2026-10-23-async-idempotency-local-message-table.md`（本地消息表重试是异步重复流量来源、同事务铁律）
- Source: `raw/sources/architecture/2026-10-22-distributed-transaction-six-solutions.md`（本地消息表在 6 方案谱系中的位置）

## Related Knowledge（相关知识）

- [[idempotency-design|幂等设计（概念页）]]
- [[durable-execution|持久执行（概念页）]]
- [[rocketmq|RocketMQ（实体页）]]
- [[async-idempotency-local-message-table|异步链路幂等实战（信源页）]]
- [[distributed-transaction-six-solutions|分布式事务 6 方案（信源页）]]
