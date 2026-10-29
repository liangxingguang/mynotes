---
id: wiki-concept-context-management
type: concept
title: 上下文管理（Context Management）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - concept
  - ai-agent
  - context-management
sources:
  - raw/sources/ai/2026-10-28-agent-loop-context-management.md
related:
  - wiki/concepts/agent-loop.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/llm-call-protocol.md
---
# 上下文管理（Context Management）

## Definition（定义）

上下文窗口（context window）是模型一次能处理的最大 token 数（OpenClaw compaction 文档定义原文，信源 §3.1 引用核验）；由于 agent loop 每轮都**全量重发** messages，窗口是一块有预算的内存。上下文管理就是管住 messages 体积的全部工程手段——PMTA 里 M 要素在单会话内（in-context）这一层的实现。

## Why It Matters（为什么重要）

「agent 忘事」不是玄学，是「上下文放不下 / 被裁掉了 / 太贵了」三种现实问题。轮次越多、工具结果越大，预算烧得越快；窗口满了模型立刻失真（早期指令被挤掉）。成本侧每轮按输入 token 计费，不管预算就等于烧钱。

## Core Characteristics（核心特征）

1. **token 预算视角**：messages 每轮全量重发（非增量缓存）；工具结果（命令输出、文件内容）是增长最快的部分——一次读入大文件可烧掉一大截。中文 1 字 ≈ 0.6~2 token，比英文「占地」更大。
2. **忘事的几种病**：跨会话失忆（没写进去，in-context 记忆的天然边界）vs 会话内被挤掉（写进去了但窗口满了）——后者是本概念的主战场，前者靠会话外记忆（P4·11 三层记忆）解决。
3. **第一原则**：不是技巧，是「只留这次任务接下来还能用到的」，其余交给压缩/总结；确定性规则放系统指令/持久文件（如 CLAUDE.md），不依赖对话历史。

## Structure（结构）

三种手段（信源 §3.4，不互斥，成熟 harness 打组合拳）：

| 手段 | 做法 | 优点 | 代价 |
| --- | --- | --- | --- |
| 裁剪（truncation） | 直接丢掉最旧消息 | 零成本、实现五行 | 永久丢失，只适合「旧的确实没用了」 |
| 压缩（compaction） | 旧对话总结成摘要替换原文；或近 N 轮原始 + 更早压缩 | 保留要点、可聚焦 | 有损：细节丢失、摘要可能漏关键约束；多花一次模型调用 |
| 隔离（isolation） | 整块工作交给 subagent（独立窗口） | 主上下文几乎不涨 | 跨窗口只能靠摘要回传；多一次模型成本 |

Claude Code 官方做法分两层（信源 §3.4 引用核验）：先清旧工具输出（裁剪：最大且时效最短），不够再总结对话（压缩），用户请求与关键代码片段优先保留。

## How It Works（运作方式）

两条工程铁律（信源 §3.5，均出自 OpenClaw/Claude Code 官方文档）：

1. **工具调用与结果必须成对保留**——裁掉 assistant 的 tool_calls 却留下孤立 tool 结果会把模型搞糊涂（协议上这些消息必须配对，见 [[llm-call-protocol]]）。
2. **磁盘全量、窗口有损**——「The full conversation history stays on disk. Compaction only changes what the model sees on the next turn.」可见性与有损性分离，永远可回查原文。

配套机制：`/compact`（手动压缩，可带聚焦指令——有损所以要让用户指定保什么）、`/context`（先看见开销）；**压缩本身也要有终止条件**——单文件大到「压缩完立刻又满」时 Claude Code 报 thrashing error 而非无限循环。设计规则三条：当前任务必要事实留窗口；确定性规则进持久文件；超大工具结果先在工具端截断/摘要再进窗口。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-loop|Agent Loop]]：messages 是 Loop 唯一跨轮存活的内部状态，上下文管理管的就是它的体积；压缩防循环是 Loop 终止条件的相邻问题。
- [[harness-engineering|Harness Engineering]]：上下文管理是 harness「上下文与记忆」观察面 / 第八件套的落点。
- [[llm-call-protocol|OpenAI 兼容调用协议]]：成对保留约束的协议层来源（tool_call_id 配对）。

### Distinctions（区分）

- **in-context 记忆 vs 会话外记忆**：本概念只管前者；跨会话的工作记忆/长期记忆、向量检索与 RAG 是另一层（该系列 P4·11 主题）。
- **压缩 vs 摘要续接**：同族手段，前者会话内替换原文，后者跨会话以「上下文：会话摘要」开场。

## Evolution（演进）

- 2026-10-29 — 新建，信源为知乎《Agent》系列第 3 篇（Claude Code / OpenClaw 官方文档行为均经作者 2026-10-15 实测核验）。

## Open Questions（开放问题）

- 三层记忆（工作记忆 Redis / 长期记忆 pgvector）与 RAG 的分界，待该系列第 11 篇信源补充。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-loop-context-management.md`

## Related Knowledge（相关知识）

- [[agent-loop-context-management|Agent - agent loop 与上下文管理（3）（信源页）]]
