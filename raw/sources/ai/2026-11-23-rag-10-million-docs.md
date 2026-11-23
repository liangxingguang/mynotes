---
title: 1000 万份文档，RAG 系统到底怎么扛？
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/udXF9FEP6SCyeqIxo0YqWA
source_type: article
platform: 微信
captured: 2026-11-23
registered_at: 2026-11-23
inbox_ref: Archive/2026-11-23-rag-10-million-docs.md
asset_ref: Assets/2026-11/weixin-udxf9fep-rag-scale.md
---
# 1000 万份文档，RAG 系统到底怎么扛？

> 来源：微信公众号文章。以图解形式拆解千万级 RAG 系统的写入链路、存储架构、混合检索与生产保障，正文以图为主，文字为要点概述。

当知识库扩展到 1000 万份文档，平均每份切分 20 个 Chunks，整个系统就需要管理约 2 亿个检索单元。仅 1024 维 Float32 向量的原始存储量，就接近 820GB。

到了这个规模，RAG 的复杂度已经远远超出向量检索本身。

文档接入需要同时处理实时上传和历史数据回填，通过 Kafka 解耦任务，再由独立的 Worker 完成 OCR、文本切块、Embedding 和索引构建。遇到任务失败，还要支持重试、恢复和重新处理。

存储层通常需要多种引擎协同：S3 保存原始文件，Postgres 管理元数据和权限，向量数据库负责语义召回，OpenSearch 提供 BM25 关键词检索，Redis 降低重复查询的开销。

查询链路同样不简单。向量检索与 BM25 并行召回，通过 RRF 融合候选结果，再交给 Reranker 筛选高质量证据，最后由 LLM 生成带来源引用的回答。

除此之外，还需要解决索引更新、权限隔离、性能监控、质量评测和故障恢复等问题。

这组图完整拆解了千万级 RAG 的写入链路、存储架构、混合检索与生产保障，适合系统理解大规模 RAG 的工程设计。
