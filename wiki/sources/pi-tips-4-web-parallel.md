---
id: wiki-source-pi-tips-4-web-parallel
type: source
title: Pi 实用技巧系列（四）：联网与并行的实战方案
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - pi
  - mcp
  - browser-automation
sources:
  - raw/sources/products/2026-10-20-pi-tips-4-web-parallel.md
related:
  - wiki/entities/pi.md
  - wiki/concepts/mcp.md
---
# Pi 实用技巧系列（四）：联网与并行的实战方案

## Overview（概览）

公众号 Pi 技巧系列第四篇：Pi 核心只有 read/write/edit/bash、默认离线（设计立场——联网是扩展的事，Mario Zechner 语），连接外界有四条路线：内置 MCP、pi-web-access、自建 Skill+CDP、pi-side-agents，附选型表与社区扩展安全核查清单。补充 [[pi|Pi]] 实体的联网/并行版图。

## Key Facts（关键事实）

- 设计立场：Pi 默认离线是刻意为之——"联网能力应该是扩展的事情，不是核心内置的事情"（Mario Zechner）；核心极小、扩展自由组合。
- MCP 现状：0.99 起客户端原生内置，1.0 补齐 OAuth 登录与凭证安全——pi-mcp-adapter 等桥接包仅作历史兼容；MCP 接的是可执行工具/系统（数据库、SaaS、CI），不只是抓网页文本。
- 四条路线选型：接具体外部系统→MCP；查最新信息/读网页→pi-web-access（社区包，搜索+内容提取，质量依赖底层搜索服务、受网站反爬/动态渲染限制）；真实浏览器交互（填表单/截图/验证动态页）→自建 Skill+CDP（Armin Ronacher 的做法，agent-stuff 仓库，可用 Playwright/Puppeteer，安全边界自己定义）；多任务并行→pi-side-agents（社区包，子代理非真进程隔离，结果整合需自理）。
- 组合示例：子代理 1 用 pi-web-access 联网调查 + 子代理 2 写对比文档 + CDP 验证官网演示，各司其职。
- 安全核查（装社区扩展前必做）：扩展做了什么（请求目标是否仅限允许范围）；有无不必要权限（查信息扩展不该有写文件权）；Maintainer 是谁（知名开发者相对可信仍要看代码）；包来源（npm/git 可靠来源）。扩展运行在宿主完整权限下。
- 其他风险：联网返回信息可能过时片面，模型可能不加批判采信；别装过多联网扩展（增上下文复杂度与安全面）；扩展按需加载不占提示词缓存。

## Important Claims（重要论断）

### Claim 1：接系统用 MCP、查信息用 web-access、控浏览器用 CDP、并行用 side-agents

四条路线不互斥、按任务组合；选型看需求粒度而非功能多寡。

## Concepts Introduced（引入的概念）

- Pi 连接外界四路线选型矩阵（单信源）

## Entities Mentioned（提及的实体）

- [[pi|Pi]]、pi-web-access / pi-side-agents（社区包，未立页）、Armin Ronacher（Flask 作者，提及未立页）

## Implications（影响／启示）

"默认离线 + 联网走扩展 + 装扩展必看源码"的姿态与本仓库 web-fetch 白名单 skill 设计同构（解读）。

## Limitations（局限）

- 社区包能力与质量随版本变化；pi-web-access/pi-side-agents 的具体实现未给仓库链接（文中称"参考相关仓库"）。

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[mcp|MCP]]
- [[agent-sandboxing|Agent 沙箱隔离]]（扩展全权限运行的安全背景）

## Source（信源）

- `raw/sources/products/2026-10-20-pi-tips-4-web-parallel.md`
