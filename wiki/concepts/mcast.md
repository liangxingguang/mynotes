---
id: wiki-concept-mcast
type: concept
title: 长连接组播（mcast）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - concept
  - architecture
  - im
  - live-streaming
sources:
  - raw/sources/architecture/2026-10-23-baidu-live-mcast-message-architecture.md
related:
  - wiki/concepts/write-fanout.md
  - wiki/concepts/read-fanout.md
  - wiki/sources/baidu-live-mcast-message-architecture.md
  - wiki/sources/meipai-live-danmu-realtime-push.md
---
# 长连接组播（mcast）

## Definition（定义）

把「群组」概念从业务层下沉到长连接层的消息推送机制：组播 mcast 是若干在线长连接的集合（全局唯一 mcastID），下发消息时只需指定 mcastID，由长连接服务直接完成 1:M×1:N 两级扩散——路由模块按组播路由并发到 M 个持有该组连接的长连接实例，每个实例再并发推给实例内 N 条连接。用户列表拆分与动态路由查询两个百万 QPS 级步骤因此整体消失。

## Why It Matters（为什么重要）

直播场景（单房间百万在线、每秒上万进出）下，照搬 IM 群聊的用户列表/设备/路由/下发链路每一步都是百万 QPS；按峰值预置资源又有几十倍冗余。mcast 把压力集中到天然可水平扩容的长连接层，使整体下行 QPS 恒等于在线数，容量可精确预算——百度实测 100w 下发只需 20 个实例、1000w 只需 125 个。

## Core Characteristics（核心特征）

1. **连接-组关系本地化**：组与连接的从属关系维护在每个长连接实例内存中，无独立存储；路由（mcastRoute）只记录「哪些实例持有该组连接」，拆分到实例仅几十到百量级。
2. **路由维护压力低两个数量级**：mcastJoin/Leave 峰值 ≤2 万 QPS（对应百万在线的进出峰值）。
3. **单实例高下发**：单进程内多连接并发发送，25w 长连接下压测 8w QPS 稳定下发（容量按 5w 保守评估）。
4. **峰值靠聚合与压缩消化**：秒级聚合打包（+500ms 均延换百倍消息量级，高优消息立即下发不聚合）；压缩比 6.7:1（单机 15.6Gbps→2.3Gbps，全局 1.5Tbps→230Gbps）；按优先级分级限速保护端侧。
5. **允许折损换可控**：设计目标明确允许峰值丢弃与不在线用户折损；断链即清除组播成员，重连后业务层监听恢复信号重新 join。
6. **可拓展**：每 mcast 可配公共消息信箱（msgID 范围拉取的 timeline 模型）支持历史消息；高优可靠消息（如礼物）走数据流隔离的独立可靠 mcast 通道，主播侧推拉结合 + 短连轮询兜底（触达 99.9%+）。

## Structure（结构）

客户端 → mcastJoin/mcastLeave（业务层校验 → 路由层维护 mcastRoute → 长连接实例维护 mcastConnectList）；下发路径：业务模块 →（一致性 hash）→ mcastRouter 实例 →（mcastRoute 拆 M 实例）→ 长连接实例 →（mcastConnectList 拆 N 连接）→ 客户端 SDK。

## How It Works（运作方式）

以百度直播为例：一条发往 mcast-m 的消息先做一致性 hash 选定路由实例；路由实例按 mcastRoute-m 并发发给所有持有该组连接的长连接实例；实例内按本地连接列表并发推送。容量账：整体下行 QPS = 在线数，单实例 5-8w QPS，实例数 = 在线数 ÷ 5w。接入侧配套三大运营商 + 香港接入点、HTTPDNS 多级解析、join 后智能短心跳。

## Relationships（关系）

### Related Concepts（相关概念）

- [[write-fanout|写扩散（Fan-out on Write）]]：mcast 可视为把写扩散的「展开收件人」一步下沉到长连接层内存完成，省掉了持久化副本与外部路由查询。
- [[read-fanout|读扩散（Fan-out on Read）]]：对偶的另一端——读扩散让客户端拉，mcast 让长连接层推；mcast 的历史消息信箱（timeline 模型）则是推之外的拉取补充。

### Dependencies（依赖项）

- 长连接服务的单实例高并发下发能力与实例间水平扩容。

### Distinctions（区分）

- 与 [[write-fanout|写扩散]] 的区别在于「内存组播 vs 持久化副本」：写扩散为每成员写投递记录以支撑已读/撤回/离线补全；mcast 不写副本、不保证必达，换百万级在线的容量可控。
- 与 [[read-fanout|读扩散]] 的区别在于「推 vs 拉」：读扩散把一致性交给端侧位点同步；mcast 由服务端主动推，端侧无位点概念，折损由设计目标容忍。

## Evolution（演进）

- 百度直播：先推演照搬 IM 群聊（六压力点）与多群组方案（消息不同步/成员不稳）均不可行 → 设计 mcast（本文信源，一手）；后续拓展历史消息信箱与独立可靠礼物通道。
- 对照路径：美拍弹幕选择「轮询 → 长连接订阅推送（告知→拉取→推，大直播间降级广播）」（见 [[meipai-live-danmu-realtime-push|美拍信源]]）；阿里直播选择读写扩散混合（见 [[read-fanout|读扩散]]）。

## Open Questions（开放问题）

- 跨实例组的成员一致性（实例宕机时该组在其他实例上的连接如何感知）信源未展开。
- 聚合窗口与压缩参数在极端峰值（如春晚）下的实际调优过程未披露。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-baidu-live-mcast-message-architecture.md`（百度APP消息中台团队一手实践：机制设计、压测数字、容量账、拓展方案）

## Related Knowledge（相关知识）

- [[baidu-live-mcast-message-architecture|百度直播海量用户实时消息系统架构：长连接组播 mcast 实践]]
- [[meipai-live-danmu-realtime-push|百万在线的美拍直播弹幕系统实时推送技术实践]]
- [[alibaba-ecommerce-im-group-live|阿里电商IM消息平台在群聊、直播场景下的技术实践]]
