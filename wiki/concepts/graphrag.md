---
id: wiki-concept-graphrag
type: concept
title: GraphRAG（图检索增强生成）
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - concept
  - ai
  - rag
sources:
  - raw/sources/ai/2026-11-20-agent-knowledge-base.md
related:
  - wiki/concepts/rag.md
  - wiki/concepts/ontology.md
  - wiki/concepts/llm-wiki.md
  - wiki/comparisons/agent-knowledge-base-capabilities.md
---
# GraphRAG（图检索增强生成）

## Definition（定义）

GraphRAG 是把实体与它们之间的关系纳入检索过程的检索增强技术：不只在文档片段中找相似文本，而是沿实体—关系网络查找信息，回答"对象之间有什么关系、问题会沿着哪些关系传播"这类关系链问题。它是 [[rag|RAG]] 在"关系"维度上的延伸，而非替代。

## Why It Matters（为什么重要）

传统 RAG 只能找出提到某关键词（如"供应商""物料""订单"）的段落，要把分散内容连成关系链往往要模型自己推断。当问题本质是一条关系链——"哪些订单受某供应商延迟影响""某产品用了哪些关键物料""一项政策变化影响哪些地区和客户"——纯文本片段检索不够，需要把实体和关系显式组织进检索。GraphRAG 补的正是这一层。

## Core Characteristics（核心特征）

1. **关系纳入检索**：把实体与实体间关系纳入检索过程，系统沿关系网络查找，而非只在文本片段里算相似度。
2. **回答关系链问题**：主要回答"这些对象之间有什么关系，问题会沿着哪些关系传播？"，常见对象是实体、关系、知识网络。
3. **仍在检索/回答层**：GraphRAG 仍主要在回答和检索层工作，能把关系讲清楚，但不一定能统一企业里的业务定义，也不一定知道企业当前的实时状态。
4. **与 RAG 的分工**：不是一代替代一代，而是从"找到信息"走向"理解业务上下文"的连续能力；RAG 找相关知识，GraphRAG 找关系（信源 2026-11-20）。

## Structure（结构）

与 RAG / LLM Wiki / Ontology 的对照（信源 2026-11-20）：

| 能力 | 主要回答 | 常见对象 |
|---|---|---|
| [[rag|RAG]] | 哪些资料与问题相关？ | 文档、文本片段、检索结果 |
| **GraphRAG** | 对象之间有什么关系？ | 实体、关系、知识网络 |
| [[llm-wiki|LLM Wiki]] | 知识如何整理、更新和追溯？ | 主题、摘要、来源、版本 |
| [[ontology|Ontology]] | 企业业务对象是什么，彼此如何关联？ | 对象、属性、关系、业务定义 |

## How It Works（运作方式）

以供应链场景为例（信源 2026-11-20）：企业把"供应商—物料—产品—订单—客户"的关系组织起来。查询某供应商出现风险时，系统沿关系网络进一步定位它可能影响的物料、产品和订单。

组合用法：企业用 RAG 搜索制度和流程文档，用 GraphRAG 分析跨对象的关系，用 [[llm-wiki|LLM Wiki]] 持续整理知识，用 [[ontology|Ontology]] 统一业务对象与术语（信源 2026-11-20）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[rag|RAG]]：GraphRAG 是 RAG 在关系维度上的延伸，两者都在回答/检索层工作。
- [[ontology|Ontology]]：Ontology 统一业务对象与语义；GraphRAG 能讲清关系但不一定能统一业务定义、也不知实时状态，二者分工不同。
- [[llm-wiki|LLM Wiki]]：LLM Wiki 关注知识如何持续整理与追溯，GraphRAG 关注提问时沿关系查找。

### Distinctions（区分）

- **GraphRAG vs Ontology**：GraphRAG 仍在回答/检索层，能讲清关系但不一定统一业务定义、不知实时状态；Ontology 定义业务对象、规则和关系语义，把不同系统的同名记录映射到共同业务对象（信源 2026-11-20）。

## Evolution（演进）

- 2026-11-20 — 新建本页。信源 `raw/sources/ai/2026-11-20-agent-knowledge-base.md` 给出 GraphRAG 的定义、关系链问题定位、与 RAG/LLM Wiki/Ontology 的对照与组合用法，并明确其"仍在回答与检索层工作"的边界。

## Open Questions（开放问题）

- GraphRAG 的图谱构建成本与更新维护成本在真实企业中的量级，当前信源未给出量化数据（未知）。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-20-agent-knowledge-base.md`

## Related Knowledge（相关知识）

- [[agent-knowledge-base-capabilities|Agent 知识库四种能力对照（RAG / GraphRAG / LLM Wiki / Ontology）]]
