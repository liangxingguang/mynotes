---
id: 2026-11-23-rag-retrieval-ranking-algorithms
title: RAG 检索与排序核心算法
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/oSvRVvWLvu87RYDLWEcUGg
source_type: 网页
platform: 微信
created: 2026-11-23
category: 技术
tags: [RAG, AI]
asset_ref: Assets/2026-11/weixin-osvrrvvwlvu87rydlwecugg.md
wiki_status: ingested
---

# RAG 检索与排序核心算法

> RAG 系列第三篇，聚焦检索与排序环节：多轮 Query 改写、全文检索（TFIDF/BM25 与分词策略）、向量检索（双塔表示模型与 LLM 类 Embedding）、混合检索、排序（RRF/Cross-Encoder/延迟交互/Qwen3-Reranker）、基于 LLM 的相关性判断，以及全链路多路召回优化方案。

## 核心要点

- **多轮 Query 改写**：用 LLM+思维链把用户 query 改写成多个查询，分别检索后取并集融合排序；生成回答时用原始 query+聊天历史，让 LLM 过滤检索杂质，提升容错。
- **全文检索**：基于倒排索引；TFIDF 精确但语义弱，BM25 在其基础上四点改进——TF 非线性饱和、文档长度归一化（k1=1.2、b=0.75）、IDF 惩罚常见词、参数可调。分词宁细勿粗，可用命名实体识别或业务词典补充，切细了可由向量/重排补救，切粗无法补救。
- **向量检索**：双塔表示模型 query/document 独立编码、文档向量离线预存；bge-m3 单模型处理非对称检索；Qwen3-Embedding 属 LLM 类，用 EOS 取向量、三阶段训练（弱监督 1.5 亿对→监督微调 1200 万对→球面线性插值融合）。切块长度需匹配向量模型（Bert 类建议 256–512）。
- **混合检索**：向量 KNN（语义相近、容错、可召回词表外词如 iphone 17）+ BM25（精准匹配、短文本、可解释高亮）互补，工业界主流做法。
- **排序算法**：RRF 倒数融合按排名而非得分合并多路结果（k 为超参）；Cross-Encoder 将 query 与文档拼接交互打分，精度高但慢；延迟交互模型（CoIBERT）兼得双塔效率与交互精度；Qwen3-Reranker 单塔、支持 32K 长文本、指令感知，以 yes/no 概率判相关性。
- **LLM 相关性判断**：以 NLI（蕴含/无关/矛盾）做检索质量关口，小模型只保留"蕴含"知识，过滤噪声、提升鲁棒性。
- **全链路多路召回**：BM25+向量并行召回→RRF 粗排→Cross-Encoder 精排→LLM 生成；辅以业务驱动的数据混合与置信度阈值筛选。

## 正文

见 `[[Assets/2026-11/weixin-osvrrvvwlvu87rydlwecugg]]`（抓取稿，配图原位为 1px 占位符属公众号抓取常态，文字内容完整）。

## 来源

- https://mp.weixin.qq.com/s/oSvRVvWLvu87RYDLWEcUGg

## 附件

[[Assets/2026-11/weixin-osvrrvvwlvu87rydlwecugg.md]]
