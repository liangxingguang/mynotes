---
id: wiki-source-a2a-multi-agent-langgraph
type: source
title: A2A 实战：从零搭建工业级多 Agent 协作系统
status: active
created: 2026-10-16
updated: 2026-10-16
confidence: high
tags:
  - ai
  - multi-agent
  - a2a
sources:
  - raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md
related:
  - wiki/concepts/a2a-protocol.md
  - wiki/concepts/mcp.md
  - wiki/comparisons/a2a-vs-mcp.md
---
# A2A 实战：从零搭建工业级多 Agent 协作系统

## Overview（概览）

尼恩《A2A 学习圣经》第 13 章（公众号版）。讲解 Google 2025 年 4 月开源的 A2A（Agent-to-Agent）协议的核心概念与通信模型，并基于 python-a2a + LangChain + LangGraph 从零实现一个"天气 + 票务"多 Agent 旅行规划系统，最后辨析 A2A 与 MCP 的互补关系。

## Key Facts（关键事实）

- A2A 是 Google 于 2025 年 4 月开源的去中心化 Agent 标准化通信协议，基于 HTTP/JSON-RPC。
- 核心实体：Agent / AgentCard / AgentSkill / Task / Message / Artifact / TaskState / AgentNetwork。
- 任务状态机：SUBMITTED → WORKING → COMPLETED / FAILED；WORKING 可转 INPUT_REQUIRED，补参后重回 WORKING。
- 实战依赖锁定：python-a2a==0.2.8、langchain-openai==0.1.12、langchain-core==0.2.30、langgraph==0.2.15、pydantic==2.10.0。
- 示例系统采用去中心化 + 星型拓扑：总控负责意图识别与汇总，专家 Agent 独立部署、可单独扩容、故障隔离。

## Important Claims（重要论断）

### Claim 1：A2A 解决多 Agent 系统的四大痛点

单体 Agent 能力局限、异构 Agent 消息格式不通、硬编码调度难维护、任务执行黑盒无管控；A2A 通过标准化"工作规范"（注册、接单、传消息、执行、回结果、报错、催补参数）统一解决。

### Claim 2：MCP 与 A2A 是互补关系而非竞争

MCP（Anthropic 2024）是 LLM↔工具/数据的纵向底层协议；A2A（Google 2025）是 Agent↔Agent 的横向上层协议。生产组合：单 Agent 经 MCP 强化自身，多 Agent 经 A2A 集群协作。详见 [[a2a-vs-mcp|A2A vs MCP]]。

### Claim 3：意图路由应从关键词匹配升级为 LLM 结构化输出

实战用 LLM + PydanticOutputParser 输出布尔意图（如 `{need_weather, need_ticket}`）做路由，替代关键词匹配。

## Concepts Introduced（引入的概念）

- [[a2a-protocol|A2A 协议]]
- [[mcp|MCP]]

## Entities Mentioned（提及的实体）

- Google（A2A 协议发起方）
- Anthropic（MCP 协议发起方）
- python-a2a / LangChain / LangGraph / Pydantic（技术栈）
- 尼恩（作者，「技术自由圈」公众号）

## Implications（影响／启示）

- 多 Agent 系统可按"总控编排 + 专家独立部署"的星型拓扑落地，专家 Agent 可单独迭代扩容。
- 异步优先与 INPUT_REQUIRED 状态使长任务与人工介入成为一等公民，适合生产场景。

## Limitations（局限）

- 公众号引流长文，作者称完整版 3 万字以上，本版有约 1000 字删节；文末培训营销内容未采集。
- 代码基于 python-a2a 0.2.8 教学版封装，落地前需核对官方 SDK 当前 API。
- 示例中订票结果为模拟返回，非真实业务闭环。

## Related Knowledge（相关知识）

- [[a2a-protocol|A2A 协议]]
- [[mcp|MCP]]
- [[a2a-vs-mcp|A2A vs MCP]]

## Source（信源）

- `raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md`
