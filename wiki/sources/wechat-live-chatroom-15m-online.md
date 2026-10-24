---
id: wiki-source-wechat-live-chatroom-15m-online
type: source
title: 微信直播聊天室单房间1500万在线的消息架构演进之路
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
  - raw/sources/architecture/2026-10-23-wechat-live-chatroom-15m-online.md
related:
  - wiki/topics/live-streaming-messaging.md
  - wiki/concepts/read-fanout.md
  - wiki/concepts/hyperloglog.md
---
# 微信直播聊天室单房间1500万在线的消息架构演进之路

## Overview（概览）

微信后台团队（kellyliang）一手复盘：视频号直播聊天室组件从 1.0（2017 年，服务微信电竞直播间）到 2.0 的架构演进，目标是单房间支撑 1500w 同时在线——"把 13 亿人拉个群"的工程回答。核心链路：读扩散 + longpolling + 无状态 cache（recvsvr）；2.0 解四个痛点：重要信令丢失、在线统计单点、历史在线统计缺失、请求量不可控。

## Key Facts（关键事实）

- 选型读扩散的依据：直播聊天室与微信标准群聊（写扩散）差异巨大，且同一人同一时间只关注一个聊天室。
- 不用 WebSocket 的三条理由：推模式可能丢、不丢仍需拉模式兜底；推模式需精确维护每刻在线列表，难度大；longpolling 本质是短连，客户端简单。
- 无状态 cache recvsvr 五件套：实时通知→异步拉取；1s 兜底轮询（防通知失效 + 启动自恢复）；读写表分离原子切换无锁读；sect 化扩容分摊。
- 重要信令丢失根因：recvsvr 只保留最近 2000 条，大直播间消息未收即被淘汰。
- 优先级消息信道：一张消息表打优先级标记 + recvsvr cache 内分 normal/important 两表 + 双 seq 先收 important——连麦与大礼物动画零丢失，且不增加 KV 访问（另建列表方案 KV 访问翻倍被否）。
- 在线统计：1500w 在线 10s 心跳 = 9000w/min 穿透写，裸 tablekv 不可行 → 拆 key（机内按 uin 哈希分 shard 对应 KV key）+ 心跳只写内存 + 异步聚合落盘全量替换 + 双指针原子切换无锁查询。
- 历史在线用 [[hyperloglog|HyperLogLog]]：最大空间 12KB 估算 64 位级基数；≤1w 双写 tablekv 精确计数，>1w 只写 HLL、准确率 >95%；在线列表定期 merge 进 HLL 防丢。
- 流量隔离 vip sect：参考微信支付大小商户分级，可预测大直播提前加白走 vip sect，大直播在线列表才拆 key；自动切换列为 future work。
- 请求量：longpolling 下 100w 在线 ≥6kw 请求/min，1500w 达 9 亿/min；logicsvr 按 30w/min/台 算需 3000 台。
- 柔性控流：按在线数设定收取间隔 + 成功收取后请求在 proxy 层 hold + 按在线数丢 longpolling notify；400w 压测触发 8~10s 档位，请求量较预期降 58%。

## Important Claims（重要论断）

### 读扩散是直播聊天室唯一可行的扩散方案

1.0 已证实写扩散不可行；2.0 优先级消息也不通过写扩散或另建列表解决，而是把分表收归 cache 内，用最小改造代价换可靠信道。

### longpolling 下不能用拒绝请求来控流

客户端收到回包立即发新请求，拒绝越快请求量越大，越拒绝越滚雪球。正确做法是利用 proxy 层 hold 特性柔性降频，用体验换成本。

### 大小房间必须分级隔离

大直播间的爆发式请求会拖垮占多数的小直播间，且聊天室对 KV 层请求数与机器数成正比——小房间多机器部署反而是浪费，故按房间规模分 sect 差异化部署。

## Concepts Introduced（引入的概念）

- [[read-fanout|读扩散（Fan-out on Read）]]（longpolling + 无状态 cache 形态）
- [[hyperloglog|HyperLogLog（基数估算）]]

## Entities Mentioned（提及的实体）

- 微信视频号直播 / 微信后台团队（未单独立页）

## Implications（影响／启示）

- 为 [[live-streaming-messaging|直播实时消息分发]] 的"拉"阵营补上一个千万级一手样本：通知拉取（融云）、短轮询（vivo）之外的第三条路线——longpolling + proxy 柔性控流。
- "重要消息独立信道保必达"的微信实现（打标记 + cache 内分表双 seq）与融云 [[live-message-drop-policy|丢弃策略]] 的"优先级三桶"互为参照：同为分级，一个保重要消息零丢失、一个保系统消息必达。
- 解读：整套 2.0 的主线是"把状态从单机挪到分布式 KV + 内存异步聚合"——在线统计、消息 cache、流量控制三处都复用了"异步任务 + 原子切换无锁读"这一同一手法。

## Limitations（局限）

- 单一信源、官方一手自述，数字（1500w 压测、58% 降幅、>95% 准确率）无第三方验证。
- 原文经 52im.net 收录修订，章节号有缺省（无第 2、3、16 节）。
- 客户端侧设计（收取间隔的端上配合细节）未展开。

## Related Knowledge（相关知识）

- [[live-streaming-messaging|直播实时消息分发]]（主题）
- [[read-fanout|读扩散（Fan-out on Read）]]
- [[live-message-drop-policy|直播消息丢弃策略]]
- [[hyperloglog|HyperLogLog（基数估算）]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-wechat-live-chatroom-15m-online.md`
