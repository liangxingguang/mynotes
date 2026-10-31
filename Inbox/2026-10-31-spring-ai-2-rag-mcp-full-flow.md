---
id: 2026-10-31-spring-ai-2-rag-mcp-full-flow
title: 新玩具到货：Spring AI 2.0 + RAG + MCP，Java生态的AI开发全流程
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/fc3HYvCgv4AK9BPQnVnPCg
source_type: article
platform: 微信公众号
created: 2026-10-31
category: 技术
tags:
  - 工程实践
  - AI
asset_ref: Assets/2026/10/spring-ai-2-rag-mcp-full-flow.md
wiki_status: pending
---

# 新玩具到货：Spring AI 2.0 + RAG + MCP，Java生态的AI开发全流程

> 摘要：Java 程序员的 AI 应用开发教程——不用学 Python、不碰 LangChain，用 Spring AI 2.0 以写 Service 的姿势搭一个"私人助手"。七步走通全流程：ChatClient 对话 → defaultSystem 人设 → MessageChatMemoryAdvisor 记忆 → QuestionAnswerAdvisor + PgVector 读笔记（RAG）→ @Tool 方法查实时数据（Tool Calling）→ .entity() 返回结构化 Java 对象 → MCP Server 把工具暴露给其他 AI 客户端。核心卖点：换模型只改配置不改代码；MCP 是 AI 应用间的"USB 接口"。

## 核心要点

- **定位**：Spring AI 不是大模型，是 Java 应用与模型之间的中间层——Spring Data 屏蔽数据库差异，Spring AI 屏蔽模型差异；Java 版 LangChain，更 Spring（依赖注入、自动配置、@Bean）。
- **第一步对话**：加 `spring-ai-starter-model-openai`（兼容所有 OpenAI 格式 API：通义千问、LM Studio、Ollama），`api-key`/`base-url`/`model` 三项配置；本地模型填 `localhost:1234/v1`。自动配置注入 `ChatClient.Builder`，`build()` + `call()` 即可，无 SDK 初始化、无鉴权、无 HTTP 调用代码。
- **换模型不改代码**：改 `application.yml` 的 base-url 即可切通义千问（DashScope）等。
- **人设 System Prompt**：`defaultSystem` 每次对话自动带上；"不知道就说不知道"能挡掉一大半幻觉。
- **记忆（Advisor 机制）**：`MessageChatMemoryAdvisor` 自动把最近 20 条消息塞进每次请求；按 `conversationId` 区分对话；**conversationId 必传，不传报错**。
- **RAG（读笔记）**：笔记 → embedding → PgVector 向量库（`initialize-schema: true` 自动建表；embedding 模型与聊天模型分开，云端可用 text-embedding-v4）；`QuestionAnswerAdvisor` 自动检索并塞进 Prompt；可调 `similarityThreshold(0.5)`、`topK(4)`。
- **Tool Calling（查实时数据）**：普通 Java 方法加 `@Tool` + `@ToolParam`（description 给模型看，描述越清楚调用越准）；模型决定调什么、何时调，Spring AI 执行并回传结果。
- **结构化输出**：`.entity(AssistantReply.class)` 让模型按 JSON 结构返回 record，直接 `if (reply.needsFollowUp())` 做业务判断，一套代码两种输出。
- **MCP Server（工具暴露）**：加 `spring-ai-starter-mcp-server-webmvc`，注册 `ToolCallbackProvider`，`@Tool` 方法同时服务自己的助手（`.tools(...)`）和外部 AI 客户端（Claude Desktop、Cursor）——工具可复用、可共享、可被发现；MCP 是 AI 应用间的"USB 接口"。
- **适用边界**：适合 Spring Boot 主项目加 AI 能力（客服/问答/助手）、团队无 Python 经验；不适合纯脚本实验（Python+LangChain 生态更成熟）、已有 Python AI 基础设施硬切 Java。
- **已知问题**：API 快速演进（2.1 Milestone 已推，高级用法可能变）、文档不完善（Advisor 优先级等需看源码/Issue）、社区生态不如 LangChain。

## 正文

七步回顾：ChatClient 能说话 → System Prompt 有人设 → MemoryAdvisor 有记忆 → QuestionAnswerAdvisor+PgVector 读笔记 → @Tool 查实时数据 → .entity() 结构化输出 → MCP Server 暴露工具。每步都是几行代码。

## 来源

- 原文：https://mp.weixin.qq.com/s/fc3HYvCgv4AK9BPQnVnPCg
- 抓取方式：web-fetch（Playwright 渲染，15,294 字符）

## 附件

- [[Assets/2026/10/spring-ai-2-rag-mcp-full-flow.md]]（抓取正文）
