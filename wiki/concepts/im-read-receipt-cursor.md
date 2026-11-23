---
id: wiki-concept-im-read-receipt-cursor
type: concept
title: IM 已读未读：会话级已读游标模型
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - concept
  - im
  - architecture
  - messaging
sources:
  - raw/sources/architecture/2026-11-23-im-read-receipt-high-concurrency.md
related:
  - wiki/sources/im-read-receipt-high-concurrency.md
  - wiki/concepts/read-fanout.md
  - wiki/concepts/notification-system-design.md
  - wiki/sources/im-websocket-reconnect-heartbeat.md
  - wiki/sources/nginx-websocket-million-connections.md
---
# IM 已读未读：会话级已读游标模型

## Definition（定义）

IM 单聊（1:1）场景的已读未读实现范式：**不逐条标记消息已读，而是按会话为每个参与人维护一个「已读游标（read cursor）」**——每个会话（conversation）对每个参与人只维护一个 `last_read_message_seq`，消息序号 ≤ 游标即视为已读，客户端只上报「我已经读到了哪一条」而非逐条 ACK。

该功能本质是横跨长连接、消息顺序、状态一致性、在线路由与高并发存储的系统工程，而非 UI 层「小红点」功能。

## Why It Matters（为什么重要）

已读未读是 IM 的标配能力，但生产级实现面临六重挑战：连接分布式（发送方与接收方落在不同网关）、消息异步流转（写库/推送/ACK/未读更新不在同一事务）、客户端乱序上报、系统须抗重复（Kafka 重投、客户端重发、网关重连）、须可扩展（不能把已读状态压死在数据库行锁上）、须可恢复（节点宕机、Redis 抖动、消费回溯不能打乱状态）。

语义定义不清是后期返工的常见根因（信源论断：很多系统返工不是因为代码写错，而是因为语义定义不清）。游标模型把状态量从「消息数」压到「会话数」，是单聊场景下同时满足正确性、幂等与可扩展性的主流选型。

## Core Characteristics（核心特征）

1. **生产级目标五条**：正确性优先（已读位置单调递增、不能回退）；顺序性可控（同一会话内消息与回执的业务顺序可推导）；高并发可承载（写路径异步化、热点状态缓存化）；系统可水平扩展（网关无状态、业务服务无会话粘性依赖）；故障下可收敛（允许最终一致，但保证最终正确）。
2. **语义选型**：单聊「已读」至少有三种常见定义，生产系统优先采用会话级已读游标；语义先行，再谈存储与链路。
3. **游标模型四优势**：状态量从消息数降到会话数；天然支持 ACK 合并、避免 ACK 风暴；更新逻辑天然幂等、适合 MQ 重试；便于与 Redis、Kafka、MySQL 组合架构。
4. **角色解耦**：WebSocket 网关只承担快速收包、轻量校验、异步投递、快速回写；消息写库、未读计算、回执推送拆为独立角色。解读：网关承担过多业务会同时失去连接承载能力、扩容弹性与故障隔离能力。
5. **数据模型**：`im_conversation` 会话消息表（`msg_seq` 会话内单调递增、`client_msg_id` 发送幂等防客户端重试产生重复消息、`uk_conv_seq` 保证同会话序号唯一）+ `im_conversation_read_cursor` 已读游标表。
6. **存储分工**：Redis 负责快（只承担在线路由等高频读写缓存状态，**不当最终事实源**）、MySQL 负责准、Kafka 负责解耦与削峰。
7. **推进与投递原则**：游标推进比逐条更新更稳；已读推进用 Lua 保证原子性与幂等；推送不做全网关广播、尽量精准投递；未读数缓存不是事实源，修正机制必须存在。

## Structure（结构）

```text
客户端上报读到的最大序号
        ↓
WebSocket 网关（快速收包/轻量校验/异步投递/快速回写，无业务状态）
        ↓
状态计算服务（已读推进：Lua 原子幂等更新会话级游标）
        ↓
存储分层：Redis（缓存，非事实源）+ MySQL（事实源：会话表 + 读游标表）+ Kafka（解耦削峰、异步流转）
        ↓
回执推送（精准投递到目标网关，非全网关广播）
        ↓
未读数缓存（配修正机制，周期性/事件触发对账收敛）
```

## How It Works（运作方式）

1. **语义确立**：按会话维护游标，序号 ≤ 游标即已读；客户端上报「读到哪条」替代逐条 ACK——从机制上消除乱序上报与 ACK 风暴的影响。
2. **消息落库**：消息写入 `im_conversation`，会话内 `msg_seq` 单调递增；`client_msg_id` 保证发送幂等；`uk_conv_seq` 保证序号唯一。
3. **已读推进**：收到上报后推进 `last_read_message_seq`，用 Lua 脚本保证「读游标更新 + 未读计数」的原子性与幂等，可安全承受 Kafka 重投、客户端重发、网关重连造成的重复处理。
4. **状态收敛**：读游标以 MySQL 为事实源，Redis 只缓存在线路由与高频读写状态；未读数缓存出现偏差时由修正机制对账收敛，保证最终正确。
5. **回执投递**：已读通知精准投递到接收方所在网关，不做全网关广播，避免连接规模放大推送开销。

## Relationships（关系）

### Related Concepts（相关概念）

- [[read-fanout|读扩散（Fan-out on Read）]]：群消息投递模式，与本模型场景不同但互补；读扩散的开放问题（已读回执在读扩散下的实现形态）本信源未覆盖。
- [[notification-system-design|站内消息系统领域模型]]：站内通知的已读标记（isRead）是轻量形态；本模型针对实时 IM 单聊的高并发场景，复杂度与一致性要求显著更高。
- [[idempotency-design|幂等设计]]：游标推进的天然幂等与 Lua 原子更新是幂等设计在 IM 状态更新场景的具体实例（解读）。

### Dependencies（依赖项）

- 会话内消息序号机制（`msg_seq` 单调递增 + 唯一约束）——游标模型的语义前提。
- 长连接层（[[websocket-heartbeat-reconnect|心跳保活与断线重连]]为上报链路提供可达性，经 [[im-websocket-reconnect-heartbeat]] 信源印证）。

### Distinctions（区分）

- 与 [[read-fanout|读扩散]] 的区分：本模型面向单聊会话、按参与人维护游标、状态量与会话数同阶；读扩散面向群消息投递、按会话队列同步位点，是投递模式而非已读状态模型。
- 与逐条 ACK 模型的区分：逐条 ACK 状态量随消息数线性增长、易现 ACK 风暴且对乱序敏感；游标模型以「位置」替代「逐条记录」，用单调性换取状态压缩与幂等。

## Evolution（演进）

- 信源给出架构演进路径：从 1 万连接到百万在线的分层演进（具体阶段与容量指标在 thread-4929 全文，采集稿未含）。
- 落地场景：以电商客服单聊为真实场景，覆盖高并发优化（瓶颈通常不在直觉处）、故障时状态回收、容器化云原生部署（细节同上，在全文）。

## Open Questions（开放问题）

- 「已读」的其他两种常见定义（除游标外）的具体形态：信源称至少三种，但采集稿中仅有图示占位，细节未展开。
- 完整实现细节未采集：生产级代码示例、消息发送链路、Lua 已读推进脚本、未读数修正机制、精准投递实现均在 52im.net thread-4929 全文，本页仅收录导读层结论；如需深化可后续采集该帖。
- 群聊场景的已读回执（读扩散下的实现形态，如已读 bitmap 聚合）不在本信源范围内，见 [[read-fanout]] 开放问题。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-23-im-read-receipt-high-concurrency.md`（52im.net 公众号导读文：生产目标五条、三种已读定义与游标选型、四优势、网关职责、数据模型、Redis/MySQL/Kafka 分工、Lua 原子幂等与未读数修正原则；完整细节在 thread-4929 全文未采集）

## Related Knowledge（相关知识）

- [[im-read-receipt-high-concurrency|【新文导读】详解IM消息已读未读功能的高并发技术实现]]（信源页）
- [[read-fanout|读扩散（Fan-out on Read）]]
- [[notification-system-design|站内消息系统领域模型]]
- [[im-websocket-reconnect-heartbeat|IM聊天不掉线？生产级WebSocket断线重连、心跳保活实战]]
- [[nginx-websocket-million-connections|百万 WebSocket 长连接背后的 Nginx 架构设计与踩坑实录]]
