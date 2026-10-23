---
id: 2026-10-22-rocketmq-advanced-reliability-idempotency
title: RocketMQ 进阶：消息可靠性、幂等、顺序消息、延时消息与高可用，一篇彻底搞懂
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/oG2MVFFHiLeMgeDimbyt-w
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - RocketMQ
  - 分布式事务
  - 工程实践
asset_ref: Assets/2026/10/rocketmq-advanced-reliability-idempotency.md
wiki_status: ingested
---

# RocketMQ 进阶：消息可靠性、幂等、顺序消息、延时消息与高可用，一篇彻底搞懂

> RocketMQ 进阶九问通关：可靠性三阶段保障、幂等四种落地方案、消息积压扩容策略、局部顺序选队列、Tag/SQL 过滤、18 级延时实现、半消息事务八步、死信队列、主从集群读写高可用。

## 核心要点

- **可靠性三阶段**：生产端靠 ACK 确认+失败重试；存储端靠 CommitLog 持久化+同步刷盘+主从同步复制；消费端**执行业务逻辑之后才确认**，靠消费位点重投兜底
- **幂等**：RocketMQ 只保证不丢不保证不重。消息携带业务唯一标识（雪花算法 64bit=1符号+41时间戳+10机器+12序列），消费端用 Redis 标志位（72h 过期）、DB 唯一索引、乐观锁 version / 悲观锁 FOR UPDATE 四道防线
- **消息积压**：Queue 数 > 消费者数 → 扩消费者；否则新建多 Queue 临时 Topic，转发迁移后扩容消费，再恢复原状
- **顺序消息**：全局顺序性能差，常用局部顺序——按业务键（如 orderId）`hashCode() % mqs.size()` 选队列；Broker 端对队列加锁保证单消费者串行处理
- **消息过滤**：Tag 过滤最常用、SQL 表达式更灵活、Filter Server 最复杂；一般用 Consumer 端过滤，求吞吐走 Broker 端
- **延时消息**：18 个固定级别（1s…2h），原理=临时存储+定时任务：先写 `SCHEDULE_TOPIC_XXXX` 对应等级队列，到期再投递到目标 Topic。典型场景：订单超时取消
- **事务消息**：半消息（暂不可投递）+ 二次确认 + 消息回查八步流程，Broker 超时未收到 Commit/Rollback 会主动回查 Producer 本地事务状态
- **死信队列**：重试达上限的消息进入，可重发或导出保存避免到期删除
- **高可用**：NameServer 无状态集群部署即可；Broker Master 读写、Slave 只读，Consumer 自动切 Slave 实现读高可用；写高可用靠 Topic 多 Queue 分布多个 Broker 组；Slave 不能自动升 Master，需手动改配置重启

## 正文

完整代码示例（幂等消费、乐观/悲观锁、选队列、SQL 过滤、延时发送）、雪花算法位结构详解与主从高可用配置说明见 [[Assets/2026/10/rocketmq-advanced-reliability-idempotency.md]]。

## 来源

- [RocketMQ 进阶：消息可靠性、幂等、顺序消息、延时消息与高可用，一篇彻底搞懂](https://mp.weixin.qq.com/s/oG2MVFFHiLeMgeDimbyt-w)

## 附件

- [[Assets/2026/10/rocketmq-advanced-reliability-idempotency.md]]
