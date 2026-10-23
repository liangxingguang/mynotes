---
id: wiki-source-rongyun-million-online-live-message-distribution
type: source
title: 融云：百万人在线的直播间实时聊天消息分发技术实践
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - source
  - im
  - live-streaming
  - messaging
sources:
  - raw/sources/architecture/2026-10-23-rongyun-million-online-live-message-distribution.md
related:
  - wiki/concepts/live-message-drop-policy.md
  - wiki/concepts/read-fanout.md
  - wiki/entities/rongyun.md
---
# 融云：百万人在线的直播间实时聊天消息分发技术实践

## Overview（概览）

融云技术团队在 52im.net 连载《直播系统聊天技术》第六篇（原题"聊天室海量消息分发之消息丢弃策略"），基于单直播间百万用户在线的实践，给出直播间实时消息分发的架构模型与三级丢弃策略。与第七篇（[[rongyun-live-chatroom-architecture-challenges|架构设计难点]]）互为上下篇。

## Key Facts（关键事实）

- 架构两服务分离：直播间服务缓存房间元数据（用户列表/禁言/白名单）、**不缓存消息内容**；消息服务缓存用户关系与消息队列（环形队列）
- 落点：直播间服务按直播间 ID、消息服务按用户 ID，均经 Zookeeper 注册信息计算；Redis 作二级缓存与重启备份
- 分发模式：通知 + 拉取（读扩散形态），**通知合并**——待通知队列去重，下发线程一轮只向同一用户发一个通知
- 上行限速默认 200 条/秒，超限消息在直播间服务直接丢弃、不再同步
- 下行靠环形队列长度控制，满则淘汰最老消息；"拉取中"标记 2 秒内不重发通知（丢通知不丢消息）
- 重要消息：白名单/优先级 + 独立环形队列保证不丢弃
- 消息是否被丢弃取决于客户端拉取速度；连续多次通知未拉取触发踢出

## Important Claims（重要论断）

### 直播消息允许有策略地丢，这是与 IM 最大的不同

IM 不允许丢消息；直播间大量重复刷屏消息"没有太多实际意义"，用上行硬丢弃 + 下行柔性丢弃换客户端流畅与服务端稳定。丢弃策略与通知合并一起，使海量消息的稳定流畅分发成为可能。

### 通知合并天然适合 Actor 模型

大消息量下通知合并（一轮一用户一通知）适合用 Actor 分布式算法实现（信源为 PS 附注，未展开）。

## Concepts Introduced（引入的概念）

- [[live-message-drop-policy|直播消息丢弃策略]]
- [[read-fanout|读扩散（Fan-out on Read）]]（通知拉取形态）

## Entities Mentioned（提及的实体）

- [[rongyun|融云]]

## Implications（影响／启示）

直播消息系统设计的第一性问题是"哪些消息可以不达"，而不是"如何保证全达"；优先级分桶 + 独立队列把"必达"收窄到小集合，其余交给限速与淘汰。

## Limitations（局限）

厂商自述实践，无第三方验证；未给单机分发 QPS、通知延迟等量化指标；"200 条/秒"为默认值而非实测推导。

## Related Knowledge（相关知识）

- [[rongyun-live-chatroom-architecture-challenges|融云：直播间海量聊天消息的架构设计难点实践]]（下篇）
- [[live-streaming-messaging|直播实时消息分发]]（主题）

## Source（信源）

- `raw/sources/architecture/2026-10-23-rongyun-million-online-live-message-distribution.md`
