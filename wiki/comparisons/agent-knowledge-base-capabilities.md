---
id: wiki-comparison-agent-knowledge-base-capabilities
type: comparison
title: Agent 知识库四种能力对照：RAG / GraphRAG / LLM Wiki / Ontology
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - comparison
  - ai
  - knowledge-base
sources:
  - raw/sources/ai/2026-11-20-agent-knowledge-base.md
related:
  - wiki/concepts/rag.md
  - wiki/concepts/graphrag.md
  - wiki/concepts/llm-wiki.md
  - wiki/concepts/ontology.md
---
# Agent 知识库四种能力对照：RAG / GraphRAG / LLM Wiki / Ontology

## Scope（范围）

本页对照企业做 Agent 知识库时四种常被一起讨论的技术——[[rag|RAG]]、[[graphrag|GraphRAG]]、[[llm-wiki|LLM Wiki]]、[[ontology|Ontology]]。它们都在帮 AI 获取上下文，但解决的问题不同，**不是一代替代一代的产品清单**，而是从"找到信息"逐步走向"理解业务上下文"的几种能力（信源 2026-11-20）。

一句话区分：**RAG 找相关知识，GraphRAG 找关系，LLM Wiki 整理可持续更新的知识，Ontology 定义业务对象、规则和关系语义。**

## Comparison Matrix（对比矩阵）

| 维度 | RAG | GraphRAG | LLM Wiki | Ontology |
|---|---|---|---|---|
| 主要回答 | 哪些资料与问题相关？ | 对象之间有什么关系？ | 知识如何整理、更新和追溯？ | 企业业务对象是什么，彼此如何关联？ |
| 常见对象 | 文档、文本片段、检索结果 | 实体、关系、知识网络 | 主题、摘要、来源、版本 | 对象、属性、关系、业务定义 |
| 解决层 | 检索/回答层 | 检索/回答层（关系维度） | 知识维护层 | 业务语义层 |
| 局限 | 找到的是"可能相关的内容"，非业务系统确认的当前状态；依赖资料本身 | 能讲清关系，但不一定能统一业务定义、不知实时状态 | 非边界统一的标准术语；有用性取决于能否回源、更新、纠错 | 构建成本高；适合业务对象复杂、系统分散的场景 |

## Analysis（分析）

**从"找到信息"到"理解业务上下文"**（信源 2026-11-20）：RAG 与 GraphRAG 主要关心"提问时怎么找"，LLM Wiki 关心"知识怎么维护"，Ontology 关心"业务世界是什么、对象意味着什么"。四种能力处理的信息形态和应用目标不同，**关键是不要把它们当成同一种"知识库"来选型**。

**组合使用**：企业可以用 RAG 搜索制度和流程文档，用 GraphRAG 分析跨对象的关系，用 LLM Wiki 持续整理知识，再用 Ontology 统一业务对象、关系和术语定义；Agent 据此结合实时数据组织分析、提建议（信源 2026-11-20）。

**供应链案例分工**（信源 2026-11-20）：汽车厂发现订单可能延期——RAG 查延期处理规范与会议记录；GraphRAG 沿"供应商—电池组件—车型—生产计划—订单"查受影响范围；LLM Wiki 整理已确认的供应商情况与历史处置经验并保留来源；Ontology 把供应商/物料/工厂/产线/订单映射成有业务含义的对象、统一关系和术语；Agent 结合库存产能比较方案成本、交付与风险并说明依据。

## Best Fit（适用场景）

### RAG 更合适

- 需求是搜索几百份制度文档；能利用已有文档、便于更新知识库（信源 2026-11-20）。

### GraphRAG 更合适

- 主要问题是从多份资料中追踪人物、事件或供应链关系（信源 2026-11-20）。

### LLM Wiki 更合适

- 知识需要持续归纳、追溯和更新（信源 2026-11-20）。

### Ontology 更合适

- 业务对象复杂、系统分散，AI 需要跨系统理解业务语义；尤其当"客户""订单""风险"等概念在不同部门或系统中含义不一致时（信源 2026-11-20）。

## Important Caveats（重要提醒）

- **评估从具体流程入手**，而不是先决定"要不要上 Ontology"：先把一个流程和它的对象、状态、规则梳理清楚，往往比先搭建一套很大的知识图谱更有价值（信源 2026-11-20）。
- **真正要回答的不只是"AI 能不能找到答案"**，还包括"它依据什么理解业务、不同系统里的对象如何对应、结论能否追溯到来源"（信源 2026-11-20）。
- 四种能力不是单向替代关系：企业仍然需要文档检索，也仍然需要关系分析和知识维护。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-20-agent-knowledge-base.md`
