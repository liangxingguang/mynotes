---
id: wiki-concept-crdt
type: concept
title: CRDT（无冲突复制数据类型）
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
  - wiki/concepts/operational-transformation.md
  - wiki/comparisons/ot-vs-crdt.md
  - wiki/sources/collaborative-doc-editor-design.md
---
# CRDT（无冲突复制数据类型）

## Definition（定义）

协同编辑的并发收敛算法流派之一：数据结构自带交换律、结合律、幂等性，合并**天然无冲突**，无需中心服务器变换。基于 Lamport 时间戳 + 全局唯一 ID 的偏序关系自动排序，数学上可证明收敛。

## Why It Matters（为什么重要）

CRDT 让**离线优先**和**去中心化（P2P）**协同成为可能：本地先执行，联网后任意顺序合并都收敛。Figma、Notion（部分）、Yjs、Automerge 走这一路线。

## Core Characteristics（核心特征）

1. **无需中心定序**：可去中心化，服务端甚至可以不理解内容只做中继。
2. **每字符带全局唯一 ID**：如 `(siteId, clock)` / 站点 ID + 自增序号；定位按邻居 ID 而非数字位置（RGA）。
3. **墓碑删除**：删除只做软删除标记（幂等，重复删除无副作用），保证任意顺序合并一致；墓碑需定期 GC。
4. **元数据膨胀**：内存膨胀 3~5 倍；10 万字文档元数据可达 5~10MB（信源口径），字符串压缩存储与墓碑 GC 是必修课。

## Structure（结构）

信源给出三块核心拼图：

1. **LSEQ 字符模型**：每个字符带全局唯一 ID 与全序位置串；合并规则 = 按 position 字典序排序、同位置按 ID 排序，任意节点执行结果完全一致；生产用 LSEQ/Logoot 避免位置串无限变长。
2. **RGA 插入逻辑**：插入按左侧邻居 ID 定位；同位置并发插入的排序规则 = 先比时间戳（大者在前）、时间戳相同比 clientId——所有节点执行相同规则故最终顺序一致。
3. **文档引擎合并与 GC**：向量时钟裁决版本新旧（remote 存在更新分量才算"更新"）；墓碑节点按延迟删除策略定期回收，避免 GC 抖动。

## How It Works（运作方式）

- 本地操作立即应用并持久化（Local-First，如写 IndexedDB），联网后批量同步；
- 合并函数对任意到达顺序幂等收敛；离线编辑天然支持，无需像 OT 那样重放/补偿大量历史操作；
- Undo 相对自然（相比 OT 的逆操作 + 重放）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[operational-transformation|Operational Transformation（OT）]]：另一大流派，见 [[ot-vs-crdt]]。

### Distinctions（区分）

- 与 [[operational-transformation|OT]] 的不同之处：CRDT 不依赖中心服务器、离线天然友好、实现复杂度中等（规则固定但要处理墓碑 GC）；代价是元数据体积大（每字符带 ID）。

## Evolution（演进）

- 代表实现：Yjs、Automerge（信源建议不要自研，优先基于它们二次开发）。当前信源未提供算法本身的学术演进脉络。

## Open Questions（开放问题）

- Yjs 内部协议（YATA）与 LSEQ/RGA 的具体差异：当前信源未确立。
- 结构化数据（白板/图形）上的 CRDT 设计：信源仅指出其为 CRDT 适用场景。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-collaborative-doc-editor-design.md`（含 LSEQ/RGA/CRDT 文档引擎的 Java 参考实现与向量时钟合并逻辑）

## Related Knowledge（相关知识）

- [[collaborative-doc-editor-design|信源：设计一个在线文档协同编辑系统]]
- [[ot-vs-crdt|OT vs CRDT]]
