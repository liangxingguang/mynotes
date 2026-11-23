---
id: wiki-source-langchain-rag-tutorial
type: source
title: 用 LangChain 搞定 RAG：告别大模型幻觉
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: high
tags:
  - source
  - ai
  - rag
  - langchain
sources:
  - raw/sources/ai/2026-11-23-langchain-rag-tutorial.md
related:
  - wiki/entities/langchain.md
  - wiki/concepts/rag.md
  - wiki/concepts/rag-chunking.md
---
# 用 LangChain 搞定 RAG：告别大模型幻觉

## Overview（概览）

大模型 Agent 系列教程篇，以 LangChain 演示 RAG 完整流程。先讲 RAG 原理（私有数据检索增强、离线/在线分工、六阶段职责），再讲切分重叠、Embedding 余弦相似度、Faiss 索引思想，最后以《天龙八部》文本为例走通 LangChain 代码（Loader→切分→建库→Retriever→RetrievalQA）并解析返回结果与调试方法。作者提醒 LangChain 在生产中用得少，重在理解机制而非背接口。

## Key Facts（关键事实）

- **RAG 原理**：私有数据（如公司制度）无法靠训练数据回答，全文塞入又超上下文且信息过载；RAG 把文档切块，检索最相关 chunk 与问题拼接后让模型依据片段回答。"检索增强"即回答前从外部找补充材料，知识不写入参数、不重训，每次提问都要重新检索。
- **六阶段职责**：切分→Embedding→向量索引→Top-K 召回→Prompt 拼接→生成；任一阶段出错都影响结果。离线部分（加载/切分/向量/索引）预先完成，在线部分实时检索生成。
- **切分与重叠**：固定字数切分可能把知识点拆到两个 chunk，相邻块保留重叠（如每块 200 字、重叠 20）降低边界截断风险；但重叠只降风险不能绝对保证，过大反而引入重复。
- **Embedding 与余弦相似度**：文本经 Embedding 模型转为固定维度向量，用余弦相似度 cos(θ)=A·B/(‖A‖×‖B‖) 判语义相近；文档与问题必须用同一模型生成向量（同一套"语义坐标系"），不同模型的向量不可比较。
- **Faiss 思想**：向量多时不能逐一比较，先把向量组织成候选区域，新点来时先定位区域再在局部比较；不同向量库的差异只在"怎么划分区域"。Bert 即向量模型，BGE/BME 为其改良版。
- **LangChain 代码流**：离线 TextLoader 加载+切分+建库；在线 `db.as_retriever(search_kwargs={"k":2})` 取 Top-K，`ChatPromptTemplate` 定义 {context}/{question}，`RetrievalQA.from_chain_type`（stuff 模式）拼装调用模型；`return_source_documents=True` 同时返回来源片段。
- **结果解析与调试**：返回含 query、result（模型生成）、source_documents（召回原文）三字段，二者不可混同；调试先查来源文档——来源无相关内容则问题出在检索之前，反复改措辞无效；来源正确而答案错才查上下文传入与提示词。
- **学习观**：作者指出 LangChain 生产中用得少，重点不是背接口，而是理解文本如何经模板/分词器进模型、Message 角色分工、Chain 状态传递、工具调用中模型只规划程序执行、模型随机性等运行机制。

## Important Claims（重要论断）

### Claim 1：文档与问题必须用同一 Embedding 模型

文档向量和问题向量必须由同一个 Embedding 模型生成。不同模型的向量即使维度相同，其空间含义也不同，不能直接比较——Embedding 模型是同一套"语义坐标系"，文档与问题须放入同一坐标系才能判断相近。

### Claim 2：重叠只降风险不能绝对保证

重叠只是在边界附近复制文本，并不能保证所有知识点都完整。知识点本身很长或分隔符选择不合理时仍可能被拆开，因此重叠是降低风险的办法，不能绝对保证；重叠太大反而产生更多重复内容。

### Claim 3：调试 RAG 先查来源文档

不能把 result（生成结果）与 source_documents（检索结果）混为一谈。调试时应优先检查来源文档：来源无相关内容，问题在检索之前，反复改回答措辞通常无效；来源正确而答案仍错，才检查上下文传入与提示词。

### Claim 4：LangChain 生产用得少，重在理解机制

LangChain 用来做 RAG 在实际生产中几乎不用，实现没有那么好，更多是基本功能。重点不是背接口，而是理解文本如何经模板/分词器进模型、Message 角色分工、Chain 状态传递、工具调用中模型只规划程序执行等运行机制——理解机制后框架接口变化也能较快定位新写法。

## Concepts Introduced（引入的概念）

- [[rag]]
- [[rag-chunking]]
- [[langchain]]

## Entities Mentioned（提及的实体）

- [[langchain|LangChain]]
- Faiss（向量相似度搜索与聚类库）
- Bert / BGE / BME（向量（Embedding）模型及其改良版）

## Implications（影响／启示）

- RAG 的检索与生成承担不同职责，六阶段任一出错都影响结果，投入重心应在解析、分块与召回而非换模型。
- 检索质量与生成质量是相乘关系：能力很强的模型拿到无关条款会写出通顺、自洽但无关的答案，比明显胡说更难发现。
- 框架接口易变，理解输入/输出/状态传递与依赖关系比记忆写法更重要。

## Limitations（局限）

- 单信源、教学演示性质，LangChain 代码流为最小演示，未覆盖生产级 RAG 的混合检索、Rerank、评估等进阶变体。
- 抓取稿配图原位为 1px 占位符（公众号抓取常态），文字内容完整；部分代码块在抓取中折叠/截断（如离线流程说明、RetrievalQA 调用、返回结构示例），以文字说明为准。
- 作者"LangChain 生产用得少"为个人观点，未给出生产采用率数据。

## Related Knowledge（相关知识）

- [[langchain|LangChain]]
- [[rag|RAG（检索增强生成）]]
- [[rag-chunking|RAG 分块]]
- [[langgraph|LangGraph]]

## Source（信源）

- `raw/sources/ai/2026-11-23-langchain-rag-tutorial.md`
- 原文：https://mp.weixin.qq.com/s/T350SQ54mnpRH4GVMBx5bw
