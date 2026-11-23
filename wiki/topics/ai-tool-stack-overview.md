---
id: wiki-topic-ai-tool-stack-overview
type: topic
title: AI 工具栈全景（11 维度）
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - topic
  - AI
  - 工具栈
sources:
  - raw/sources/ai/2026-11-23-ai-ecosystem-11-dimensions.md
related:
  - wiki/sources/ai-ecosystem-11-dimensions.md
  - wiki/concepts/mcp.md
  - wiki/concepts/rag.md
---
# AI 工具栈全景（11 维度）

## Scope（范围）

现代 AI 工具栈的全景分类框架：按「底层模型 → 能力增强 → 工程基建 → 上层应用」链路划分为 11 个维度，每个维度给出功能定位与代表工具。作为 AI 技术选型、方案盘点与缺口检查的导航入口。

## Current Understanding（当前认知）

信源（知乎想法，单信源分类框架）将 AI 工具栈拆为 11 个维度：

| 维度 | 功能定位 | 代表工具（信源枚举） |
|---|---|---|
| 1 大语言模型 | 基础推理与生成 | GPT、Claude、Gemini、Llama、Mistral、Cohere、Hugging Face、Ollama、vLLM |
| 2 智能体式 AI | 智能体编排与多智能体协作 | [[langgraph]]、CrewAI、AutoGen、Microsoft Agent Framework、LlamaIndex Workflows、AWS Strands Agents、CAMEL、Agno |
| 3 检索增强生成（RAG） | 把外部知识接进模型 | [[rag]] 生态：LangChain、LlamaIndex、Haystack、DSPy、RAGflow、GraphRAG、Unstructured、EmbedChain |
| 4 向量嵌入 | 文本/数据转向量 | OpenAI Embeddings、Cohere Embed、Voyage AI、Sentence Transformers、BGE、Vertex AI、Azure OpenAI Embeddings |
| 5 模型上下文协议（MCP） | 模型与工具/数据源连接标准 | [[mcp]] 生态：MCP SDK、FastMCP、MCP Registry 及 GitHub、Slack、PostgreSQL、Google Drive、Filesystem 等 Server |
| 6 AI 安全 | 护栏、隐私与内容风控 | NeMo Guardrails、Guardrails AI、Presidio、Lakera Guard、Prompt Security、Protect AI、Azure AI Content Safety、Bedrock Guardrails |
| 7 可观测性 | 链路追踪、评估与监控 | LangSmith、Langfuse、Arize Phoenix、W&B Weave、TruLens、Ragas、Promptfoo、Helicone |
| 8 记忆 | 长期/短期状态与上下文持久化 | Memo、Zep、Letta、LangGraph Memory、Redis、PostgreSQL、Neo4j、Chroma |
| 9 AI 智能体 | 厂商级 Agent 开发套件与托管服务 | OpenAI Agents SDK、LangChain Agents、PydanticAI、Semantic Kernel、Google ADK、Bedrock AgentCore、Azure AI Foundry Agent Service |
| 10 自动化 | 工作流与任务编排 | n8n、Zapier、Make、Power Automate、Temporal、Airflow、Prefect、Kestra、Pipedream |
| 11 向量数据库 | 向量检索与存储底座 | Pinecone、Weaviate、Qdrant、Milvus、Chroma、pgvector、Elasticsearch、Redis、MongoDB Atlas Vector Search |

链路解读：维度 1 提供基础能力；维度 2–5 是「能力增强」（接入知识、工具与编排）；维度 6–8 是「工程基建」（安全、观测、记忆）；维度 9–11 是「上层应用与底座」（Agent 套件、自动化、向量存储）。此分层解读为编译者归纳，信源仅给出维度顺序。

## Key Concepts（关键概念）

- [[mcp]]（维度 5，模型与外部工具/数据源的连接标准）
- [[rag]]（维度 3，检索增强生成）
- 向量嵌入 / 向量数据库（维度 4、11，检索与存储底座）
- AI 安全护栏（维度 6）
- AI 可观测性（维度 7）
- 智能体编排（维度 2 与维度 9 的分工：编排框架 vs 厂商套件）

## Key Entities（关键实体）

- [[langgraph]]（智能体式 AI 维度代表）
- 大模型厂商：OpenAI、Anthropic、Google、Meta、Mistral、Cohere、Hugging Face
- RAG/编排框架：LangChain、LlamaIndex、Haystack、DSPy
- 向量库：Pinecone、Weaviate、Qdrant、Milvus、Chroma、pgvector
- 自动化：n8n、Zapier、Make、Temporal、Airflow

> 注：多数工具为单信源枚举提及，证据不足以单独建实体页；已有页面者（如 [[langgraph]]）已链接。

## Important Decisions（重要决策）

- 无（信源为分类盘点，不涉及具体决策）。

## Major Developments（重大进展）

- 无（信源为静态盘点，无时间线信息）。

## Disagreements（分歧）

- 维度 2「智能体式 AI」（编排框架）与维度 9「AI 智能体」（厂商套件/托管服务）的边界在信源中未明确定义，存在重叠可能，属分类口径问题而非事实矛盾。

## Open Questions（开放问题）

- 11 维度划分是单信源的主观框架，是否被更广泛采用、是否有其他权威分类（如按层划分的参考架构），需更多信源交叉验证。
- 各工具的最新版本、适用场景与对比，本页未覆盖，需按需补充。

## Related Topics（相关主题）

- [[ai-ecosystem-11-dimensions]]
