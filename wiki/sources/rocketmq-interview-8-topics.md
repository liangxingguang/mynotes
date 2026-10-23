---
id: wiki-source-rocketmq-interview-8-topics
type: source
title: RocketMQ 面试连环炮：8 大核心题一篇讲透
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - rocketmq
  - message-queue
  - interview
  - storage
sources:
  - raw/sources/architecture/2026-10-22-rocketmq-interview-8-topics.md
related:
  - wiki/entities/rocketmq.md
  - wiki/sources/rocketmq-advanced-reliability-idempotency.md
  - wiki/sources/mq-transaction-idempotency-design.md
  - wiki/sources/kafka-fast-four-mechanisms.md
---
# RocketMQ 面试连环炮：8 大核心题一篇讲透

## Overview（概览）

RocketMQ 八模块通关地图：架构四组件、CommitLog+ConsumeQueue 存储、三种发送/消费模式、事务消息、刷盘与复制可靠性组合、幂等设计、堆积治理、顺序消费。每题按"标准答案→原理→生产坑点→加分项"展开。本信源的独特贡献是**存储层机制**与 **5.x DLedger** 分水岭。

## Key Facts（关键事实）

- 架构四组件：NameServer 无状态路由（不用 ZK，最终一致优先可用性）；Broker 主从存储；Producer 本地缓存路由+故障规避重试；Consumer 重平衡+Offset 持久化。
- 存储三层：CommitLog+ConsumeQueue+IndexFile。**所有 Topic 消息混存顺序追加到 CommitLog**（≈600MB/s 接近内存写），ConsumeQueue 每队列 20 字节定长索引（物理偏移 8B+大小+TagHash），寻址=一次索引读+一次数据读且都是顺序读；哲学"**写时合并，读时分治**"；CommitLog 单文件默认 1GB、文件名即起始偏移；mmap 写 PageCache + sendfile 零拷贝读——与 Kafka 四板斧同源。
- 事务消息：半消息暂存 `RMQ_SYS_TRANS_HALF_TOPIC` 对消费者不可见 → 本地事务 → Commit/Rollback；Broker 定时回查（默认 60s 间隔、最多 15 次），`checkLocalTransaction` 必须幂等。
- 可靠性矩阵：同步刷盘+同步复制=零丢失但吞吐骤降；**生产常用异步刷盘+同步复制折中**；同步复制要求至少一个 Slave 同步成功才 ACK，Slave 全宕 Master 拒写；异步复制下 Master 宕机丢未同步消息——"很多线上事故的根源"。
- **4.x/5.x 分水岭**：4.x Slave 不能自动升 Master 需手动；5.x 引入 DLedger 模式（Raft）支持自动主从切换。
- 幂等：重复消费三来源（生产重试/消费超时重投/Rebalance）；幂等公式=唯一标识+状态判断+原子操作；推荐 Redis SETNX 前置去重+DB 唯一索引兜底，**幂等键用业务唯一键而非 msgId**。
- 堆积治理流程：先定位（mqadmin consumerProgress）→ 止损（限流/跳坏消息）→ 治本（扩消费者≤队列数、批量/异步/瘦身）→ 兜底（死信+监控 diff 指标）。
- 顺序消费：ShardingKey 哈希到同一 Queue + 单线程+队列锁；全局有序吞吐极低不用，热点 Queue 是主要坑。

## Important Claims（重要论断）

### Claim 1：写时合并，读时分治

写入全部合并到单一 CommitLog 换顺序写极限，读取按队列分治索引换定位效率——存储设计的总纲（信源）。

## Concepts Introduced（引入的概念）

（无——存储哲学与 [[kafka-fast-four-mechanisms]] 顺序写+PageCache+零拷贝互证，未立新页）

## Entities Mentioned（提及的实体）

- [[rocketmq|RocketMQ]]（第 4 信源）

## Implications（影响／启示）

- CommitLog 混存 vs Kafka 按分区文件：两种"顺序写"组织方式，前者写更极致、后者读更局部——同原理不同取舍（解读）。

## Limitations（局限）

- 面试文体，部分数字（600MB/s）为经验口径；5.x DLedger 细节未展开。

## Related Knowledge（相关知识）

- [[rocketmq|RocketMQ（实体页）]]
- [[rocketmq-advanced-reliability-idempotency|RocketMQ 进阶九问（信源页）]]
- [[mq-transaction-idempotency-design|MQ 事务消息与幂等（信源页）]]
- [[kafka-fast-four-mechanisms|Kafka 四板斧（信源页）]]（顺序写/PageCache/sendfile 同源对照）

## Source（信源）

- `raw/sources/architecture/2026-10-22-rocketmq-interview-8-topics.md`
