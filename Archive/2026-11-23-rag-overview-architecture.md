---
id: 2026-11-23-rag-overview-architecture
title: RAG 是什么：RAG 的整体技术架构
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/Ob6_qxUNMh26Oq5gk9m51A
source_type: 网页
platform: 微信
created: 2026-11-23
category: 技术
tags: [RAG, AI]
asset_ref: Assets/2026-11/weixin-ob6-qxunmh26oq5gk9m51a.md
wiki_status: ingested
---

# RAG 是什么：RAG 的整体技术架构

> RAG 系列开篇综述：从 LLM 的六大缺陷（幻觉、知识滞后、隐私、上下文窗口有限、输入噪声、成本高）切入，讲 RAG 的破局思路与系统组成，辨析"RAG 已死"的误区（RAG/长上下文/微调/MCP 是互补而非替代），并给出离线+在线的技术架构、技术演进路线与落地七大误区。

## 核心要点

- **RAG 定位**：结合检索系统与生成模型，从外部知识库检索相关内容作为 Prompt 输入，增强知识密集型任务；知识可实时更新、可观测可解释，能显著降低幻觉。
- **系统组件**：Chunk（切块）、Embedding（向量化）、Vector Database（如 Milvus/Weaviate/Pinecone）、Retrieval（检索）、Generation（生成）；切块+向量化+建库为离线部分，检索+生成为在线部分。
- **"RAG 已死"辨析**：长上下文、微调、MCP 与 RAG 是互补关系——RAG 获取外部知识、微调优化处理、长上下文承载更多信息、MCP 简化工具集成，类比硬盘与内存，真正有价值的是组合拳。
- **FAQ vs RAG**：FAQ 是预设答案库的高效匹配、轻量；RAG 是文档切块向量化后由 LLM 综合生成，可推理组合、更灵活；可做双层知识库：FAQ 层管高频标准问题，向量库层管长尾复杂查询。
- **技术架构**：离线（切块→分词→向量化→建文本/向量索引）；在线（文本混合检索+向量检索→重排序→TopK 块+问题进 LLM 生成）。
- **技术演进**：Naive RAG（直接检索组装）→ 高级 RAG（查询改写/路由等前优化 + 重排融合等后优化）→ 模块化 RAG（检索、重排、OCR 等组件可插拔、松耦合、可独立评估）。
- **落地七大误区**：数据不分库、盲目用混合检索、切块粒度一刀切（应按文档类型调，如法律用 512）、把召回率等同于效果（需看精确率/NDCG/TOP-K）、生成过度依赖 LLM（提示词须约束"严格基于内容回答"）、忽视查询意图（需改写）、缺少前置意图分类与分发（不同知识库分开路由检索更准）。

## 正文

见 `[[Assets/2026-11/weixin-ob6-qxunmh26oq5gk9m51a]]`（抓取稿，配图原位为 1px 占位符属公众号抓取常态，文字内容完整）。

## 来源

- https://mp.weixin.qq.com/s/Ob6_qxUNMh26Oq5gk9m51A

## 附件

[[Assets/2026-11/weixin-ob6-qxunmh26oq5gk9m51a.md]]
