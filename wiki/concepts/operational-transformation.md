---
id: wiki-concept-operational-transformation
type: concept
title: Operational Transformation（OT，操作转换）
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: high
tags:
  - concept
  - collaborative-editing
  - distributed-systems
sources:
  - raw/sources/architecture/2026-10-28-collaborative-doc-editor-design.md
related:
  - wiki/concepts/crdt.md
  - wiki/comparisons/ot-vs-crdt.md
  - wiki/sources/collaborative-doc-editor-design.md
---
# Operational Transformation（OT，操作转换）

## Definition（定义）

协同编辑的并发收敛算法流派之一：中心服务器对基于同一旧版本产生的并发操作做**变换**（transform），调整位置偏移量，使所有端无论操作到达顺序如何都收敛到同一文本。变换的不变量是 `apply(apply(doc, remote), local') == apply(apply(doc, local), remote')`。

## Why It Matters（为什么重要）

协同编辑的核心矛盾是：两个操作基于同一旧版本产生，直接按到达顺序执行时位置坐标系已漂移，结果必然分裂/丢数据。OT 是 Google Docs、腾讯文档、飞书等中心化在线文档采用的解法。

## Core Characteristics（核心特征）

1. **中心定序**：强依赖中心服务器做全局定序，版本号由服务端统一"发牌"，客户端严禁自增。
2. **确定性 tie-break**：同位置并发插入用全局一致比较器（siteId 字典序）决定左右，保证各端结果一致——这是收敛的命门。
3. **小元数据**：只存操作本身，不像 CRDT 那样每字符带唯一 ID。
4. **可回放审计**：操作序列有序落 OpLog，天然支持历史回放与审计。

## Structure（结构）

- 原子操作模型：只支持 `Insert(pos, text, siteId)` / `Delete(pos, len, siteId)`，复杂操作拆解为原子序列（真实系统用 retain/insert/delete 三段式）。
- 变换函数两个易漏的坑：① 插入点落在删除区间内部时，一个 Delete 必须**裂变**成两个；② 删除区间重叠时做减法，扣没了退化成 noop。
- 正确性性质：TP1（变换后可交换：`T(T(e,a),b') = T(T(e,b),a')`）、TP2（`transform(transform(a,b),transform(c,b)) == transform(transform(a,c),transform(b,c))`）。

## How It Works（运作方式）

1. 客户端乐观本地渲染，维护 `pending`（已发未 ACK）与 `buffer`（本地未发出）两个队列（Google ot.js 的经典结构）。
2. 服务端按 `docId` 把操作路由到单线程 Actor 串行提交：`clientId+clientSeq` 幂等去重 → `baseVersion` 冲突检测 → 对 baseVersion 之后的服务端操作**依次 transform（rebase，级联变换）** → 发新版本号 → 先写 OpLog 再广播。
3. 客户端收到远端 op 时，把它依次越过本地 pending 做双向 transform 后应用。
4. 正确性验证靠**属性式 fuzz 测试**（随机 op 序列 + 随机并发交错，断言各端最终一致）+ TP2 验证。
5. 生产细节：位置按 code point / grapheme 计算（不按 Java `char`，否则 Emoji/中文代理对错位）；transform 链过长（>500 条）直接发全量快照重置。

## Relationships（关系）

### Related Concepts（相关概念）

- [[crdt|CRDT]]：另一大流派，见 [[ot-vs-crdt]]。
- [[websocket-heartbeat-reconnect|WebSocket 心跳与断线重连]]：OT 客户端的重连增量拉取依赖的重连机制。
- [[idempotency-design|幂等设计]]：OT 操作提交依赖 opId 幂等。

### Distinctions（区分）

- 与 [[crdt|CRDT]] 的不同之处：OT 靠中心服务器变换调整偏移量，离线能力弱、实现复杂度极高（CP2 验证难）；CRDT 靠数据结构自身的交换律/结合律/幂等性天然收敛，支持去中心化和离线，代价是元数据膨胀。

## Evolution（演进）

- 当前信源未提供 OT 的历史演进脉络。

## Open Questions（开放问题）

- 富文本格式属性的变换规则、Undo 的完整语义（逆操作 + 重放）在信源中只给出方向性说明，未给完整算法。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-collaborative-doc-editor-design.md`（含 OT 变换函数完整 Java 实现、文档级 Actor 定序、ot.js 式客户端结构）

## Related Knowledge（相关知识）

- [[collaborative-doc-editor-design|信源：设计一个在线文档协同编辑系统]]
- [[ot-vs-crdt|OT vs CRDT]]
