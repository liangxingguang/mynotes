---
id: wiki-source-async-idempotency-local-message-table
type: source
title: 异步链路幂等实战：本地消息表配套防重，解决重复扣款与消息重放
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - architecture
  - idempotency
  - distributed-transaction
  - message-queue
sources:
  - raw/sources/architecture/2026-10-23-async-idempotency-local-message-table.md
related:
  - wiki/concepts/idempotency-design.md
  - wiki/sources/mq-transaction-idempotency-design.md
  - wiki/sources/async-task-system-design.md
  - wiki/entities/rocketmq.md
---
# 异步链路幂等实战：本地消息表配套防重，解决重复扣款与消息重放

## Overview（概览）

基于商城大促重复扣券真实事故的复盘文：拆解异步链路重复流量的三大来源（本地消息表重试 / RocketMQ 重放 / 支付回调重试），对比四类幂等方案（唯一索引 / 幂等记录表 / 业务状态机 / Token）的取舍边界，给出「外层快速拦截、底层持久化兜底」的分层防护闭环。核心定调：重试是最终一致性方案赖以生存的基础，重试必然引入重复执行，幂等是整套最终一致性体系中不可分割的配套约束层。

## Key Facts（关键事实）

- 事故根因是分布式「不确定结果」问题：DB 事务提交后 ACK 丢包，应用判超时但事务已落地；本地消息表仍处待处理状态，定时任务重试导致重复扣券。放量 40 分钟触发对账告警，binlog 显示消息表标记成功但扣券执行两次。
- 异步重复流量三大来源均属系统自治产生（非用户重复点击），前端防抖、一次性 Token 完全无法拦截——这是异步幂等与同步接口幂等最核心的边界。
- 唯一索引短板：仅防新增写入，不防状态变更（UPDATE 不触发唯一冲突）；高并发下争抢同一索引记录产生行锁压力；分库分表下幂等记录须与业务数据同分片。
- 幂等记录表致命竞态：查询与写入非原子，两条重试请求同时判定记录不存在会双双执行；必须同事务+唯一索引兜底；须加 expire_time 离线归档防膨胀（半年可上亿）。
- 业务状态机幂等核心红线：状态校验与业务变更必须包裹在同一 DB 事务内，否则并发重试读到过期快照、先后进事务，行锁串行执行两次扣减。修复版把状态校验、扣减、消息状态更新全放进 `@Transactional`。
- 幂等键三要素：全局唯一、业务含义稳定、多次重试不变；错误选型是自增 ID / 本地随机串；外部传入 ID 须做合法性校验防恶意绕过。
- 幂等记录前置/后置写入的经典矛盾，解法是幂等记录、业务数据、消息状态同一本地事务提交——本地消息表天然满足，这是「本地消息表+状态机幂等」成为首选组合的根本原因。
- Redis 幂等缓存只做前置快速拦截：宕机/过期/闪断时查询异常会放行重复执行，绝不能作为唯一幂等数据源，必须数据库持久化兜底。
- 分层防护闭环：MQ 链路用 msgId+topic 幂等键+状态机校验（Redis 前置+DB 兜底）；支付回调用平台流水号+订单状态二次校验；本地消息重试用状态机+消息表联动。

## Important Claims（重要论断）

### Claim 1：重试与幂等共生，不可单独取舍

关闭重试可消灭重复执行，但直接引入消息丢失与数据不一致；重试是故障自愈，幂等是配套约束。幂等本质目标不是拦截请求，而是基于业务领域状态判断本次动作是否已持久化落地，已完成则跳过业务变更仅返回成功（信源定调）。

### Claim 2：状态校验脱离事务，并发场景必然竞态

故障版本代码把 `selectById` 放在事务之外，单测与普通流量看不出问题，只有大促并发重试才触发；两个重试线程都读到「未使用」先后扣减。核心红线是状态校验与业务变更同事务（信源复盘）。

## Concepts Introduced（引入的概念）

- [[idempotency-design|幂等设计]]（已立概念页）：四类方案取舍矩阵、幂等键设计、同事务铁律、分层防护闭环。

## Entities Mentioned（提及的实体）

- [[rocketmq|RocketMQ]]（主从切换消息重放是异步重复流量来源之一）

## Implications（影响／启示）

- 与 [[mq-transaction-idempotency-design]] 的「幂等判断+业务处理+幂等记录同事务」铁律完全互证：本篇给出违反该铁律的真实事故与代码对照，是同一不变量的事故侧证据（解读）。
- 「不确定结果」问题（ACK 丢失导致重试）与 [[async-task-system-design]] 的「至少一次执行下重复是常态」互为因果表述：网络不可靠 ⇒ 重试 ⇒ 幂等（解读）。

## Limitations（局限）

- 单一公众号信源，事故细节（时间、量级）未给出具体数字；四类方案对比无基准测试数据；建表 SQL 为 MySQL 方言。

## Related Knowledge（相关知识）

- [[idempotency-design|幂等设计（概念页）]]
- [[mq-transaction-idempotency-design|MQ 事务消息+业务幂等（信源页）]]
- [[async-task-system-design|异步任务系统设计（信源页）]]
- [[rocketmq|RocketMQ（实体页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-async-idempotency-local-message-table.md`
