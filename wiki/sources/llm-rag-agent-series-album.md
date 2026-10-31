---
id: wiki-source-llm-rag-agent-series-album
type: source
title: LLM/RAG/Agent 实战合集（172 篇：Pi实战/Harness Engineering/RAG实战/MCP实战/LLM基础/OpenClaw）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - source
  - digest
  - ai-agent
  - resource
sources:
  - raw/sources/ai/2026-10-28-llm-rag-agent-series-album.md
related:
  - wiki/sources/ai-agent-series-album.md
  - wiki/entities/pi.md
  - wiki/entities/langgraph.md
  - wiki/entities/learn-harness-engineering-course.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/context-management.md
  - wiki/concepts/mcp.md
  - wiki/concepts/claude-skills.md
  - wiki/concepts/workflow-vs-agent.md
  - wiki/concepts/rag-production-guardrails.md
  - wiki/concepts/agent-permission-model.md
---
# LLM/RAG/Agent 实战合集（172 篇）

## Overview（概览）

微信公众号合集页（biz=MzkwOTAxOTY4Nw，album_id=3391836763593359360），2026-10-28 抓取，含 172 篇文章的目录与原文链接。这是**纯链接目录型合集**：raw 信源页只收录目录与链接（无正文快照），与含全部正文快照的 [[ai-agent-series-album]]（82 篇，另一公众号 biz=Mzk4ODE0NzEzNQ，同日快照）形成对照。文章按倒序编号（编号 1 为最早一篇），Pi 实战系列以 01~17 编号穿插其中。

## Key Facts（关键事实）

- 172 篇，快照日期 2026-10-28；每篇附标题 + 原文链接（mp.weixin.qq.com/s?...）。
- 主要板块（按标题归纳）：
  - **Pi 实战系列 16 篇**（编号 01~17，缺 08）：01 配置（#149）/02 提示词与技能（#151）/03 扩展（#152）/04 多智能体与高级工作流（#153）/05 本地模型·MCP·安全沙箱（#154）/06 日常实战·模式·选型（#155）/07 调试（#157）/09 提示词心法（#158）/10 重构与避坑（#159）/11 上手陌生代码库（#161）/12 TDD（#164）/13 技能实战（#165）/14 树状会话历史（#166）/15 插件/技能工具箱（#168）/16 agent-skills（#169）/17 打造 Claude Code（#172）；另有 #148《用好 Pi》官方文档与社区技巧指南。16 篇正文已单独抓取为独立 Inbox 笔记（2026-10-28-pi-series-full，待摄入）。
  - **Harness / Loop Engineering**：#156 十一个编码智能体源代码解剖、#136 Learn Harness Engineering 12 讲、#131/#132 长周期 Agent Harness 设计（Anthropic 实践）、#135 Claude Code Loop Engineering、#167 Harness² 产品分析。
  - **Claude Code 原理**：#120 架构设计、#121 Agent 编排层、#122 Compact 上下文窗口管理。
  - **RAG 实战**：dify 实现分析系列（#50~#59、#73）、LlamaIndex 系列（#3~#28）、LangGraph 系列（#63~#82）、LightRAG（#31/#37/#38）、Hands_On_LLM RAG 翻译（#41~#43）、BM25（#55）、Chonkie 分块（#108）、Vanna（#95）、Onyx/DAnswer（#46）、qodo（#91）、Augment（#88/#89）、Continue（#87）、Cursor 索引（#83/#84）、Cody（#36）、Tabby（#33/#34）、开源嵌入模型对比（#94）、#138 用小模型扔掉 68% RAG 上下文、#109 Anthropic Agent 上下文工程。
  - **MCP 实战**：#61 概述、#70/#71 本地 Server + Cursor/Client、#97/#98 LangGraph 整合 MCP（本地/远程 SSE）。
  - **LLM 基础**：#66 Token、#71 Tokenizer、#69 Embeddings、#76 Inference、#100 连续/动态批处理、#79 推理引擎 Tokasaurus、#126 DSPy、#150 tokenspeed、#163 约束解码 + 温度校准、#160 本体 vs 语义层。
  - **本地 LLM**：Ollama（#30/#32/#49/#65）、aider + Ollama + DeepSeek-R1（#49）、vscode + ollama + twinny（#32）、本地私有化代码助手。
  - **AI 编程助手与产品分析**：OpenCode（#133/#147）、DeepSeek-TUI（#127）、zerostack（#144）、agentty（#143）、Semble（#130）、DeepInfer（#170）、Orchestrator/Backlog/Nika/Convergo（#139~#142）、#145 2026 年 CLI 编程客户端盘点、#129 LLM CLI、#128 Karpathy LLM Wiki 理念解析。
  - **Agent 设计范式与工程**：#99~#119（提示词链/多条件路由/并行化/工具调用/记忆管理/上下文管理/权限与身份/AGENTS.md/小且专注/任意位置触发）、#112 Addy Osmani 谈"70% 问题"、Agent Skills（#111/#124/#125）、#86 构建高效 Agent 系统、#116 用 AI 高效写代码、#85 Vibe Coding 技术债、#146 AI 编码时代的集体焦虑、#9 Agent 基本概念、#92 从提示工程到上下文工程。
  - **安全与治理**：#74 DoomArena 智能体安全测试、#110 Aardvark、#134 SkillsGuard 技能包扫描、#107 数字身份危机、#115 记忆治理、#137 AI 身份验证与授权。
  - **其他**：#171 单哈希布隆过滤器（Bluesky）、#162 Rust 写操作系统与 AI Agent、#168~#172 杂篇；#35 VC 2025 企业技术预测、#93 吴恩达演讲、#99 Julius AI、#78 Copilot Spaces、#123 Human 软件工厂、#113 PeerLLM、#60/#96 Manus（部署/上下文工程）、#77 LiteLLM、#81/#82 LangGraph 自定义嵌入与人工反馈。

## Important Claims（重要论断）

（合集本身为目录/链接性质，无论断性原创内容；各篇论断归属原作者，待单篇摄入时编译。）

## Concepts Introduced（引入的概念）

（合集层级不开概念页；以下为主题地图，多数已有对应 Wiki 页面：）

- Agent 基础与范式：[[workflow-vs-agent|Workflow vs Agent]]、[[agent-loop|Agent Loop]]、[[pmta-framework|PMTA 框架]]（#9~#19 区域为潜在信源）
- 驾驭与运行时：[[harness-engineering|Harness Engineering]]
- 上下文：[[context-management|Context Management]]（#114/#122/#109/#96 为潜在信源）
- 协议与技能：[[mcp|MCP]]、[[claude-skills|Claude Skills]]（#111/#124/#125/#117 为潜在信源）
- 检索增强：[[rag-production-guardrails|RAG 生产护栏]]（#41~#59 RAG 实战系列为潜在信源）
- 权限与安全：[[agent-permission-model|Agent 权限模型]]（#115/#119/#137 为潜在信源）

## Entities Mentioned（提及的实体）

- [[pi|Pi]]（Pi 实战 01~17 印证其编码 Agent 工程实践定位；16 篇正文待独立摄入）
- [[langgraph|LangGraph]]（实战系列 #63~#82 印证其检索链路/多 Agent/工作流入门定位）
- [[learn-harness-engineering-course|Learn Harness Engineering]]（#136 十二讲课程印证）
- dify、LightRAG、LlamaIndex（RAG 框架实现分析系列密集出现；当前 Wiki 无实体页，单篇摄入时可建）
- Ollama、Cursor、Cody、Tabby、Augment、Continue、qodo（代码库索引/本地 LLM 工具；暂不立实体页）
- OpenClaw：**本合集目录中无一篇标题含 OpenClaw**（见 Limitations），其解剖内容在 [[ai-agent-series-album]]

## Implications（影响／启示）

- 本合集与 [[ai-agent-series-album]] 分属两个公众号、同日快照、主题高度重叠（Pi/Harness/RAG/MCP），合起来构成 2026-10 时点中文 AI 工程内容生态的两份互补快照：前者含全文可深读，本合集为链接目录（解读）。
- RAG 实战板块（dify/LlamaIndex/LangGraph/LightRAG 实现分析系列）是未来精读的信源池：上述框架均无实体页，单篇摄入时按"一篇一 raw"新建信源（解读）。
- Pi 实战 16 篇正文已单独抓取（Inbox/2026-10-28-pi-series-full.md，pending），摄入后可印证/更新 [[pi]] 实体页（解读）。

## Limitations（局限）

- 纯链接目录型合集：raw 只含目录与链接，无正文快照，不能独立支撑任何单篇的事实断言；单篇摄入须按 source_url 重抓原文。
- 采集笔记摘要称板块含"OpenClaw（开源编码 Agent 架构与周边生态）"，但 172 篇目录标题中 OpenClaw 出现 0 次，实际对应板块为 AI 编程助手与产品分析；OpenClaw 内容在另一合集 [[ai-agent-series-album]] 中。
- 摘要称"Pi 实战 17 篇"，但目录编号 01~17 缺 08，实为 16 篇；笔记正文亦称"Pi 实战系列 16 篇正文已单独抓取"。
- 合集页为动态接口数据，2026-10-28 之后的新增篇目不在本信源内。
- 微信链接有时效与反爬风险，单篇重抓可能失败。

## Related Knowledge（相关知识）

- [[ai-agent-series-album|AI Agent 系列合集（82 篇，含全文快照）]]（另一公众号、同日快照，OpenClaw/Pi Harness 解剖所在）
- [[pi|Pi（实体页）]]、[[langgraph|LangGraph（实体页）]]、[[learn-harness-engineering-course|Learn Harness Engineering（实体页）]]
- [[harness-engineering|Harness Engineering（概念页）]]、[[agent-loop|Agent Loop（概念页）]]、[[context-management|Context Management（概念页）]]
- [[mcp|MCP（概念页）]]、[[claude-skills|Claude Skills（概念页）]]、[[workflow-vs-agent|Workflow vs Agent（概念页）]]、[[rag-production-guardrails|RAG 生产护栏（概念页）]]、[[agent-permission-model|Agent 权限模型（概念页）]]

## Source（信源）

- `raw/sources/ai/2026-10-28-llm-rag-agent-series-album.md`（采集稿：`Assets/2026/10/llm-rag-agent-series-album.md`）
