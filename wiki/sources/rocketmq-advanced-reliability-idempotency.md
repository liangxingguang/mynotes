---
id: wiki-source-rocketmq-advanced-reliability-idempotency
type: source
title: RocketMQ 进阶：消息可靠性、幂等、顺序消息、延时消息与高可用，一篇彻底搞懂
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - rocketmq
  - message-queue
  - reliability
  - idempotency
sources:
  - raw/sources/architecture/2026-10-22-rocketmq-advanced-reliability-idempotency.md
related:
  - wiki/entities/rocketmq.md
  - wiki/sources/mq-transaction-idempotency-design.md
  - wiki/sources/mq-message-backlog-solutions.md
---
# RocketMQ 进阶：消息可靠性、幂等、顺序消息、延时消息与高可用，一篇彻底搞懂

## Overview（概览）

RocketMQ 进阶九问通关文：可靠性三阶段保障、幂等四种落地、积压扩容、局部顺序、Tag/SQL 过滤、18 级延时原理、半消息事务八步、死信队列、主从集群高可用。与前两个 RocketMQ 信源构成"机制面试向"第三视角。

## Key Facts（关键事实）

- 可靠性三阶段：生产端 ACK 确认+失败重试；存储端 CommitLog 持久化+同步刷盘+主从同步复制；消费端**执行业务逻辑之后才确认**，靠消费位点重投兜底。
- 幂等：RocketMQ 只保证不丢不保证不重；消息携带业务唯一标识（雪花算法 64bit=1 符号+41 时间戳+10 机器+12 序列），消费端四道防线——Redis 标志位（72h 过期）、DB 唯一索引、乐观锁 version、悲观锁 FOR UPDATE。
- 积压扩容：Queue 数 > 消费者数→扩消费者；否则新建多 Queue 临时 Topic，转发迁移后扩容消费再恢复（与堆积治理信源"分流"互证）。
- 顺序消息：全局顺序性能差，常用局部顺序——按业务键（如 orderId）`hashCode() % mqs.size()` 选队列，Broker 端对队列加锁保单消费者串行（与 Kafka 按 key 分区同思想）。
- 过滤：Tag 最常用、SQL 表达式更灵活、Filter Server 最复杂；一般用 Consumer 端过滤，求吞吐走 Broker 端。
- 延时消息：18 个固定级别（1s…2h），原理=临时存储+定时任务——先写 `SCHEDULE_TOPIC_XXXX` 等级队列，到期再投递目标 Topic；典型场景订单超时取消。
- 事务消息：半消息+二次确认+回查八步（与事务幂等信源流程互证）。
- 死信队列：重试达上限进入，可重发或导出保存避免到期删除。
- 高可用：NameServer 无状态集群；Broker Master 读写、Slave 只读，Consumer 自动切 Slave 实现读高可用；写高可用靠 Topic 多 Queue 分布多 Broker 组；**Slave 不能自动升 Master，需手动改配置重启**（对比 MySQL orc 自动切换，是明显能力差距）。

## Important Claims（重要论断）

### Claim 1：RocketMQ 只保证不丢，不保证不重

可靠性三阶段解决"不丢"；重复必须业务侧幂等兜底——四道防线按场景选（信源口径，与事务幂等信源"至少一次投递"互证）。

## Concepts Introduced（引入的概念）

（无——局部顺序/幂等防线均与既有信源互证，未立新页）

## Entities Mentioned（提及的实体）

- [[rocketmq|RocketMQ]]（第 3 信源）

## Implications（影响／启示）

- "业务键 hash 选队列"与 Kafka `key=deviceId` 分区是同一招：把顺序需求降级为"局部顺序"换吞吐（解读）。
- Slave 不可自动升主意味着 RocketMQ 写可用性依赖人工或外部编排——选型时须计入（解读）。

## Limitations（局限）

- 面试通关文体，机制描述精简；雪花算法等通用知识与 RocketMQ 本体关联弱。

## Related Knowledge（相关知识）

- [[rocketmq|RocketMQ（实体页）]]
- [[mq-transaction-idempotency-design|MQ 事务消息与幂等（信源页）]]
- [[mq-message-backlog-solutions|MQ 消息堆积治理（信源页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-22-rocketmq-advanced-reliability-idempotency.md`
