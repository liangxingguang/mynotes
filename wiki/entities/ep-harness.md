---
id: wiki-entity-ep-harness
type: entity
title: EP-Harness
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - entity
  - ai-agent
  - harness
sources:
  - raw/sources/ai/2026-10-15-ep-harness-team-agent-workflow.md
related:
  - wiki/concepts/agent-loop.md
---
# EP-Harness

## Overview（概览）

得物的团队级 Agent 工作系统（Managed Agents 平台），基于开源项目 Multica 二次开发。把 Agent 当作有身份、任务、状态、执行记录、可见性与权限边界的"团队成员"管理，覆盖任务派发、上下文结构化、执行治理与闭环反馈。

## Identity（身份信息）

- Type（类型）: 内部研发平台（Managed Agents 平台）
- Organization（所属组织）: 得物
- Role（角色）: 团队级 AI Coding / Agent 工作流基座
- Status（状态）: 已在得物内部落地使用（据官方文章）

## Important Facts（重要事实）

- 技术基座为开源项目 Multica（open-source managed agents platform），EP-Harness 在其上贴合得物研发流程与内部系统二开。
- 三层协作架构：server（工作区/Issue/成员/任务队列/实时更新）+ daemon（开发者本机领任务、调本地 AI 编程 CLI）+ 本地工具链执行实际代码。
- 统一执行契约 `Backend.Execute(ctx, prompt, ExecOptions)`（server/pkg/agent/agent.go）；Claude/Codex/OpenCode/ACP 等 Runtime 保留各自协议，对上层暴露一致执行生命周期。
- 任务以 Issue 为载体，关联项目、需求、应用分支、工作流、评论、执行日志、文件变更与后续反馈。
- 自动化治理成效（官方口径）：累计自动修复 100+ 异常日志问题；典型高频问题从每 4 小时 2400+ 条降至个位数。

## Products / Projects（产品／项目）

- Multica（上游开源基座，未单独立页）

## Relationships（关系）

- [[agent-loop|Agent Loop]]：EP-Harness 是 Harness/Loop 层工程化的团队平台实例（derived-from 该概念框架）。

## Timeline（时间线）

- 2026-10-15 — 得物技术公众号发文介绍 EP-Harness 定位、架构与落地成效。

## Current Understanding（当前认知）

定位判断（官方观点）：AI Coding 沿 Prompt→Context→Harness→Loop 四层外扩，个人工具只解决前两层；EP-Harness 补齐结构化上下文（八类来源按时机进入）与"发现-派发-执行-验证-记录-决策"闭环。当前仅单一官方信源，成效数字缺第三方验证。

## Evidence（证据）

- `raw/sources/ai/2026-10-15-ep-harness-team-agent-workflow.md`
