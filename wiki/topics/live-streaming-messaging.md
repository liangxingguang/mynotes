---
id: wiki-topic-live-streaming-messaging
type: topic
title: 直播实时消息分发
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: medium
tags:
  - topic
  - im
  - live-streaming
  - messaging
sources:
  - raw/sources/architecture/2026-10-23-rongyun-million-online-live-message-distribution.md
  - raw/sources/architecture/2026-10-23-rongyun-live-chatroom-architecture-challenges.md
  - raw/sources/architecture/2026-10-23-alibaba-ecommerce-im-group-live.md
  - raw/sources/architecture/2026-10-23-baidu-live-mcast-message-architecture.md
  - raw/sources/architecture/2026-10-23-meipai-live-danmu-realtime-push.md
  - raw/sources/architecture/2026-10-23-netease-live-danmu-cdn-broadcast.md
  - raw/sources/architecture/2026-10-23-vivo-live-im-message-architecture.md
  - raw/sources/architecture/2026-10-23-wechat-live-chatroom-15m-online.md
---
# 直播实时消息分发

## Scope（范围）

直播间弹幕/聊天/礼物/点赞等海量实时互动消息的分发架构：百万至千万级同时在线、无人数上限的聊天室场景。不含传统 IM 单聊/群聊（见 [[read-fanout|读扩散]]/[[write-fanout|写扩散]]），但二者共享技术模型——直播聊天室本质是"超大规模聊天室"。

## Current Understanding（当前认知）

直播消息与 IM 最根本的区别是**允许有策略地丢消息**：刷屏消息大量重复、价值密度低，全达既压垮服务端又让客户端卡顿。各厂路线由此分化为"拉"与"推"两大阵营：

- **通知拉取（读扩散）**：融云——通知合并 + 客户端位点拉取 + 三级丢弃 + 优先级三桶；阿里直播互动消息同走读扩散（读写混合）。
- **长轮询（longpolling）**：微信——读扩散 + 无状态 cache（recvsvr 通知异步拉取 + 1s 兜底轮询），明确拒绝 WebSocket（推会丢需拉兜底、在线列表难维护、短连客户端简单）；重要信令同表打标 + cache 内 normal/important 双 seq 零丢失；proxy 层 hold 柔性控流（400w 压测请求量降 58%）；大房间加白走 vip sect 流量隔离。
- **短轮询（HTTP 拉）**：vivo——2s 间隔 + timestamp 游标，Redis SortedSet 四桶存储，日轮询 10+ 亿次，间隔按房间人数动态下发；超高热房间物理隔离 VIP Redis 集群。
- **长连接推送**：百度 mcast（groupID 下沉长连接层两级扩散）、美拍（Redis 关系 + 长连接推拉结合）、vivo 长连接侧（接入层 so 热更新 + 块消息匀速分发，每秒 10~20 条）。
- **下行外包 CDN**：网易云信把弹幕下行伪装成视频流/静态文件交给 CDN 边缘，源站只扛上行。

共性工程手段：一致性哈希落点汇聚行为、环形队列缓存、"拉取中/聚合/合并"类降频机制、重要消息（系统/管理通知）独立通道保必达（融云优先级三桶 / 微信同表打标双 seq 两种实现）、状态类消息用 [[gain-message|增益消息]] 全量快照兜底丢包（vivo）、超高热房间物理/逻辑隔离（vivo VIP Redis 集群 / 微信 vip sect 加白）、统计类需求用 [[hyperloglog|HyperLogLog]] 等概率结构换空间（微信历史在线）。

## Key Concepts（关键概念）

- [[read-fanout|读扩散（Fan-out on Read）]]
- [[live-message-drop-policy|直播消息丢弃策略]]
- [[gain-message|增益消息（全量快照自愈）]]
- [[mcast|长连接组播（mcast）]]
- [[cdn-broadcast-fanout|CDN 广播（弹幕下行）]]

## Key Entities（关键实体）

- [[rongyun|融云]]（通知拉取 + 丢弃策略）
- [[pigeon-message-bus|信鸽（Pigeon）]]（网易云音乐直播活动消息总线）

## Important Decisions（重要决策）

（暂无）

## Major Developments（重大进展）

- 阿里电商 IM：直播互动消息走读写扩散混合，双 11 盖楼群 500ms 端到端（2020 实践）
- 百度：mcast 单实例 25w 连接 8w QPS，聚合 + 压缩消化峰值
- 网易云信：千万级在线下行改道 CDN 广播
- 融云：百万在线聊天室 200 台消息服务 × 5000 人，丢弃策略体系化（上/下行限速 + 优先级三桶）
- vivo：推拉结合（短轮询日 10+ 亿次 + 长连接），消息分级的物理根源定位为客户端渲染上限（15~20 条/秒），增益消息抗丢包自愈
- 微信：单房间 1500w 在线（压测），longpolling 9 亿请求/min 量级靠 proxy 柔性控流消化；在线统计拆 key + 异步聚合落盘，历史在线 tablekv+HLL 阈值混用（>1w 准确率 >95%）

## Disagreements（分歧）

- **丢 vs 不丢**：IM 阵营（微信/钉钉群聊）坚持消息必达；直播阵营普遍接受策略性丢弃。同一公司不同业务线立场不同（阿里群内消息必达、直播互动消息可降级；微信群聊写扩散必达、直播聊天室读扩散且只保重要信令零丢失）。
- **拉 vs 推**：融云/阿里走通知拉取，微信走 longpolling 拉并论证推模式（WebSocket）三宗罪，百度/美拍/网易云信走长连接推或 CDN 拉——信源各自论证己方场景最优，无跨厂商基准对比。

## Open Questions（开放问题）

- 各路线在同一负载模型下的成本/延迟横评缺失（信源均为各厂自述）。
- 直播间"连麦/多人互动"场景下消息必达要求上升后，丢弃策略如何收紧，信源未展开。

## Related Topics（相关主题）

- [[system-design-core-components|系统设计核心组件]]
