---
id: wiki-concept-rag
type: concept
title: RAG（检索增强生成）
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: high
tags:
  - concept
  - ai
  - llm
sources:
  - raw/sources/ai/2026-11-12-ai-agent-tech-overview.md
related:
  - wiki/concepts/prompt-engineering.md
  - wiki/concepts/context-management.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/harness-engineering.md
---
# RAG（检索增强生成）

## Definition（定义）

RAG（Retrieval-Augmented Generation，检索增强生成）是一种在 LLM 生成前先从外部知识库检索相关文档片段、将其注入上下文的技术，使模型基于检索到的真实文档回答，而非仅依赖训练数据中的记忆。核心思想是"不把所有知识塞进 LLM，而是在需要时按需检索"——类比人不需要背下百科全书，遇到问题去查即可。

## Why It Matters（为什么重要）

LLM 的训练数据有截止时间，且无法覆盖私有知识（公司制度、产品文档、客户数据等）。RAG 解决了两个关键问题：①**知识过时**——知识库可随时更新，无需重新训练；②**幻觉**——模型基于检索到的真实文档回答，而非凭空编造。RAG 是 Agent 连接外部知识库的基础，也是 [[context-management|上下文管理]] 中"外部知识注入"环节的主要技术路径。

## Core Characteristics（核心特征）

1. **检索与生成分离**：知识不"融化"在模型权重中，而是存储在外部知识库，按需检索。这是与微调的根本区别——微调改变模型"能力"（怎么回答），RAG 改变模型"输入"（基于什么回答）。
2. **向量检索为主流实现**：文档切块 → embedding 模型转成向量 → 查询向量与文档向量计算余弦相似度 → 取 Top-K。embedding 将语义相近的文本映射到空间相近的向量，比关键词匹配强——关键词找"字面相同"，向量检索找"意思相近"。
3. **进阶变体丰富**：朴素 RAG（检索 Top-K 拼入 prompt）之上有混合检索、查询改写、分块策略、多跳检索等变体持续提升效果。
4. **与 Agent 的关系**：RAG 是 Agent 获取静态领域知识的主要来源（公司制度、产品文档、行业规范），在 [[agent-loop|Agent Loop]] 的"规划"和"执行"环节提供参考。知识库管"静态领域知识"，[[agent-memory-system|记忆系统]] 管"Agent 经历的事实"，两者分工不同。

## Structure（结构）

RAG vs 微调对比（信源 2026-11-12）：

| 维度 | 微调（Fine-tuning） | RAG |
|---|---|---|
| 知识更新 | 需要重新训练，成本高 | 更新知识库即可，即时生效 |
| 知识溯源 | 知识"融化"在权重里，无法追溯 | 可以引用具体文档来源 |
| 幻觉风险 | 模型可能"编造"学过的知识 | 基于检索到的真实文档回答 |
| 计算成本 | 训练 + 推理都贵 | 只需推理时多一次检索 |
| 适合 | 改变模型的"风格/能力" | 注入"事实性知识" |

两者不互斥，实际系统常组合使用。

## How It Works（运作方式）

**向量检索流程**：

1. **文档预处理**：文档切成片段（通常 200-500 token 一段），每个片段用 embedding 模型转成向量（几百到几千维浮点数数组）
2. **查询向量化**：用户问题用同一个 embedding 模型转成向量
3. **相似度计算**：问题向量与每个文档向量的余弦相似度，取最相关的 Top-K
4. **注入生成**：Top-K 文档片段拼入 prompt，LLM 基于检索内容生成回答

**进阶变体**（信源 2026-11-12）：

- **混合检索**：向量检索（语义）+ 关键词检索（BM25，精确匹配）+ 重排序，取长补短
- **查询改写**：LLM 先把用户问题改写得更适合检索（如"那个报销的事" → "差旅费报销标准 流程"）
- **分块策略**：按语义切分而非固定长度，或用父子文档（检索子块、返回父块获取更多上下文）
- **多跳检索**：第一轮检索结果中发现新线索，再检索一轮（适合需要推理的问题，如"A 公司的 CEO 之前在哪家公司"）

**知识库 vs 记忆 vs 技能**（容易混淆的三层，信源 2026-11-12）：

| 维度 | 记忆（Memory） | 知识库（Knowledge Base） | 技能（Skill） |
|---|---|---|---|
| 内容 | Agent 经历的事实 | 外部静态领域知识 | 工作流指令（"怎么做"） |
| 来源 | 对话中自动提炼 | 预先准备好的文档 | 人工/Agent 起草 |
| 性质 | 动态积累 | 静态参考 | 流程指导 |
| 类比 | 个人日记 | 百科全书 | SOP 手册 |

## Relationships（关系）

### Related Concepts（相关概念）

- [[context-management|上下文管理]]：RAG 检索结果需纳入上下文预算管理，是上下文注入环节的主要技术
- [[prompt-engineering|提示工程]]：RAG 检索到的文档片段需通过提示工程有效组织，影响模型对检索内容的关注
- [[agent-loop|Agent Loop]]：RAG 为 Agent 提供静态知识，在"规划"与"执行"环节提供参考
- [[harness-engineering|Harness Engineering]]：RAG 作为 Agent 的内置能力之一，以 middleware 形式接入 ReAct 循环

### Distinctions（区分）

- **RAG vs 微调**：微调改变模型"能力"（怎么回答），RAG 改变模型"输入"（基于什么回答）。事实性知识走 RAG，行为模式/领域推理走微调。
- **知识库 vs 记忆**：知识库是外部静态领域知识（预先准备好的文档），记忆是 Agent 经历的事实（对话中自动提炼）。

## Evolution（演进）

- 2026-11-12 — 新建，信源为 vivo《AI Agent 技术全景解析》。文章系统梳理了 RAG 的核心流程（向量检索）、RAG vs 微调对比、进阶变体（混合检索/查询改写/分块策略/多跳检索）与知识库/记忆/技能三层分工。

## Open Questions（开放问题）

- 多跳检索与推理增强（CoT/ToT）的协同：多跳检索本身已含推理，与提示层推理增强如何配合？
- 向量检索与关键词检索的最优混合比例：不同领域是否有最佳配置？

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-12-ai-agent-tech-overview.md`（vivo Agent 全景综述，2026-11-12，RAG 流程/对比表/进阶变体）

## Related Knowledge（相关知识）

- [[2026-11-12-ai-agent-tech-overview|AI Agent 技术全景解析（信源页）]]
- [[context-management|上下文管理]]
- [[prompt-engineering|提示工程]]
- [[agent-loop|Agent Loop]]
- [[harness-engineering|Harness Engineering]]
- [[agent-memory-system|Agent 记忆系统]]
