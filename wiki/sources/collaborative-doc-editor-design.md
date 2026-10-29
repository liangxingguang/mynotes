---
id: wiki-source-collaborative-doc-editor-design
type: source
title: 「设计一个在线文档协同编辑系统」：从 WebSocket、OT/CRDT 到快照回放
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: high
tags:
  - source
  - system-design
  - websocket
  - distributed-systems
sources:
  - raw/sources/architecture/2026-10-28-collaborative-doc-editor-design.md
related:
  - wiki/concepts/operational-transformation.md
  - wiki/concepts/crdt.md
  - wiki/comparisons/ot-vs-crdt.md
---
# 「设计一个在线文档协同编辑系统」：从 WebSocket、OT/CRDT 到快照回放

## Overview（概览）

一篇系统设计/面试导向的长文（约 3.8 万字），完整推演在线文档协同编辑系统：需求澄清（千万 DAU、峰值 30 万长连接、最终一致）、分层架构（无状态网关 + 有状态协同引擎）、OT 变换函数与 CRDT（LSEQ/RGA/墓碑 GC）的 Java 实现、文档级 Actor 串行定序、Netty 零拷贝房间广播、Redis Pub/Sub 与 Kafka 的跨节点扇出分工、快照 + OpLog 存储与版本回放、断线重连与离线合并、Presence 隔离、权限与限流、大文档性能（Piece Table/虚拟滚动），附 18 条难点速查表与 8 个高频追问。

## Key Facts（关键事实）

- 需求假设：千万 DAU、峰值 30 万长连接、单文档 50~100 人编辑 + 上万只读围观、每人 ~2 ops/s、历史版本留存 30 天。
- 核心定性：协同编辑 = "高频小写入 + 强实时广播 + 强收敛一致性"；难点是并发操作收敛而非 CRUD。
- 关键架构权衡：接入层无状态、协同层有状态，同一 `docId` 经一致性哈希路由到单节点单线程串行定序，"把分布式一致性问题降级成单机内存问题"。
- 操作合并：客户端攒 50ms 合并成一条批量 op，打字场景 QPS 从 10 降到 2、带宽降 60% 以上（信源口径）。
- 幂等设计：`opId = clientId + timestamp + seq`；服务端以 `clientId + clientSeq` 去重。
- 存储：快照 + OpLog，每 200 条 op 一次 checkpoint，恢复任意版本 O(快照 + 200 条增量)；存储成本较全量留存降低约 70%（信源口径）。
- 追平策略：客户端落后超 500 条（或 transform 链超 500 条）直接全量快照重置，不硬追增量链。
- 性能目标（参考值）：端到端延迟 < 100ms（WebSocket 实测 35~50ms）、操作到达率 99.999%、所有副本 1s 内收敛。
- 代表产品阵营：OT = Google Docs / 腾讯文档 / 飞书；CRDT = Figma / Notion（部分）/ Yjs / Automerge。

## Important Claims（重要论断）

### Claim 1：协同编辑的本质是"合并"而非"互斥"

数据库行锁/分布式锁只适合短事务；用户编辑时长不可预期，持锁会打崩吞吐，离线场景无法持锁。正确路线是 OT/CRDT 这类合并算法。

### Claim 2：OT 与 CRDT 的取舍点是"是否需要端侧完全自治"

中心化在线产品选 OT（op 体积小、历史可回放审计）；离线优先/去中心化选 CRDT（代价是每字符带唯一 ID，内存膨胀 3~5 倍，需墓碑 GC）。详见 [[ot-vs-crdt]]。

### Claim 3：可靠性要在应用层补齐

WebSocket 协议本身不保证有序、不保证不丢、没有重传；需要心跳（30s ping / 60~90s 超时）、全局 `serverSeq` 跳号检测、`lastServerSeq` 断线增量拉取、opId 幂等四件套。

### Claim 4：Presence 绝不能走编辑主链路

光标/在线状态是高频易失数据：走独立 Awareness 频道，300ms 防抖 + 限流 10 次/秒，`last-write-wins + TTL`，不落库、不进版本号、不做 OT 变换（光标位置本身仍需按文本 op 做位置变换）。

## Concepts Introduced（引入的概念）

- [[operational-transformation|Operational Transformation（OT）]]
- [[crdt|CRDT（无冲突复制数据类型）]]

## Entities Mentioned（提及的实体）

- [[netty|Netty]]（零拷贝房间广播）
- [[kafka|Kafka]]（操作日志落库 / 跨节点广播备选）
- Yjs、Automerge（CRDT 开源实现，未建实体页——信源仅顺带提及）
- Google Docs、飞书、Figma、Notion（产品阵营举例，未建实体页）

## Implications（影响／启示）

- "有状态下沉、无状态上浮"是该系统的根本结构：扩展性靠无状态网关，一致性靠有状态协同服务按 `docId` 串行。
- 快照 + OpLog 是"事件溯源"在协同文档上的落地，与 Git、WAL 同构；审计、回放、离线恢复都由它托底。
- 落地建议：不要自研 OT/CRDT 算法，优先基于 Yjs/Automerge 二次开发；历史版本回溯是必须有的兜底。

## Limitations（局限）

- 面试导向文章，性能数字（QPS 降 80%、存储降 70%、延迟 35~50ms 等）为作者给出的参考口径，无测量方法说明。
- 代码为教学简化版（如 OT 只含原子 Insert/Delete，LSEQ 位置生成是示意实现），非生产级完整实现。
- CRDT 部分对 Yjs 的实际协议细节（YATA）未展开。

## Related Knowledge（相关知识）

- [[websocket-heartbeat-reconnect|WebSocket 心跳保活与断线重连]]
- [[idempotency-design|幂等设计]]
- [[cdn-broadcast-fanout|CDN 广播扇出]]

## Source（信源）

- `raw/sources/architecture/2026-10-28-collaborative-doc-editor-design.md`
