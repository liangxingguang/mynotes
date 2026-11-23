---
id: 2026-11-23-rag-doc-parsing-knowledge-base
title: RAG 文档解析与知识库构建
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/xGIVYtT012pY-O3CKlRDKg
source_type: 网页
platform: 微信
created: 2026-11-23
category: 技术
tags: [RAG, AI]
asset_ref: Assets/2026-11/weixin-xgivyt-t012py-o3cklrdkg.md
wiki_status: pending
---

# RAG 文档解析与知识库构建

> 系统梳理 RAG 技术实现全流程的四大环节：文档解析、知识库构建（分块）、知识库构建（索引）、知识增强。覆盖文档解析工具（DeepDoc/MinerU）、7 种分块策略及选型、向量检索算法（Flat/IVF/HNSW），以及上下文增强、块标题（CCH）、问题生成三类检索增强手段。

## 核心要点

- **文档解析**：Word 转 docx 解析较简单，PDF 复杂；除常规分段外还可提取问答对（结构化 Q→A 键值对）作为可检索知识单元；三大视觉任务：OCR 取文字、DLR 分析版面布局、TSR 结构化表格。
- **解析引擎**：DeepDoc（RAGFlow 的视觉+语义引擎，模型+工程规则混合策略、模块化 Parser、chunk 保留截图可可视化校验）；MinerU 将所有格式统一转成 md/json。
- **分块核心问题**：LLM 与嵌入有 token 上限，长文档引入噪声、导致检索命中下降与生成虚构；好 chunk 的标准是可独立理解、信息密集不冗余、索引溯源友好。
- **七种分块策略**：固定大小（兜底，但易截断）、滑动窗口（保上下文，冗余增加）、句子切块（语义完整但依赖标点）、递归切块（最稳妥的通用起点，按分隔符优先级递归细分）、页面/结构化切块（保留页码标题，便于引用）、语义切块（按相邻句向量相似度在话题变化处切，阈值可用百分位/标准差/IQR 三种方法）、Small2Big（检索用小块、生成用大块，命中后邻域补全或父块回溯，重叠处裁剪去重）。
- **块大小权衡**：小块（128–256 tokens）检索精度高、适合 FAQ；中等块（256–512）平衡，适合产品文档；大块（512–1024）上下文完整但精度与成本高；overlap 建议 10%–25%。
- **索引构建**：分词 + Embedding 将片段转为向量存入（向量）数据库；向量检索算法分 Flat（精确）、IVF（倒排聚类）、HNSW（图索引）三类。
- **知识增强三手段**：①上下文增强索引（检索单元带前后文上下文，避免断章）；②Contextual Chunk Headers，把文档/章节标题拼到块前再嵌入，无标题时可用 LLM 生成小标题；③问题生成，为每个块用 LLM 生成 2–5 个相关问题一并嵌入，缩小用户问题与原文的语义差距、提升召回。

## 正文

见 `[[Assets/2026-11/weixin-xgivyt-t012py-o3cklrdkg]]`（抓取稿，配图原位为 1px 占位符属公众号抓取常态，文字内容完整）。

## 来源

- https://mp.weixin.qq.com/s/xGIVYtT012pY-O3CKlRDKg

## 附件

[[Assets/2026-11/weixin-xgivyt-t012py-o3cklrdkg.md]]
