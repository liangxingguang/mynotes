---
id: wiki-concept-idempotency-design
type: concept
title: 幂等设计（Idempotency Design）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - concept
  - architecture
  - idempotency
  - reliability
sources:
  - raw/sources/architecture/2026-10-23-async-idempotency-local-message-table.md
  - raw/sources/architecture/2026-10-22-mq-transaction-idempotency-design.md
  - raw/sources/architecture/2026-10-22-async-task-system-design.md
related:
  - wiki/concepts/durable-execution.md
  - wiki/sources/async-idempotency-local-message-table.md
  - wiki/sources/mq-transaction-idempotency-design.md
  - wiki/sources/async-task-system-design.md
---
# 幂等设计（Idempotency Design）

## Definition（定义）

在分布式系统「至少一次」投递与重试自愈的前提下，保证同一业务动作重复执行多次与执行一次的最终效果一致的设计约束。幂等的目标不是拦截重复请求，而是基于业务领域状态或持久化记录判断本次动作是否已落地：已完成则跳过业务变更、仅返回成功。

## Why It Matters（为什么重要）

网络不可靠使「不确定结果」问题不可避免（DB 提交成功但 ACK 丢失，应用判超时），任何依赖重试做故障自愈的最终一致性链路都必然引入重复执行。重试与幂等共生、不可单独取舍：关掉重试换来的是消息丢失与数据不一致。因此幂等不是可选的工具函数，而是整套最终一致性体系中不可分割的配套约束层。

## Core Characteristics（核心特征）

1. **同事务铁律**：幂等判断 / 幂等记录写入、业务变更、消息（任务）状态推进，必须在同一个本地事务内提交——状态校验脱离事务，并发重试必然读到过期快照产生竞态。
2. **幂等键三要素**：全局唯一、业务含义稳定、多次重试不变（如业务单据号、支付流水号、msgId+topic）；自增 ID 与本地随机串在重试下失效；外部传入 ID 须做合法性校验。
3. **同步/异步边界**：异步重复流量（MQ 重放、回调重试、本地消息表轮询）是系统自治产生的内部重复，前端防抖与一次性 Token 完全无效。
4. **持久化兜底**：缓存（Redis）只能做前置快速拦截，宕机/过期/闪断时查询异常会放行重复执行，唯一幂等数据源必须是数据库。

## Structure（结构）

四类主流方案及取舍边界（多信源互证）：

| 方案 | 适用 | 短板 |
|---|---|---|
| 数据库唯一索引 | 新增流水、单据创建 | 不防状态变更（UPDATE 不触发冲突）；高并发行锁压力；分库分表须同分片 |
| 独立幂等记录表 | 跨服务复杂事件、无状态通知 | 查询+写入须同事务+唯一索引防竞态；须 expire_time 归档防膨胀 |
| 业务状态机幂等 | 有生命周期的领域对象（订单/优惠券/库存） | 状态校验与变更必须同事务；无状态场景（推送/通知）不适用；抬升领域建模复杂度 |
| Token 防重 | 同步前端接口 | 异步链路没有任何防护能力，不可混用 |

生产落地形态为分层防护闭环：按流量入口（MQ 消费 / 第三方回调 / 本地消息重试）匹配幂等键与校验机制，外层缓存快速拦截、底层数据库持久化兜底——分层是故障域隔离，不是重复造轮子。

## How It Works（运作方式）

以「本地消息表 + 业务状态机」组合为例：业务事务与消息记录同事务提交；重试进入消费逻辑时，先（在事务内）校验领域对象状态，已是终态则直接返回成功，否则执行变更并更新消息状态。即使 commit 阶段 ACK 丢失触发重试，第二次进入时状态已是终态，天然跳过——「不确定结果」被领域状态吸收。

## Relationships（关系）

### Related Concepts（相关概念）

- [[durable-execution|持久执行]]：「幂等判断+业务+记录同事务」与持久执行的「结果+checkpoint+outbox 原子提交」是同一条不变量——状态推进与副作用记录必须原子，否则宕机即裂缝。

### Distinctions（区分）

- 与「防重」的区别：防重（防抖/Token）面向人产生的重复，在接入层拦截请求；幂等面向系统自治产生的重复，在业务层判断动作是否已落地，重复请求照样进入但被吸收。

## Evolution（演进）

- 2026-10-22：[[mq-transaction-idempotency-design]] 给出幂等三方案选型与同事务铁律（MQ 消费侧）。
- 2026-10-22：[[async-task-system-design]] 从异步任务视角确立「至少一次执行下重复是常态」，幂等键 (task_id, row_number) 与「状态已是 RUNNING 不是幂等保护」。
- 2026-10-23：[[async-idempotency-local-message-table]] 以真实重复扣券事故补全事故侧证据：不确定结果根因、异步重复流量三大来源、分层防护闭环与 8 条评审清单。

## Open Questions（开放问题）

- 跨分片场景下幂等记录与业务数据无法同分片时的事务保障方案，现有信源未给出确立答案。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-async-idempotency-local-message-table.md`（事故复盘 + 四方案取舍 + 分层闭环）
- Source: `raw/sources/architecture/2026-10-22-mq-transaction-idempotency-design.md`（幂等三方案选型、同事务铁律）
- Source: `raw/sources/architecture/2026-10-22-async-task-system-design.md`（至少一次执行、任务幂等键）

## Related Knowledge（相关知识）

- [[durable-execution|持久执行（概念页）]]
- [[rocketmq|RocketMQ（实体页）]]（消息重放是异步重复流量来源之一）
