---
id: wiki-concept-write-fanout
type: concept
title: 写扩散（Fan-out on Write）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - concept
  - architecture
  - im
  - messaging
sources:
  - raw/sources/architecture/2026-10-23-im-group-chat-write-fanout-cost.md
related:
  - wiki/sources/im-group-chat-write-fanout-cost.md
  - wiki/entities/rocketmq.md
  - wiki/entities/kafka.md
---
# 写扩散（Fan-out on Write）

## Definition（定义）

群消息投递的一种架构模式：消息到达服务端时，按群成员列表为每个接收者**各写一份消息副本**（每成员一条投递记录），读路径上成员只需读自己的消息流。与之相对的是读扩散（Fan-out on Read）：消息只存一份，成员读取时按订阅关系拉取。

## Why It Matters（为什么重要）

toB IM 场景里已读回执、消息撤回、离线补全是硬需求，三者都依赖每成员维度的投递记录，因此中小规模 toB 项目几乎必然选写扩散。代价是写放大：千人群一条消息产生约 3000~5000 次后端操作（999 副本扇出 + 路由 + 未读 + 推送），群规模决定了这条路的物理上限。

## Core Characteristics（核心特征）

1. **扇出位置在群服务**：群成员/属性/配置都在群服务，责任边界清晰（候选：客户端展开、接入层展开）。
2. **副本指纹**：副本 uuid = `原uuid|G<short_id>`，下游历史库/离线/已读聚合据此区分原消息与副本。
3. **MQ 批量化对抗写放大**：50 人/批把千人群 MQ 写次数从 999 降到 ~20；批内部分失败用「拆分重投」。
4. **双轨存储**：历史库只存原消息（1 条），离线盒子存副本（N 条），避免分表爆炸又保住未读对账。
5. **部分失败是常态**：不 ACK 自动重投、3~5 次上限进死信（带 uuid+uid 精确定位）、发送方入库即 ACK 不感知扇出失败。

## Structure（结构）

发送 → 群服务扇出（展开成员、生成副本指纹）→ MQ 批量（~20 批）→ 分发服务路由投递（批内展开）→ 双轨存储（历史库 1 条 / 离线盒子 N 条）。

## How It Works（运作方式）

群服务收到群消息后加载成员列表、剔除发送者，为每个成员克隆副本并打上副本指纹，按 50 人/批发布到 MQ；下游分发服务消费批次时对批内每个目标做路由与投递；历史库消费者看 uuid 是否含 `|G` 决定丢弃或入库。失败副本不 ACK 由 broker 重投，超过重试上限进死信队列交 SRE 处理。

## Relationships（关系）

### Related Concepts（相关概念）

- 读扩散（Fan-out on Read）：对偶模式，消息存一份、读取时拉取；万人群场景的替代解（钉钉选型）。Wiki 暂无独立页面。
- [[idempotency-design|幂等设计]]：副本重投/拆分重投依赖消费侧幂等。

### Dependencies（依赖项）

- 消息队列（[[rocketmq|RocketMQ]] / [[kafka|Kafka]] 一类 broker）：副本即 MQ 消息，broker 的连接数与单 partition 串行化是常见瓶颈。

### Distinctions（区分）

- 与读扩散的区别在于「写时复制 vs 读时聚合」：写扩散拿写放大换读路径简单与每成员投递记录；读扩散拿读取聚合成本换存储与写入的极致节省。群规模是选型主变量：1000 人写扩散需批量化、5000 人需专项优化、10000 人写扩散走不通。

## Evolution（演进）

已知实践中的规模分档（单信源）：100 人舒服 → 1000 人批量化 → 5000 人专项优化 → 10000 人切读扩散。过渡期常用混合模式：千以下写扩散、千以上读扩散，在**群创建时静态标记**分流而非每次扇出动态判断。大厂分化：钉钉转读扩散+多级缓存；微信坚持写扩散；企业微信写扩散+硬件堆料。

## Open Questions（开放问题）

- 读扩散侧的完整成本账（读放大、缓存一致性、已读 bitmap 聚合代价）尚无对称的信源支撑。
- 5000 人档的「专项优化策略」具体形态，信源只给了方向未给方案。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-im-group-chat-write-fanout-cost.md`（单一信源，经验性分析，数字为估算量级 → confidence: medium）

## Related Knowledge（相关知识）

- [[im-group-chat-write-fanout-cost|IM千人群聊该不该用消息写扩散？详细算算成本账！]]
