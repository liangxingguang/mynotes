---
id: wiki-concept-agent-handoff
type: concept
title: Agent 交接（Handoff）
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: medium
tags:
  - concept
  - ai-agent
  - collaboration
sources:
  - raw/sources/ai/2026-11-12-pi-xfer-handoff-network.md
related:
  - wiki/entities/pi-xfer.md
  - wiki/concepts/context-management.md
  - wiki/topics/multi-agent-collaboration-architecture.md
  - wiki/sources/pi-xfer-handoff-network.md
---
# Agent 交接（Handoff）

## Definition（定义）

Agent 之间的正式交接机制：把不同阶段的任务交给不同的 Agent（各自保持干净的上下文窗口），不是把聊天记录复制粘贴过去，而是像人类同事一样准备一份材料、做一次正式交接（信源定义）。交接的交付物是"header + 落盘文档"：投递消息只带协议头，正文以文档形式落到接收方，接收方按需加载。

## Why It Matters（为什么重要）

一个窗口从"一个问题的容器"变成"多个问题共用的池子"，即**上下文腐坏（context rot）**——早期探查代码、被推翻的方案等无关信息持续干扰判断。Agent 时代的瓶颈不是模型能力，是上下文卫生（信源观点）。常规解法（summary / compaction / 子代理）是"把池子里的水重新澄清"，handoff 是另一条路：**根本不让窗口变成池子**，每个阶段用独立窗口，靠交接传递材料（信源观点）。

## Core Characteristics（核心特征）

1. **header + 落盘文档**：消息体只带 header（target / kind / summary）——谁发来的、什么类型、一句话摘要；正文落成文档写到接收方 `$TMPDIR/pi-xfer-<msg_id>.md`，通知附路径。
2. **按需加载（渐进式）**：接收方先读协议文本判断要不要接，决定接了才打开文档展开正文——与 skill 的渐进式加载同一思路，避免无谓的 token 与注意力消耗。
3. **双向与回执**：task 类 handoff 要求接收方处理后回发 reverse handoff（如 pi-xfer 的 alpha→beta 交接要求 beta 以结论回传 alpha）。
4. **材料化而非对话化**：交接文档包含 Context / Problem / Requirements 等结构（信源样例），保证接收方不依赖发方会话历史也能独立推进。

## Structure（结构）

一次 handoff 的组成（信源样例归纳）：

| 部分 | 位置 | 内容 |
| --- | --- | --- |
| header | 消息体 | target（发给谁）、kind（任务类型）、summary（一句话摘要） |
| 正文文档 | 接收方 `$TMPDIR` | Context（背景与已排除项）、Problem（待确认问题）、Requirements（要求与回执约定） |
| 通知 | 消息体 | 附文档路径与处理指引，不含正文 |

## How It Works（运作方式）

交接的运作闭环（以 pi-xfer 为例，信源）：

1. 发方在 A 会话排查问题，判断根因在 B 会话的改动 → 准备交接文档（背景、问题、要求）。
2. 投递：消息只带 header，正文落盘到 B 的 `$TMPDIR`，通知附路径。
3. B 先读协议判断是否接手 → 接手则读文档 → 处理并回发 reverse handoff（task 类要求输出结论）。
4. 跨机场景下文档无法以路径引用（对端打不开），文档内联进消息帧完整展示。

## Relationships（关系）

### Related Concepts（相关概念）

- [[context-management|上下文管理]]：handoff 是压缩之外解决上下文腐坏的路径——不澄清池子，而是不造池子。
- [[pi-xfer]]：handoff 机制的开源实现（本地 socket、adapter、浏览器、跨机多形态接入）。

### Dependencies（依赖项）

- 依赖 Agent 间可寻址的消息通道（如 pi-xfer 的 unix socket / SSH Link / Mesh 引擎）。

### Distinctions（区分）

- **handoff vs 压缩（summary/compaction）**：前者换窗口保干净，后者在原窗口内澄清；不互斥，成熟 harness 可组合使用（解读）。
- **handoff vs 子代理隔离**：子代理是主上下文委派；handoff 是平级 Agent 间的材料化交接，接收方独立上下文、独立推进（解读）。

## Evolution（演进）

- 2026-11-12 — 新建。信源为知乎文章《我给 pi 做了一个交接工具，后来它长成了一张网络》：提出"上下文卫生"问题与 handoff 方案（header + 落盘文档 + 按需加载 + 反向回执），并以 pi-xfer 的多形态网络为落地实例。单信源，置信度中。

## Open Questions（开放问题）

- handoff 的规模化问题：大量并发交接时文档管理、去重与失败重试策略，信源未覆盖。
- handoff 与任务看板/持久化（ticket 模型）的组合方式，待更多信源补充。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-12-pi-xfer-handoff-network.md`

## Related Knowledge（相关知识）

- [[pi-xfer-handoff-network|我给 pi 做了一个交接工具，后来它长成了一张网络（信源页）]]
- [[pi-xfer]]（实现实体）
- [[multi-agent-collaboration-architecture|多 Agent 协作架构与控制权下沉]]（Handoffs 是四种协作模式之一）
- [[context-management]]
