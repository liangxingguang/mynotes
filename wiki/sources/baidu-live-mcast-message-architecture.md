---
id: wiki-source-baidu-live-mcast-message-architecture
type: source
title: 直播系统聊天技术(四)：百度直播的海量用户实时消息系统架构演进实践
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - im
  - live-streaming
  - messaging
  - architecture
sources:
  - raw/sources/architecture/2026-10-23-baidu-live-mcast-message-architecture.md
related:
  - wiki/concepts/mcast.md
  - wiki/concepts/write-fanout.md
  - wiki/concepts/read-fanout.md
  - wiki/sources/meipai-live-danmu-realtime-push.md
  - wiki/sources/alibaba-ecommerce-im-group-live.md
---
# 直播系统聊天技术(四)：百度直播的海量用户实时消息系统架构演进实践

## Overview（概览）

百度APP消息中台团队的一手实践：直播消息流（聊天/弹幕/礼物/进场/点赞/控制指令）被论证无法照搬 IM 群聊模型，最终另辟蹊径把 groupID 概念下沉到长连接层，设计出组播 mcast 机制，支撑单直播间百万级同时在线的消息实时下发。

## Key Facts（关键事实）

- 照搬 IM 群聊有六个每秒百万量级压力点：拆用户列表、查设备、查动态路由、长连接下发、端拉取、已读设置；砍掉拉取与已读后仍剩三个。
- 百万级峰值对应的平时负载可能不足 1 万，按峰值预置资源会有几十倍冗余；多群组拆分方案有消息不同步与成员不稳问题，被否决。
- mcast 下发为 1:M×1:N 两级扩散：一致性 hash 选路由实例 → 并发到 M 个长连接实例 → 实例内并发到 N 条连接。
- 单实例保持 25w 长连接时压测 8w QPS 稳定下发（容量评估保守按 5w）；100w 下发 20 实例、500w 100 实例、1000w 125 实例。
- 秒级聚合打包：100 条/秒 × 100w = 1 亿消息/秒聚合成每秒一包，均延 +500ms 换百倍下发量级；高优消息立即下发不聚合。
- 压缩比实测 6.7:1：单机 2K×100×1w 连接的 15.6Gbps 降到 2.3Gbps，全局峰值 1.5Tbps→230Gbps。
- mcastJoin/Leave 峰值 ≤2 万 QPS，比百万低两个数量级；连接-组关系维护在长连接实例本地，无独立存储。
- 礼物消息走独立可靠 mcast 通道（数据流隔离）+ 主播侧推拉结合/短连轮询兜底，触达率 99.9%+。

## Important Claims（重要论断）

### Claim 1：直播消息不能照搬 IM 群聊

参与人数（百万/千万累计 vs 千人群）、进出频率（每秒上万变更 vs 低频）、持续时间（小时级 vs 天/月级）三个维度的差异，使 IM 群聊的「用户列表拆分 + 动态路由 + 拉取 + 已读」全链路在直播场景下全部变成百万 QPS 级瓶颈。

### Claim 2：组播 mcast 把扩散下沉到长连接层后，容量完全可控

路由层与消息服务压力消失，压力只由长连接层承载且可水平扩容；整体下行 QPS = 在线数，容量可以精确预算。

### Claim 3：允许峰值丢弃与不在线折损是合理设计目标

直播消息过时即无价值，以折损换可控的 QPS/带宽与近零冗余。

## Concepts Introduced（引入的概念）

- [[mcast|长连接组播（mcast）]]

## Entities Mentioned（提及的实体）

- 百度APP消息中台团队（未立实体页，单一信源内组织团队）

## Implications（影响／启示）

- 为「大量在线用户分组实时推送」提供了一条与读写扩散并列的第三条路：不经过用户列表与动态路由，直接在长连接层组播。
- 聚合（+500ms 换百倍量级）与压缩（6.7:1）是下行带宽/ QPS 的通用杠杆，可迁移到其他推送系统。

## Limitations（局限）

- 设计目标明确允许消息折损，不适合要求必达/已读回执的 IM 场景。
- 容量数字来自百度自身压测环境，压缩比依赖具体压缩库调优。

## Related Knowledge（相关知识）

- [[meipai-live-danmu-realtime-push|百万在线的美拍直播弹幕系统实时推送技术实践]]（同为直播消息推送一手实践，走了轮询→长连接订阅推送的另一条路）
- [[alibaba-ecommerce-im-group-live|阿里电商IM消息平台在群聊、直播场景下的技术实践]]（读写扩散混合模式的直播分发）
- [[write-fanout|写扩散（Fan-out on Write）]]、[[read-fanout|读扩散（Fan-out on Read）]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-baidu-live-mcast-message-architecture.md`
