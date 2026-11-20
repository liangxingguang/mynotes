---
id: wiki-concept-agent-service
type: concept
title: Agent Service（Agent 应用后端化）
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - concept
  - ai-agent
  - backend
sources:
  - raw/sources/ai/2026-11-20-agentscope-2.md
related:
  - wiki/entities/agentscope.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-loop.md
---
# Agent Service（Agent 应用后端化）

## Definition（定义）

Agent Service 是把 Agent 应用当作一套可部署的后端服务来提供的模式：不只给 SDK（积木），还附带多租户、多会话、IM 渠道、RAG、MCP Hub、持久化、调度等 SaaS 通用能力，让 Agent 应用"作为服务跑起来"，而非停留在"怎么定义一个 Agent"。以 [[agentscope|AgentScope 2.0]] 的 Agent Service 为典型实现（信源 2026-11-20）。

## Why It Matters（为什么重要）

纯 SDK 框架只解决"Agent 怎么写"，而 Agent 应用真正难的是把它变成可靠的服务——多租户隔离、会话管理、IM 接入、权限、沙箱、持久化、可观测、调度。这些是 SaaS 的通用问题，不是 Agent 特有的问题。Agent Service 把这些通用问题在框架层提前做完，省掉重复造轮子（信源 2026-11-20）。

## Core Characteristics（核心特征）

1. **框架 + 后端组合**：前半部分是积木（ReAct、工具、上下文、权限、沙箱），后半部分是服务化；相比"纯 SDK 框架"，更偏应用后端（信源 2026-11-20）。
2. **多租户与多会话隔离**：Serving 提供多租户、多会话隔离、FastAPI 后端与预置 Web UI。
3. **IM 渠道接入**：Channels 接飞书、Discord、钉钉、自定义渠道与消息路由——"Agent 直接进 IM 群干活"的入口。
4. **团队编排**：Agent Team 提供 leader-worker 编排、内置团队工具与任务规划。
5. **知识与工具生态**：RAG Service（Blob 存储、索引 worker、多租户检索）、MCP & Skill Hub（浏览 GitHub MCP Registry / ClawHub，安装进库、加进 workspace）、Resource Sharing（组/组织级共享模型、MCP server、skills、workspace）。
6. **持久化与调度**：Persistence（SQL / NoSQL 持久化会话与状态）、Scheduling（定时任务、Agent 唤醒、后台任务卸载）。

## Structure（结构）

Agent Service 能力清单（信源 2026-11-20）：

| 能力 | 你能得到什么 |
|---|---|
| Serving | 多租户、多会话隔离、FastAPI 后端、预置 Web UI |
| Agent Team | Leader-worker 编排、内置团队工具、任务规划 |
| Channels | 飞书、Discord、钉钉、自定义渠道、消息路由 |
| RAG Service | Blob 存储、索引 worker、多租户检索 |
| MCP & Skill Hub | 浏览 GitHub MCP Registry / ClawHub，安装进库，加进 workspace |
| Resource Sharing | 组/组织级共享模型、MCP server、skills、workspace |
| Persistence | SQL / NoSQL 持久化会话与状态 |
| Scheduling | 定时任务、Agent 唤醒、后台任务卸载 |

## How It Works（运作方式）

Agent Service 以 FastAPI 后端 + 预置 Web UI 为载体，把 Agent 变成"多租户、多会话的应用"。调用方通过预置 Web UI 或接入的 IM 渠道与 Agent 交互，框架层负责租户隔离、会话状态持久化、渠道消息路由与后台任务调度（信源 2026-11-20）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agentscope|AgentScope]]：AgentScope 2.0 是 Agent Service 的典型实现载体。
- [[harness-engineering|Harness Engineering]]：Agent Service 的多租户/沙箱/权限/渠道/持久化属于 Harness 层的工程能力，Agent Service 是 Harness 能力服务化后的形态（解读）。
- [[agent-loop|Agent Loop]]：Agent Service 承载的 Agent 核心仍是 ReAct 循环，服务化解决的是循环之外的运维与接入问题。

### Distinctions（区分）

- **Agent Service vs 纯 SDK 框架**：纯 SDK 框架只给积木，服务化问题需自建；Agent Service 把 SaaS 通用问题在框架层解决。适合要做 Agent 应用（非 demo）的团队；只想写脚本或单机 Agent 的个人，Pydantic AI、OpenAI SDK 更轻（信源 2026-11-20）。

## Evolution（演进）

- 2026-11-20 — 新建本页。信源 `raw/sources/ai/2026-11-20-agentscope-2.md` 提出"Agent 框架 + Agent 后端"的定位，给出 Agent Service 八项能力清单、SaaS 通用问题框架层解决的论断与适用边界。

## Open Questions（开放问题）

- Agent Service 的运维复杂度对小团队是否成为负担，信源提示"Agent Service 很重，小团队用不上反而增加负担"，但未给出量化成本数据（未知）。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-20-agentscope-2.md`

## Related Knowledge（相关知识）

- [[agentscope|AgentScope]]（实体页，含 2.0 的 Agent Service 实现与版本节奏）
