---
id: wiki-entity-pi
type: entity
title: Pi
status: active
created: 2026-10-20
updated: 2026-10-20
confidence: medium
tags:
  - entity
  - ai-agent
  - cli
sources:
  - raw/sources/products/2026-10-14-pi-6-extensions-from-claude-code.md
related:
  - wiki/concepts/mcp.md
---
# Pi

## Overview（概览）

Pi 是一款极简风格的 Agent CLI：默认只内置 read、write、edit、bash 四个工具，其余能力（MCP、联网、子代理、待办、诊断等）全部交给扩展目录按需安装。官方文档在 pi.dev/docs。被部分 Claude Code 用户视为迁移替代选项。

## Identity（身份信息）

- Type（类型）: Agent CLI（终端智能体工具）
- Organization（所属组织）: 未知（当前信源未确立）
- Role（角色）: 以"毛坯房 + 扩展生态"模式提供可自定义能力清单的编码/工作 Agent
- Status（状态）: 活跃（扩展目录 5000+ 包，头部扩展月下载数十万级，2026-08 npm 数据）

## Important Facts（重要事实）

- 默认工具仅 read/write/edit/bash 四个；没有内置 MCP、子代理、待办。
- 扩展经 npm 分发：`pi install npm:<pkg>` 安装，`pi -e` 临时试用不落盘，`pi list` / `pi remove` / `pi update --all` 管理，装完 `/restart` 生效。
- 头部扩展（2026-08 npm 月下载）：pi-mcp-adapter ≈76 万、pi-web-access ≈40 万、pi-subagents ≈36 万、rpiv-ask-user-question ≈12 万、rpiv-todo ≈10 万、pi-lens ≈6 万。
- pi-mcp-adapter 通过约 200 token 的代理工具按需启动 MCP server，可直接读取 Claude Code 的 `.mcp.json` 配置。
- 扩展以完整系统权限运行，官方生态依赖用户自行甄别可信源。

## Products / Projects（产品／项目）

- 扩展目录（5000+ 包）；pi-cc-plugins（把 Claude Code 插件仓的 skills/agents/MCP 配置转成 Pi 原生格式）。

## Relationships（关系）

- 对标/替代关系：Claude Code（Anthropic Agent CLI）——Pi 默认能力更简，但核心体验可经扩展补回。
- 协议支持：经 pi-mcp-adapter 支持 [[mcp]]（模型↔工具纵向协议）。

## Timeline（时间线）

- 2026-08 — npm 月下载数据显示 pi-mcp-adapter 约 76 万，居扩展生态第一
- 2026-10-14 — 微信公众号迁移实录发布（本信源），记录三周从 Claude Code 整体迁移的工作流

## Current Understanding（当前认知）

Pi 代表了 Agent CLI 的另一种产品哲学：内核极简、能力清单交给用户与社区扩展（解读：与 Claude Code"全家桶"路线形成对照）。适合愿意自行管理扩展与安全的进阶用户；对 MCP 生态的兼容性（直读 .mcp.json）降低了从 Claude Code 迁移的成本。当前仅单一经验性信源支撑，结论待更多信源印证。

## Evidence（证据）

- `raw/sources/products/2026-10-14-pi-6-extensions-from-claude-code.md`
