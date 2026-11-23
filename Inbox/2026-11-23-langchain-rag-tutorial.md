---
id: 2026-11-23-langchain-rag-tutorial
title: 用 LangChain 搞定 RAG：告别大模型幻觉
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/T350SQ54mnpRH4GVMBx5bw
source_type: 网页
platform: 微信
created: 2026-11-23
category: 学习
tags: [RAG, AI]
asset_ref: Assets/2026-11/weixin-t350sq54mnp-rh4gvmbx5bw.md
wiki_status: pending
---

# 用 LangChain 搞定 RAG：告别大模型幻觉

> 大模型 Agent 系列教程篇：用 LangChain 演示 RAG 完整流程。先讲 RAG 原理（私有数据检索增强、离线/在线分工、六阶段职责），再讲切分重叠、Embedding 余弦相似度、Faiss 索引思想，最后以《天龙八部》文本为例走通 LangChain 代码（Loader→切分→建库→Retriever→RetrievalQA）并解析返回结果与调试方法。作者提醒 LangChain 生产中用得少，重在理解机制而非背接口。

## 核心要点

- **RAG 原理**：私有数据（如公司制度）无法靠训练数据回答，全文塞入又超上下文且信息过载；RAG 把文档切块，检索最相关 chunk 与问题拼接后让模型依据片段回答。"检索增强"即回答前从外部找补充材料，知识不写入参数、不重训，每次提问都要重新检索。
- **六阶段职责**：切分→Embedding→向量索引→Top-K 召回→Prompt 拼接→生成；任一阶段出错都影响结果。离线部分（加载/切分/向量/索引）预先完成，在线部分实时检索生成。
- **切分与重叠**：固定字数切分可能把知识点拆到两个 chunk，相邻块保留重叠（如每块 200 字、重叠 20）降低边界截断风险；但重叠只降风险不能绝对保证，过大反而引入重复。
- **Embedding 与余弦相似度**：文本经 Embedding 模型转为固定维度向量，用余弦相似度 cos(θ)=A·B/(‖A‖×‖B‖) 判语义相近；文档与问题必须用同一模型生成向量（同一套"语义坐标系"），不同模型的向量不可比较。
- **Faiss 思想**：向量多时不能逐一比较，先把向量组织成候选区域，新点来时先定位区域再在局部比较；不同向量库的差异只在"怎么划分区域"。Bert 即向量模型，BGE/BME 为其改良版。
- **LangChain 代码流**：离线 TextLoader 加载+切分+建库；在线 `db.as_retriever(search_kwargs={"k":2})` 取 Top-K，`ChatPromptTemplate` 定义 {context}/{question}，`RetrievalQA.from_chain_type`（stuff 模式）拼装调用模型；`return_source_documents=True` 同时返回来源片段。
- **结果解析与调试**：返回含 query、result（模型生成）、source_documents（召回原文）三字段，二者不可混同；调试先查来源文档——来源无相关内容则问题出在检索之前，反复改措辞无效；来源正确而答案错才查上下文传入与提示词。
- **学习观**：作者指出 LangChain 生产中用得少，重点不是背接口，而是理解文本如何经模板/分词器进模型、Message 角色分工、Chain 状态传递、工具调用中模型只规划程序执行、模型随机性等运行机制。

## 正文

见 `[[Assets/2026-11/weixin-t350sq54mnp-rh4gvmbx5bw]]`（抓取稿，配图原位为 1px 占位符属公众号抓取常态，文字内容完整）。

## 来源

- https://mp.weixin.qq.com/s/T350SQ54mnpRH4GVMBx5bw

## 附件

[[Assets/2026-11/weixin-t350sq54mnp-rh4gvmbx5bw.md]]
