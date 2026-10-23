---
id: 2026-10-16-pi-practice-06-daily-patterns-selection
title: Pi实战 06：日常实战 · 模式 · 选型篇
source: 微信公众号「九幺一铭 Ai修行手记」
source_url: https://mp.weixin.qq.com/s/H5jMdYhJXR3QxdFBsy9QHA
source_type: article
platform: mp.weixin.qq.com
created: 2026-10-16
category: 技术
tags: [Pi, AI Coding, 工程实践]
asset_ref: Assets/2026/10/pi-practice-06-daily-patterns-selection.md
wiki_status: ingested
---

# Pi实战 06：日常实战 · 模式 · 选型篇

> Pi Coding Agent 系列第 6 篇，汇总社区实战经验与选型对照：按任务分工切模型（便宜模型日常、强模型啃硬骨头）、固定系统开销 <1k tokens 的省 token 优势与五个节流技巧、四种运行模式（interactive/print/RPC/SDK）、高频快捷键与会话树习惯；并诚实对照 Pi / Claude Code / OpenCode / Codex CLI——Pi 是可无限 hack 的"Emacs 式骨架"，把 Agent 定义权交给工程师，代价是自建自维护，受监管行业可借其本地端点与可审计性获益。

## 核心要点

- **模型分工**：Pi+DeepSeek 当 daily driver，Grok Build 啃复杂任务，前端交给 Claude Code；`/model`（Ctrl+L）切换、Shift+Tab 调思考等级。
- **低开销优势**：每请求固定开销 Pi <1k tokens，对比 OpenCode ~6.9k、Claude Code ~32.8k；叠加 `!!command` 不入上下文、显式 `contextWindow`、MCP adapter（200 vs 30k+）、`/session` 看花费、精简工具集。
- **四种模式**：interactive 日常、`pi -p`/JSON 脚本管道、RPC 供非 Node 集成、SDK（`@mariozechner/pi-coding-agent`）嵌入应用。
- **选型本质**：Pi=可 hack 骨架（像 Neovim/Emacs，MIT、15+ 模型商、功能自造），CC=高集成成品 Agent，OpenCode=可配置成品，Codex=托管流；composio 百小时实测 Pi vs OpenCode 平局，面向不同人群。
- **社区评价**："Pi is the Emacs of coding AI agents"；树状会话受好评；短板是本地模型仍差一口气、无权限弹窗需自建 permission-gate。
- **适配人群**：爱打磨工具、重隐私/成本/模型自由→Pi；要开箱兜底→CC/Cursor；受监管行业（无 SaaS 后端+本地端点+可审计）具顶层优势。

## 正文

完整正文见采集态原件（含模型分工表、固定开销对照表、四模式表、四款 Harness 选型对照表与 30 分钟上手清单）：[[Assets/2026/10/pi-practice-06-daily-patterns-selection.md]]

## 来源

- [Pi实战 06：日常实战 · 模式 · 选型篇 · 微信公众号](https://mp.weixin.qq.com/s/H5jMdYhJXR3QxdFBsy9QHA)

## 附件

- [[Assets/2026/10/pi-practice-06-daily-patterns-selection.md]]（web-fetch 抓取正文，5,858 字符，fetch_level=browser）
