---
id: wiki-entity-spring-ai
type: entity
title: Spring AI
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: medium
tags:
  - entity
  - spring-ai
  - java
  - rag
  - mcp
sources:
  - raw/sources/ai/2026-10-31-spring-ai-2-rag-mcp-full-flow.md
  - raw/sources/ai/2026-10-21-spring-ai-milvus-rag-production.md
related:
  - wiki/sources/spring-ai-2-rag-mcp-full-flow.md
  - wiki/sources/spring-ai-milvus-rag-production.md
  - wiki/concepts/mcp.md
  - wiki/sources/langchain4j-multimodal-rag.md
---
# Spring AI

## Overview（概览）

Spring 生态的 Java 应用与 AI 模型之间的中间层：屏蔽模型差异（类比 Spring Data 屏蔽数据库差异），被定位为"Java 版 LangChain，但更 Spring"（依赖注入、自动配置、@Bean）。换模型只改配置不改代码。当前由两篇信源支撑：入门教程（2.0.2 + Spring Boot 4.1.2 七步全流程）与企业级 RAG 生产实践（1.0.9 基线，多租户/权限/容量/恢复）。

## Identity（身份信息）

- Type（类型）: 开源框架 / AI 中间层（应用与模型之间）
- Organization（所属组织）: Spring 生态项目（信源未指明具体维护组织，未验证）
- Role（角色）: Java 应用接入大模型的抽象层：ChatClient 对话、Advisor 横切（记忆/RAG）、@Tool 工具调用、结构化输出、MCP Server 工具暴露
- Status（状态）: 活跃（2.0 GA，2.1 Milestone 推进中）

## Important Facts（重要事实）

- 能力栈（七步）：ChatClient（自动配置注入 Builder）→ defaultSystem 人设 → MessageChatMemoryAdvisor（默认窗口 20 条，conversationId 必传）→ QuestionAnswerAdvisor + 向量库（PgVector initialize-schema 自动建表；embedding 与聊天模型分开）→ @Tool/@ToolParam 工具调用（description 即模型可见性）→ .entity() 结构化输出（record 直接返回）→ MCP Server（ToolCallbackProvider，@Tool 同时服务内部助手与外部 AI 客户端）。
- 模型兼容：OpenAI starter 兼容所有 OpenAI 格式 API（通义千问 DashScope、LM Studio、Ollama）；换模型改 base-url。
- 版本基线差异：入门教程 2.0.2 + Spring Boot 4.1.2；生产实践信源 1.0.9 + Spring Boot 3.4/3.5 —— 两信源间存在版本演进（1.0.x → 2.0）。
- 已知问题（教程口径）：API 快速演进、文档不完善（Advisor 优先级等需看源码/Issue）、社区生态弱于 LangChain。
- 适用边界：适合 Spring Boot 主项目加 AI 能力（客服/问答/助手）、团队无 Python 经验；不适合纯脚本实验、已有 Python AI 基础设施硬切 Java。

## Products / Projects（产品／项目）

- [[spring-ai-2-rag-mcp-full-flow]]（七步全流程入门教程信源）
- [[spring-ai-milvus-rag-production]]（企业级 RAG 生产工程实践信源）
- [[langchain4j-multimodal-rag]]（Java 生态另一 AI 框架，横向对照）

## Relationships（关系）

- [[mcp]]（MCP Server 让 Spring AI 应用的工具能力对外暴露）
- [[rag-production-guardrails]]（生产护栏方法论，由 Milvus 信源引入）

## Timeline（时间线）

- 2026-10-21 — Spring AI + Milvus 企业级 RAG 生产工程实践（1.0.9 基线）：多租户/权限/容量/恢复四条主线
- 2026-10-31 — Spring AI 2.0.2 七步全流程教程（Spring Boot 4.1.2）：对话→记忆→RAG→工具→结构化→MCP

## Current Understanding（当前认知）

Spring AI 是 Java 生态 AI 应用开发的事实候选框架：以 Spring 惯例（DI/自动配置/Advisor 拦截器链）组织 AI 能力，并以 MCP Server 把工具能力标准化暴露。两信源互补——入门教程讲能力组装，生产信源讲工程护栏。

## Evidence（证据）

- `raw/sources/ai/2026-10-31-spring-ai-2-rag-mcp-full-flow.md`
- `raw/sources/ai/2026-10-21-spring-ai-milvus-rag-production.md`
