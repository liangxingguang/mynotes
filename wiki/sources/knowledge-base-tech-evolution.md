---
id: wiki-source-knowledge-base-tech-evolution
type: source
title: 一文搞懂知识库的技术演进：从关键词检索、向量 RAG 到 GraphRAG、LLM Wiki、本体论与 Agent
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - knowledge-base
  - rag
sources:
  - raw/sources/ai/2026-10-16-knowledge-base-tech-evolution.md
related:
  - wiki/concepts/llm-wiki.md
  - wiki/concepts/okf-knowledge-format.md
---
# 一文搞懂知识库的技术演进：从关键词检索、向量 RAG 到 GraphRAG、LLM Wiki、本体论与 Agent

## Overview（概览）

微信公众号综述文，梳理知识库技术的能力地图（强调非线性替代关系）：关键词检索→全文索引→向量检索→RAG→混合检索重排→知识图谱/GraphRAG→LLM Wiki→本体论语义层→Agent，并给出选型三问。是 [[llm-wiki|LLM Wiki]] 概念的来源信源之一。

## Key Facts（关键事实）

- 能力地图九阶段，每层解决不同问题：找词、找语义、生成答案、优化召回排序、沿关系推理、沉淀可复用知识、统一概念、执行操作；生产系统常并行组合而非依次替代。
- RAG 答错多在链路而非模型：解析/切分丢结构、召回缺失、多材料冲突未识别版本、片段错误拼接。
- 生产级 RAG 组合拳：BM25（精确术语）+ 向量（语义召回）+ 元数据过滤（权限/部门/时间）+ Reranking + 查询改写多路召回。
- GraphRAG（微软实现）：实体关系抽取建图 + 社区摘要；Local Search 面向具体实体，Global Search 经社区报告答全局问题；图谱质量决定关联价值，边名（如"负责"）不自动等于业务含义。
- LLM Wiki（Karpathy 模式描述）：原始来源保持不变，Wiki 页面由模型持续维护，通过结构说明文件约定组织方式与操作流程；新资料进入时保留原件、写摘要、更新相关页面、查冲突、记日志。
- 本体论 vs 知识图谱：本体定义"概念该如何理解"（类/个体/属性/语义约束，如 OWL），图谱记录"具体对象及其事实"；本体仅在跨系统语义统一收益足够时引入。
- Agent 阶段要求升级：回答可容忍不确定性，执行操作需要权限、审计、来源与执行前校验。
- 四类典型组合架构：制度问答（全文+RAG）、跨文档研究（RAG+LLM Wiki）、客户订单分析（结构化数据+图谱+GraphRAG）、跨系统业务 Agent（语义层+API+权限+审计，必要时+RAG）。
- 选型三问：知识以什么形式存在？完成搜索/问答/推理/执行哪类任务？结果如何验证与治理（来源、权限、版本、冲突、更新）？

## Important Claims（重要论断）

### Claim 1：这是能力地图，不是升级路线

LLM Wiki 不是 GraphRAG 的前一代或后一代；本体论也不是所有系统的必备模块——各自回应不同工程需求，选型从问题类型出发而非技术名词。

### Claim 2：LLM Wiki 带来新工程问题

持久化综合页面引入：来源能否追溯、旧结论如何更新、冲突由谁裁定、自动写入的错误会不会被后续引用；因此 LLM Wiki 可与 RAG 并用（Wiki 供整理后知识，RAG 检索原始材料/证据）。

## Concepts Introduced（引入的概念）

- [[llm-wiki|LLM Wiki]]（模型持续编译互链知识页面，原始来源不可变）

## Entities Mentioned（提及的实体）

- GraphRAG（微软实现，未单独立页）
- Karpathy（LLM Wiki 模式的描述者，未立页）

## Implications（影响／启示）

本仓库（raw 不可变 + wiki 模型维护 + AGENTS.md 结构约定 + log 追溯）正是文中所述 LLM Wiki/Karpathy 模式的一个实例（解读）；文中"LLM Wiki 与 RAG 并用"也对应本库 wiki-query 覆盖不足时回退 raw 的契约。

## Limitations（局限）

- 综述性文章，各技术只到概念与工程要点层，无实现细节与评测数据。
- Karpathy 模式为转述，未给一手出处链接。

## Related Knowledge（相关知识）

- [[llm-wiki|LLM Wiki]]
- [[okf-knowledge-format|OKF（面向 AI Agent 的知识包装规范）]]（同为"知识编译后供 Agent 使用"的包装思路）

## Source（信源）

- `raw/sources/ai/2026-10-16-knowledge-base-tech-evolution.md`
