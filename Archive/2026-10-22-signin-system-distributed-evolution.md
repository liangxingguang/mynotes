---
id: 2026-10-22-signin-system-distributed-evolution
title: 从 0 到 1 亿：Spring Boot 签到打卡系统的分布式架构演进与生产级避坑指南
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/Ig7Y4uOQWzBe97p51udlHQ
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - 分布式系统
  - 工程实践
  - Kafka
asset_ref: Assets/2026/10/signin-system-distributed-evolution.md
wiki_status: ingested
---

# 从 0 到 1 亿：Spring Boot 签到打卡系统的分布式架构演进与生产级避坑指南

> 以 1 亿账户、500 万日签到、30K QPS 峰值的内容 App 签到系统为案例，给出生产级方案：Redis 按日期+用户分桶 Bitmap 做热判定，DB Command Outbox 做恢复锚点，Stream+Dispatcher+Kafka 做异步投递，签到/积分双 Ledger 唯一键幂等，配故障复盘与压测清单。

## 核心要点

- **数据权威性分层**：Redis 位图/streak/Stream 均可重建、非权威；`signin_command`（命令锚点）、`signin_ledger`（签到事实）、`point_ledger`（奖励事实）才是权威账本
- **分桶 Bitmap**：1 亿用户按日期+1024 桶分布 Key（约 12KB/桶/日）；必须用注册时分配的稠密 `uid_index` 作 offset，绝不能用 Snowflake ID，且 offset 永不复用
- **原子签到 Lua**：同 Slot 三 Key（bitmap/streak/stream）一次 Lua 完成 SETBIT 旧值判定+streak 状态机+XADD；streak 状态机拒绝 `date < lastDate` 的迟到请求，防零点乱序回退
- **Command Outbox**：Lua 只保证原子不保证持久——先落 `signin_command` 再调 Redis，Redis 成功但应用崩溃靠对账补标，Stream 被裁剪也有 DB 扫描器兜底重投
- **Dispatcher**：Stream 消费组批量读 → Kafka 异步批量发送 → 成功回调才 XACK；XAUTOCLAIM 接管宕机 worker，绝不逐条同步 send().get()
- **奖励幂等**：事件携带 `ruleVersion`+确定金额，每笔奖励独立 `awardBizId` 唯一索引，重复消费 100 次只入账一次；签到与奖励分开落账
- **故障复盘**：Kafka 中断 20 分钟，签到接口不受影响（返回 PROCESSING），恢复后补投靠唯一键幂等不多发；Redis 全失可从 Ledger 重建
- **附 8 项压测清单**与全链路可观测指标（pending age、对账 gap 等）

## 正文

完整演进路径（MySQL 唯一索引 → Redis 热状态 → 分桶 Bitmap + Outbox）、Lua 脚本、建表 SQL、Kubernetes/HPA 配置与故障矩阵见 [[Assets/2026/10/signin-system-distributed-evolution.md]]。

## 来源

- [从 0 到 1 亿：Spring Boot 签到打卡系统的分布式架构演进与生产级避坑指南](https://mp.weixin.qq.com/s/Ig7Y4uOQWzBe97p51udlHQ)

## 附件

- [[Assets/2026/10/signin-system-distributed-evolution.md]]
