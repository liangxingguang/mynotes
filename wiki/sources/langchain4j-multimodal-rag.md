---
id: wiki-source-langchain4j-multimodal-rag
type: source
title: LangChain4j 多模态 RAG：图片+表格检索实战
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - rag
  - java
  - multimodal
sources:
  - raw/sources/ai/2026-10-17-langchain4j-multimodal-rag.md
related:
  - wiki/sources/knowledge-base-tech-evolution.md
---
# LangChain4j 多模态 RAG：图片+表格检索实战

## Overview（概览）

Java RAG 系列教程第 13 篇：企业文档中图片/表格占比高，纯文本 RAG 丢失大量知识。用 LangChain4j 实现图片描述法与多模态向量法两种方案，并给出表格处理四原则与双通道检索，最终整合文本/图片/表格三条管线成问答 Agent。

## Key Facts（关键事实）

- 文档构成（信源口径）：产品手册约 40% 内容是图片、25% 是表格；故障表拍平后检索准确率从 95% 跌到 40%。
- 方案一·图片描述法：ImageContent 提取图片 → VLM（GPT-4o）生成 ≤200 字描述 → 描述带 `type=image_caption`+`image_path` 元数据入向量库，复用纯文本管线。
- 方案二·多模态向量法：Cohere Embed v4（或 Voyage/Gemini）把图文嵌入同一向量空间，文字查询直接匹配图片向量。
- 六维对比：描述法入库成本高（VLM 费用）但可解释性高，适合图片少（100 张内）、需人工审核；向量法保真度高但不可解释，适合图片多、高精度；可叠加（向量主检索 + 描述辅助过滤）。
- 表格三错误：拍平跨页丢表头；递归分块从表格中间切断；Markdown 分隔符（|、-）干扰 Embedding 语义。
- 表格四原则：每个 chunk 带完整表头；"列名=值"描述行数据优于 Markdown；小表（≤10 行）整块、大表逐行；Metadata 记录表题/行号/列名支持精确过滤。
- 双通道检索：向量答开放问题（"XR-500 有哪些常见故障"），Metadata 过滤的结构化查询答精确问题（"故障代码 E03 的解决方案"）。
- 坑：GPT-4o 处理图片成本是文本 10–20 倍（可用 mini 初筛）；VLM 会幻觉（Prompt 限定只描述可见内容）；图片 Base64 占 2000+ token（检索结果只传描述不传原图）。

## Important Claims（重要论断）

### Claim 1：表格是 RAG 最容易翻车的基础环节

几乎所有 RAG 系统都会遇到表格，但绝大多数处理方式都是错的——表格应当作独立结构化单元，保留表头与行列关系。

## Concepts Introduced（引入的概念）

- 图片描述法 vs 多模态向量法的选型矩阵
- 双通道检索（向量 + Metadata 结构化过滤）

## Entities Mentioned（提及的实体）

- LangChain4j（Java LLM 框架，未单独立页）
- Cohere Embed v4 / GPT-4o（模型提及，未立页）

## Implications（影响／启示）

"列名=值 + 完整表头"的表格 chunk 策略与双通道检索可直接迁移到任何 RAG 管线，不绑定 LangChain4j（解读）。

## Limitations（局限）

- 教程文，代码示例为主；准确率数字（95%→40%）为作者场景口径，无公开基准。
- 多模态 Embedding 模型价格/效果随版本快速变化。

## Related Knowledge（相关知识）

- [[knowledge-base-tech-evolution|一文搞懂知识库的技术演进]]（RAG 链路失败点的宏观框架）

## Source（信源）

- `raw/sources/ai/2026-10-17-langchain4j-multimodal-rag.md`
