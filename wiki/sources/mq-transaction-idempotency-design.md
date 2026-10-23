---
id: wiki-source-mq-transaction-idempotency-design
type: source
title: 消息队列架构设计（中篇）：事务消息、业务幂等，保障单据数据一致性
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - message-queue
  - rocketmq
  - distributed-transaction
  - idempotency
sources:
  - raw/sources/architecture/2026-10-22-mq-transaction-idempotency-design.md
related:
  - wiki/entities/rocketmq.md
  - wiki/sources/async-task-system-design.md
  - wiki/sources/mq-message-backlog-solutions.md
  - wiki/concepts/durable-execution.md
---
# 消息队列架构设计（中篇）：事务消息、业务幂等，保障单据数据一致性

## Overview（概览）

大宗商品销采运储系统架构连载中篇（公共中间件层）：解决"数据库事务和消息发送的原子性"与"消息重复投递脏数据"两大难题——RocketMQ 事务消息保发送、业务幂等保消费，两板斧配合让单据流转不丢不重。

## Key Facts（关键事实）

- 问题本质两面：DB 提交成功但消息发失败→下游单据断层；消息发成功但 DB 回滚→下游收到幽灵消息。普通消息无法保证原子性。
- 事务消息流程：半消息暂存 Broker（消费者不可见）→ 执行本地事务 → Commit 转可消费 / Rollback 删除；宕机未确认时 Broker 主动**事务回查**，生产者查本地事务状态后回复——**回查必须实现，是兜底机制**。
- 落地要点：`@RocketMQTransactionListener` 实现本地事务执行+回查两方法；`sendMessageInTransaction` 发送；事务消息生产者组全局唯一；本地事务轻量化避免长锁库。
- 边界：事务消息是**最终一致非强一致**，只适合核心单据异步联动；普通通知类事件别用（徒增复杂度）。
- 幂等三方案选型：新增类单据→数据库唯一索引（简单强约束）；状态流转→业务状态机判断；跨服务复杂事件→独立幂等表（消息 ID 唯一键+业务单号，通用性最强）。
- **幂等铁律**：幂等判断 + 业务处理 + 幂等记录写入放同一 DB 事务，防宕机导致幂等记录未落库。
- RocketMQ 投递保障为至少一次：网络抖动、ACK 丢失、重启重平衡都会造成重复投递。

## Important Claims（重要论断）

### Claim 1：事务消息保发送，业务幂等保消费

事务消息保证事件"有没有发出去"，幂等保证事件"不会重复处理"，两板斧配合单据流转才不丢不重（信源定调）。

## Concepts Introduced（引入的概念）

- "DB+消息原子性"的另一解法：与 [[async-task-system-design]] 的 Outbox 模式（同事务写任务+事件表，后台投递 MQ）解决同一问题——事务消息把回查责任交给 Broker，Outbox 把投递责任留给后台 Worker（解读对比，未立新页）。

## Entities Mentioned（提及的实体）

- [[rocketmq|RocketMQ]]（与堆积治理信源共同支撑实体页）

## Implications（影响／启示）

- "幂等判断+业务处理+幂等记录同事务"与 [[durable-execution]] 的"结果+checkpoint+outbox 原子提交"是同一条不变量：状态推进与副作用记录必须原子，否则宕机即裂缝（解读）。

## Limitations（局限）

- 原文部分代码块抓取缺失，核心逻辑以文字要点呈现（采集稿已注明）；事务消息为 RocketMQ 特有能力，Kafka/RabbitMQ 语境不适用。

## Related Knowledge（相关知识）

- [[rocketmq|RocketMQ（实体页）]]
- [[async-task-system-design|异步任务系统设计（信源页）]]（Outbox 解法对照）
- [[mq-message-backlog-solutions|MQ 消息堆积治理（信源页）]]
- [[durable-execution|持久执行（概念页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-22-mq-transaction-idempotency-design.md`
