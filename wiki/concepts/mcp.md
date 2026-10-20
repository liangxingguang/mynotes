---
id: wiki-concept-mcp
type: concept
title: MCP
status: active
created: 2026-10-16
updated: 2026-10-20
confidence: medium
tags:
  - concept
  - ai
  - protocol
sources:
  - raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md
  - raw/sources/ai/2026-10-14-arthas-mcp-ai-troubleshooting.md
  - raw/sources/products/2026-10-14-pi-6-extensions-from-claude-code.md
related:
  - wiki/concepts/a2a-protocol.md
  - wiki/comparisons/a2a-vs-mcp.md
  - wiki/entities/arthas.md
  - wiki/entities/pi.md
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

已知其承担"工具发现 + 上下文注入 + 数据读取"三类职能。个案证据（[[arthas|Arthas]] MCP Server，4.3.5 实验性模块）：MCP Server 可经 HTTP 提供 JSON-RPC 2.0 接口，采用 Streamable HTTP 传输并保留会话状态（适合持续输出类工具），亦支持 STATELESS 一次性查询模式；工具以"命令名 + 参数 + 返回结果"标准化暴露，使 AI 能保留上一步输出、把多次调用串成一条会话。认证可简单到密码 + Bearer Token，但工具级权限管控不在协议内，需客户端或网关另加。

## Relationships（关系）

### Related Concepts（相关概念）

- [[a2a-protocol|A2A 协议]]：互补协议，详见 [[a2a-vs-mcp|A2A vs MCP]]

### Distinctions（区分）

- 与 [[a2a-protocol|A2A 协议]] 的不同之处在于：MCP 是 LLM↔工具/数据的纵向底层协议（对内、单 AI 能力拓展）；A2A 是 Agent↔Agent 的横向上层协议（对外、多 AI 协作）。生产中组合使用：单 Agent 经 MCP 对接工具强化自身，多个 Agent 再经 A2A 集群协作。

## Evolution（演进）

- 2024：Anthropic 提出 MCP（当前信源未确立更详细沿革）。
- 2026-10：[[arthas|Arthas]] 4.3.5 官方文档将 MCP Server 标为实验性模块（29 个诊断工具）——MCP 生态向运维诊断工具扩展的个案。
- 2026-10：[[pi|Pi]] 生态的 pi-mcp-adapter（月下载约 76 万，2026-08 npm 数据）以约 200 token 的代理工具替代全量工具定义、server 按需启动，并可直接读取 Claude Code 的 `.mcp.json`——MCP 配置跨客户端可移植、且工具定义的上下文成本可被代理式设计大幅压缩的个案。

## Open Questions（开放问题）

- MCP 的规范细节与 Server/Client 模型的完整定义：当前信源未确立，需专门信源补充（传输方式已有个案证据：Streamable HTTP / JSON-RPC 2.0）。
- 工具级权限分级（RBAC）在 MCP 生态中的通行做法：当前信源仅表明 Arthas 官方未提供，需客户端/网关自建。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md`
- Source: `raw/sources/ai/2026-10-14-arthas-mcp-ai-troubleshooting.md`
- Source: `raw/sources/products/2026-10-14-pi-6-extensions-from-claude-code.md`

## Related Knowledge（相关知识）

- [[a2a-vs-mcp|A2A vs MCP]]
- [[a2a-multi-agent-langgraph|A2A 实战：从零搭建工业级多 Agent 协作系统]]
- [[arthas-mcp-ai-troubleshooting|让 AI 调 Arthas，Java 排障会快多少？（信源页）]]
