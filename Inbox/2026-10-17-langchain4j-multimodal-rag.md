---
id: 2026-10-17-langchain4j-multimodal-rag
title: LangChain4j 多模态 RAG：图片+表格检索实战
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/AJmVoaODjF5SAzPQnJF72Q
source_type: link
platform: 微信
created: 2026-10-17
category: 技术
tags: [AI, 工程实践]
asset_ref: Assets/2026/10/langchain4j-multimodal-rag.md
wiki_status: pending
---

# LangChain4j 多模态 RAG：图片+表格检索实战

> 企业文档中图片/表格等非纯文本内容平均占比超 40%，传统 RAG 管线只处理文本，知识大量丢失。本文用 LangChain4j 实现两种多模态 RAG 方案：①图片描述法——用 VLM（GPT-4o）给图片生成文字描述，复用纯文本管线，成本低、可解释但受 VLM 质量制约；②多模态向量法——用 Cohere Embed v4 把图片和文本映射到同一向量空间，无损但调用成本高。表格处理是最大翻车点：禁止拍平/按段落切块/Markdown 直接 Embedding，正确做法是每个 chunk 保留完整表头、以"列名=值"描述行数据、小表整块大表逐行，并用 Metadata 过滤做双通道检索（向量处理开放问题、结构化查询处理精确问题）。最后整合文本/图片/表格三条管线构建完整问答 Agent，并总结 4 个坑：多模态模型贵、描述质量瓶颈、切分丢表头、上下文窗口超限。

## 核心要点

- **为什么需要多模态 RAG**：产品手册约 40% 内容是图片、25% 是表格；故障表拍平后检索准确率从 95% 跌到 40%
- **方案一·图片描述法**：ImageContent 提取图片 → VLM 生成 ≤200 字描述 → 描述带 `type=image_caption`+`image_path` 元数据入向量库；复用现有文本管线，适合图片少、需人工审核场景
- **方案二·多模态向量法**：Cohere Embed v4 / Voyage / Gemini 把图文嵌入同一空间，文字查询直接匹配图片向量；适合图片多、精度要求高场景，两者可叠加
- **表格处理四原则**：每个 chunk 带完整表头；"列名=值"格式优于 Markdown；小表(≤10 行)整表一个 chunk、大表逐行分块；Metadata 记录表题/行号支持精确过滤
- **双通道检索**：向量检索答开放问题，Metadata 过滤的结构化查询答"哪个/多少"类精确问题
- **常见坑**：GPT-4o 处理图片成本是文本 10-20 倍（可先用 mini 初筛）；VLM 会幻觉（Prompt 限定只描述可见内容）；图片 Base64 占 2000+ token（检索结果只传描述不传原图）

## 正文

见 [[Assets/2026/10/langchain4j-multimodal-rag.md|抓取正文]]。

## 来源

- [13-Java RAG | LangChain4j：多模态图片+表格检索](https://mp.weixin.qq.com/s/AJmVoaODjF5SAzPQnJF72Q)

## 附件

- [[Assets/2026/10/langchain4j-multimodal-rag.md]]
