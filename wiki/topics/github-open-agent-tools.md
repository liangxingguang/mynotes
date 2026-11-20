---
id: wiki-topic-github-open-agent-tools
type: topic
title: GitHub 开源 Skill/Agent 工具盘点
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - topic
  - github
  - agent
sources:
  - raw/sources/ai/2026-11-20-weibo-github-open-skills.md
related:
  - wiki/sources/2026-11-20-weibo-github-open-skills.md
---
# GitHub 开源 Skill/Agent 工具盘点

## Scope（范围）

本主题收录 2026-11-20 微博盘点推荐的 GitHub 开源 Skill/Agent 工具，覆盖五个场景：本地视频剪辑、Office 能力、网页搜索与爬取、软件 CLI 化、小模型训练。每项工具独立成实体页，本页仅作导航与综述。

## Current Understanding（当前认知）

博主的选型口径为无云端、无 API Key、可直接上手，工具面向 Claude Code / Cursor / Codex 等主流 agent。5 项工具当前均为微博单信源，细节未经仓库核验（confidence: medium）。

## Key Concepts（关键概念）

- [[claude-skills|Claude Skills]]：Skill 是 agent 能力的可复用资产形态，ffmpeg-skill 为其实例。
- [[mcp|MCP]]：ffmpeg-skill 以 MCP 形式暴露工具。

## Key Entities（关键实体）

- [[ffmpeg-skill]]：本地 FFmpeg 视频编辑 skill（42 个工具 + MCP，无云端）
- [[univer]]：可嵌入产品的 Office SDK（编辑/计算/协作/文件处理，面向人与 AI agent）
- [[firecrawl]]：agent 网页搜索与爬取基础设施（号称 550+ 数据源）
- [[cli-anything]]：任意软件转 agent 可调用 CLI（配套 CLI-Hub 统一入口）
- [[minimind]]：从零训练 64M 参数小模型的完整教程与代码（两小时跑通）

## Important Decisions（重要决策）

（无——盘点帖不涉及决策记录）

## Major Developments（重大进展）

- 2026-11-20 — 微博博主盘点 5 个 GitHub 热榜开源 Skill/Agent 工具（采集日）。

## Disagreements（分歧）

（无）

## Open Questions（开放问题）

- 各工具的仓库地址、星数、维护状态与实际能力需与官方仓库交叉核验。
- firecrawl「550+ 数据源」的说法未经证实。

## Related Topics（相关主题）

（暂无）
