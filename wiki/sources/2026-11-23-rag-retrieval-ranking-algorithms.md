---
id: wiki-source-rag-retrieval-ranking-algorithms
type: source
title: RAG 检索与排序核心算法
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - rag
  - ai
sources:
  - raw/sources/ai/2026-11-23-rag-retrieval-ranking-algorithms.md
---
# RAG 检索与排序核心算法

## Overview（概览）

微信公众号 RAG 系列的算法篇（系列第 3 篇），聚焦检索与排序环节的核心算法。文章按链路顺序讲：多轮 Query 改写（LLM+思维链改写、并集融合）、全文检索（TFIDF 与 BM25 的四点改进及分词策略）、向量检索（双塔表示模型 DSSM、bge-m3、Qwen3-Embedding 的三阶段训练）、混合检索（向量 KNN + BM25 互补）、排序算法（RRF 倒数融合、Cross-Encoder 精排、CoIBERT 延迟交互、Qwen3-Reranker 单塔长文本）、基于 LLM 的相关性判断（NLI 蕴含/无关/矛盾三分类），最后给出全链路多路召回方案（BM25+向量→RRF→Cross-Encoder→LLM）。是 [[rag]] 中"混合检索/查询改写/重排"等进阶变体的算法级展开。

## Key Facts（关键事实）

- **多轮 Query 改写**：用 LLM+思维链把用户 query 改写成多个查询，分别检索后取并集融合排序；生成回答时用原始 query+聊天历史，让 LLM 过滤检索杂质，提升容错。
- **全文检索**：基于倒排索引；TFIDF 精确但语义弱，BM25 在其基础上四点改进——TF 非线性饱和、文档长度归一化（k1=1.2、b=0.75）、IDF 惩罚常见词、参数可调。分词宁细勿粗，可用命名实体识别或业务词典补充，切细了可由向量/重排补救，切粗无法补救。
- **向量检索**：双塔表示模型 query/document 独立编码、文档向量离线预存；bge-m3 单模型处理非对称检索；Qwen3-Embedding 属 LLM 类，用 EOS 取向量、三阶段训练（弱监督 1.5 亿对→监督微调 1200 万对→球面线性插值融合）。切块长度需匹配向量模型（Bert 类建议 256–512）。
- **混合检索**：向量 KNN（语义相近、容错、可召回词表外词如 iphone 17）+ BM25（精准匹配、短文本、可解释高亮）互补，工业界主流做法。
- **排序算法**：RRF 倒数融合按排名而非得分合并多路结果（k 为超参）；Cross-Encoder 将 query 与文档拼接交互打分，精度高但慢；延迟交互模型（CoIBERT）兼得双塔效率与交互精度；Qwen3-Reranker 单塔、支持 32K 长文本、指令感知，以 yes/no 概率判相关性。
- **LLM 相关性判断**：以 NLI（蕴含/无关/矛盾）做检索质量关口，小模型只保留"蕴含"知识，过滤噪声、提升鲁棒性。
- **全链路多路召回**：BM25+向量并行召回→RRF 粗排→Cross-Encoder 精排→LLM 生成；辅以业务驱动的数据混合与置信度阈值筛选。

## Important Claims（重要论断）

### 混合检索是工业界主流，两路互补而非冗余

向量 KNN 语义容错强、能召回词表外词（如"iphone 17"），BM25 精准匹配、可解释高亮；两者覆盖的查询类型不同，互补取长补短。这与 [[rag]] 中"混合检索：向量检索（语义）+ 关键词检索（BM25，精确匹配）+ 重排序，取长补短"的判断一致，并给出了算法层面的互补机制解释。

### 排序是召回的补充，精度与延迟需权衡

双塔模型（DSSM）无 query-doc 交互，速度快但精度受限；Cross-Encoder 拼接交互打分精度高但慢；延迟交互模型（CoIBERT）是折中方案。排序算法的选择是精度与延迟的权衡，而非简单的"越复杂越好"。

### 分词宁细勿粗，切粗不可补救

分词切细了可由向量检索或重排补救（语义召回+精排补精度），但切粗导致关键词丢失无法补救——这一原则对全文检索的分词策略有直接指导意义。

### 向量模型选型需匹配任务与切块长度

双塔模型（DSSM）适合 query/doc 独立编码、文档向量离线预存的非对称检索；bge-m3 单模型处理非对称检索；Qwen3-Embedding 属 LLM 类表示模型，用 EOS 取向量、三阶段训练。切块长度需匹配向量模型（Bert 类建议 256–512），与 [[rag-chunking]] 中块大小需适配检索模型的口径一致。

## Concepts Introduced（引入的概念）

- [[rag]]（检索与排序的算法级展开：BM25/DSSM/混合检索/RRF/Cross-Encoder/NLI 等核心算法）
- [[rag-implementation-overview]]（与"天地之间"框架中检索策略的算法级印证）

## Entities Mentioned（提及的实体）

- DSSM（双塔表示模型）、BM25、TFIDF、RRF（倒数排名融合）、Cross-Encoder、CoIBERT（延迟交互模型）、Qwen3-Embedding、Qwen3-Reranker、bge-m3
- NLI（自然语言推理，用于相关性判断）

## Implications（影响／启示）

- 检索与排序的算法选型应按链路环节分别决策：召回用 BM25+向量双路并行，粗排用 RRF 按排名融合，精排用 Cross-Encoder 或延迟交互模型，最终用 LLM NLI 做质量关口——每一环的算法各有侧重。
- 分词策略是全文检索的隐藏杠杆：宁细勿粗，切细可补救、切粗不可补救；业务词典与命名实体识别可补充通用分词的不足。
- 向量模型的选型需与切块长度匹配（Bert 类建议 256–512），模型与分块策略是耦合的而非独立的。
- RRF 按排名而非得分融合多路结果，对不同检索路径的得分分布差异更鲁棒，是多路召回融合的实用方案。

## Limitations（局限）

- 单信源、算法综述型文章，未附独立实验数据与基准对比；各算法的参数取值（如 k1=1.2、b=0.75）为文中推荐值，非实测调优结果。
- 各排序算法的精度与延迟对比为定性描述，未给出量化数据，实际选型需在业务场景中实测。
- 采集稿配图原位为 1px 占位符，图示信息未收录。

## Related Knowledge（相关知识）

- [[rag|RAG（检索增强生成）]]
- [[rag-implementation-overview|RAG 落地实施总览（天地框架与七大误区）]]
- [[rag-chunking|RAG 分块]]（切块长度需匹配向量模型）
- [[2026-11-23-rag-practice-medical|RAG 技术实战：从微调召回到精排的完整链路（信源页）]]（同系列实战篇，算法的工程落地）
- [[2026-11-23-rag-overview-architecture|RAG 是什么：RAG 的整体技术架构（信源页）]]（同系列开篇篇）
- [[2026-11-23-rag-llm-generation|RAG 中的大模型生成：最后一公里（信源页）]]（同系列生成篇）

## Source（信源）

- `raw/sources/ai/2026-11-23-rag-retrieval-ranking-algorithms.md`（微信公众号，2026-11-23 采集，Assets 采集稿逐字收录，单信源置信度中）
