---
id: wiki-source-llm-master-learning-roadmap
type: source
title: 全网硬核大模型应用开发（Agent、RAG）学习路线+配套资源，在 GitHub 开源
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: high
tags:
  - source
  - ai
  - agent
  - rag
  - learning
sources:
  - raw/sources/ai/2026-11-23-llm-master-learning-roadmap.md
related:
  - wiki/entities/llm-master.md
  - wiki/concepts/rag.md
  - wiki/concepts/agent-loop.md
---
# 全网硬核大模型应用开发（Agent、RAG）学习路线+配套资源，在 GitHub 开源

## Overview（概览）

作者将多年大模型技术文章整理为开源仓库 `youngyangyang04/llm-master`，定位"程序员的大模型全栈学习路线"，含 172 个 Markdown 文件、150+ 篇中文教程，按六阶段组织，每阶段配可交付项目，并连带面试路线，形成知识—项目—简历—面试闭环。作者称其为"目前全网最完整、最适合程序员的大模型应用开发学习路线之一"。

## Key Facts（关键事实）

- **仓库定位**：https://github.com/youngyangyang04/llm-master，面向程序员的大模型全栈学习路线，持续更新；含 172 个 Markdown 文件、150+ 篇中文教程。
- **六阶段路线**（按知识依赖排序，每阶段标注完成标志）：①全局认知（岗位、术语、技术版图）→②模型调用（Prompt、流式输出、结构化输出、Function Calling）→③RAG（切片、Embedding、检索、Rerank、引用、评估）→④Agent（工具、状态、规划、记忆、权限、失败恢复）→⑤生产工程（部署、缓存、量化、压测、监控、容量规划）→⑥原理与面试（Transformer 原理 + 项目表达）。
- **覆盖范围**：基础入门、应用开发、RAG、Agent、微调（SFT/RLHF/DPO/LoRA/QLoRA/蒸馏及与 RAG 选型）、部署性能（vLLM/SGLang/KV Cache/PagedAttention/量化/压测）、Transformer（Q/K/V/Attention/位置编码/FFN/LayerNorm/手写实现）、AI 编程（Claude Code/Agent CLI/Skills/Hooks/MCP）、求职面试（RAG/Agent/微调/Transformer/AI 编程/真实面经）。
- **索引体系**：除路线外有全量资料索引与专题索引（docs/README.md），可当课程从头学，也可当手册按问题查。
- **可交付项目**：流式 AI 应用（流式输出/JSON Schema/错误处理/成本统计）、含混合检索+Rerank+答案引用+固定评测集的企业知识库、可追踪/可中断/可恢复/可评估的工具型 Agent、生产化服务（限流/缓存/监控/灰度/P99/TTFT/TPOT/容量报告）。
- **使用建议**：零基础从 roadmap 六阶段起步；有 API 经验直接进 RAG/Agent 专题边看边做；求职从面试路线切入，练"业务—选型—设计—评估—优化"表达；遇具体问题查全量索引。
- **作者观点**：学习最终要落到作品上，RAG 不是"看完几篇文章"算学会，而是要做出含混合检索/引用/评测集的知识库；Agent 不是调通一次工具调用，而是要可追踪/可中断/可恢复/可评估。衡量文章含金量看转发量而非阅读量（公众号有推荐机制，水文也能冲阅读量）。

## Important Claims（重要论断）

### Claim 1：学习路线要落到可交付作品上

很多"学习路线"只列课程清单，真正开始学不知先看哪个。LLM Master 按知识依赖拆六阶段并标注每阶段完成标志，给每阶段安排可交付项目——RAG 须做出含混合检索/答案引用/离线评测集的知识库，Agent 须可追踪/可中断/可恢复/可评估。学习最终要落到作品上，这才是程序员真正能执行的路线。

### Claim 2：衡量文章含金量看转发量而非阅读量

公众号有推荐机制，很多水文也能冲阅读量；真正看一篇文章的含金量看转发量——读者是否想把它分享给其他人。

### Claim 3：知识、项目、简历、面试形成完整闭环

从应用到原理、从 Demo 到生产、从学习到求职几条线连在一起：项目做完可顺面试路线准备（含高频题与真实面经），形成知识—项目—简历—面试闭环。

## Concepts Introduced（引入的概念）

- [[rag]]
- [[agent-loop]]

## Entities Mentioned（提及的实体）

- [[llm-master|LLM Master（llm-master 仓库）]]
- vLLM、SGLang（部署推理框架）
- Claude Code、MCP（AI 编程工具与协议）

## Implications（影响／启示）

- 大模型应用开发学习可按"全局认知→模型调用→RAG→Agent→生产工程→原理与面试"的知识依赖顺序推进，每阶段以可交付项目为完成标志。
- 学习资料的组织应兼顾"按路线从头学"与"按问题查手册"两种用法，专题索引与全量索引是规模化学习的必要基础设施。

## Limitations（局限）

- 单信源、作者自述与自报规模数据（172 个文件、150+ 篇教程），未给独立核验；仓库规模与内容会随持续更新变化。
- "全网最完整"为作者主观判断，未做横向对比验证。
- 抓取稿配图原位为 1px 占位符（公众号抓取常态），文字内容完整。

## Related Knowledge（相关知识）

- [[llm-master|LLM Master（llm-master 仓库）]]
- [[rag|RAG（检索增强生成）]]
- [[agent-loop|Agent Loop]]

## Source（信源）

- `raw/sources/ai/2026-11-23-llm-master-learning-roadmap.md`
- 原文：https://mp.weixin.qq.com/s/guiPm_5D2xKutVZoEsdR-g
- 仓库：https://github.com/youngyangyang04/llm-master
- 路线：https://github.com/youngyangyang04/llm-master/blob/main/docs/roadmap/README.md
- 索引：https://github.com/youngyangyang04/llm-master/blob/main/docs/README.md
