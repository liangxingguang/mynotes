---
id: 2026-10-22-distributed-transaction-six-solutions
title: 分布式事务最全图解（6种方案）：从强一致的2PC到最终对账
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/iefb1PSKWHDdfnE_QKDwIQ
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - 分布式系统
  - 工程实践
  - 分布式事务
asset_ref: Assets/2026/10/distributed-transaction-six-solutions.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-23T01:33:20.352Z"
ingest_claim_id: 46876-1792719200352-0
---

# 分布式事务最全图解（6种方案）：从强一致的2PC到最终对账

> 分布式事务六种方案的完整梳理：2PC（及致命伤）、本地消息表、RocketMQ 事务消息、TCC、事务状态表+补偿、同步双写+异步对账。从强一致到最终一致，覆盖从理论到落地的全路径。

## 核心要点

- **2PC**：准备+提交两阶段，MySQL Redo/Binlog 一致性即内部 2PC。五大致命伤——同步阻塞持锁性能差、协调者宕机全体卡在 prepare（需人工 `XA RECOVER`）、部分参与者收不到 commit 致不一致、悬置事务恢复复杂、不适合无状态进程模型，互联网高并发基本不用
- **本地消息表**：业务写库+写消息表同事务保原子性，后台任务重传 MQ 保不丢；消费端 ACK 机制防丢失+判重表（与写库同事务）防重复，合起来实现"不漏不重"的最终一致
- **RocketMQ 事务消息**：发送拆 Prepare/Confirm 两阶段，半消息先暂存；MQ 定期（默认 1min）回查未确认消息问发送方发或取消——本质是把"扫描消息表"从业务方移到中间件；消费失败重试 3 次仍失败则人工介入（低频事件人工比自动回滚系统更可靠）
- **TCC**：支付宝提出的应用层 2PC，Try（资源检查+锁定）/Confirm（提交）/Cancel（回滚）；Confirm/Cancel 必须幂等，重试由 TCC 框架执行而非业务方
- **事务状态表+补偿**：全局事务 ID 落盘，状态 Begin→End；后台任务扫描超时未 End 的事务按幂等重调，多次失败转 Error 人工干预；同步调用部分成功只能告知用户"稍后再确认"
- **同步双写+异步对账**：以一个库为基准写成功即返回，其余靠对账补齐——三层对账：异步消息对账（部分成功即发消息补差）、全量定时对账（每晚）、增量对账（按更新时间）；另需监控"超时停留在中间态"的对象做补偿

## 正文

全文流程详解见 [[Assets/2026/10/distributed-transaction-six-solutions.md]]。

## 来源

- [分布式事务最全图解（6种方案）：从强一致的2PC到最终对账，彻底搞懂数据一致性](https://mp.weixin.qq.com/s/iefb1PSKWHDdfnE_QKDwIQ)

## 附件

- [[Assets/2026/10/distributed-transaction-six-solutions.md]]
