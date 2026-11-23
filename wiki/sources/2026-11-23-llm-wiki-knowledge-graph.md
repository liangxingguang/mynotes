---
id: wiki-source-llm-wiki-knowledge-graph
type: source
title: LLM-Wiki：基于知识图谱的本地知识库系统
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - source
  - ai
  - rag
  - llm-wiki
sources:
  - raw/sources/ai/2026-11-23-llm-wiki-knowledge-graph.md
related:
  - wiki/concepts/llm-wiki.md
  - wiki/concepts/rag.md
  - wiki/comparisons/rag-vs-graphrag-vs-deepsearch.md
---
# LLM-Wiki：基于知识图谱的本地知识库系统

## Overview（概览）

RAG 系列第六篇。先指出 RAG 的三大先天问题（chunk 切分粒度难控、向量召回语义鸿沟、信息碎片化丢失时序），再给出 LLM-Wiki 这一对 RAG 的**补充**方案：用大模型作"知识编译器"把原始资料编译为互相引用的 Wiki（Obsidian 存储），检索由 Skill 控制、CLI 执行，以图谱遍历方式支撑关联分析与深度推理。文章以采购合同知识库为实战例，并对比 RAG / LLM-Wiki / DeepSearch 三种架构与 GraphRAG。

## Key Facts（关键事实）

- **RAG 三大先天问题**：① chunk 切分粒度难控（切太碎丢上下文、切太大带噪声）；② 向量召回语义鸿沟（query 是问题、chunk 是陈述，语义空间不一致）；③ 信息碎片化（丢失时序与整体上下文）。滑动窗口、HyDE、重排、上下文扩充都只是补丁。
- **三层定位**：RAG 是基础层（向量相似度、事实快答）、LLM-Wiki 是增强层（知识图谱遍历、关联分析与深度推理）、DeepSearch 是扩展层（多轮搜索+验证、开放域实时查询），三者互补而非互斥。
- **核心架构**：原始资料 → LLM 知识编译器 → Wiki 知识库（Obsidian 存储）→ 对 Wiki 问答。Wiki 的本质是知识间通过 `[[双括号]]` 引用互链成图。
- **非现成框架**：LLM-Wiki 不是完整开源框架，是概念 + AI Coding 实现，考验架构与设计能力。
- **实战（采购合同知识库）**：`agent.md` 作工作规范，LLM 将合同抽取为 JSON 再转 MD；`sources/` 存原件，wiki 页用双括号引用实体/概念，点按跳转形成图谱；Obsidian 仅作存储管理，建索引专门解析双括号。
- **检索设计**：Obsidian CLI 承担复杂检索（避免全量塞入撑爆上下文）；`index.md` 作为检索入口目录，先读目录再定位实体；智能体加载 Skill 执行查询。
- **三 Skill 协作**：Knowledge-Recall（优先级最高，扫 index 命中既有知识直接复用）→ Wiki-Query（未命中时完整检索）→ Knowledge-Capture（回答后沉淀为新文档），越用越聪明、越用越快。
- **选型建议**：文档量大用 RAG，文档量少但需深度问答/总结用 Wiki；复杂整体性问题（如"哪些饭店用了预制菜"）传统 RAG 难解，Wiki 擅长。
- **先天条件**：依赖强基模（文中用 32B，换小模型效果立降）、上下文长度要求高、速度慢。
- **与 GraphRAG 区别**：LLM-Wiki 用 Wiki 链接模拟图谱（文档型），GraphRAG 用图数据库存图谱（计算型）。

## Important Claims（重要论断）

### Claim 1：RAG 三大先天问题是 LLM-Wiki 的诞生动机

RAG 的 chunk 粒度、语义鸿沟、信息碎片化三类问题，现有技巧（滑动窗口/HyDE/重排/上下文扩充）只是打补丁，LLM-Wiki 是针对这些情况提出的概念。这些补丁各自只解决一类问题，无法整体解决宏观、总结、强关联类知识。

### Claim 2：LLM-Wiki 是 RAG 的补充而非替代

RAG、LLM-Wiki、DeepSearch 三者互补而非互斥：RAG 处理简单查询、LLM-Wiki 处理复杂关联查询、DeepSearch 处理开放域实时查询。RAG 检索出的是碎片化内容，擅长单点事实；涉及整体性问题（跨多份合同、需大量理解）时传统 RAG 难解，LLM-Wiki 作用更大。

### Claim 3：检索由 Skill 控制、CLI 执行

LLM-Wiki 所有检索由 Skill 控制、由 CLI 执行——检索的数据如何组织、检索哪些东西全由 Skill 决定，复杂检索功能全部在 Obsidian CLI 里。把 CLI 放进 Skill、由智能体加载执行，避免把大量内容一次性塞入大模型撑爆上下文。RAG 偏工作流，LLM-Wiki 是真正的智能体（直接加载 Skill 做检索）。

### Claim 4：GraphRAG（计算型）vs LLM-Wiki（文档型）

两者都用知识图谱，核心定位不同：LLM-Wiki = 用 Wiki 链接模拟图谱关系（文档型）；GraphRAG = 用图数据库存图谱关系（计算型）。

## Concepts Introduced（引入的概念）

- [[llm-wiki]]
- [[rag]]
- [[deepsearch]]
- [[graphrag]]

## Entities Mentioned（提及的实体）

- Obsidian（Wiki 存储与 CLI 检索载体）
- DeepSearch
- GraphRAG（微软开源图增强 RAG 方案）

## Implications（影响／启示）

- LLM-Wiki 把"整理"沉淀为可复用知识（越用越聪明），与 RAG 每次临时检索片段形成对比；适合文档量适中但需深度问答与关联分析的场景。
- 以 Skill 暴露问答能力，可与 Dify、LangChain、OpenClaw、WorkBuddy 等智能体产品天然接入。

## Limitations（局限）

- 依赖强基模（文中用 32B）与长上下文，换小模型效果立降；速度慢是先天问题。
- 非现成开源框架，需自行以 AI Coding 实现，考验架构与设计能力。
- 配图原位为 1px 占位符（公众号抓取常态），图示内容未保留，文字内容完整。

## Related Knowledge（相关知识）

- [[llm-wiki|LLM Wiki]]
- [[rag|RAG（检索增强生成）]]
- [[deepsearch|DeepSearch（Agentic 循环检索 RAG）]]
- [[rag-vs-graphrag-vs-deepsearch|传统 RAG vs GraphRAG vs DeepSearch]]
- [[graphrag|GraphRAG（图检索增强生成）]]

## Source（信源）

- `raw/sources/ai/2026-11-23-llm-wiki-knowledge-graph.md`
