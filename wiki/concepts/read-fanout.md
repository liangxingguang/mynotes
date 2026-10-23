---
id: wiki-concept-read-fanout
type: concept
title: 读扩散（Fan-out on Read）
status: active
created: 2026-10-23
updated: 2026-10-24
confidence: high
tags:
  - concept
  - architecture
  - im
  - messaging
sources:
  - raw/sources/architecture/2026-10-23-alibaba-ecommerce-im-group-live.md
  - raw/sources/architecture/2026-10-23-im-group-chat-write-fanout-cost.md
  - raw/sources/architecture/2026-10-23-rongyun-million-online-live-message-distribution.md
  - raw/sources/architecture/2026-10-23-rongyun-live-chatroom-architecture-challenges.md
related:
  - wiki/concepts/write-fanout.md
  - wiki/concepts/mcast.md
  - wiki/concepts/notification-system-design.md
  - wiki/concepts/live-message-drop-policy.md
  - wiki/sources/alibaba-ecommerce-im-group-live.md
  - wiki/sources/meipai-live-danmu-realtime-push.md
---
# 读扩散（Fan-out on Read）

## Definition（定义）

群消息投递的架构模式：消息在服务端**只存一份**（写入会话维度的消息队列），成员读取时按订阅关系从会话队列**拉取/同步**各自缺失的区间。与 [[write-fanout|写扩散]] 互为对偶：写扩散"写时复制"（每成员一份副本），读扩散"读时聚合"（一份数据多人共享读）。

## Why It Matters（为什么重要）

写扩散的扩散比是 1:N，DB 写入能力直接决定消息上行上限（阿里实测：120w/s DB 写入仅支撑 3K/s 群消息上行）。读扩散把非个性化消息的扩散比压到 1:1，是大规模群（万人群）与强互动场景（双 11 盖楼群）下突破写入瓶颈的主路径；代价从"写放大"转移为"架构复杂度 + 读路径成本"。

## Core Characteristics（核心特征）

1. **可行性前提：消息可分类**。非个性化消息（全员可见，阿里群内占 99.99%）才只写一条；个性化消息（进群欢迎语等单边消息）仍走写扩散——落地形态因此是**读写扩散混合**而非纯读扩散。
2. **会话队列 + 位点同步**：群会话消息队列用自增 syncId 保序；客户端存储各队列同步位点（去中心化），下行推拉结合。
3. **差值检洞、区间补齐**：服务端 syncId − 客户端 syncId = 1 表示无空洞；否则客户端携位点回云端拉取区间数据，达到最终一致。
4. **会话级优先级**：同步队列按会话维度组织，天然支持会话级同步优先级与差异化服务（写扩散的用户队列混排做不到）。
5. **成本转移**：写压力消失，转为架构复杂度（维护动态会话队列、端侧实时感知新增队列）与冷启动多读 QPS（启动时分散读多个会话队列）。

## Structure（结构）

发送 → 写一条进群会话消息队列（syncId 自增）→ 端侧按订阅的会话队列持位点推拉同步 → 差值检洞 → 区间拉取补齐 → 端侧呈现。

## How It Works（运作方式）

阿里混合模式（2020 双 11 实践）：非个性化消息读扩散、个性化消息写扩散，云端一体化数据同步；覆盖几千万互动群用户，做到一条上行消息 500ms 内到达群内其他端侧。钉钉（万人群）整体转读扩散 + 多级缓存；过渡期系统常用静态分流——群创建时按规模标记走写扩散或读扩散，而非每次扇出动态判断。

融云直播聊天室形态（百万在线实践）：聊天室服务校验后广播到消息服务，消息服务**通知合并**（待通知队列去重，一轮只向同一用户发一个通知）后下发拉取通知；客户端携本地最大时间戳差量拉取（首拉传 0 取最近 50 条），消息存环形队列。位点用"最后一条消息时间戳"而非阿里 syncId，语义相同。与 IM 读扩散的关键差异：叠加 [[live-message-drop-policy|丢弃策略]]，位点拉取不再保证"最终全量补齐"。

## Relationships（关系）

### Related Concepts（相关概念）

- [[write-fanout|写扩散（Fan-out on Write）]]：对偶模式，混合落地时的另一半。

### Dependencies（依赖项）

- 端侧同步协议（位点存储、推拉结合、差值检洞）：读扩散把一致性职责下沉到客户端同步层。

### Distinctions（区分）

- 与 [[write-fanout|写扩散]] 的区别在于「读时聚合 vs 写时复制」：读扩散拿架构复杂度与读聚合成本换存储/写入的极致节省；写扩散拿写放大换读路径简单与每成员投递记录（已读回执、撤回、离线补全的天然载体）。群规模与消息个性化比例是选型主变量。
- 与 [[mcast|长连接组播]] 的区别在于「拉 vs 推」：读扩散由端侧持位点拉取补齐；mcast 由长连接层主动推、容忍折损。美拍的「告知→毫秒级等待→拉取→推」订阅推送模型是二者混合的长连接形态（见 [[meipai-live-danmu-realtime-push|美拍信源]]）。
- 站内通知场景的应用见 [[notification-system-design|站内消息系统领域模型]]：公告/提醒按订阅关系拉取（读扩散实例），私信发送即写接收者队列（写扩散实例）——推拉按「消息类型」而非「群规模」划分。

## Evolution（演进）

- 阿里：2018 双 11 盖楼活动暴露写扩散瓶颈（120w/s 写入 → 3K/s 上行）→ 演进出读写扩散混合模式（2020 双 11，500ms 端到端）。
- 行业分化（二次信源断言）：钉钉转读扩散 + 多级缓存；微信坚持写扩散；企业微信写扩散 + 硬件堆料。
- 融云（一手实践）：直播聊天室读扩散 + 通知合并 + 时间戳位点差量拉取；为适配直播"允许丢消息"语义叠加三级丢弃策略（2026-10 收录）。

## Open Questions（开放问题）

- 已读回执、消息撤回等强依赖"每成员投递记录"的能力，在读扩散下的实现形态（已读 bitmap 聚合等）两信源均未展开。
- 冷启动多读 QPS 的具体量级与缓存对策，信源只指出压力存在、未给数字。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-alibaba-ecommerce-im-group-live.md`（一手实践：同步模型、99.99% 前提、混合模式、500ms 指标、优缺点清单）
- Source: `raw/sources/architecture/2026-10-23-im-group-chat-write-fanout-cost.md`（二次分析：钉钉读扩散选型、规模分档中的读扩散切换点、静态分流策略）
- Source: `raw/sources/architecture/2026-10-23-rongyun-million-online-live-message-distribution.md`（一手实践：通知合并机制、环形队列、拉取流程）
- Source: `raw/sources/architecture/2026-10-23-rongyun-live-chatroom-architecture-challenges.md`（一手实践：通知拉取流程、时间戳位点、首拉 50 条与退出清库）

## Related Knowledge（相关知识）

- [[alibaba-ecommerce-im-group-live|阿里电商IM消息平台在群聊、直播场景下的技术实践]]
- [[im-group-chat-write-fanout-cost|IM千人群聊该不该用消息写扩散？详细算算成本账！]]
- [[rongyun-million-online-live-message-distribution|融云：百万人在线的直播间实时聊天消息分发技术实践]]
- [[rongyun-live-chatroom-architecture-challenges|融云：直播间海量聊天消息的架构设计难点实践]]
- [[live-streaming-messaging|直播实时消息分发]]（主题）
