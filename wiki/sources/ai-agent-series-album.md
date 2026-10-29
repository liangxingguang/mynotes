---
id: wiki-source-ai-agent-series-album
type: source
title: AI Agent 系列合集（82 篇：官方指南 / Context Engineering / OpenClaw / 跟我学 AI Agent / Pi Harness）
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: medium
tags:
  - source
  - digest
  - ai-agent
  - resource
sources:
  - raw/sources/ai/2026-10-28-ai-agent-series-album.md
related:
  - wiki/sources/learn-pi-agent-01-llm-to-agent.md
  - wiki/sources/harness-engineering-11-agents-study.md
  - wiki/entities/pi.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/context-management.md
  - wiki/concepts/mcp.md
  - wiki/concepts/a2a-protocol.md
  - wiki/concepts/workflow-vs-agent.md
  - wiki/concepts/rag-production-guardrails.md
---
# AI Agent 系列合集（82 篇）

## Overview（概览）

公众号（ biz=Mzk4ODE0NzEzNQ ）的 AI Agent 主题合集页（album_id=4029823410275598350），2026-10-28 抓取，含 82 篇文章的目录与**全部正文快照**（约 74 万字符，raw 信源页逐字收录）。与纯目录型合集不同，本信源自带全文证据，可支撑后续单篇精读与概念编译。

## Key Facts（关键事实）

- 82 篇按合集顺序排列（倒序编号，第 1 篇为最新），每篇附原文链接；目录与正文均为 2026-10-28 快照。
- 五大板块：① 大厂官方指南——Anthropic《构建有效的 Agent》、OpenAI《构建 Agent 的实用指南》、Google Agents 白皮书、Google Prompt Engineering 白皮书、Anthropic 多智能体研究系统、17 种提示词工程实测（#1~#6）；② Context Engineering——LangChain 剖析、Manus 经验教训与论文解读、长上下文失效与修复（#7~#12、#19）；③ OpenClaw 技术解剖四篇（记忆架构 / 递归决策引擎 / 工具分类学 / 运行时与可编程认知，#21~#24）及微信插件、OpenCode 对比、Hermes 等周边（#26~#41）；④ 跟我学 AI Agent 17 课（#42~#58）：LLM→Agent、Prompt Chaining、Routing、Parallelization、Tool Use、Reflection、Planning、Multi-Agent、Memory、RAG+MCP、Learning & Goal Setting、HITL、Guardrails、Evaluation、Reasoning、A2A；⑤ 深入浅出 Pi Harness 11 篇（#71~#82）：Chord Delta、SQLite 保存工作现场、Document/Task/Conversation 状态设计、流式流水线、Durable Subagent、Mini-Harness、Code Mode。
- 其余散篇覆盖 Agentic Workflows、RAG 笔记 4 篇、MCP Apps、Loop/Graph/Harness Engineering 概念辨析、极简 RAG、DeepSeek Harness 的 Cordis 运行时、Jev、2026 上半年大模型总结、智谱 RSI 报告解读等。

## Important Claims（重要论断）

（合集本身为编纂/转载性质，无论断性原创内容；各篇论断归属原作者，待单篇摄入时编译。）

## Concepts Introduced（引入的概念）

（合集层级不开概念页；以下为主题地图，多数已有对应 Wiki 页面：）

- Agent 基础：[[workflow-vs-agent|Workflow vs Agent]]、[[agent-loop|Agent Loop]]
- 上下文：[[context-management|Context Management]]、Context Engineering（未立页，合集 #7~#12/#19 为潜在信源）
- 驾驭与运行时：[[harness-engineering|Harness Engineering]]
- 协议：[[mcp|MCP]]、[[a2a-protocol|A2A]]
- 检索增强：[[rag-production-guardrails|RAG 生产护栏]]

## Entities Mentioned（提及的实体）

- [[pi|Pi]]（Pi Harness 系列 11 篇 + pi-mono 框架全景，与已有实体页大量重叠）
- OpenClaw（龙虾，合集 #21~#41 的解剖对象；当前 Wiki 无实体页，本合集可作未来建立时的主要信源）
- Manus、LangChain、DeepSeek Harness、Hermes、Jev、OpenCode（合集散篇提及，暂不立实体页）

## Implications（影响／启示）

- 该合集是一份 2026-10 时点的中文 AI Agent 学习路线快照：官方指南 → 上下文工程 → 开源实现解剖（OpenClaw/Pi）→ 模式课程（17 课），可作为后续主题精读的信源池（解读）。
- 与 Wiki 已有知识高度重叠：[[learn-pi-agent-01-llm-to-agent|跟我学 AI Agent 第 1 课]]已单独摄入；Pi 实体页与 [[harness-engineering-11-agents-study|Harness Engineering 源码研究]]已覆盖相邻主题——本合集的首要价值是全文留证与索引，而非重复编译（解读）。

## Limitations（局限）

- 合集为同一公众号自产/转载内容；官方指南板块是**译文转载**（如 Anthropic 文标注"本文译自"），非一手原文，引用时应回溯原始出处。
- 目录标题存在抓取重复（同一标题出现两遍，如「Anthropic:构建有效的Agent Anthropic:构建有效的Agent」），以正文为准。
- 合集页为动态接口数据，2026-10-28 之后的新增篇目不在本信源内。

## Related Knowledge（相关知识）

- [[learn-pi-agent-01-llm-to-agent|跟我学 AI Agent 第 1 课（信源页）]]（合集 #42 的独立摄入版）
- [[harness-engineering-11-agents-study|从 11 款 Agent 源码研究看 Harness Engineering（信源页）]]（与合集 #65 同主题）
- [[pi|Pi（实体页）]]（合集 #71~#82 Pi Harness 系列与 #43 pi-mono 全景的沉淀处）
- [[harness-engineering|Harness Engineering（概念页）]]、[[agent-loop|Agent Loop（概念页）]]、[[context-management|Context Management（概念页）]]
- [[mcp|MCP（概念页）]]、[[a2a-protocol|A2A 协议（概念页）]]、[[workflow-vs-agent|Workflow vs Agent（概念页）]]、[[rag-production-guardrails|RAG 生产护栏（概念页）]]

## Source（信源）

- `raw/sources/ai/2026-10-28-ai-agent-series-album.md`
