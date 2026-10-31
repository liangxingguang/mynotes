---
id: wiki-source-distributed-transaction-six-solutions
type: source
title: 分布式事务最全图解（6种方案）：从强一致的2PC到最终对账
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - distributed
  - transaction
  - consistency
sources:
  - raw/sources/architecture/2026-10-22-distributed-transaction-six-solutions.md
related:
  - wiki/sources/mq-transaction-idempotency-design.md
  - wiki/entities/rocketmq.md
  - wiki/concepts/durable-execution.md
  - wiki/sources/async-task-system-design.md
  - wiki/concepts/local-message-table.md
---
# 分布式事务最全图解（6种方案）：从强一致的2PC到最终对账

## Overview（概览）

微信公众号图解长文：分布式事务六方案全谱——2PC（及五大致命伤）、本地消息表、RocketMQ 事务消息、TCC、事务状态表+补偿、同步双写+异步对账，从强一致到最终一致覆盖理论到落地全路径。

## Key Facts（关键事实）

- **2PC**：准备+提交两阶段，MySQL Redo/Binlog 一致性即内部 2PC。五大致命伤：同步阻塞持锁性能差；协调者宕机全体卡在 prepare（需人工 `XA RECOVER`）；部分参与者收不到 commit 致不一致；悬置事务恢复复杂；不适合无状态进程模型——互联网高并发基本不用。
- **本地消息表**：业务写库+写消息表同事务保原子性，后台任务重传 MQ 保不丢；消费端 ACK 防丢 + 判重表（与写库同事务）防重，合起来"不漏不重"的最终一致。
- **RocketMQ 事务消息**：发送拆 Prepare/Confirm 两阶段，半消息先暂存；MQ 定期（**默认 1 分钟**）回查未确认消息问发送方发或取消——本质是把"扫描消息表"从业务方移到中间件；**消费失败重试 3 次仍失败转人工介入**（作者观点：低频事件人工比自动回滚系统更可靠）。
- **TCC**：支付宝提出的应用层 2PC——Try（资源检查+锁定）/Confirm（提交）/Cancel（回滚）；Confirm/Cancel 必须幂等，重试由 TCC 框架执行而非业务方。
- **事务状态表+补偿**：全局事务 ID 落盘，状态 Begin→End；后台扫描超时未 End 的事务按幂等重调，多次失败转 Error 人工干预；同步调用部分成功只能告知用户"稍后再确认"。
- **同步双写+异步对账**：以一个库为基准写成功即返回，其余靠对账补齐——三层对账：异步消息对账（部分成功即发消息补差）、全量定时对账（每晚）、增量对账（按更新时间）；另需监控"超时停留中间态"的对象做补偿。

## Important Claims（重要论断）

### Claim 1：互联网场景的最终一致谱系是"本地消息表 → 事务消息 → 对账"的责任转移

同一问题（DB 与消息的原子性）的三种解法差别只在责任放哪：业务方自己扫表、中间件回查、或事后对账补齐；强一致 2PC 因阻塞与可用性代价被高并发场景放弃（信源综述立场）。

## Concepts Introduced（引入的概念）

（无——六方案均为业界既有模式，未立新页）

## Entities Mentioned（提及的实体）

- [[rocketmq|Apache RocketMQ]]（事务消息机制第 5 信源：回查默认 1min、重试 3 次转人工）
- MySQL XA（Redo/Binlog 内部 2PC，提及）、支付宝（TCC 提出方，提及）

## Implications（影响／启示）

- "事务状态表+补偿"与 [[durable-execution]] 的"状态落盘+后台恢复"完全同构，是该概念在事务领域的又一印证（解读）。
- 三层对账（异步消息/全量定时/增量）可直接套用到任何双写场景的最终一致兜底设计（解读）。

## Limitations（局限）

- 图解综述文，各方案给到流程级而非参数级细节；TCC 框架选型未展开。

## Related Knowledge（相关知识）

- [[mq-transaction-idempotency-design|事务消息+业务幂等（信源页）]]（RocketMQ 方案落地细部）
- [[async-task-system-design|异步任务系统设计（信源页）]]（Outbox 与本地消息表同族）
- [[durable-execution|持久化执行（概念页）]]（状态表+补偿的概念抽象）

## Source（信源）

- `raw/sources/architecture/2026-10-22-distributed-transaction-six-solutions.md`
