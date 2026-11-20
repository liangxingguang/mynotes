---
id: wiki-entity-ffmpeg-skill
type: entity
title: ffmpeg-skill
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - entity
  - skill
  - video
sources:
  - raw/sources/ai/2026-11-20-weibo-github-open-skills.md
related:
  - wiki/concepts/claude-skills.md
  - wiki/concepts/mcp.md
---
# ffmpeg-skill

## Overview（概览）

面向 agent 的本地 FFmpeg 视频编辑 skill：把 FFmpeg 的视频处理能力封装为 Claude Code / Cursor / Codex 可直接调用的 skill，无云端、无需 API Key。

## Identity（身份信息）

- Type（类型）: 开源 Skill（GitHub 项目）
- Organization（所属组织）: 未知（原帖未给出仓库归属）
- Role（角色）: agent 的本地视频编辑能力提供者
- Status（状态）: 活跃（2026-11-20 微博盘点）

## Important Facts（重要事实）

- 提供 42 个工具，并以 MCP 形式暴露，供 Claude Code / Cursor / Codex 使用。
- 无云端、无需 API Key，本地运行。
- 背景：ffmpeg 作为视频组件家喻户晓（博主背景陈述）。

## Products / Projects（产品／项目）

- 原帖未给出仓库链接，待与官方仓库交叉核验后补充。

## Relationships（关系）

- [[claude-skills|Claude Skills]]：属于 Skill 这一 agent 能力资产形态。
- [[mcp|MCP]]：工具以 MCP 形式分发。
- [[deepseek-hyperframes-video-workflow]]：另一条同样依赖 FFmpeg 的 agent 视频工作流实践。

## Timeline（时间线）

- 2026-11-20 — 微博博主盘点推荐（采集日）。

## Current Understanding（当前认知）

微博单信源：工具细节、仓库地址与星数未经核验（confidence: medium）。

## Evidence（证据）

- `raw/sources/ai/2026-11-20-weibo-github-open-skills.md`
