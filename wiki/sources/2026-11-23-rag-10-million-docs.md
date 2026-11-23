---
id: wiki-source-rag-10-million-docs
type: source
title: 1000 万份文档，RAG 系统到底怎么扛？
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - source
  - ai
  - rag
  - 系统设计
sources:
  - raw/sources/ai/2026-11-23-rag-10-million-docs.md
related:
  - wiki/concepts/rag-production-guardrails.md
  - wiki/concepts/rag.md
---
# 1000 万份文档，RAG 系统到底怎么扛？

## Overview（概览）

以图解形式拆解千万级 RAG 的写入链路、存储架构、混合检索与生产保障。当知识库达 1000 万份文档（约 2 亿 Chunks、1024 维向量近 820GB），RAG 复杂度远超向量检索本身，需多引擎协同与完整生产保障。正文以图为主，文字为要点概述。

## Key Facts（关键事实）

- **规模量级**：1000 万份文档、每份切 20 Chunks → 约 2 亿检索单元；1024 维 Float32 向量原始存储近 820GB，复杂度远超向量检索本身。
- **写入链路**：文档接入需同时处理实时上传与历史回填，通过 Kafka 解耦任务，再由独立 Worker 完成 OCR、文本切块、Embedding 与索引构建；遇到任务失败需支持重试、恢复与重新处理。
- **存储架构（多引擎协同）**：S3 保存原始文件，Postgres 管理元数据和权限，向量数据库负责语义召回，OpenSearch 提供 BM25 关键词检索，Redis 降低重复查询开销。
- **查询链路**：向量检索与 BM25 并行召回 → RRF 融合候选结果 → Reranker 筛选高质量证据 → LLM 生成带来源引用的回答。
- **生产保障**：还需解决索引更新、权限隔离、性能监控、质量评测与故障恢复等问题。

## Important Claims（重要论断）

### Claim 1：千万级 RAG 复杂度远超向量检索本身

到 1000 万份文档、约 2 亿检索单元、近 820GB 向量的规模，RAG 的复杂度已远超向量检索本身，必须多引擎协同并配套完整生产保障，单靠向量库无法承载。

### Claim 2：写入链路需解耦与重试

文档接入同时处理实时上传与历史回填，通过 Kafka 解耦，独立 Worker 串起 OCR/切块/Embedding/索引构建全链路，且必须支持失败重试、恢复与重新处理——任一环节失败不应中断整体入库。

### Claim 3：存储按职责多引擎分工

原始文件、元数据与权限、语义召回、关键词检索、查询缓存各有专属引擎（S3/Postgres/向量库/OpenSearch/Redis），各司其职而非用单一存储承担全部职责。

### Claim 4：查询链路混合召回 + 融合 + 精排

向量检索与 BM25 并行召回后以 RRF 融合（只依赖排名不依赖分数），再交 Reranker 筛选高质量证据，最后由 LLM 生成带来源引用的回答——混合检索、融合排序、证据筛选、带引用生成是标准链路。

## Concepts Introduced（引入的概念）

- [[rag]]
- [[rag-production-guardrails]]

## Entities Mentioned（提及的实体）

- Kafka（写入解耦）
- S3（对象存储）
- Postgres（元数据与权限）
- OpenSearch（BM25 关键词检索）
- Redis（查询缓存）

## Implications（影响／启示）

- 大规模 RAG 的工程重点不在向量检索本身，而在写入链路解耦、多引擎存储分工、混合召回融合与生产保障（索引更新/权限/监控/评测/恢复）的系统设计。
- 该文图解口径与 [[rag-production-guardrails]] 的多信源生产护栏框架一致，可作为规模量级与多引擎分工的量化印证。

## Limitations（局限）

- 正文以图为主、文字为要点概述，具体工程参数（如 Kafka 分区数、向量库索引类型、RRF 参数 K）未给出，属设计级描述。
- 规模数字（1000 万份/2 亿 Chunk/820GB）为文章口径，未附独立压测数据。

## Related Knowledge（相关知识）

- [[rag-production-guardrails|企业级 RAG 生产护栏]]
- [[rag|RAG（检索增强生成）]]

## Source（信源）

- `raw/sources/ai/2026-11-23-rag-10-million-docs.md`
