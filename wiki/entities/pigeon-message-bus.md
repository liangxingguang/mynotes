---
id: wiki-entity-pigeon-message-bus
type: entity
title: 信鸽（Pigeon）
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - entity
  - message-queue
  - live-streaming
sources:
  - raw/sources/architecture/2026-10-23-netease-pigeon-message-bus-activity.md
related:
  - wiki/entities/rocketmq.md
  - wiki/concepts/message-bus.md
---
# 信鸽（Pigeon）

## Overview（概览）

网易云音乐大直播活动中台的实时消息总线服务，解决直播活动系统的模块灵活组合（异步履约分发）与消息治理问题。业务模块完成任务后把数据发给信鸽，信鸽按"信鸽 ID"查路由配置，经 [[rocketmq|RocketMQ]]（云音乐内部版 Nydus）异步投递到下一个接入子系统。

## Identity（身份信息）

- Type（类型）: 业务消息总线 / 履约分发服务
- Organization（所属组织）: 网易云音乐大直播活动中台技术团队
- Role（角色）: 活动域模块组合的"哑管道"——配置化路由 + topic 治理收拢
- Status（状态）: 内部系统（信源 2026-10 仍活跃演进，规划国际化机房路由与 FaaS 承载）

## Important Facts（重要事实）

- 只做"履约"一侧：解决异步场景的分发问题，不做 adapter 式组合集成；稳定流程走 Pipeline 编排，流水线末端挂信鸽节点。
- 架构四层面：履约能力（代码结束后的末端触发）、SDK 接入（Spring 容器建 bean 时自动创建 PushConsumer 监听「fly」）、全局标识字典（userId/anchorId 统一命名，禁止 uid/aid 等私造字段）、Provider 自动注册（注解扫描 + 启动+定时顺序消息上报，自动激活免人工介入）。
- 异步投递依赖 RocketMQ，失败备份存储 + 定时步长重试；选 MQ 而非 RPC 的理由是 4 台 broker 同时坏 3 台概率极低，且大部分链路不需要下游返回结果。
- 消息治理三场景：业务自定义分发（清洗后转发）、注册上报自动分发（tag 区分防单类消息饿死）、消息存储（礼物等重要消息批量写 TiDB 供回放，大部分不需要读）。
- receiver 按配置动态在 Spring 容器创建 consumer bean，新接入 topic 不改信鸽代码；转发关系研发自助管理、可配存活周期，活动结束后减少空转消费；转发失败存 exception 表重试。
- 容量数据：32 台 8U16G 容器支撑 300 万条/分钟、CPU 约 45%；纯转发吃 CPU，4U8G→8U16G 吞吐翻倍；写 TiDB 链路独立部署单独压测（批量写会拖垮整体吞吐）；线上消息量极限评估 100 万条/分钟，按压测结果集分区间扩缩容。

## Products / Projects（产品／项目）

- Nydus：云音乐版 [[rocketmq|RocketMQ]] 管控平台，信鸽的消息底座。

## Relationships（关系）

- 底座依赖 [[rocketmq|Apache RocketMQ]]（投递、顺序消息注册上报）。
- 是 [[message-bus|业务消息总线]] 概念的实例（example-of）。
- 与 ESB 的区分：忽略协议转换、不做中心化同步集成（见 [[message-bus]] 的 Distinctions）。

## Timeline（时间线）

- 2026-10-23 — 架构文章发布（52im 系列第 10 篇），信源所述系统已承载直播活动业务

## Current Understanding（当前认知）

单一信源（一手团队自述），无外部印证。系统价值已被团队内部验证（活动组合从写胶水代码变为配置路由）；作者自认转发方案非最优解，展望消息回放修数据、国际化机房路由、FaaS+BaaS 承载消息清洗。

## Evidence（证据）

- `raw/sources/architecture/2026-10-23-netease-pigeon-message-bus-activity.md`
