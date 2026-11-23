---
id: wiki-source-im-read-receipt-high-concurrency
type: source
title: 【新文导读】详解IM消息已读未读功能的高并发技术实现
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - im
  - architecture
  - messaging
  - high-concurrency
sources:
  - raw/sources/architecture/2026-11-23-im-read-receipt-high-concurrency.md
related:
  - wiki/concepts/im-read-receipt-cursor.md
  - wiki/sources/im-websocket-reconnect-heartbeat.md
  - wiki/sources/nginx-websocket-million-connections.md
---
# 【新文导读】详解IM消息已读未读功能的高并发技术实现

## Overview（概览）

52im.net（即时通讯网）发布的「新文导读」：针对 IM 单聊场景的已读未读功能，从生产环境视角拆解一套可水平扩展、可容灾、可演进的架构实现。核心主张：已读未读不是 UI「小红点」，而是横跨长连接、消息顺序、状态一致性、在线路由与高并发存储的系统工程。本篇为导读版（20 节目录 + 前半核心论述），完整代码示例与链路细节在 52im.net thread-4929 全文。

## Key Facts（关键事实）

- 单机 Demo 与生产环境的落差：消息写库 → 未读数 +1 → 标记已读 → 通知发送人四步在生产中因分布式连接、异步流转、乱序上报、重复投递、扩展性、可恢复性六重挑战而失效。
- 生产级核心目标五条：正确性优先（已读位置单调递增不回退）、顺序性可控、写路径异步化 + 热点状态缓存化、网关无状态可水平扩展、故障下可收敛（允许最终一致但保证最终正确）。
- 单聊「已读」至少有三种常见定义，作者建议优先采用「按会话维护已读游标（read cursor）」：每会话每参与人只维护一个 `last_read_message_seq`，序号 ≤ 游标即视为已读，客户端只上报读到哪条而非逐条 ACK。
- 游标模型四优势：状态量从消息数降到会话数；天然支持 ACK 合并避免 ACK 风暴；更新逻辑天然幂等适合 MQ 重试；适合与 Redis、Kafka、MySQL 组合架构。
- 网关职责边界：WebSocket 网关第一职责是快速收包、轻量校验、异步投递、快速回写；复杂事务、多表查询、长时间阻塞、高冲突状态更新不应落在网关，否则同时失去连接承载能力、扩容弹性与故障隔离能力。
- 数据模型：`im_conversation`（`msg_seq` 会话内单调递增、`client_msg_id` 发送幂等、`uk_conv_seq` 序号唯一）+ `im_conversation_read_cursor` 已读游标表。
- 存储分工原则：Redis 负责快（只承担高频读写缓存状态，不当最终事实源）、MySQL 负责准、Kafka 负责解耦与削峰。
- 关键原理：游标推进比逐条更新更稳；已读推进用 Lua 保证原子性与幂等；推送不做全网关广播、尽量精准投递；未读数缓存不是事实源，修正机制必须存在。
- 落地场景：电商客服单聊；架构演进路径从 1 万连接到百万在线；全文含 19 篇 IM 技术参考文献，完整版在 http://www.52im.net/thread-4929-1-1.html 。

## Important Claims（重要论断）

### Claim 1：已读未读的难点在系统工程而非功能本身

生产环境已读未读的复杂度来自分布式连接（发送方与接收方在不同网关）、消息异步流转（写库/推送/ACK/未读更新不在同一事务）、客户端乱序上报、系统须抗重复（Kafka 重投、客户端重发、网关重连）与可恢复（节点宕机、Redis 抖动、消费回溯不能打乱状态）。

### Claim 2：语义定义不清是后期返工的根因

很多系统后期返工不是因为代码写错，而是因为「已读」语义定义不清；单聊生产系统应优先选择会话级已读游标语义。

### Claim 3：游标推进优于逐条更新

「游标推进」比「逐条更新」更稳——状态量从消息数降到会话数，更新天然幂等，配合 Lua 保证原子性，适配 MQ 重试与乱序上报。

## Concepts Introduced（引入的概念）

- [[im-read-receipt-cursor]]

## Entities Mentioned（提及的实体）

- 无独立实体页（52im.net 作为信源出处，未单设实体页；相关长连接实践见 [[nginx-websocket-million-connections]] 与 [[im-websocket-reconnect-heartbeat]]）

## Implications（影响／启示）

- 解读：IM 类功能的设计起点应先定义状态语义与一致性目标，再选存储与链路；网关保持无状态、状态计算外置是水平扩展与故障隔离的前提。
- 解读：未读数等缓存指标必须配修正机制，缓存只能加速不能充当事实源，与「Redis 负责快、MySQL 负责准」的分工原则互为表里。

## Limitations（局限）

- 本篇为公众号「导读版」，采集稿仅含引言、目录、难点分析、语义选型、解耦原则与数据模型要点；完整代码示例、消息发送链路、Lua 实现、精准投递与未读数修正机制细节在 thread-4929 全文，未采集。
- 文中「已读的三种常见定义」仅有图示占位，另两种定义的具体形态在采集稿中不可见。
- 单信源、无其他实践印证；作者为 52im.net 社区技术文章，非官方文档，置信度中。

## Related Knowledge（相关知识）

- [[im-read-receipt-cursor|IM 已读未读：会话级已读游标模型]]
- [[im-websocket-reconnect-heartbeat|IM聊天不掉线？生产级WebSocket断线重连、心跳保活实战]]
- [[nginx-websocket-million-connections|百万 WebSocket 长连接背后的 Nginx 架构设计与踩坑实录]]
- [[read-fanout|读扩散（Fan-out on Read）]]

## Source（信源）

- `raw/sources/architecture/2026-11-23-im-read-receipt-high-concurrency.md`
