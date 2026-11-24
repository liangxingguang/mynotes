---
id: wiki-concept-mcp
type: concept
title: MCP
status: active
created: 2026-10-16
updated: 2026-11-24
confidence: medium
tags:
  - concept
  - ai
  - protocol
sources:
  - raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md
  - raw/sources/ai/2026-10-14-arthas-mcp-ai-troubleshooting.md
  - raw/sources/products/2026-10-14-pi-6-extensions-from-claude-code.md
  - raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md
  - raw/sources/ai/2026-10-14-pi-setup-mcp-codemode-guide.md
  - raw/sources/ai/2026-10-28-agent-permission-model-design.md
  - raw/sources/ai/2026-11-12-ai-agent-tech-overview.md
  - raw/sources/ai/2026-11-20-agent-sandbox-mcp-k8s.md
  - raw/sources/ai/2026-11-24-ant-toolgw-agent-tool-gateway.md
related:
  - wiki/concepts/a2a-protocol.md
  - wiki/comparisons/a2a-vs-mcp.md
  - wiki/entities/arthas.md
  - wiki/entities/pi.md
  - wiki/concepts/codemode.md
  - wiki/concepts/agent-permission-model.md
  - wiki/concepts/agent-sandboxing.md
  - wiki/concepts/agent-tool-gateway.md
  - wiki/sources/2026-11-20-agent-sandbox-mcp-k8s.md
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
5. **协议边界**：MCP 是交互协议，**不是沙箱或授权系统**。部署前须先明确工作负载属于哪种模型——**远程 MCP Server**（SaaS/内部服务/第三方集成：注册审核、服务端身份、地址/版本/schema 钉扎、逐次授权、出站代理）与**沙箱内 runner**（用户脚本/动态代码：一次性 Pod、最小能力、双向网络、资源限额、执行后销毁）是两个不同的安全边界，协议本身不提供其中任何一类。

## Structure（结构）

**三种连接方式**（信源 2026-11-12）：

| 连接方式 | 通信方式 | 适合场景 |
|---|---|---|
| STDIO | 本地进程 stdin/stdout | 本地工具（如文件系统操作） |
| SSE | HTTP 长连接 | 远程工具，需要实时推送 |
| Streamable HTTP | HTTP 流式 | 远程工具，现代推荐方式 |

MCP server 启动后暴露工具列表，客户端（Agent 框架）连接后自动发现可用工具——与微服务的"服务注册与发现"同一思想。

## How It Works（运作方式）

已知其承担"工具发现 + 上下文注入 + 数据读取"三类职能。个案证据（[[arthas|Arthas]] MCP Server，4.3.5 实验性模块）：MCP Server 可经 HTTP 提供 JSON-RPC 2.0 接口，采用 Streamable HTTP 传输并保留会话状态（适合持续输出类工具），亦支持 STATELESS 一次性查询模式；工具以"命令名 + 参数 + 返回结果"标准化暴露，使 AI 能保留上一步输出、把多次调用串成一条会话。认证可简单到密码 + Bearer Token，但工具级权限管控不在协议内，需客户端或网关另加。

**微服务类比与工具发现**（信源 2026-11-12）：MCP 让工具变成可复用、可独立部署的"微服务"——工具提供方按 MCP 协议实现 server，任何支持 MCP 的 Agent 框架都能接入，无需为每个框架重写工具。类比 HTTP 之于 Web 服务：标准协议让生产者与消费者解耦，不需关心工具跑在哪个 Agent 框架里。MCP server 启动后暴露工具列表，客户端连接后自动发现可用工具，与微服务的"服务注册与发现"同一思想。

## Relationships（关系）

### Related Concepts（相关概念）

- [[a2a-protocol|A2A 协议]]：互补协议，详见 [[a2a-vs-mcp|A2A vs MCP]]

### Distinctions（区分）

- 与 [[a2a-protocol|A2A 协议]] 的不同之处在于：MCP 是 LLM↔工具/数据的纵向底层协议（对内、单 AI 能力拓展）；A2A 是 Agent↔Agent 的横向上层协议（对外、多 AI 协作）。生产中组合使用：单 Agent 经 MCP 对接工具强化自身，多个 Agent 再经 A2A 集群协作。

## Evolution（演进）

- 2024：Anthropic 提出 MCP（当前信源未确立更详细沿革）。
- 2026-10：[[arthas|Arthas]] 4.3.5 官方文档将 MCP Server 标为实验性模块（29 个诊断工具）——MCP 生态向运维诊断工具扩展的个案。
- 2026-10：[[pi|Pi]] 生态的 pi-mcp-adapter（月下载约 76 万，2026-08 npm 数据）以约 200 token 的代理工具替代全量工具定义、server 按需启动，并可直接读取 Claude Code 的 `.mcp.json`——MCP 配置跨客户端可移植、且工具定义的上下文成本可被代理式设计大幅压缩的个案。
- 2026-09-30：[[pi|Pi]] v0.99.0/0.99.1 将 MCP 做进核心（Armin Ronacher PR #10040），但换了个接法——MCP 工具默认不直接给模型，藏在 [[codemode|Codemode]] 后面，五档 exposure 按需选择；配置 `~/.pi/agent/mcp.json` 与 Claude Code/Cursor 格式一致可直接复制。背景账：Pi 作者 2025-11 博客称 Playwright MCP 21 个工具仅工具说明就 1.37 万 token/请求（二手转述）。
- 2026-10：Pi 1.0 将原生 MCP 纳入稳定版（0.99 引入、1.0 稳定）——其团队曾公开批评 MCP 臃肿、官网写"不支持 MCP"，因协议成熟（一年六七轮调整）与模型训练改善而转变；接入方式为工具搜索 + 渐进式披露按需加载，避免上下文膨胀——"批评者转向采纳"可作为 MCP 协议成熟度的一个信号。
- 2026-10：Pi 0.99.1 实测为 MCP 的上下文成本提供定量个案（GLM-5.3，3 个 MCP 共 11 工具）：工具说明固定开销 direct 12,878 → codemode 6,956 → deferred 1,780 token；但单次任务收益取决于 MCP 返回格式是否结构化（brave 非结构化 JSON 文本致模型试错，GPT-5.5 反多 63%）——MCP 服务端返回格式设计直接影响 Agent 侧成本。
- 2026-10-30：[[agent-permission-model|Agent 权限模型]]信源确认「MCP 协议标准没有内置复杂权限，要在接入层补齐」，并给出两种落地：MCP 网关统一收口（校验签名 claim/授权记录/租户隔离/限流/审计，原生服务零改动，生产首选）vs 服务内置鉴权中间件（适合少量自建工具）；明确不推荐静态 Token（无法绑定 session/指令细粒度回收）。部分回答了下方工具级权限分级的开放问题。
- 2026-11-12 — 新增 vivo《AI Agent 技术全景解析》信源。补上**三种连接方式**（STDIO/SSE/Streamable HTTP）对比表、MCP server 的"服务注册与发现"机制与微服务类比，回应此前"规范细节未确立"的开放问题（传输方式部分）。
- 2026-11-20 — 平台级沙箱信源（第 8 信源）确立**部署模型边界**：MCP 是交互协议、不是沙箱或授权系统；远程 MCP Server 与沙箱内 runner 是两类不同的安全边界，各自控制点不同；同时补上网关逐次授权与能力票据的落地视角（详见 [[agent-permission-model]]）。MCP Tasks 扩展仍为 Draft（规范版本 2026-07-28），未协商能力时不能把 `202 Accepted + task_id` 伪装成通用 `tools/call` 响应。
- 2026-11-24 — 蚂蚁 ToolGW 信源（第 9 信源）补充**大规模生产接入**视角：MCP 与 CLI 流量共享同一网关调用内核（ToolEngine），协议层只做适配；存量 RPC/HTTP 经网关**零代码上翻**为标准 MCP Server（虚拟 Server 集群 + 协议转换 + 响应模板），解决"几万存量能力逐个重开发 MCP"的供给问题；Tool 粒度两层鉴权 + 血缘自动管理由网关与统一权限平台协同落地，印证"MCP 协议不内置工具级权限、由接入层网关补齐"的既有判断；场景化工具分组（工具懒加载）缓解 MCP 上下文膨胀（业内实测 3 个 MCP Server 工具定义吃掉 200K 上下文七成）。详见 [[agent-tool-gateway]]。

## Open Questions（开放问题）

- MCP 的规范细节与 Server/Client 模型的完整定义：连接方式已有信源补充（STDIO/SSE/Streamable HTTP 三模式），但 Server/Client 模型的完整规范仍需专门信源补充；MCP Tasks 扩展仍为 Draft，须固定规范版本并在 SDK 升级前做兼容性与安全回归。
- 工具级权限分级在 MCP 生态中的通行做法：已有「协议不管、接入层网关补齐」的设计方案证据（2026-10-30、2026-11-20），但缺乏多家实现的横向实证。
- 远程 MCP Server 与沙箱内 runner 的边界划分：部署模型边界已由 2026-11-20 信源确立，但两类模型在真实平台的占比与演进路径当前信源未确立。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md`
- Source: `raw/sources/ai/2026-10-14-arthas-mcp-ai-troubleshooting.md`
- Source: `raw/sources/products/2026-10-14-pi-6-extensions-from-claude-code.md`
- Source: `raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md`
- Source: `raw/sources/ai/2026-10-14-pi-setup-mcp-codemode-guide.md`
- Source: `raw/sources/ai/2026-10-28-agent-permission-model-design.md`
- Source: `raw/sources/ai/2026-11-12-ai-agent-tech-overview.md`（三种连接方式表、服务注册与发现机制、微服务类比）
- Source: `raw/sources/ai/2026-11-20-agent-sandbox-mcp-k8s.md`（第 8 信源：部署模型边界——远程 MCP Server 与沙箱内 runner 两类安全边界；MCP 是交互协议而非沙箱/授权系统；MCP Tasks 扩展 Draft）
- Source: `raw/sources/ai/2026-11-24-ant-toolgw-agent-tool-gateway.md`（第 9 信源：MCP/CLI 共享网关调用内核、存量服务零代码上翻、Tool 粒度两层鉴权、场景化分组缓解上下文膨胀）

## Related Knowledge（相关知识）

- [[a2a-vs-mcp|A2A vs MCP]]
- [[a2a-multi-agent-langgraph|A2A 实战：从零搭建工业级多 Agent 协作系统]]
- [[arthas-mcp-ai-troubleshooting|让 AI 调 Arthas，Java 排障会快多少？（信源页）]]
- [[2026-11-20-agent-sandbox-mcp-k8s|生产级 AI Agent 执行沙箱实战（信源页）]]
- [[agent-sandboxing|Agent 沙箱隔离]]
- [[agent-tool-gateway|Agent 工具网关（统一工具流量入口）]]
