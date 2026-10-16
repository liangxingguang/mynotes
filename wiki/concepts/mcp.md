---
id: wiki-concept-mcp
type: concept
title: MCP
status: active
created: 2026-10-16
updated: 2026-10-16
confidence: medium
tags:
  - concept
  - ai
  - protocol
sources:
  - raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md
related:
  - wiki/concepts/a2a-protocol.md
  - wiki/comparisons/a2a-vs-mcp.md
---
# MCP

## Definition（定义）

MCP（Model Context Protocol）是 Anthropic 于 2024 年提出的通信协议，用于连接 LLM 与工具/数据源，解决单个 Agent 的能力拓展问题。

## Why It Matters（为什么重要）

MCP 把"LLM 调用外部工具、数据库、文件、API"的方式协议化，使单个 AI 应用能以统一方式接入外部能力（"让一个 AI 自己变强"），并成为多 Agent 体系中每个 Agent 强化自身的底层基础。

## Core Characteristics（核心特征）

1. **纵向底层协议**：位于 LLM 与工具/数据源之间，服务单个 Agent。
2. **核心能力**：工具发现、上下文注入、数据读取。
3. **通信主体**：LLM → 工具、数据库、文件、API。
4. **典型场景**：调搜索、读文件、查数据库。

## Structure（结构）

当前信源未确立（仅给出协议定位与能力概述，未展开内部结构）。

## How It Works（运作方式）

当前信源未确立具体工作机制；已知其承担"工具发现 + 上下文注入 + 数据读取"三类职能。

## Relationships（关系）

### Related Concepts（相关概念）

- [[a2a-protocol|A2A 协议]]：互补协议，详见 [[a2a-vs-mcp|A2A vs MCP]]

### Distinctions（区分）

- 与 [[a2a-protocol|A2A 协议]] 的不同之处在于：MCP 是 LLM↔工具/数据的纵向底层协议（对内、单 AI 能力拓展）；A2A 是 Agent↔Agent 的横向上层协议（对外、多 AI 协作）。生产中组合使用：单 Agent 经 MCP 对接工具强化自身，多个 Agent 再经 A2A 集群协作。

## Evolution（演进）

- 2024：Anthropic 提出 MCP（当前信源未确立更详细沿革）。

## Open Questions（开放问题）

- MCP 的规范细节、传输方式、Server/Client 模型与生态现状：当前信源未确立，需专门信源补充。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md`

## Related Knowledge（相关知识）

- [[a2a-vs-mcp|A2A vs MCP]]
- [[a2a-multi-agent-langgraph|A2A 实战：从零搭建工业级多 Agent 协作系统]]
