---
id: wiki-source-pi-1-0-durable-mcp-update
type: source
title: Pi 抛出全新 Agent Harness，还把自己骂了一年的 MCP 装进了核心
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - ai-agent
sources:
  - raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md
related:
  - wiki/entities/pi.md
  - wiki/concepts/mcp.md
  - wiki/concepts/durable-execution.md
---
# Pi 抛出全新 Agent Harness，还把自己骂了一年的 MCP 装进了核心

## Overview（概览）

InfoQ 编译的播客访谈：Pi 升级 1.0（Code Mode 与原生 MCP 进入稳定版），同日推出持久化 Agent 框架 Pi Durable；Mario Zechner 与 Armin Ronacher 详谈 Durable 架构、AI 编程能力边界与 Pi 的未来方向。

## Key Facts（关键事实）

- Pi 1.0：Code Mode 与原生 MCP 正式进稳定版；Pi Durable 架构历经八轮迭代；MCP 协议过去一年经历六七轮调整。
- Pi Durable 约 1.2 万行代码；不采用事件溯源，原语为"效应三明治"（意图→执行→结果）+ 版本化 JSON 文档存储（Proxy 记录类 JSON Patch 操作）；可部署到 Vercel、Cloudflare Durable Objects、E2B、笔记本、手机。
- Pi 官网曾写"不支持 MCP"，因协议成熟与模型训练改善转为正式接入；经工具搜索与渐进式披露按需加载。
- Code Mode 在 QuickJS 沙箱跑 JS：并行调工具、过滤数据、循环内调 System 1 分类模型（如 Jev），只把汇总结果送回前沿模型。
- Mario 的桌面软件（JVM 加固）被人用两个 Codex 账号破解（深入 JVM native 内存结构逆向）；他随后用 AI 重放攻击分析。
- Pi Durable 之前的 Pi 会把整棵对话树加载进内存，长驻 Bot 场景无法工作。

## Important Claims（重要论断）

### AI 擅长有 Oracle 的任务，学不会架构
有明确对错信号（Oracle）、二元可判定、可 fuzz 的任务模型做得极好（Bun 的 Rust 重写、模拟器、序列化库 fuzzing）；架构是编程中唯一没有被编码成文本的过程，训练数据缺失，LLM 学不到。Armin 认为模型架构能力没有明显进步甚至退步（Sol 6.1 与 Opus 5.5 在表达上有所改善）。

### Agent 修 Bug 必然膨胀代码库
Agent 几乎不可能在不增加代码的情况下修好问题；全自动维护的代码库会随每次修复持续膨胀。组件级实现可完全交给 Agent（Pi 的 TUI 库 markdown/text 组件从未被 review），但性能问题的架构级根因修复仍需人。

### 训练数据质量是架构能力的突破口
从 GitHub 仓库历史（PR 是否合并、代码存活比例）与架构讨论轨迹中筛选高质量数据是可能路径；轨迹质量分类本质上是分类问题，且与 RSI（递归自我改进）相关。

## Concepts Introduced（引入的概念）

- [[durable-execution|持久执行（Durable Execution）]]
- [[mcp|MCP]]

## Entities Mentioned（提及的实体）

- [[pi|Pi]]（及其公司 Earendil；人物 Mario Zechner、Armin Ronacher）

## Implications（影响／启示）

- Pi 从终端编程 Agent 向完整 Agent 基础设施延伸：持久执行 + 原生 MCP + Code Mode 构成 Harness 三件套。
- 分层模型调用（MCP 取数 → Code Mode 编排 → 小模型分类 → 前沿模型推理）是控制 Token 成本的可复用模式。
- "Agent 不擅长架构根因"为人机分工划出当前边界：组件级可全委托，架构级仍需人。

## Limitations（局限）

- 播客编译稿（二次信源），观点均为受访者立场；Pi Durable 的性能与可靠性数据未给出基准。
- "模型架构能力退步"等判断为个人经验，非系统评测结论。

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[mcp|MCP]]
- [[durable-execution|持久执行（Durable Execution）]]

## Source（信源）

- `raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md`
