---
id: wiki-comparison-a2a-vs-mcp
type: comparison
title: A2A vs MCP
status: active
created: 2026-10-16
updated: 2026-10-16
confidence: medium
tags:
  - comparison
  - ai
  - protocol
sources:
  - raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md
related:
  - wiki/concepts/a2a-protocol.md
  - wiki/concepts/mcp.md
---
# A2A vs MCP

## Scope（范围）

对比两个 AI 协作协议：[[a2a-protocol|A2A 协议]]（Google，2025-04 开源）与 [[mcp|MCP]]（Anthropic，2024）。两者解决不同层级的互联互通问题，是互补关系而非竞争关系。

## Comparison Matrix（对比矩阵）

| Dimension（维度） | A2A | MCP |
|---|---|---|
| Purpose（用途） | Agent 与 Agent 的协作协议 | LLM 与工具/数据源的通信协议 |
| 发起方与时间 | Google，2025-04 开源 | Anthropic，2024 |
| 通信主体 | Agent → Agent（异构智能体） | LLM → 工具、数据库、文件、API |
| 核心能力 | 任务调度、状态流转、服务发现、结果汇总 | 工具发现、上下文注入、数据读取 |
| 应用层级 | 横向上层，多 Agent 集群协作 | 纵向底层，单 Agent 能力拓展 |
| 典型场景 | 总控调度多个垂直专家完成复合任务 | 调搜索、读文件、查数据库 |

## Analysis（分析）

一句话概括（信源原文）：**MCP 让一个 AI 自己变强（对内、单 AI 能力拓展）；A2A 让多个 AI 组队变强（对外、多 AI 协作）**。

两者位于不同层级，不构成替代关系：MCP 解决"单个 Agent 如何接工具"，A2A 解决"多个能力完备的 Agent 如何组队"。

## Best Fit（适用场景）

### A2A is preferable when（以下情况 A2A 更合适）

- 需要总控调度多个垂直专家 Agent 完成复合任务；
- 异构框架/语言写出的 Agent 需要标准化互通、任务状态可管控。

### MCP is preferable when（以下情况 MCP 更合适）

- 单个 Agent 需要接入外部工具、数据库、文件、API 以拓展自身能力。

### 组合使用

生产组合（信源主张）：单个 Agent 通过 MCP 对接工具强化自身，多个能力完备的 Agent 再通过 A2A 集群协作。

## Important Caveats（重要提醒）

- 本对比目前仅基于单一教学向信源（公众号文章），维度与结论待更多一手信源（双方官方规范）印证。
- A2A 侧信息基于 python-a2a 0.2.8 教学版封装，与官方 SDK 现状可能有出入。

## Evidence（证据）

- `raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md`
