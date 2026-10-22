---
id: wiki-source-pi-setup-mcp-codemode-guide
type: source
title: Pi Agent 入门指南：安装 + MCP + Codemode
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - ai
  - agent-cli
  - mcp
sources:
  - raw/sources/ai/2026-10-14-pi-setup-mcp-codemode-guide.md
---
# Pi Agent 入门指南：安装 + MCP + Codemode

## Overview（概览）

宇辰AI编程的 Pi 0.99.1 实操指南（实测环境 macOS，模型 GLM-5.3/GPT-5.5 走 magpie 网关，MCP 为 context7/brave-search/magpie-image）：安装与适用人群、0.99 五项更新、三种 MCP 接法、Codemode 机制与五档 exposure 选择，附大量 token 实测数据与六个坑。

## Key Facts（关键事实）

- Pi 作者 Mario Zechner（libGDX 作者），仓库 earendil-works/pi，MIT 协议，2026-09-30 达 11.1 万星；默认 4 工具（read/bash/edit/write），grep/find/ls 需在 `defaultTools` 中开启；五种用法（交互、`-p` 打印、`--mode json`、`--mode rpc`、TS SDK）共用同一套 agent 与会话；会话是一棵可分叉/fork 的树；`CLAUDE.md` 也认。
- 2026-09-30 发布 v0.99.0（当天补 0.99.1，上一版 0.87.1），五项更新：Codemode + 内置 MCP、system 主题、ChatGPT 订阅登录、虚拟模型（按请求分发真实模型分别计费）、分类模型。内置 MCP 功能来自 Armin Ronacher（Flask 作者，Pi 仓库提交数第二）的 PR #10040。
- Pi 官网曾写「No MCP」：作者 2025-11 博客算账，Playwright MCP 21 个工具仅工具说明就 1.37 万 token；0.99 把 MCP 藏到 Codemode 后面，官网改标 "Now with MCP+Codemode"。
- MCP 配置 `~/.pi/agent/mcp.json`，格式与 Claude Code/Cursor 的 `mcpServers` 一致可直接复制；支持 HTTP/npx/本地程序三种接法；`pi mcp add`/`pi mcp list`/`/mcp` 管理，`/reload` 生效。
- **接了 MCP 即自动开启 Codemode**，无需改 settings.json；`"+codemode"` 仅未接 MCP 时单独启用需要。`codemode.inlineBudget` 默认 3000 token 列工具声明，装不下用 `searchTools()`。
- 固定开销实测（GLM-5.3，3 个 MCP 共 11 工具，"只回复 OK"）：不接 1,453 / deferred 1,780 / codemode-deferred 4,170 / codemode（默认）6,956 / direct 12,878 token。
- 真实任务实测（各 3 次取中位数）：brave 搜索 GLM-5.3 省 39%（54,096→33,171），GPT-5.5 反多 63%（63,279→102,981）；context7 查文档两模型仅省 8%~9%。同一任务三次跑差 6 倍（2.1 万~12.3 万 token），取决于 MCP 返回格式与模型第一次猜得准不准。
- 五档 exposure：codemode（默认）/codemode-deferred/deferred/direct/hidden，单工具可用 `toolExposure` 覆盖。
- 六个坑：多工具服务整组 direct 固定开销暴涨（brave 达 37,922 token，`brave_place_search` 描述 1,390 字符加 TS 声明变 63,805）；npx 起的 MCP 首轮最多等 10 秒连不上则该轮不可见；直连结果超 20KB 截中段需再 read；`--tools` 不认 `+codemode`；`pi-mcp-adapter` 会使内置 MCP 失效需先删；context-mode 扩展 `npm install -g` 会污染 `~/.claude` 配置且实测更费 token（固定开销多 8.4K~10.7K）。

## Important Claims（重要论断）

### Claim 1：Codemode 稳定省的是工具说明的固定开销，单次任务省不省看返回格式

MCP 工具不逐个进模型工具列表、改由模型写脚本调用，固定开销约减半；但多数 MCP 返回非结构化 JSON 文本，模型需试错猜格式，单次任务收益不稳定（GLM 省 39% vs GPT-5.5 多 63%）。

### Claim 2：选型看"工具数量 × 使用频率 × 返回格式"

工具多且常用保持默认 codemode；偶尔用选 deferred 系（最省但每任务多一轮搜索）；返回大段文档的（context7）Codemode 与直连相差无几，保持默认。

## Concepts Introduced（引入的概念）

- [[codemode|Codemode（代码模式工具编排）]]

## Entities Mentioned（提及的实体）

- [[pi|Pi]]

## Implications（影响／启示）

为 MCP 接入的 token 成本提供了少见的定量实测：工具说明的固定开销可被代码模式压缩约一半，但非结构化返回格式会吞噬收益——MCP 服务端返回格式设计直接影响 Agent 成本。

## Limitations（局限）

单一作者单机实测，样本量小（部分场景只跑 1~3 次）；结论以 Pi 0.99.1 与特定 MCP 服务为准，版本迭代后可能失效。

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[codemode|Codemode]]
- [[mcp|MCP]]
- [[pi-1-0-durable-mcp-update|Pi 1.0：原生 MCP + Code Mode 稳定版（信源页）]]

## Source（信源）

- `raw/sources/ai/2026-10-14-pi-setup-mcp-codemode-guide.md`
