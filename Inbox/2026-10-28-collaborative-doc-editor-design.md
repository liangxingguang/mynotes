---
id: 2026-10-28-collaborative-doc-editor-design
title: 「设计一个在线文档协同编辑系统」：从 WebSocket、OT/CRDT 到快照回放
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/RxiTou-DD--KeS7pnriUcQ
source_type: link
platform: wechat
created: 2026-10-28
category: 技术
tags: [分布式系统, 工程实践, WebSocket]
asset_ref: Assets/2026/10/collaborative-doc-editor-design.md
wiki_status: pending
---

# 「设计一个在线文档协同编辑系统」：从 WebSocket、OT/CRDT 到快照回放

> 系统设计与面试顶流题：一题考实时通信、分布式一致性、冲突解决算法、存储设计四样。从需求澄清（千万 DAU、30 万长连接、最终一致）讲到分层架构、OT 变换函数完整实现、CRDT 三拼图、文档级 Actor 定序、快照 + OpLog 存储，附 18 条难点速查表与高频追问。

## 核心要点

- **需求定性**：协同编辑 = 高频小写入 + 强实时广播 + 强收敛一致性；难点不在 CRUD，在"10 人同时打字不互相覆盖"。
- **架构三权衡**：接入层无状态随便扩、协同层有状态（`docId` 一致性哈希 → 单线程 Actor 串行定序，把分布式一致性降级成单机内存问题）、实时链路（WebSocket）与落库链路（MQ 异步）分离。
- **OT 变换函数**：同位置插入用 siteId 字典序 tie-break 保各端一致；插入落在删除区间内 → Delete 裂变成两个；删除区间重叠做减法；TP1/TP2 性质 + 属性式 fuzz 测试验证正确性。
- **OT vs CRDT**：中心化在线产品选 OT（op 体积小、可回放审计，Google Docs/飞书）；离线优先/去中心化选 CRDT（Yjs/RGA，代价是每字符带 ID 内存膨胀 3~5 倍、墓碑 GC）。
- **客户端**：乐观本地渲染 + `pending`/`buffer` 未确认队列分离 + 50ms 操作合并（QPS 降 80%）+ `opId = clientId+timestamp+seq` 幂等。
- **广播**：Netty 零拷贝 `retain()/release()` 一条消息写全房间；跨节点 Redis Pub/Sub 管实时广播、Kafka 管操作日志落库，全局 seq 用 Redis `INCR`。
- **存储**：快照 + OpLog（每 200 条一次 checkpoint，append-only 顺序 IO），恢复任意版本 O(快照+200 条)；落后超 500 条直接全量快照重置，不硬追 transform 链。
- **外围纪律**：Presence/光标走独立 Awareness 频道（300ms 防抖、不落库、last-write-wins）；每 op 服务端二次 `canEdit` 校验 + 令牌桶 20 op/s 限流；大文档用 Piece Table/Rope + 虚拟滚动。

## 正文

见 [[Assets/2026/10/collaborative-doc-editor-design.md]]（全文约 3.8 万字，含 OT/CRDT/Actor/Netty 广播/离队列等完整代码与 18 条难点速查表）。

## 来源

- [「设计一个在线文档协同编辑系统」：从 WebSocket、OT/CRDT 到快照回放](https://mp.weixin.qq.com/s/RxiTou-DD--KeS7pnriUcQ)

## 附件

- [[Assets/2026/10/collaborative-doc-editor-design.md]]
