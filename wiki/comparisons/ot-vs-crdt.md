---
id: wiki-comparison-ot-vs-crdt
type: comparison
title: OT vs CRDT
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: high
tags:
  - comparison
  - collaborative-editing
  - distributed-systems
sources:
  - raw/sources/architecture/2026-10-28-collaborative-doc-editor-design.md
related:
  - wiki/concepts/operational-transformation.md
  - wiki/concepts/crdt.md
  - wiki/sources/collaborative-doc-editor-design.md
---
# OT vs CRDT

## Scope（范围）

协同编辑并发收敛的两大算法流派对比：[[operational-transformation|Operational Transformation（OT）]]（中心服务器变换并发操作、调整偏移量）与 [[crdt|CRDT]]（数据结构自带交换律/结合律/幂等性、合并天然无冲突）。证据来自单一信源的系统设计长文。

## Comparison Matrix（对比矩阵）

| Dimension（维度） | OT | CRDT |
|---|---|---|
| 核心思想 | 中心服务器对并发操作做变换，调整偏移量 | 数据结构自带交换律、结合律、幂等性，合并天然无冲突 |
| 一致性保证 | 依赖服务端全序 + CP1/CP2 数学性质 | Lamport 时间戳 + ID 偏序自动排序，数学可证明收敛 |
| 中心服务器 | 强依赖 | 可去中心化，支持 P2P |
| 离线编辑 | 弱，需重放/补偿大量历史操作 | 天然友好，本地先执行、联网自动合并 |
| 实现复杂度 | 极高（变换函数组合爆炸，CP2 验证极难） | 中等（规则固定，但需处理墓碑 GC） |
| 元数据体积 | 小，只存操作 | 大，每字符带唯一 ID，内存膨胀 3~5 倍 |
| 撤销 Undo | 需逆操作 + 重放 | 相对自然 |
| 代表产品 | Google Docs、腾讯文档、飞书 | Figma、Notion（部分）、Yjs、Automerge |
| 适用场景 | 线性文本、在线为主、有中心服务 | 强离线、桌面端、去中心化、结构化数据 |

## Analysis（分析）

两者的取舍点是**是否需要端侧完全自治**（信源论断）：

- OT 把收敛责任集中在服务端：op 体积小、存储低、历史可回放审计，适合网络稳定的中心化在线产品；CRDT 的离线优势在 OT 体系里可用"本地队列 + 重连重放"部分覆盖。
- CRDT 把收敛能力下放到数据结构：天然支持真离线与 P2P，OT 变换函数"写对太难"（CP2 验证），中小团队可直接用 Yjs/Automerge；代价是元数据膨胀（10 万字文档元数据可达 5~10MB，信源口径）与墓碑 GC 负担。
- 迁移路径（信源给出的"加分说法"）：在线文档主链路用 OT 中心定序；未来要做完全离线桌面端、白板/图形结构化数据或去中心化 P2P 时切 Yjs 类 CRDT。

## Best Fit（适用场景）

### OT is preferable when（以下情况 OT 更合适）

- 中心化在线产品，网络稳定、以线性文本为主；
- 需要小 op 体积、低存储、可回放审计的操作历史；
- 有能力投入极高的实现与验证成本（或复用成熟 OT 库）。

### CRDT is preferable when（以下情况 CRDT 更合适）

- 离线优先 / 桌面端 / 去中心化 P2P；
- 中小团队，希望复用 Yjs、Automerge 等成熟开源实现；
- 结构化数据（白板、图形）场景。

## Important Caveats（重要提醒）

- 单一信源来源，矩阵内容是该文作者的归纳；"内存膨胀 3~5 倍""5~10MB"等数字为信源口径，未给测量方法。
- CRDT 的"实现复杂度中等"指有成熟库可用时；自研完整 CRDT（含 GC、压缩）并不简单。
- 信源建议：不要从头自研任一算法，优先基于 Yjs、Automerge 二次开发。

## Evidence（证据）

- `raw/sources/architecture/2026-10-28-collaborative-doc-editor-design.md`（第 4.2/4.3 节对比表与选型建议）
