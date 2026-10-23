---
id: wiki-source-pi-practice-06-daily-patterns-selection
type: source
title: Pi实战 06：日常实战 · 模式 · 选型篇
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - pi
  - ai-coding
sources:
  - raw/sources/products/2026-10-16-pi-practice-06-daily-patterns-selection.md
related:
  - wiki/entities/pi.md
---
# Pi实战 06：日常实战 · 模式 · 选型篇

## Overview（概览）

「九幺一铭 Ai修行手记」Pi 系列第 6 篇，汇总社区（deepakness、HN、Reddit、composio.dev、Context Studios、petronellatech 等）实战经验：模型分工、省 token 技巧、四种运行模式、高频快捷键，以及 [[pi|Pi]] / Claude Code / OpenCode / Codex CLI 的诚实选型对照。

## Key Facts（关键事实）

- 固定系统开销实测（Systima，composio.dev 引用）：Pi < 1,000 tokens/请求，OpenCode ~6,900，Claude Code ~32,800。
- 模型分工实例（deepakness）：Pi+DeepSeek 日常、Grok Build 啃复杂任务、前端交 Claude Code；联网用 pi-web-access（Exa 免 key）。
- 节流五招：`!!command` 输出不入上下文；`models.json` 显式 `contextWindow`（否则继承默认 128k 过早压缩）；MCP 走 adapter（~200 vs 30k+ tokens）；`/session` 看花费；`--tools`/`--exclude-tools` 精简工具集。
- 四种运行模式：interactive（日常）；print/JSON（`pi -p`，脚本管道）；RPC（`--mode rpc`，stdin/stdout JSON 协议，供非 Node 集成）；SDK（嵌入应用，文中包名 `@mariozechner/pi-coding-agent`，案例 OpenClaw）。
- composio.dev 实测 100 小时后结论：Pi vs OpenCode 平局——"Pi 是你去编程的平台（像 Neovim），OpenCode 是你去配置的产品"。
- HN 评价："Pi is the Emacs of coding AI agents"（onetom）；树状会话（/tree /fork /clone /resume）广受好评。
- 短板（社区反馈）：本地模型仍 "still a beat behind" Claude Code；无权限弹窗需自建 permission-gate；有人担心 Anthropic OAuth 被封。
- 选型结论（Context Studios）："Pi 奖励把 Agent 当锋利手术刀始终握在手里的工程师；Claude Code 奖励想让 Agent 扛下更多流程的团队"；受监管行业（无 SaaS 后端+本地端点+可审计）是 Pi 顶层优势（petronellatech）。

## Important Claims（重要论断）

### Claim 1：四款 Harness 不是同一赛道竞品

Pi=可 hack 骨架（MIT、15+ 模型商、功能自造）、CC=高集成成品、OpenCode=可配置成品、Codex=托管流——回答的是不同问题（mcplato / Context Studios）。

### Claim 2：Pi 的自由有代价

"除非你接受用厂商维护的功能换取自己动手搭建维护的代价，否则它不能直接替代商业 harness"（BenjaminWegener）。

## Concepts Introduced（引入的概念）

- 按任务分工的多模型调度策略（便宜模型探索、强模型收尾）

## Entities Mentioned（提及的实体）

- [[pi|Pi]]
- Claude Code / OpenCode / Codex CLI / Grok Build / DeepSeek（对照对象，未立页）

## Implications（影响／启示）

固定开销对照表是选 Harness 的量化依据之一：长会话/高频调用场景下 <1k vs ~32.8k 的差异会显著影响成本与有效上下文（解读）。

## Limitations（局限）

- 系列软文性质，来源为二手社区汇编；开销数字为特定版本实测，随版本变化快。
- 无权限弹窗等短板作者本身有立场（系列主题为推广 Pi）。

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[pi-secondary-dev-5-layers|Pi 二次开发一篇讲透]]（同主题深度文）

## Source（信源）

- `raw/sources/products/2026-10-16-pi-practice-06-daily-patterns-selection.md`
