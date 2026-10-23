---
id: wiki-entity-rocketmq
type: entity
title: Apache RocketMQ
status: active
created: 2026-10-23
updated: 2026-10-24
confidence: high
tags:
  - entity
  - message-queue
  - distributed
sources:
  - raw/sources/architecture/2026-10-22-mq-message-backlog-solutions.md
  - raw/sources/architecture/2026-10-22-mq-transaction-idempotency-design.md
  - raw/sources/architecture/2026-10-22-rocketmq-advanced-reliability-idempotency.md
  - raw/sources/architecture/2026-10-22-rocketmq-interview-8-topics.md
  - raw/sources/architecture/2026-10-22-distributed-transaction-six-solutions.md
  - raw/sources/architecture/2026-10-23-netease-pigeon-message-bus-activity.md
related:
  - wiki/sources/mq-message-backlog-solutions.md
  - wiki/sources/mq-transaction-idempotency-design.md
  - wiki/sources/rocketmq-advanced-reliability-idempotency.md
  - wiki/sources/rocketmq-interview-8-topics.md
  - wiki/sources/distributed-transaction-six-solutions.md
  - wiki/sources/async-task-system-design.md
  - wiki/entities/pigeon-message-bus.md
---
# Apache RocketMQ

## Overview（概览）

阿里系开源的高性能分布式消息队列（后入 Apache，背景知识，信源未详述）。本库五个独立信源覆盖其运维（堆积治理）、一致性（事务消息+幂等）、机制全景、存储层与分布式事务谱系定位，构成本库证据最充分的实体之一。

## Identity（身份信息）

- Type（类型）: 开源分布式消息队列
- Organization（所属组织）: Apache 软件基金会（起源于阿里巴巴）
- Role（角色）: 大型项目业务事件管道——核心单据异步联动（事务消息）、延迟消息、高并发消费
- Status（状态）: 主流活跃（信源覆盖 4.x/5.x 用法）

## Important Facts（重要事实）

- 定位对照（堆积治理信源）：高性能、高可用、支持事务消息，适合大型项目；RabbitMQ 则轻量易用多协议、适合中小型项目；两者均有持久化/死信/延迟/优先级能力。
- 投递语义：**至少一次投递**——网络抖动、ACK 丢失、重平衡都会重复投递，业务幂等是必选项而非可选项（与 [[kafka]] "消费端幂等兜底"同一纪律）。
- 事务消息（差异化能力）：半消息暂存 Broker → 本地事务 → Commit/Rollback 决定消息生死；宕机未确认时 Broker 主动**事务回查**（分布式事务信源：默认 1 分钟周期，本质是把"扫描消息表"从业务方移到中间件）——解决"DB 事务与消息发送的原子性"，但最终一致非强一致，只适用核心单据场景；消费失败重试 3 次仍失败转人工介入（同信源：低频事件人工比自动回滚系统更可靠）。
- 消费模型：`ConsumeMode.CONCURRENTLY` 并发消费 + 抛异常自动重试；生产者 asyncSend 回调；延迟消息按 DELAY_TIME_LEVEL 分级。
- 运维面：DefaultMQAdminExt 可编程巡检 Broker 堆积；堆积治理三板斧（扩容/分流/清理）适用；Queue 数>消费者数才能靠扩消费者消化积压，否则须临时 Topic 迁移扩容。
- 可靠性三阶段（进阶信源）：生产端 ACK+重试、存储端 CommitLog 同步刷盘+主从同步复制、消费端**业务逻辑执行后才确认**（位点重投兜底）；幂等四防线——Redis 标志位/DB 唯一索引/乐观锁 version/悲观锁。
- 顺序与延时（进阶信源）：局部顺序按业务键 hash 选队列+Broker 队列加锁（与 [[kafka]] 按 key 分区同思想）；延时消息 18 固定级别，经 `SCHEDULE_TOPIC_XXXX` 暂存到期转投。
- 高可用边界（进阶+面试双信源）：NameServer 无状态（不用 ZK，最终一致优先可用性）；Broker Master 读写/Slave 只读，Consumer 自动切 Slave 读高可用；**4.x Slave 不能自动升 Master**（手动切换，对比 MySQL orc 是能力差距），**5.x 引入 DLedger（Raft）支持自动主从切换**——两信源口径经版本线对齐；生产可靠性常用"异步刷盘+同步复制"折中（同步刷盘+同步复制零丢失但吞吐骤降；异步复制 Master 宕机丢未同步消息，"很多线上事故的根源"）。
- 存储架构（面试信源）：CommitLog+ConsumeQueue+IndexFile 三层——所有 Topic 消息混存顺序追加 CommitLog（≈600MB/s，单文件 1GB 文件名即偏移），ConsumeQueue 每队列 20 字节定长索引（物理偏移+大小+TagHash），哲学"写时合并，读时分治"；mmap 写 PageCache+sendfile 零拷贝读，与 [[kafka]] 四板斧同源（对比：Kafka 按分区文件组织，RocketMQ 全混存——前者读更局部，后者写更极致）。

## Products / Projects（产品／项目）

- Spring Boot 集成：`rocketmq-spring-boot-starter`（`@RocketMQTransactionListener`、`sendMessageInTransaction`，信源示例）。

## Relationships（关系）

- 对照 RabbitMQ：轻量多协议 vs 高性能事务消息，按项目规模与一致性需求选型（堆积治理信源口径）。
- 对照 [[kafka|Kafka]]：同为高吞吐 MQ，Kafka 胜在日志流生态与吞吐极致，RocketMQ 胜在事务消息与业务场景开箱能力（解读，信源未直接对比）。
- 与 Outbox 模式（[[async-task-system-design]]）解决同一问题：DB+消息原子性——事务消息把回查责任交给 Broker，Outbox 把投递责任留给后台 Worker。
- 业务总线底座（信鸽信源）：网易云音乐 [[pigeon-message-bus|信鸽]] 选 RocketMQ（内部版 Nydus）做活动域异步履约分发，理由是 4 台 broker 同时坏 3 台概率极低、且履约链路大多不需要下游返回结果，相比 RPC 有"绝对的优势"；Provider 自动注册走顺序消息上报；顺序消息与 PushConsumer 在该场景构成接入闭环。

## Timeline（时间线）

- 2012 — 阿里巴巴开源（背景知识，信源未详述）
- 2017 — 进入 Apache 孵化器，后毕业为顶级项目（背景知识）

## Current Understanding（当前认知）

五个信源互补：堆积治理给运维视角，事务消息信源给一致性视角，进阶信源补机制全景，面试信源补存储层与 5.x DLedger 分水岭，分布式事务综述把事务消息放进"本地消息表→事务消息→对账"责任转移谱系定位。一致纪律：至少一次投递下幂等是必修课（幂等键用业务唯一键而非 msgId），事务消息只用于核心单据，写高可用 4.x 须计入 Slave 不可自动升主（5.x DLedger 解）（五信源互证，置信度高）。

## Evidence（证据）

- `raw/sources/architecture/2026-10-22-mq-message-backlog-solutions.md`（堆积治理/消费模型/运维巡检）
- `raw/sources/architecture/2026-10-22-mq-transaction-idempotency-design.md`（事务消息/回查/业务幂等）
- `raw/sources/architecture/2026-10-22-rocketmq-advanced-reliability-idempotency.md`（可靠性三阶段/幂等四防线/局部顺序/延时/HA）
- `raw/sources/architecture/2026-10-22-rocketmq-interview-8-topics.md`（CommitLog+ConsumeQueue 存储/事务回查参数/可靠性矩阵/5.x DLedger）
- `raw/sources/architecture/2026-10-22-distributed-transaction-six-solutions.md`（回查默认 1min/重试 3 次转人工/六方案谱系定位）
- `raw/sources/architecture/2026-10-23-netease-pigeon-message-bus-activity.md`（信鸽业务总线选型理由/顺序消息注册/PushConsumer 接入）
