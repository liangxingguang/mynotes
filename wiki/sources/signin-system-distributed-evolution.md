---
id: wiki-source-signin-system-distributed-evolution
type: source
title: 从 0 到 1 亿：Spring Boot 签到打卡系统的分布式架构演进与生产级避坑指南
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - redis
  - architecture
  - reliability
  - kafka
sources:
  - raw/sources/architecture/2026-10-22-signin-system-distributed-evolution.md
related:
  - wiki/concepts/durable-execution.md
  - wiki/sources/async-task-system-design.md
  - wiki/sources/business-risk-control-redis-lua-annotation.md
  - wiki/sources/mq-transaction-idempotency-design.md
---
# 从 0 到 1 亿：Spring Boot 签到打卡系统的分布式架构演进与生产级避坑指南

## Overview（概览）

以 1 亿账户、500 万日签到、30K QPS 峰值的内容 App 签到系统为案例的生产级方案：Redis 按日期+用户分桶 Bitmap 做热判定，DB Command Outbox 做恢复锚点，Stream+Dispatcher+Kafka 做异步投递，签到/积分双 Ledger 唯一键幂等，配故障复盘与压测清单。

## Key Facts（关键事实）

- 数据权威性分层：Redis 位图/streak/Stream 均可重建、**非权威**；`signin_command`（命令锚点）、`signin_ledger`（签到事实）、`point_ledger`（奖励事实）才是权威账本。
- 分桶 Bitmap：1 亿用户按日期+1024 桶分布 Key（约 12KB/桶/日）；**必须用注册时分配的稠密 `uid_index` 作 offset，绝不能用 Snowflake ID，且 offset 永不复用**。
- 原子签到 Lua：同 Slot 三 Key（bitmap/streak/stream）一次 Lua 完成 SETBIT 旧值判定+streak 状态机+XADD；streak 状态机拒绝 `date < lastDate` 的迟到请求，防零点乱序回退。
- Command Outbox：Lua 只保证原子不保证持久——先落 `signin_command` 再调 Redis，Redis 成功但应用崩溃靠对账补标，Stream 被裁剪也有 DB 扫描器兜底重投。
- Dispatcher：Stream 消费组批量读 → Kafka 异步批量发送 → 成功回调才 XACK；XAUTOCLAIM 接管宕机 worker，**绝不逐条同步 send().get()**。
- 奖励幂等：事件携带 `ruleVersion`+确定金额，每笔奖励独立 `awardBizId` 唯一索引，重复消费 100 次只入账一次；签到与奖励分开落账（签到事实与奖励事实分离）。
- 故障复盘：Kafka 中断 20 分钟，签到接口不受影响（返回 PROCESSING），恢复后补投靠唯一键幂等不多发；**Redis 全失可从 Ledger 重建**。
- 附 8 项压测清单与全链路可观测指标（pending age、对账 gap）。

## Important Claims（重要论断）

### Claim 1：先分清谁是权威账本，再谈缓存与队列

Redis/Kafka/Stream 都可重建，DB Ledger 才是事实；一切恢复设计（对账/重投/重建）都从这一分层推出（信源纲领）。

## Concepts Introduced（引入的概念）

- Command Outbox（先落命令锚点再调外部系统，崩溃对账补标）——与 [[durable-execution]] 的 OUTBOUND_INTENT/出网三段式同构（第 5 个同构印证，未并入 sources）。

## Entities Mentioned（提及的实体）

- [[kafka|Kafka]]（异步投递通道+故障复盘对象）；Redis（Bitmap/Stream/Lua 三重用法）

## Implications（影响／启示）

- "签到"这个看似简单的业务被做到 1 亿规模，用的是全套可靠性兵器：Outbox、幂等键、对账、状态机——与异步任务系统信源、事务消息信源互为印证（解读）。
- 稠密 uid_index 分桶 Bitmap 是亿级用户布尔判定的事实标准解法（解读）。

## Limitations（局限）

- 单一团队方案文，无开源实现；压测清单数值为其环境口径。

## Related Knowledge（相关知识）

- [[durable-execution|持久执行（概念页）]]
- [[async-task-system-design|异步任务系统设计（信源页）]]
- [[business-risk-control-redis-lua-annotation|Redis+Lua 风控组件（信源页）]]
- [[mq-transaction-idempotency-design|MQ 事务消息与幂等（信源页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-22-signin-system-distributed-evolution.md`
