---
id: wiki-concept-a2a-protocol
type: concept
title: A2A 协议
status: active
created: 2026-10-16
updated: 2026-10-16
confidence: medium
tags:
  - concept
  - ai
  - multi-agent
  - protocol
sources:
  - raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md
related:
  - wiki/concepts/mcp.md
  - wiki/comparisons/a2a-vs-mcp.md
---
# A2A 协议

## Definition（定义）

A2A（Agent-to-Agent）是 Google 于 2025 年 4 月开源的去中心化 Agent 标准化通信协议。它不替代大模型、不写业务代码，只统一 Agent 的"工作规范"：如何注册、接单、传消息、执行、回结果、报错与催补参数。通信基于 HTTP/JSON-RPC。

## Why It Matters（为什么重要）

传统多 Agent 系统存在四大痛点：单体 AI 只能做固定任务；异构框架写出的 Agent 消息格式互不兼容；新增/修改 Agent 要改动核心调度代码；任务执行全程黑盒。A2A 用标准化协议让异构 Agent 互联互通，使多 Agent 协作从硬编码集成走向协议化组网。

## Core Characteristics（核心特征）

1. **标准化**：统一消息封装、任务生命周期状态机、异常与归档规范。
2. **互操作性**：屏蔽框架、语言、部署环境差异。
3. **去中心化对等通信**：支持点对点直连，总控（Orchestrator）只编排不垄断执行。
4. **可服务发现**：AgentCard 元数据实现技能曝光与动态扩容。
5. **异步优先**：原生支持长耗时任务、人工介入、中断续跑。

## Structure（结构）

核心实体（附通俗类比）：

| 实体 | 类比 | 作用 |
|---|---|---|
| Agent | 专职员工 | 干具体活的 AI |
| AgentCard | 员工工牌 | 名称、技能、访问地址，用于服务发现 |
| AgentSkill | 技能标签 | 标记可干的活，供总控派单 |
| Task | 标准化工单 | 带 ID、状态、需求、结果的统一载体 |
| Message | 用户需求 | Task 内的原始提问 |
| Artifact | 工作成果 | 最终结果，统一归档 |
| TaskState | 状态印章 | SUBMITTED / WORKING / INPUT_REQUIRED / COMPLETED / FAILED |
| AgentNetwork | 通讯录 | 总控管理与调度所有 Agent |

## How It Works（运作方式）

任务状态机：SUBMITTED → WORKING → COMPLETED / FAILED；WORKING 可转 INPUT_REQUIRED（催补参数），补参后重回 WORKING。

标准通信流程（Orchestrator 编排模式）：用户自然语言请求 → 总控意图识别并经 AgentNetwork 匹配专家 → 封装 Task 异步下发 → 专家执行、更新状态、返回 Artifact → 总控汇总多 Agent 结果。

参考落地形态（解读，来自单一教学信源）：去中心化 + 星型拓扑，专家 Agent 独立部署、可单独扩容、故障隔离；意图路由用 LLM + Pydantic 结构化输出替代关键词匹配。

## Relationships（关系）

### Related Concepts（相关概念）

- [[mcp|MCP]]：互补协议，详见 [[a2a-vs-mcp|A2A vs MCP]]

### Distinctions（区分）

- 与 [[mcp|MCP]] 的不同之处在于：MCP 连接 LLM 与工具/数据（纵向底层、单 Agent 能力拓展），A2A 连接 Agent 与 Agent（横向上层、多 Agent 集群协作）。

## Evolution（演进）

- 2025-04：Google 开源 A2A（当前信源未确立更详细的版本沿革）。

## Open Questions（开放问题）

- 协议当前版本规范、官方 SDK 最新 API 与生态采纳情况：当前信源未确立（信源基于 python-a2a 0.2.8 教学版封装）。
- 去中心化对等通信在生产中的安全、鉴权与治理模型：当前信源未涉及。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md`

## Related Knowledge（相关知识）

- [[a2a-vs-mcp|A2A vs MCP]]
- [[a2a-multi-agent-langgraph|A2A 实战：从零搭建工业级多 Agent 协作系统]]
