---
id: 2026-10-22-mq-message-backlog-solutions
title: RabbitMQ vs RocketMQ，消息堆积了怎么办？一线解决方案全解析！
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/nXNdub_DSqJSnf73PWLLRg
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - 工程实践
  - Kafka
asset_ref: Assets/2026/10/mq-message-backlog-solutions.md
wiki_status: pending
---

# RabbitMQ vs RocketMQ，消息堆积了怎么办？一线解决方案全解析！

> 消息堆积（生产快于消费导致队列积压）的排查与解决指南：分别给出 RabbitMQ 与 RocketMQ 的消费者/队列/生产者优化代码，以及应急处理三板斧（临时扩容、消息分流、消息清理），并按电商/金融/内容三类业务场景给出差异化策略。

## 核心要点

- **选型差异**：RabbitMQ 轻量易用、多协议，适合中小型项目；RocketMQ 高性能高可用、支持事务消息，适合大型项目
- **RabbitMQ 侧**：消费者并发度 `concurrency="5-10"` + 手动 ack + 异步处理；队列配优先级/TTL/死信交换机；死信队列按 retry-count 头重试（<3 次）否则记永久失败
- **RocketMQ 侧**：`ConsumeMode.CONCURRENTLY` 并发消费 + 抛异常自动重试；生产者 asyncSend 回调 + 延迟消息（DELAY_TIME_LEVEL）；用 DefaultMQAdminExt 巡检 Broker 堆积
- **应急三板斧**：① 临时扩容（加消费者实例/提并发/简化逻辑）② 消息分流（新队列、多消费组、优先级）③ 消息清理（TTL 过期清理、手动删除、归档）
- **分场景策略**：电商订单/库存/支付消息不可堆积需高优先级+事务，物流可容忍延迟；金融交易/风控实时性极高，对账/通知可批量异步；内容系统行为/统计消息可批量容忍延迟
- **监控告警**：盯队列长度、消费延迟、消费者状态、错误率四项指标，阈值告警；附简易管理端点（stats/clean）
- **常见坑**：消费者并发配置不当、业务逻辑过重、网络延迟、资源不足、监控缺失

## 正文

全文代码与配置见 [[Assets/2026/10/mq-message-backlog-solutions.md]]。

## 来源

- [RabbitMQ vs RocketMQ，消息堆积了怎么办？一线解决方案全解析！](https://mp.weixin.qq.com/s/nXNdub_DSqJSnf73PWLLRg)

## 附件

- [[Assets/2026/10/mq-message-backlog-solutions.md]]
