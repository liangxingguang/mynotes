---
id: 2026-10-22-mq-transaction-idempotency-design
title: 消息队列架构设计（中篇）：事务消息、业务幂等，保障单据数据一致性
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/mR9XYzUnXQaEn2aW9X5nJA
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - 分布式事务
  - Kafka
asset_ref: Assets/2026/10/mq-transaction-idempotency-design.md
wiki_status: ingested
---

# 消息队列架构设计（中篇）：事务消息、业务幂等，保障单据数据一致性

> 大宗商品销采运储系统架构连载中篇。解决"数据库事务和消息发送的原子性"与"消息重复投递脏数据"两大难题：RocketMQ 事务消息保发送、业务幂等保消费，两板斧配合让单据流转不丢不重。

## 核心要点

- **问题本质**：DB 提交成功但消息发失败→下游单据断层；消息发成功但 DB 回滚→下游收到幽灵消息——普通消息无法保证原子性
- **事务消息流程**：半消息暂存 Broker → 执行本地事务 → Commit 转可消费/Rollback 删除；宕机时 Broker 主动**事务回查**，生产者查本地事务状态后回复——回查必须实现，是兜底机制
- **边界**：事务消息是最终一致非强一致，只适合核心单据异步联动，普通通知类事件别用（徒增复杂度）；本地事务要轻量避免长锁库
- **幂等三方案选型**：新增类单据→数据库唯一索引（简单强约束）；状态流转→业务状态机判断；跨服务复杂事件→独立幂等表（记消息 ID+业务单号，通用性最强）
- **幂等铁律**：幂等判断 + 业务处理 + 幂等记录写入放同一 DB 事务，防宕机导致幂等记录未落库
- **一句话**：事务消息保发送、业务幂等保消费；下篇预告：消息堆积、重试风暴、死信治理与监控告警

## 正文

全文流程与工程规范见 [[Assets/2026/10/mq-transaction-idempotency-design.md]]（原文部分代码块抓取缺失，要点已以文字整理）。

## 来源

- [微服务架构落地：消息队列架构设计（中篇）——事务消息、业务幂等，保障单据数据一致性](https://mp.weixin.qq.com/s/mR9XYzUnXQaEn2aW9X5nJA)

## 附件

- [[Assets/2026/10/mq-transaction-idempotency-design.md]]
