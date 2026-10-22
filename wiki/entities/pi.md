---
id: wiki-entity-pi
type: entity
title: Pi
status: active
created: 2026-10-20
updated: 2026-10-23
confidence: medium
tags:
  - entity
  - ai-agent
  - cli
sources:
  - raw/sources/products/2026-10-14-pi-6-extensions-from-claude-code.md
  - raw/sources/ai/2026-10-14-learn-pi-agent-01-llm-to-agent.md
  - raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md
  - raw/sources/ai/2026-10-14-pi-sandbox-two-layer-isolation.md
related:
  - wiki/concepts/mcp.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/agent-sandboxing.md
---
# Pi

## Overview（概览）

Pi 是一款极简风格的 Agent CLI：默认只内置 read、write、edit、bash 四个工具，其余能力（MCP、联网、子代理、待办、诊断等）全部交给扩展目录按需安装。官方文档在 pi.dev/docs。被部分 Claude Code 用户视为迁移替代选项。

## Identity（身份信息）

- Type（类型）: Agent CLI（终端智能体工具）；官方自称 **Pi Agent Harness**（完整 Agent 运行层）
- Organization（所属组织）: earendil-works（npm 包命名空间 `@earendil-works/*`）
- Role（角色）: 以"毛坯房 + 扩展生态"模式提供可自定义能力清单的编码/工作 Agent
- Status（状态）: 活跃（扩展目录 5000+ 包，头部扩展月下载数十万级，2026-08 npm 数据）

## Important Facts（重要事实）

- 默认工具仅 read/write/edit/bash 四个；1.0 之前没有内置 MCP、子代理、待办（2026-08 生态数据口径）。
- **2026-10 Pi 1.0**：Code Mode 与原生 [[mcp|MCP]] 进入稳定版（官网曾写"不支持 MCP"，因协议成熟与模型训练改善转变；经工具搜索与渐进式披露按需加载）；同日推出持久化框架 Pi Durable（约 1.2 万行代码，架构历经八轮迭代）。
- Code Mode：模型在 QuickJS 沙箱内写 JS 编排工具调用，可并行调工具、过滤数据、循环内调 System 1 分类模型（如 Jev），只把汇总结果送回前沿模型以降低 Token 消耗。
- **安全姿态（2026-10 官方文档）**：默认不沙箱，工具以启动账号权限运行；官方立场"把模型生成的命令和代码当作不可信"，看会话/项目信任/审 diff 均不构成安全边界；提供脚本级沙箱与进程级五种隔离做法，整体容器/VM 隔离为实践中最强选项（详见 [[agent-sandboxing|Agent 沙箱隔离]]）。
- 扩展经 npm 分发：`pi install npm:<pkg>` 安装，`pi -e` 临时试用不落盘，`pi list` / `pi remove` / `pi update --all` 管理，装完 `/restart` 生效。
- 头部扩展（2026-08 npm 月下载）：pi-mcp-adapter ≈76 万、pi-web-access ≈40 万、pi-subagents ≈36 万、rpiv-ask-user-question ≈12 万、rpiv-todo ≈10 万、pi-lens ≈6 万。
- pi-mcp-adapter 通过约 200 token 的代理工具按需启动 MCP server，可直接读取 Claude Code 的 `.mcp.json` 配置（1.0 前的 MCP 接入方式；1.0 起 MCP 进入核心）。
- 扩展以完整系统权限运行，官方生态依赖用户自行甄别可信源。

## Products / Projects（产品／项目）

- 扩展目录（5000+ 包）；pi-cc-plugins（把 Claude Code 插件仓的 skills/agents/MCP 配置转成 Pi 原生格式）。
- Pi Durable：持久执行框架，效应三明治 + 版本化文档存储，可部署到 Vercel/Cloudflare Durable Objects/E2B/手机（见 [[durable-execution|持久执行]]）。
- PIM（Pi Mobile，探索中未开源）：大脑跑在手机上、可连远程服务器做执行环境的多端 Agent；愿景是多 Agent 多设备与多人协作。
- 三个核心包：`@earendil-works/pi-ai`（连接不同模型服务，统一模型、消息、工具和逐步返回的响应）、`@earendil-works/pi-agent-core`（维护 [[agent-loop|Agent Loop]] 与 State，执行工具并报告运行变化）、`@earendil-works/pi-coding-agent`（装配 Session、工具和命令行，形成可用的编程 Agent）。核心循环保持小，定制（新工具/命令/界面行为/运行钩子）走扩展入口接入 Harness，而非改 Loop。

## Relationships（关系）

- 对标/替代关系：Claude Code（Anthropic Agent CLI）——Pi 默认能力更简，但核心体验可经扩展补回。
- 协议支持：经 pi-mcp-adapter 支持 [[mcp]]（模型↔工具纵向协议）。

## Timeline（时间线）

- 2026-08 — npm 月下载数据显示 pi-mcp-adapter 约 76 万，居扩展生态第一
- 2026-10-14 — 微信公众号迁移实录发布，记录三周从 Claude Code 整体迁移的工作流
- 2026-10-14 — learn-pi-agent 系列第一章发布，以 Pi 为主线讲解 Agent Loop，并揭示三包结构与 Pi Agent Harness 定位
- 2026-10 — Pi 升级 1.0：Code Mode 与原生 MCP 进稳定版，同日发布 Pi Durable（播客访谈，InfoQ 编译）
- 2026-10 — 官方文档与示例源码梳理的两层隔离方案公开（脚本级沙箱 + 进程级五种做法）

## Current Understanding（当前认知）

Pi 代表了 Agent CLI 的另一种产品哲学：内核极简、能力清单交给用户与社区扩展（解读：与 Claude Code"全家桶"路线形成对照）。1.0 起定位从终端编程 Agent 向完整 Agent 基础设施延伸（Durable 持久执行 + 原生 MCP + Code Mode），官方自我定位为"可自我修改的 Agentic 软件"的概念验证。其团队对 AI 编程的判断（组件级可全委托 Agent、架构级根因仍需人）与对全权限个人 Agent 的安全悲观态度，为使用者划出了当前人机分工边界。安全上官方把隔离决策留给用户（默认不沙箱、整体容器隔离为最强实践），进阶用户需自行声明边界。

## Evidence（证据）

- `raw/sources/products/2026-10-14-pi-6-extensions-from-claude-code.md`
- `raw/sources/ai/2026-10-14-learn-pi-agent-01-llm-to-agent.md`
- `raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md`
- `raw/sources/ai/2026-10-14-pi-sandbox-two-layer-isolation.md`
