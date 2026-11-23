---
id: 2026-11-23-rag-10-million-docs
title: 1000 万份文档，RAG 系统到底怎么扛？
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/udXF9FEP6SCyeqIxo0YqWA
source_type: 网页
platform: 微信
created: 2026-11-23
category: 技术
tags: [RAG, AI, 系统设计]
asset_ref: Assets/2026-11/weixin-udxf9fep-rag-scale.md
wiki_status: ingested
---

# 1000 万份文档，RAG 系统到底怎么扛？

> 以图解形式拆解千万级 RAG 的写入链路、存储架构、混合检索与生产保障。当知识库达 1000 万份文档（约 2 亿 Chunks、1024 维向量近 820GB），RAG 复杂度远超向量检索本身，需多引擎协同与完整生产保障。正文以图为主，文字为要点概述。

## 核心要点

- **规模量级**：1000 万份文档、每份切 20 Chunks → 约 2 亿检索单元；1024 维 Float32 向量原始存储近 820GB，复杂度远超向量检索本身。
- **写入链路**：Kafka 解耦实时上传与历史回填，独立 Worker 完成 OCR、切块、Embedding、索引构建，需支持失败重试、恢复与重新处理。
- **存储架构**：多引擎协同——S3 存原始文件、Postgres 管元数据与权限、向量库做语义召回、OpenSearch 做 BM25 关键词检索、Redis 降重复查询开销。
- **查询链路**：向量检索与 BM25 并行召回 → RRF 融合候选 → Reranker 筛高质量证据 → LLM 生成带来源引用的回答。
- **生产保障**：还需解决索引更新、权限隔离、性能监控、质量评测与故障恢复。

## 正文

当知识库扩展到 1000 万份文档，平均每份切分 20 个 Chunks，整个系统需管理约 2 亿个检索单元，仅 1024 维 Float32 向量原始存储量就接近 820GB。到这个规模，RAG 复杂度已远超向量检索本身。

**写入链路**：文档接入需同时处理实时上传与历史数据回填，通过 Kafka 解耦任务，再由独立 Worker 完成 OCR、文本切块、Embedding 与索引构建，遇到任务失败还要支持重试、恢复与重新处理。

**存储架构**：多种引擎协同——S3 保存原始文件，Postgres 管理元数据和权限，向量数据库负责语义召回，OpenSearch 提供 BM25 关键词检索，Redis 降低重复查询开销。

**查询链路**：向量检索与 BM25 并行召回，通过 RRF 融合候选结果，再交 Reranker 筛选高质量证据，最后由 LLM 生成带来源引用的回答。

此外还需解决索引更新、权限隔离、性能监控、质量评测和故障恢复等问题。原文以一组图完整拆解千万级 RAG 的写入链路、存储架构、混合检索与生产保障，适合系统理解大规模 RAG 的工程设计。

## 来源

- [1000 万份文档，RAG 系统到底怎么扛？](https://mp.weixin.qq.com/s/udXF9FEP6SCyeqIxo0YqWA)

## 附件

[[Assets/2026-11/weixin-udxf9fep-rag-scale.md]]
