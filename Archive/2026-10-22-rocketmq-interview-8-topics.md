---
id: 2026-10-22-rocketmq-interview-8-topics
title: RocketMQ 面试连环炮：8 大核心题一篇讲透
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/0C8U2RrwoXbhzSy_Hl2jqw
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - RocketMQ
  - 分布式事务
  - 工程实践
asset_ref: Assets/2026/10/rocketmq-interview-8-topics.md
wiki_status: ingested
---

# RocketMQ 面试连环炮：8 大核心题一篇讲透

> RocketMQ 八模块通关地图：架构四组件、CommitLog+ConsumeQueue 存储、三种发送/消费模式、事务消息半消息+回查、刷盘与主从复制可靠性组合、At-Least-Once 幂等设计、消息堆积治理流程。每题按"标准答案→原理→生产坑点→加分项"展开。

## 核心要点

- **架构**：NameServer 无状态路由（不用 ZK，最终一致优先可用性）；Broker 主从存储；Producer 本地缓存路由+故障规避重试；Consumer 重平衡+Offset 持久化
- **存储**：所有 Topic 消息混存顺序写 CommitLog（≈600MB/s），ConsumeQueue 每队列 20 字节定长索引（物理偏移+大小+TagHash）；mmap 写 PageCache + sendfile 零拷贝读，哲学是"写时合并，读时分治"
- **事务消息**：半消息暂存 `RMQ_SYS_TRANS_HALF_TOPIC` 对消费者不可见 → 本地事务 → Commit/Rollback；异常时 Broker 定时回查（默认 60s 间隔、最多 15 次），`checkLocalTransaction` 必须幂等
- **可靠性矩阵**：同步刷盘+同步复制=零丢失但吞吐骤降；生产常用异步刷盘+同步复制折中；5.x DLedger（Raft）支持自动主从切换
- **重复消费必然**：生产重试/消费超时重投/Rebalance 三来源；幂等公式=唯一标识+状态判断+原子操作，推荐 Redis SETNX 前置去重 + DB 唯一索引兜底，幂等键用业务唯一键而非 msgId
- **堆积治理**：先定位（mqadmin consumerProgress）→ 止损（限流/跳坏消息）→ 治本（扩消费者≤队列数、批量/异步/瘦身消费逻辑）→ 兜底（死信+监控 diff 指标）
- **顺序消费**：ShardingKey 哈希到同一 Queue + 单线程+队列锁；全局有序吞吐极低不用，热点 Queue 是主要坑

## 正文

完整八模块详解、时序流程与代码示例见 [[Assets/2026/10/rocketmq-interview-8-topics.md]]。

## 来源

- [RocketMQ 面试连环炮：8 大核心题一篇讲透，背完直接反杀面试官](https://mp.weixin.qq.com/s/0C8U2RrwoXbhzSy_Hl2jqw)

## 附件

- [[Assets/2026/10/rocketmq-interview-8-topics.md]]
