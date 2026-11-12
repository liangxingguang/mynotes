---
id: wiki-source-2026-11-12-ai-agent-tech-overview
type: source
title: AI Agent 技术全景解析 —— 从提示词工程到高级智能体构建
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: medium
tags:
  - source
  - ai-agent
  - overview
sources:
  - raw/sources/ai/2026-11-12-ai-agent-tech-overview.md
related:
  - wiki/concepts/prompt-engineering.md
  - wiki/concepts/rag.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/mcp.md
---
# AI Agent 技术全景解析 —— 从提示词工程到高级智能体构建

## Overview（概览）

vivo 互联研发效能团队（Wu Qinghua）的一篇 AI Agent 技术全景综述。按"基石 → 核心 → 实战"的因果链组织：从提示词工程（如何精准传达意图）、上下文工程/RAG（如何接入外部知识）、Harness 工程（如何让模型持续可靠运行），到 ReAct 自主循环（如何赋予自主决策与执行能力）、工具/MCP/技能（如何行动）、记忆与知识库（如何积累）、多智能体协作（如何组织），最后给出四大应用场景、五大避坑要点与生产部署 Checklist。核心目标是构建能自主规划、调用工具、交付结果的"数字员工"。

## Key Facts（关键事实）

- 文章主线：人写 prompt 让 LLM 执行 → LLM 自主规划执行；前一步跑不动才催生下一步（提示词工程→RAG→Harness→ReAct→多智能体）。
- 规划范式三代演进：Plan-then-Execute（静态计划）→ ReAct（推理行动交错，当前主流）→ Tree of Thoughts/MCTS（可回溯，成本高，研究阶段）。
- Agent 核心循环五环节：目标理解→规划→执行→观察→反思修正；运行机制含 maxIters（默认 10）、并发工具调用、权限闸门（允许/询问/拒绝）、中断恢复。
- RAG vs 微调核心区别：微调改变模型"能力"（怎么回答），RAG 改变模型"输入"（基于什么回答）；事实性知识适合 RAG，行为模式/领域推理适合微调。
- Harness 核心扩展机制是 Middleware 洋葱模型，内置能力（压缩/记忆/子 Agent/Plan Mode）全部以 middleware 形式钩在 ReAct 循环上。
- MCP 定义三种连接方式：STDIO（本地进程）、SSE（HTTP 长连接）、Streamable HTTP（HTTP 流式，现代推荐）。
- 长期记忆三操作：Flush（抽取事实→日流水）、Consolidation（合并到 MEMORY.md，默认 30min 一次）、Compaction（前缀蒸馏摘要，超阈值触发）。
- 多智能体四种协作模式：层级式（Supervisor）、辩论式（Debate）、流水线式（Pipeline）、Handoffs（交接）。
- 生产部署 Checklist 十项：状态存储、maxIters、STRICT 权限、沙箱、压缩、大结果卸载、可观测性、降级方案、成本监控、隐私脱敏。

## Important Claims（重要论断）

### Agent 的本质是工程基础设施，而非更聪明的模型

> Agent 技术的本质，不是让 AI 变得更"聪明"，而是给 AI 搭一套"工程基础设施"——让它从"灵光一闪的问答"变成"可靠运转的系统"。

### 控制权从开发者转移到 LLM

传统程序的控制流由开发者写死；Agent 的控制流由 LLM 在运行时动态决定。开发者不再编写"执行逻辑"，而是编写"执行框架"——框架定义 LLM 可以在哪些点做什么决策，具体决策内容由 LLM 根据上下文判断。

### RAG 与微调不互斥，按知识类型分工

事实性知识适合 RAG（可更新、可溯源），行为模式/领域推理能力适合微调。实际系统常常组合使用。

### Tool / Skill / Subagent 是不同层次的抽象

Tool 是"手脚"（函数调用），Skill 是"方法手册"（工作流指令），Subagent 是"另一个大脑"（完整推理循环）。三者不互斥：子 Agent 内部会用到工具，也可能加载 Skill。

## Concepts Introduced（引入的概念）

- [[rag|RAG（检索增强生成）]]
- [[prompt-engineering|提示工程（Prompt Engineering）]]
- [[harness-engineering|Harness Engineering]]
- [[agent-loop|Agent Loop]]
- [[mcp|MCP]]
- [[context-management|上下文管理]]
- [[agent-memory-system|Agent 记忆系统]]

## Entities Mentioned（提及的实体）

文章以 AgentScope 2.0 为主要实现示例，并横向对比 LangChain、LlamaIndex 三个编排框架（作为框架在 [[harness-engineering|Harness Engineering]] 选型对比中收录，未单独立实体页）。

## Implications（影响／启示）

- 判断任务是否适合 Agent 的核心标准：是否需要"多步推理 + 动态决策 + 外部工具"。只需一次 LLM 调用就能完成的任务，用 Agent 是杀鸡用牛刀。
- 生产环境必须配 maxIters 上限、权限闸门、沙箱隔离、上下文压缩、大结果落盘——缺任何一项都会在生产中出问题。
- Model Routing（主推理用强模型、辅助操作用轻量模型）是常见的成本优化策略，记忆操作用小模型可省约 80% 成本。

## Limitations（局限）

- 单信源综述文章，部分论断（如"CoT 在数学/推理题可提升 20%+"）未给出具体引用来源，为作者经验性陈述。
- 文章以 AgentScope 2.0 为主要实现示例，对 LangChain/LlamaIndex 的描述偏选型对比，未深入其内部机制。
- 配图缺失（原文中的流程图/架构图在采集稿中以空行占位，未文字化）。

## Related Knowledge（相关知识）

- [[prompt-engineering|提示工程]]
- [[rag|RAG]]
- [[harness-engineering|Harness Engineering]]
- [[agent-loop|Agent Loop]]
- [[mcp|MCP]]
- [[agent-memory-system|Agent 记忆系统]]
- [[context-management|上下文管理]]
- [[multi-agent-collaboration-architecture|多 Agent 协作架构]]

## Source（信源）

- `raw/sources/ai/2026-11-12-ai-agent-tech-overview.md`
