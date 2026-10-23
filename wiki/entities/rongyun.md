---
id: wiki-entity-rongyun
type: entity
title: 融云
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: medium
tags:
  - entity
  - im
  - live-streaming
sources:
  - raw/sources/architecture/2026-10-23-rongyun-million-online-live-message-distribution.md
  - raw/sources/architecture/2026-10-23-rongyun-live-chatroom-architecture-challenges.md
---
# 融云

## Overview（概览）

融云（RongCloud）是即时通讯云服务厂商。本 Wiki 仅通过其技术团队在 52im.net 连载的《直播系统聊天技术》两篇一手实践（第六、七篇）认识它：单直播间百万用户在线的实时消息分发与直播聊天室架构。

## Identity（身份信息）

- Type（类型）: 公司 / IM 云服务厂商
- Organization（所属组织）: 未知（信源未给出公司主体细节）
- Role（角色）: 直播聊天室/IM PaaS 提供方
- Status（状态）: 活跃（2026 年仍有技术输出）

## Important Facts（重要事实）

- 直播聊天室架构：连接层 / Redis 存储层 / 业务层（聊天室服务 + 消息服务）三层，多可用区部署跨机房容灾
- 百万在线房间拆分口径：200 台消息服务 × 各约 5000 人
- 上行限速默认 200 条/秒；离线判定 30s 未拉取或累计 30 条未拉
- 技术输出渠道：52im.net《直播系统聊天技术》系列连载（第六篇分发与丢弃策略、第七篇架构难点）

## Products / Projects（产品／项目）

- 直播聊天室（聊天室服务 + 消息服务分离架构，含自定义属性同步能力）

## Relationships（关系）

- 同赛道实践：百度（[[mcast|长连接组播]]）、美拍（[[meipai-live-danmu-realtime-push|弹幕实时推送]]）、网易云信（[[cdn-broadcast-fanout|CDN 广播]]）——融云路线是"通知拉取读扩散 + 丢弃策略"，与上述推式路线形成对照（见 [[live-streaming-messaging|主题页]]）。

## Timeline（时间线）

- 2026-10-23 — 本 Wiki 收录其《直播系统聊天技术》第六、七篇（52im.net 转载修订版）

## Current Understanding（当前认知）

融云的直播消息方案是读扩散阵营的代表：不追求消息必达，靠"通知合并 + 拉取 + 三级丢弃 + 优先级三桶"在海量刷屏场景保服务端稳定与客户端流畅。其扩缩容设计（渐进迁移 + 消息路径纠偏 + 销毁前归属校验）体现"强业务性服务平滑变更"的工程取向。

## Evidence（证据）

- `raw/sources/architecture/2026-10-23-rongyun-million-online-live-message-distribution.md`
- `raw/sources/architecture/2026-10-23-rongyun-live-chatroom-architecture-challenges.md`
