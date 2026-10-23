---
id: wiki-concept-read-fanout
type: concept
title: 读扩散（Fan-out on Read）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - concept
  - architecture
  - im
  - messaging
sources:
  - raw/sources/architecture/2026-10-23-alibaba-ecommerce-im-group-live.md
  - raw/sources/architecture/2026-10-23-im-group-chat-write-fanout-cost.md
related:
  - wiki/concepts/write-fanout.md
  - wiki/sources/alibaba-ecommerce-im-group-live.md
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

## Relationships（关系）

### Related Concepts（相关概念）

- [[write-fanout|写扩散（Fan-out on Write）]]：对偶模式，混合落地时的另一半。

### Dependencies（依赖项）

- 端侧同步协议（位点存储、推拉结合、差值检洞）：读扩散把一致性职责下沉到客户端同步层。

### Distinctions（区分）

- 与 [[write-fanout|写扩散]] 的区别在于「读时聚合 vs 写时复制」：读扩散拿架构复杂度与读聚合成本换存储/写入的极致节省；写扩散拿写放大换读路径简单与每成员投递记录（已读回执、撤回、离线补全的天然载体）。群规模与消息个性化比例是选型主变量。

## Evolution（演进）

- 阿里：2018 双 11 盖楼活动暴露写扩散瓶颈（120w/s 写入 → 3K/s 上行）→ 演进出读写扩散混合模式（2020 双 11，500ms 端到端）。
- 行业分化（二次信源断言）：钉钉转读扩散 + 多级缓存；微信坚持写扩散；企业微信写扩散 + 硬件堆料。

## Open Questions（开放问题）

- 已读回执、消息撤回等强依赖"每成员投递记录"的能力，在读扩散下的实现形态（已读 bitmap 聚合等）两信源均未展开。
- 冷启动多读 QPS 的具体量级与缓存对策，信源只指出压力存在、未给数字。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-alibaba-ecommerce-im-group-live.md`（一手实践：同步模型、99.99% 前提、混合模式、500ms 指标、优缺点清单）
- Source: `raw/sources/architecture/2026-10-23-im-group-chat-write-fanout-cost.md`（二次分析：钉钉读扩散选型、规模分档中的读扩散切换点、静态分流策略）

## Related Knowledge（相关知识）

- [[alibaba-ecommerce-im-group-live|阿里电商IM消息平台在群聊、直播场景下的技术实践]]
- [[im-group-chat-write-fanout-cost|IM千人群聊该不该用消息写扩散？详细算算成本账！]]
