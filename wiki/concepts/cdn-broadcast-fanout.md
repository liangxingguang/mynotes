---
id: wiki-concept-cdn-broadcast-fanout
type: concept
title: CDN 广播（弹幕下行）
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - concept
  - architecture
  - im
  - live-streaming
  - cdn
sources:
  - raw/sources/architecture/2026-10-23-netease-ten-million-live-danmu-cdn-broadcast.md
related:
  - wiki/concepts/mcast.md
  - wiki/concepts/read-fanout.md
  - wiki/sources/netease-live-danmu-cdn-broadcast.md
  - wiki/sources/meipai-live-danmu-realtime-push.md
  - wiki/sources/baidu-live-mcast-message-architecture.md
---
# CDN 广播（弹幕下行）

## Definition（定义）

把海量直播消息（弹幕）的下行分发从「服务端长连接逐连接直推」改为「复用 CDN 边缘网络分发」的广播机制：弹幕服务把消息推给 CDN，终端从 CDN 边缘获取消息，从而把千万级在线的下行流量与连接压力整体外包给 CDN。

## Why It Matters（为什么重要）

千万级在线直播间里，长连直推意味着服务端要为每个在线连接各发一份消息，下行 QPS 与带宽随在线数线性暴涨且全部压在自建链路上。CDN 广播复用为视频流量设计的边缘分发能力与成本结构，使弹幕下行的容量问题转化为 CDN 选型与调度问题——网易云信在千万级在线场景下明确优先选择该方案。

## Core Characteristics（核心特征）

1. **两种实现形态**：推流方案把消息伪装成视频流推送到 CDN，App 以订阅数据流方式同步弹幕（实时性高，实现复杂，需处理终端兼容性）；静态文件加速方案把各队列消息组装成静态文件，App 周期性到 CDN 下载（实现简单，实时性取决于同步周期）。
2. **实时性与实现成本互换**：推流 vs 静态文件按场景的实时性要求与终端类型灵活取舍。
3. **多 CDN 融合保可靠**：消息同时推送多家 CDN 厂商，按容量比例与网络延迟综合调度（如权重轮询），避免单厂商故障或容量不足。
4. **与上行链路解耦**：上行仍走聊天室长链接 + 逐级流控 + 优先级队列按比例投递；CDN 只承担下行广播。
5. **端侧可观测**：监控大盘需纳入端侧 CDN 弹幕同步指标（成功比例、延迟），下行质量以端侧实测为准。

## Structure（结构）

弹幕服务（优先级队列分桶按比例投递）→ CDN 注入（推流伪装视频流 / 静态文件生成）→ 多 CDN 厂商（权重轮询调度）→ 边缘节点 → 直播 App（订阅数据流 / 周期下载静态文件）。

## How It Works（运作方式）

以网易云信 TFBOYS 线上演唱会为例：上行弹幕经本地粗粒度流控、反垃圾分布式全局流控后进入弹幕服务；弹幕服务按业务分桶（系统广播/高优先级礼物/低优先级/弹幕）计算每秒各队列投递量（前桶余量叠加后桶），需广播的消息改道 CDN；App 端按所选方案订阅流或周期拉文件，获得弹幕。接入与鉴权（GSLB 地址分配、动态 Token 本地校验）与广播链路独立设计。

## Relationships（关系）

### Related Concepts（相关概念）

- [[mcast|长连接组播（mcast）]]：同属直播下行扩散机制——mcast 把扩散做在自建长连接层内存（1:M×1:N 两级），CDN 广播把扩散外包给 CDN 边缘。
- [[read-fanout|读扩散（Fan-out on Read）]]：静态文件加速形态本质是读扩散（端侧周期拉取），推流形态则接近「推」；CDN 广播是推拉两态在 CDN 介质上的实现。

### Dependencies（依赖项）

- 一家或多家 CDN 厂商的边缘分发能力与容量。
- 端侧 SDK 对流订阅或周期下载的兼容支持。

### Distinctions（区分）

- 与 [[mcast|mcast]] 的区别在于「自建长连层扩散 vs CDN 边缘分发」：mcast 实时性高、容量可精确预算但全靠自建链路；CDN 广播复用外部边缘网络、天然跨地域，但实时性受方案形态与同步周期约束，且引入厂商依赖（需多 CDN 融合对冲）。
- 与 [[read-fanout|读扩散]] 的区别在于「消息介质」：读扩散的拉取落在自研会话队列与位点同步上；CDN 广播（静态文件形态）的拉取落在 CDN 文件分发上，不维护任何会话状态。

## Evolution（演进）

- 网易云信（TFBOYS 线上演唱会）：千万级在线直播弹幕优先 CDN 广播，推流与静态文件两形态并存按场景选型，多 CDN 权重轮询融合（本概念唯一信源，一手实践）。
- 对照路径：美拍选「订阅推送 + 大直播间降级广播」（见 [[meipai-live-danmu-realtime-push|美拍信源]]）；百度选 mcast 长连组播（见 [[mcast|mcast]]）。三条路线覆盖直播弹幕下行的主要选型空间。

## Open Questions（开放问题）

- 推流方案「消息伪装成视频流」的具体协议封装与端侧解析方式信源未展开。
- 静态文件方案的同步周期取值与相应的弹幕延迟分布未披露。
- CDN 广播与长连直推在成本上的量化对比（何时自建更划算）无公开数据。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-netease-ten-million-live-danmu-cdn-broadcast.md`（网易云信 IM 技术团队一手实践：方案选型理由、两形态取舍、多 CDN 融合调度）

## Related Knowledge（相关知识）

- [[netease-live-danmu-cdn-broadcast|直播系统聊天技术(九)：千万级实时直播弹幕的技术实践（网易云信）]]
- [[meipai-live-danmu-realtime-push|百万在线的美拍直播弹幕系统实时推送技术实践]]
- [[baidu-live-mcast-message-architecture|百度直播海量用户实时消息系统架构：长连接组播 mcast 实践]]
