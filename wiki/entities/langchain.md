---
id: wiki-entity-langchain
type: entity
title: LangChain
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - entity
  - ai
  - rag
  - framework
sources:
  - raw/sources/ai/2026-11-23-langchain-rag-tutorial.md
  - raw/sources/ai/2026-11-12-ai-agent-tech-overview.md
related:
  - wiki/concepts/rag.md
  - wiki/concepts/rag-chunking.md
  - wiki/entities/langgraph.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-loop.md
---
# LangChain

## Overview（概览）

LangChain 是一个面向 LLM 应用开发的框架，以"链（Chains）"为核心抽象，把多个 LLM 调用与外部工具串成流水线，常用于 RAG 流程编排。其 RAG 实现提供 Loader、切分、向量库、Retriever、Prompt 模板与 RetrievalQA 等基本组件。教学与演示价值大于生产采用——作者指出 LangChain 在生产中用得少、实现偏基本，重在借其理解 RAG 与 LLM 应用的运行机制。

## Identity（身份信息）

- Type（类型）: LLM 应用开发框架（开源）
- Organization（所属组织）: 未知（本知识库信源未显式陈述其归属；见 [[langgraph]] 实体中"LangChain 生态"的推断性标注）
- Role（角色）: RAG / LLM 应用编排框架
- Status（状态）: active（生态持续演进，但生产采用有限）

## Important Facts（重要事实）

- **核心抽象**：以 Chain / Agent 为核心，将多个 LLM 调用串成流水线（信源 2026-11-12）。
- **RAG 组件**：提供 TextLoader（加载）、文档切分、向量库建库、`as_retriever(search_kwargs={"k":N})`（Top-K 召回）、`ChatPromptTemplate`（定义 {context}/{question}）、`RetrievalQA.from_chain_type`（stuff 模式拼装调用模型）、`return_source_documents=True`（返回来源片段）等基本功能（信源 2026-11-23）。
- **状态管理需自己接**：状态管理与多用户隔离需开发者自行实现，长期运行不擅长（信源 2026-11-12）。
- **框架定位对比**：与 LlamaIndex（RAG 框架，核心抽象 Query Engine）、AgentScope 2.0（Agent 平台，内置 AgentState 持久化、多租户、沙箱、长期运行）相比，LangChain 适合简单 LLM 应用；三者不互斥，AgentScope 可接入 LlamaIndex 检索能力（信源 2026-11-12，解读）。
- **生产采用有限**：作者指出 LangChain 用来做 RAG 在实际生产中几乎不用，实现没有那么好，更多是基本功能；重点不是背接口而是理解运行机制（信源 2026-11-23，作者个人观点）。
- **历史定位**：2022 年 LangChain 提出"链（Chains）"概念，其固定流程的局限后来催生了从"链"到"Agent"的转变与 Harness 工程（信源 2026-11-12）。

## Products / Projects（产品／项目）

- Chain（链，核心编排抽象）
- RetrievalQA（RAG 问答链，stuff 模式）
- ChatPromptTemplate（对话提示词模板）
- Retriever（向量库检索器，`as_retriever`）
- TextLoader（文档加载器）

## Relationships（关系）

- [[rag|RAG（检索增强生成）]]：LangChain 是实现 RAG 的教学与演示框架，提供 RAG 全流程组件。
- [[langgraph|LangGraph]]：LangGraph 是 LangChain 生态的 Agent 编排框架，以状态机驱动 Agent/多 Agent 协作；LangChain 的固定"链"局限由 LangGraph 等承接。
- [[harness-engineering|Harness Engineering]]：LangChain 的"链"是 Harness 工程演进的起点叙事之一，其固定流程局限催生了 Agent 的工程基础设施需求。
- [[agent-loop|Agent Loop]]：Chain 的状态传递与循环编排与 Agent Loop 的执行循环相关。

## Timeline（时间线）

- 2022 — LangChain 提出"链（Chains）"概念，将多个 LLM 调用串成流水线（信源 2026-11-12）。
- 2026-11-23 — 本知识库新增信源，以 LangChain 演示 RAG 完整流程并记录其"生产用得少"的采用现状。

## Current Understanding（当前认知）

LangChain 作为 LLM 应用开发框架，在 RAG 教学与原型演示上有清晰、完整的组件覆盖，适合快速搭建 RAG 最小流程；但其状态管理、长期运行、生产部署需自行补齐，生产采用有限。其更大价值在于借其理解文本如何经模板/分词器进模型、Message 角色分工、Chain 状态传递、工具调用中模型只规划程序执行等运行机制。从"链"到"Agent/Harness"的演进是其概念脉络的延伸。

## Evidence（证据）

- `raw/sources/ai/2026-11-23-langchain-rag-tutorial.md`（RAG 组件、代码流、调试方法、生产采用观，教学演示单信源，置信度中）
- `raw/sources/ai/2026-11-12-ai-agent-tech-overview.md`（框架定位对比、链→Harness 演进叙事，单信源转述，置信度中）
