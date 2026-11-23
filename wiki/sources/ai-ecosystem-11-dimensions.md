---
id: wiki-source-ai-ecosystem-11-dimensions
type: source
title: AI 生态系统的 11 个维度
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - AI
  - 工具栈
  - 索引导航
sources:
  - raw/sources/ai/2026-11-23-ai-ecosystem-11-dimensions.md
---
# AI 生态系统的 11 个维度

## Overview（概览）

知乎想法帖：把现代 AI 工具栈按「底层模型 → 能力增强 → 工程基建 → 上层应用」链路拆成 11 个维度，每个维度给出功能定位与代表工具清单，是一张实用的 AI 技术生态全景地图。

## Key Facts（关键事实）

- 11 个维度依次为：大语言模型、智能体式 AI、检索增强生成（RAG）、向量嵌入、模型上下文协议（MCP）、AI 安全、可观测性、记忆、AI 智能体、自动化、向量数据库。
- 每个维度列出代表工具：如大语言模型维度含 OpenAI GPT、Claude、Gemini、Llama、Mistral、Cohere、Hugging Face、Ollama、vLLM；自动化维度含 n8n、Zapier、Make、Power Automate、Temporal、Airflow、Prefect、Kestra、Pipedream。
- 维度划分逻辑是工具栈链路：底层模型提供基础能力，能力增强（RAG/嵌入/MCP）接入知识与工具，工程基建（安全/可观测性/记忆/向量库）保障生产，上层为 Agent 套件与自动化编排。

## Important Claims（重要论断）

### AI 工具栈可按 11 个维度划分

现代 AI 工具栈可拆为 11 个维度，组织为「底层模型 → 能力增强 → 工程基建 → 上层应用」的一条链路（单信源分类框架，非行业标准划分）。

## Concepts Introduced（引入的概念）

- [[mcp]]（模型上下文协议，维度 5）
- [[rag]]（检索增强生成，维度 3）
- 向量嵌入、向量数据库（维度 4、11，检索/存储底座）
- AI 安全护栏（维度 6，含 NeMo Guardrails、Guardrails AI、Prompt Security 等）
- AI 可观测性（维度 7，含 LangSmith、Langfuse、Ragas 等）

## Entities Mentioned（提及的实体）

- [[langgraph]]（智能体式 AI 维度代表工具之一）
- OpenAI、Anthropic、Google、Meta、Mistral、Cohere、Hugging Face（大语言模型代表厂商）
- LangChain、LlamaIndex、Haystack、DSPy（RAG 框架）
- Pinecone、Weaviate、Qdrant、Milvus、Chroma、pgvector（向量数据库）
- n8n、Zapier、Make、Temporal、Airflow（自动化编排）

## Implications（影响／启示）

- 该 11 维度框架可作为选型与生态盘点的检查清单：评估一套 AI 系统或技术方案时，可按维度核对覆盖了哪些环节、缺口在哪。
- 维度划分凸显「工程基建」的重要性：安全、可观测性、记忆、向量库是模型能力走向生产的必备环节。

## Limitations（局限）

- 单信源（知乎想法）的主观分类框架，非官方或行业标准；维度边界存在重叠（如「智能体式 AI」与「AI 智能体」两个维度的区分未在信源中说明）。
- 工具清单为枚举式，未给出各工具的对比、适用场景或版本时效，需另行核实。

## Related Knowledge（相关知识）

- [[ai-tool-stack-overview]]

## Source（信源）

- `raw/sources/ai/2026-11-23-ai-ecosystem-11-dimensions.md`
