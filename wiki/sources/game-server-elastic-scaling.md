---
id: wiki-source-game-server-elastic-scaling
type: source
title: 游戏开发：服务器弹性伸缩（负载均衡、路由服与数据迁移的理论思考）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - game-server
  - distributed-systems
  - load-balancing
sources:
  - raw/sources/architecture/2026-10-20-game-server-elastic-scaling.md
related:
  - wiki/concepts/table-sharding-migration.md
  - wiki/sources/distributed-systems-introduction.md
---
# 游戏开发：服务器弹性伸缩（负载均衡、路由服与数据迁移的理论思考）

## Overview（概览）

知乎专栏理论思考文（作者自述无该问题实操经验）：游戏有状态服务器如何做弹性伸缩且不影响玩家——从负载均衡的信息滞后问题（虚拟负载/动态权重），到路由服（类 Mongos）+ 数据迁移的保序切换，落点是"路由 Key 不是数据的身份，而是时序的容器"。与 [[table-sharding-migration|分表平滑迁移]] 的"迁移期间保序/双写"问题同构。

## Key Facts（关键事实）

- 负载均衡的失效成因是**信息滞后**：Game 服 5 秒一次上报负载，开服瞬间所有请求会压到同一台。
- 解法一·虚拟负载：每分配一个请求就增加该服虚拟负载，登录成功或超时后移除（每个虚拟负载独立生命周期），选服时真实+虚拟一起看。
- 解法二·动态权重：分配后调整权重，`score = rload / weight`；两法底层思想相同——分配后立即降低被选概率。
- 配套技巧：CPU/内存纳入负载统计；分配加冷却时间（如 10ms）；登录成功即加速上报（类 TCP 快速重传）。
- 防炸服（削峰）：Game 服设最大在线数（排队/拒绝）+ 最大登录 QPS（如 100 人/秒，落地为分帧）；高开销 IO 迁辅助线程；Login 服也限 QPS。真正问题通常不是 QPS 而是稳定性（卡顿/断连）。
- 路由服（代理服）：有状态公会服伸缩必须有路由表（类比 MongoDB Mongos）；路由服固定数量不伸缩以简化协调；还可代替 MQ 做自定义 Key 路由。业务服两种用法：按 Key Hash 选 Router（简单、负载好）vs 绑定特定 Router（时序保证好、需组网）——建议先前者。
- 一致性 Hash 的巧用（作者历史项目）：Center 服不直接分配 Scene 服，而是**生成一个 Key 给所有 Game 服**，各 Game 服自行按一致性 Hash 选 Scene 服——"简单胜过完美"。
- 数据迁移保序方案（迭代三版）：①旧服存档→压队列→卸载→数据+积压请求经旧服转发新服（多次扩容会多级路由）；②目标服按请求 ID 队首阻塞（复杂度高）；③定稿——旧服卸载后把数据和积压请求**经 Router 转发**新服，Router 借此感知路由切换开始/完成（Item 结构：key/sid/nextSid/nextId）。
- 路由 Key 的本质：框架保证同一 Key 上的请求有序执行（虚拟 Channel）——**Key 不是数据的"身份"，而是时序的容器**；实体 ID 只是恰好常与时序边界重合。选 Key 先梳理哪些操作必须有序。

## Important Claims（重要论断）

### Claim 1：信息滞后是负载均衡失效的根因

凡是"上报-决策"式负载均衡，瞬时光照流量都会击穿滞后窗口；分配动作本身必须即时反馈进决策（虚拟负载/动态权重）。

### Claim 2：有状态伸缩的难点不在扩容而在保序迁移

只把新公会路由到新服只实现扩容，没实现动态负载均衡；迁移期间旧请求必须仍走旧服，靠 Router 中转完成切换可消除目标服的队首阻塞。

## Concepts Introduced（引入的概念）

- 虚拟负载 / 动态权重（抗信息滞后的负载均衡）
- "路由 Key = 时序的容器"（单信源论断，未立概念页）

## Entities Mentioned（提及的实体）

- MongoDB Mongos（类比提及，未立页）

## Implications（影响／启示）

"Key=时序容器"与 Kafka partition key、分表路由键的选择同理——先定有序边界再定 Key（解读）。

## Limitations（局限）

- 作者明示为理论思考而非实践经验；方案未经生产验证。

## Related Knowledge（相关知识）

- [[table-sharding-migration|分表平滑迁移策略]]（迁移期保序/双写在数据库层的对应）
- [[distributed-systems-introduction|分布式系统概述（信源页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-20-game-server-elastic-scaling.md`
