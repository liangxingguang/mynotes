---
id: wiki-source-vivo-live-im-message-architecture
type: source
title: vivo直播系统中IM消息模块的架构实践
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - im
  - live-streaming
  - messaging
sources:
  - raw/sources/architecture/2026-10-23-vivo-live-im-message-architecture.md
related:
  - wiki/concepts/live-message-drop-policy.md
  - wiki/concepts/gain-message.md
  - wiki/topics/live-streaming-messaging.md
---
# vivo直播系统中IM消息模块的架构实践

## Overview（概览）

vivo 互联网技术团队（LinDu、Li Guolin）对秀场直播 IM 消息模块一年演进的总结：推拉结合架构（短轮询 + TCP 长连接）、Redis SortedSet 消息存储、接入层 so 插件热更新、块消息匀速分发、三策略消息丢弃与增益消息自愈。

## Key Facts（关键事实）

- 直播间客户端每秒只能渲染 15~20 条消息，是消息分级分发的物理约束。
- 短轮询：客户端每 2s 携带 roomId + timestamp 游标轮询，每次返回 10~15 条并回传最新时间戳；vivo 直播日轮询 10+ 亿次。
- 轮询间隔按房间人数动态配置（百人级 1.5s / 千人级 2s / 万级 2.5s），经配置中心实时下发。
- 消息存储用 Redis SortedSet，按业务分四桶 key：`live::roomId::gift|chat|notify|pk`，score = 消息时间戳。
- 超高热度直播间物理隔离到指定 Redis Cluster 集群（"VIP"服务）。
- protobuf 编码平均每消息节省 43% 字节，缓解机房出口带宽瓶颈。
- 块消息：以直播间为维度每 1~2s 匀速聚合分发，每秒 10~20 条，超出按优先级丢弃或延到下一消息块。
- 大直播间大于 30 万同时在线；成员管理有固定分片 vs 动态分片两种取舍。

## Important Claims（重要论断）

### Claim 1：消息分级是直播 IM 与社交 IM 的本质区别

微信/QQ 中每条消息优先级基本相同；直播间消息必须分优先级（礼物 > 公屏、大额 > 小额、高等级用户 > 匿名），因为客户端渲染能力存在硬上限。

### Claim 2：接入层热更新避免发布断连

连接维护、账号管理等基础逻辑入主程序，业务逻辑以 so 插件嵌入，改业务只重载插件，长连接不受影响（发布重启会导致大量外网设备重连）。

### Claim 3：过期时间戳必须服务端校验

客户端退后台恢复后会携带极旧 timestamp，导致 Redis 慢查、连接无法释放、轮询接口批量超时——服务端必须校验并拒绝过期时间戳。

### Claim 4：增益消息优于增量消息

状态类消息（如 PK 比分）应发全量快照（22:10）而非增量（2:0），网络颤抖或前置消息被丢弃时业务可自愈。

## Concepts Introduced（引入的概念）

- [[gain-message|增益消息（全量快照自愈）]]
- 块消息（Block Message，匀速聚合分发，未单独立页）
- [[live-message-drop-policy|直播消息丢弃策略]]（第三信源印证 + 新增"丢老消息"维度）

## Entities Mentioned（提及的实体）

- vivo 互联网技术团队（未单独立页）

## Implications（影响／启示）

- 为 [[live-streaming-messaging|直播实时消息分发]] 主题补齐"短轮询"路线：此前图谱只有通知拉取 / 长连接推 / CDN 广播，vivo 证明纯短轮询（日 10+ 亿次）也是可运营的生产路线。
- SortedSet 四桶按业务分 key 的设计，让优先级丢弃可直接落到存储层。

## Limitations（局限）

- 单一厂商自述，无横向基准；轮询量级（10+ 亿次/日）对应的机房成本未披露。
- SortedSet vs List 的对比在原文中以图呈现，抓取稿未含图内容。

## Related Knowledge（相关知识）

- [[live-streaming-messaging|直播实时消息分发]]（主题）
- [[live-message-drop-policy|直播消息丢弃策略]]
- [[gain-message|增益消息（全量快照自愈）]]
- [[websocket-heartbeat-reconnect|WebSocket 心跳保活与断线重连]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-vivo-live-im-message-architecture.md`
