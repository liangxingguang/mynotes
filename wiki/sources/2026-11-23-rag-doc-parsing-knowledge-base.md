---
id: wiki-source-rag-doc-parsing-knowledge-base
type: source
title: RAG 文档解析与知识库构建
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - source
  - ai
  - rag
sources:
  - raw/sources/ai/2026-11-23-rag-doc-parsing-knowledge-base.md
related:
  - wiki/concepts/rag-document-parsing.md
  - wiki/concepts/rag-chunking.md
  - wiki/concepts/rag.md
---
# RAG 文档解析与知识库构建

## Overview（概览）

系统梳理 RAG 技术实现全流程的四大环节：文档解析、知识库构建（分块）、知识库构建（索引）、知识增强。覆盖文档解析工具（DeepDoc/MinerU）、7 种分块策略及选型、向量检索算法（Flat/IVF/HNSW），以及上下文增强、块标题（CCH）、问题生成三类检索增强手段。

## Key Facts（关键事实）

- **文档解析**：Word 转 docx 解析较简单，PDF 复杂；除常规分段外还可提取问答对（结构化 Q→A 键值对）作为可检索知识单元。三大视觉任务：OCR 取文字、DLR 分析版面布局、TSR 结构化表格。
- **解析引擎**：DeepDoc（RAGFlow 的视觉+语义引擎，模型+工程规则混合策略、模块化 Parser、chunk 保留截图可可视化校验）；MinerU 将所有格式统一转成 md/json。
- **分块核心问题**：LLM 与嵌入有 token 上限，长文档引入噪声、导致检索命中下降与生成虚构；好 chunk 标准：可独立理解、信息密集不冗余、索引溯源友好。
- **七种分块策略**：固定大小（兜底，易截断）、滑动窗口（保上下文，冗余增加）、句子切块（语义完整但依赖标点）、递归切块（最稳妥的通用起点，按分隔符优先级递归细分）、页面/结构化切块（保留页码标题，便于引用）、语义切块（按相邻句向量相似度在话题变化处切，阈值可用百分位/标准差/IQR 三种方法）、Small2Big（检索用小块、生成用大块，命中后邻域补全或父块回溯，重叠处裁剪去重）。
- **块大小权衡**：小块（128–256 tokens）检索精度高、适合 FAQ；中等块（256–512）平衡，适合产品文档；大块（512–1024）上下文完整但精度与成本高；overlap 建议 10%–25%。
- **索引构建**：分词 + Embedding 将片段转为向量存入（向量）数据库；向量检索算法分 Flat（精确）、IVF（倒排聚类）、HNSW（图索引）三类。
- **知识增强三手段**：①上下文增强索引（检索单元带前后文上下文，避免断章）；②Contextual Chunk Headers（把文档/章节标题拼到块前再嵌入，无标题时可用 LLM 生成小标题）；③问题生成（为每个块用 LLM 生成 2–5 个相关问题一并嵌入，缩小用户问题与原文的语义差距、提升召回）。

## Important Claims（重要论断）

### Claim 1：递归切块是最稳妥的通用起点

递归切块无论处理何种文本，在通用性、简单性与效果之间取得较好平衡，应首先使用它建立性能基线，再按文本特性选用其他策略。

### Claim 2：Small2Big 解决块大小权衡

检索时用小块保持精度，生成时用大块保持上下文完整——命中后向外扩展上下文（邻域补全或父块回溯），合并后对重叠部分裁剪去重，保证提示词连贯且不过长。核心是块大小的衡量。

### Claim 3：语义切块阈值三种计算方法

语义切块在话题变化处切分，阈值可用百分位法（找最极端差异）、标准差法（找远超平均水平的差异）、四分位距法（找比大多数情况突出的差异）三种方法，适用场景不同。

### Claim 4：知识增强三手段缩小语义差距提升召回

上下文增强索引避免断章、Contextual Chunk Headers 增强块与 query 的语义相关性、问题生成扩展 query 匹配入口——三者从不同角度弥补传统分块丢失上下文与用户问题表述差异大导致的召回不足。

## Concepts Introduced（引入的概念）

- [[rag]]
- [[rag-document-parsing]]
- [[rag-chunking]]

## Entities Mentioned（提及的实体）

- DeepDoc（RAGFlow 的视觉+语义文档解析引擎）
- MinerU（多格式统一转 md/json 的解析工具）
- Flat / IVF / HNSW（向量检索算法）

## Implications（影响／启示）

- 文档解析、分块、索引、知识增强四环节各有工具与策略选型，分块是精度与上下文的核心权衡点，递归切块作基线、Small2Big 补上下文是工程起步组合。
- 该文为 RAG 全流程的教程式总览，与 [[rag-document-parsing]]（解析环节深挖）和 [[rag-chunking]]（分块环节深挖）互补，本信源补充了解析引擎工具与七种分块策略的完整分类。

## Limitations（局限）

- 教程式总览，各策略多为机制描述与适用场景，未附横向实测数据；块大小与 overlap 取值为作者建议，无消融验证。
- 配图原位为 1px 占位符（公众号抓取常态），图示未保留，文字内容完整。

## Related Knowledge（相关知识）

- [[rag-document-parsing|RAG 文档解析]]
- [[rag-chunking|RAG 分块]]
- [[rag|RAG（检索增强生成）]]

## Source（信源）

- `raw/sources/ai/2026-11-23-rag-doc-parsing-knowledge-base.md`
