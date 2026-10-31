---
id: wiki-source-spring-ai-2-rag-mcp-full-flow
type: source
title: 新玩具到货：Spring AI 2.0 + RAG + MCP，Java生态的AI开发全流程
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: medium
tags:
  - source
  - spring-ai
  - rag
  - mcp
  - java
sources:
  - raw/sources/ai/2026-10-31-spring-ai-2-rag-mcp-full-flow.md
related:
  - wiki/entities/spring-ai.md
  - wiki/sources/spring-ai-milvus-rag-production.md
  - wiki/concepts/mcp.md
---
# 新玩具到货：Spring AI 2.0 + RAG + MCP，Java生态的AI开发全流程

## Overview（概览）

微信公众号教程（程序员波特）：Java 程序员不用学 Python、不碰 LangChain，用 Spring AI 2.0 以写 Service 的姿势搭"私人助手"。七步走通全流程：ChatClient 对话 → defaultSystem 人设 → MessageChatMemoryAdvisor 记忆 → QuestionAnswerAdvisor + PgVector 读笔记（RAG）→ @Tool 方法查实时数据 → .entity() 结构化输出 → MCP Server 暴露工具。核心卖点：换模型只改配置不改代码；MCP 是 AI 应用间的"USB 接口"。二手教程（一手经验转述），事实密度中等。

## Key Facts（关键事实）

- 版本基线（教程）：Spring AI 2.0.2 + Spring Boot 4.1.2 + Java 17；OpenAI starter 兼容所有 OpenAI 格式 API（通义千问、LM Studio、Ollama），本地模型 base-url 填 `http://localhost:1234/v1`。
- ChatClient 由自动配置注入 Builder，`build()` + `call()` 即可，无 SDK 初始化、无鉴权、无 HTTP 调用代码。
- 换模型只改 `application.yml` 的 base-url/api-key（如 DashScope compatible-mode）。
- 记忆：MessageChatMemoryAdvisor 自动把最近 20 条消息塞进每次请求（MessageWindowChatMemory 默认窗口），按 conversationId 区分对话；conversationId 必传，不传报错。
- RAG：PgVector + `initialize-schema: true` 自动建表；embedding 模型与聊天模型分开（云端 text-embedding-v4，1024 维）；QuestionAnswerAdvisor 自动检索并塞 Prompt；similarityThreshold(0.5)、topK(4) 可调。
- Tool Calling：普通 Java 方法加 `@Tool`/`@ToolParam`（description 给模型看，描述越清楚调用越准）；模型决定调什么、何时调，Spring AI 执行并回传结果。
- 结构化输出：`.entity(AssistantReply.class)` 让模型按 JSON 结构返回 record，一套代码两种输出（聊天散文/后端结构化对象）。
- MCP Server：`spring-ai-starter-mcp-server-webmvc` + 注册 ToolCallbackProvider；`@Tool` 方法同时服务自己的助手（`.tools(...)`）与外部 AI 客户端（Claude Desktop、Cursor）。
- 已知问题：API 快速演进（2.1 Milestone 推进中，高级用法可能变）、文档不完善（Advisor 优先级等需看源码/Issue）、社区生态不如 LangChain。

## Important Claims（重要论断）

### Claim 1

Spring AI 是 Java 应用与模型之间的中间层——Spring Data 屏蔽数据库差异，Spring AI 屏蔽模型差异；定位"Java 版 LangChain，但更 Spring"（依赖注入、自动配置、@Bean）。

### Claim 2

System Prompt 中"不知道就说不知道"能挡掉一大半幻觉——没有这句话的 AI 像永远不肯承认自己不懂的同事。

### Claim 3

MCP 让工具可复用、可共享、可被发现，正在成为 AI 应用之间的"USB 接口"。

## Concepts Introduced（引入的概念）

- [[spring-ai]]（实体）
- [[mcp]]（已有概念页）
- [[rag-production-guardrails]]（生产护栏，与本教程互补）

## Entities Mentioned（提及的实体）

- [[spring-ai]]（Spring AI 2.0）
- [[langchain4j-multimodal-rag]]（Java 生态另一 AI 框架）
- [[spring-ai-milvus-rag-production]]（Spring AI 企业级 RAG 前序信源）
- Claude Desktop / Cursor（MCP 外部客户端）
- 通义千问（DashScope）、LM Studio、Ollama（OpenAI 兼容端点）

## Implications（影响／启示）

- Java 团队零换栈接入 AI 的路径已成熟：七步、每步几行代码，主项目加依赖即可。
- Advisor 横切机制（记忆/RAG 都是拦截器）把 AI 能力的组装变成 Spring 熟悉的装饰器模式。
- MCP Server 让 Java 应用的工具能力同时对内对外暴露，工具写一遍、两处调用。

## Limitations（局限）

- 二手教程信源（个人经验转述），版本与 API 细节以教程写作时点为准；官方文档与源码仍是权威。
- 配图未采集（纯文字教程）；未覆盖并发、多 Advisor 优先级、生产部署等深水区（前序信源 spring-ai-milvus-rag-production 覆盖生产侧）。

## Related Knowledge（相关知识）

- [[spring-ai]]
- [[spring-ai-milvus-rag-production]]
- [[mcp]]
- [[rag-production-guardrails]]

## Source（信源）

- `raw/sources/ai/2026-10-31-spring-ai-2-rag-mcp-full-flow.md`
