---
id: wiki-concept-codemode
type: concept
title: Codemode（代码模式工具编排）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - concept
  - ai
  - mcp
  - token-optimization
sources:
  - raw/sources/ai/2026-10-14-pi-setup-mcp-codemode-guide.md
  - raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md
related:
  - wiki/concepts/mcp.md
  - wiki/entities/pi.md
  - wiki/concepts/agent-sandboxing.md
---
# Codemode（代码模式工具编排）

## Definition（定义）

Codemode（Code Mode）是一种工具编排模式：模型不再一轮一轮地直接调工具，而是写一段 JavaScript 在沙箱中执行，脚本内串联调用工具（可并行、循环、过滤），只有脚本 `text()` 输出的筛选结果回到模型上下文。[[pi|Pi]] 0.99 起将其内置，并作为 [[mcp|MCP]] 工具的默认暴露方式。

## Why It Matters（为什么重要）

MCP 工具说明是每次请求都要支付的固定上下文成本（Pi 作者曾算账：Playwright MCP 21 个工具仅说明就 1.37 万 token）。Codemode 把"逐个工具定义进上下文"改为"一份可编程的调用接口进上下文"，是 Agent 生态应对工具数量膨胀的主流解法之一（解读：与 Cloudflare/Anthropic 倡导的 code-mode 思路同源）。

## Core Characteristics（核心特征）

1. **脚本编排**：模型写 JS 调工具，支持并行（Promise.all）、循环与大结果脚本内过滤；只有筛选后的输出回模型。
2. **稳定省固定开销**：实测（GLM-5.3，3 个 MCP 共 11 工具）一句话请求的上下文从 direct 12,878 降至 codemode 6,956 token；deferred 档更低（1,780）。
3. **单次任务收益不稳定**：真实任务实测 GLM-5.3 省 39%，GPT-5.5 反多 63%；同一任务三次跑差 6 倍（2.1 万~12.3 万 token）——收益取决于 MCP 返回格式是否结构化与模型第一次猜得准不准。
4. **沙箱执行**：脚本在隔离 JS 环境（Pi 1.0 信源口径为 QuickJS 沙箱）中运行，可并行调工具、循环内调 System 1 分类模型（如 Jev）。

## Structure（结构）

Pi 的实现提供五档 MCP 工具暴露（exposure）：`codemode`（默认，工具列在 Codemode 说明里供脚本调）/ `codemode-deferred`（说明里也不列，脚本用 `searchTools()` 找）/ `deferred`（不开 Codemode，模型 `tool_search` 搜到才加载直连）/ `direct`（直接给模型）/ `hidden`（注册但不可调）；单工具可用 `toolExposure` 覆盖服务级设置。`codemode.inlineBudget`（默认 3000 token）控制说明中列出的工具声明预算。

## How It Works（运作方式）

Pi 中接了 MCP 即自动开启 Codemode（MCP 服务默认 exposure 即 codemode，检测到后自动启用 codemode 工具），无需改 settings.json。内置功能来自 Armin Ronacher（Flask 作者）的 PR #10040。直连工具的返回超过 20KB 会被截中段，Codemode 脚本内则拿到完整结果。

## Relationships（关系）

### Related Concepts（相关概念）

- [[mcp|MCP]]：Codemode 是 MCP 工具的一种暴露/编排方式，解决其上下文成本问题
- [[agent-sandboxing|Agent 沙箱隔离]]：Codemode 脚本沙箱属于脚本级隔离的实例

### Dependencies（依赖项）

- [[pi|Pi]]：当前唯一已确立的实现载体（part-of）

## Evolution（演进）

- 2026-09-30：Pi v0.99.0/0.99.1 内置 Codemode + MCP（Armin Ronacher PR #10040）。
- 2026-10：Pi 1.0 将 Code Mode 与原生 MCP 转入稳定版。

## Open Questions（开放问题）

- `codemode.mode: only`（内置工具也全部走脚本）档的实际表现：信源作者未测。
- MCP 接得越多固定开销差距是否越大：按设计推断成立，信源未实测。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-pi-setup-mcp-codemode-guide.md`（机制与实测数据）
- Source: `raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md`（QuickJS 沙箱、System 1 分类模型）

## Related Knowledge（相关知识）

- [[pi-setup-mcp-codemode-guide|Pi Agent 入门指南（信源页）]]
- [[pi-1-0-durable-mcp-update|Pi 1.0 更新（信源页）]]
