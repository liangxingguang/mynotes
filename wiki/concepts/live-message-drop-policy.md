---
id: wiki-concept-live-message-drop-policy
type: concept
title: 直播消息丢弃策略
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - concept
  - im
  - live-streaming
  - messaging
sources:
  - raw/sources/architecture/2026-10-23-rongyun-million-online-live-message-distribution.md
  - raw/sources/architecture/2026-10-23-rongyun-live-chatroom-architecture-challenges.md
related:
  - wiki/concepts/read-fanout.md
  - wiki/topics/live-streaming-messaging.md
---
# 直播消息丢弃策略

## Definition（定义）

直播间海量消息分发中"有策略地丢消息"的一组机制：上行限速硬丢弃、下行环形队列淘汰 + "拉取中"标记柔性丢弃、优先级分桶 + 独立队列保证重要消息不丢。它与 IM 消息模型最根本的区别是：**IM 不允许丢消息，直播消息允许丢**——用可丢失性换客户端流畅与服务端稳定。

## Why It Matters（为什么重要）

百万在线直播间一条上行消息对应百万倍分发，且刷屏消息"大量用户同时段发送、内容基本相同"——全量分发既压垮服务端存储，又让客户端卡顿刷屏。丢弃策略与 [[read-fanout|通知合并拉取]] 一起，使海量消息的稳定流畅分发成为可能（融云双信源一致断言）。

## Core Characteristics（核心特征）

1. **上行限速（硬丢弃）**：单聊天室默认 200 条/秒（可配），超限消息在直播间服务直接丢弃，不再同步到消息服务节点。
2. **下行限速（柔性丢弃）**：消息存环形队列，队列满则淘汰最老消息；用户是否丢消息取决于其客户端拉取速度。
3. **"拉取中"标记**：下发通知后标记用户，2 秒内新消息不再重复通知（**丢通知不丢消息**，降低客户端压力）；超 2 秒继续通知，连续多次不拉取触发踢出。
4. **优先级三桶**：白名单（系统/管理通知）> 高 > 低，分桶存储、客户端按序拉取；高并发时低优先级先丢，白名单消息独立环形队列不丢。
5. **离线判定兜底**：30s 未拉取或累计 30 条未拉 → 判离线踢出并同步下线（白名单豁免），防止"死用户"占住分发资源。

## How It Works（运作方式）

上行：消息先到直播间服务校验 → 超 200 条/秒即弃。分发：直播间服务广播到消息服务 → 消息服务按环形队列缓存、通知合并后下发拉取通知 → 有"拉取中"标记且未超 2 秒则跳过本次通知。拉取：客户端携本地最大时间戳差量拉取，按白名单 > 高 > 低顺序取三个桶。客户端拉得快就不丢任何消息——丢弃压力被转移到"拉取速度"这个客户端可控变量上。

## Relationships（关系）

### Related Concepts（相关概念）

- [[read-fanout|读扩散（Fan-out on Read）]]：丢弃策略依附的运行底座——通知拉取 + 环形队列 + 位点差量拉取都是读扩散形态；读扩散解决"怎么分发"，丢弃策略解决"分发多少"。

### Distinctions（区分）

- 与 IM 必达模型的区别：IM 以"每成员投递记录"保证不丢（写扩散副本 / 读扩散位点兜底）；直播丢弃策略主动放弃部分消息的不达，只对白名单/高优先级保持必达语义。
- 与 [[mcast|长连接组播]]、[[cdn-broadcast-fanout|CDN 广播]] 的区别：后两者容忍的是"推 path 上的折损"（被动丢），本概念是"分级主动丢弃 + 必达子集保护"（策略丢）。

## Evolution（演进）

- 融云《直播系统聊天技术》第六篇（分发与丢弃策略，约 2020 年代初）→ 第七篇扩展为完整架构（优先级三桶、离线判定、客户端协同）。

## Open Questions（开放问题）

- 上行限速阈值（200 条/秒）的推导依据与不同业务（带货 vs 赛事）下的调参经验，信源未给。
- 迁移/扩缩容窗口期丢弃策略与纠偏逻辑的相互影响（迁移中消息是否可能漏发），信源未展开。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-rongyun-million-online-live-message-distribution.md`（一手实践：三级丢弃、200 条/秒、拉取中标记、独立环形队列）
- Source: `raw/sources/architecture/2026-10-23-rongyun-live-chatroom-architecture-challenges.md`（一手实践：优先级三桶、离线判定 30s/30 条、白名单豁免）

## Related Knowledge（相关知识）

- [[rongyun-million-online-live-message-distribution|融云：百万人在线的直播间实时聊天消息分发技术实践]]
- [[rongyun-live-chatroom-architecture-challenges|融云：直播间海量聊天消息的架构设计难点实践]]
- [[live-streaming-messaging|直播实时消息分发]]（主题）
