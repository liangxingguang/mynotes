---
id: wiki-source-ep-harness-team-agent-workflow
type: source
title: 如何从个人 AI Coding 到构建团队级 Agent 工作流？（得物 EP-Harness）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - ai-agent
  - harness
  - engineering
sources:
  - raw/sources/ai/2026-10-15-ep-harness-team-agent-workflow.md
related:
  - wiki/entities/ep-harness.md
  - wiki/concepts/agent-loop.md
---
# 如何从个人 AI Coding 到构建团队级 Agent 工作流？（得物 EP-Harness）

## Overview（概览）

得物技术（作者方舟，dbaplus 转载）介绍团队级 Agent 工作系统 [[ep-harness|EP-Harness]]：基于开源 Multica 二次开发，把 Agent 当作有身份、任务、状态、执行记录与权限边界的"团队成员"纳入平台管理。核心判断：AI Coding 正沿 Prompt→Context→Harness→Loop 四层从工具使用走向工程系统，个人工具只解决前两层。

## Key Facts（关键事实）

- 个人 AI Coding 团队化的四个缺口：Prompt 没有 Review；经验留在个人本地无法沉淀；Agent 使用与成功率/耗时/token 缺可见性；写完代码后的审查/部署/反馈/巡检靠人手动接力。
- 架构三层协作：server 管工作区/Issue/成员/任务队列与实时更新；daemon 驻开发者本机领任务、调本地 AI 编程 CLI；实际代码执行发生在本地工具链与工作目录。
- 统一执行契约：`server/pkg/agent/agent.go` 的 `Backend.Execute(ctx, prompt, ExecOptions)` 是各 Runtime 唯一入口；`agent.New` 按 agentType+Config 选 Provider；Claude/Codex/OpenCode/ACP 保留各自协议，对上层暴露一致执行生命周期。
- 上下文八类来源：Issue、需求、项目、Workflow、Skills、Runtime、飞书集成、运行记录，在正确时机结构化进入 Agent（而非复制粘贴塞满）。
- Loop 两个实例：上游 release 定时巡检→建分析 Issue→拆迁移子任务；线上日志按窗口拉异常、聚合 fingerprint→Agent 析因→生成修复建议与后续 Issue。
- 落地成效：累计自动修复 100+ 异常日志问题；典型高频问题从治理前每 4 小时 2400+ 条降至治理后个位数。

## Important Claims（重要论断）

### Claim 1：AI Coding 沿四层外扩，个人工具只解决前两层

Prompt（怎么问）→ Context（喂什么材料）→ Harness（如何执行和约束）→ Loop（如何持续闭环）；团队平台的价值在于补齐后两层。

### Claim 2：Loop 的价值在闭环不在循环

有价值的 Loop 必须包含发现、派发、执行、验证、记录和下一步决策；每轮都有记录、判断、产出与后续动作，而非让 Agent 无限自跑。

### Claim 3：下一阶段是团队把 Agent 当协作成员

要解决的不是"模型能不能写代码"，而是"模型能不能在我们的研发流程里正确工作"。

## Concepts Introduced（引入的概念）

- Managed Agents 平台（Agent 有身份、任务、状态、执行记录、可见性、权限边界，及自己的 instructions/skills/runtime/历史产出）
- Prompt→Context→Harness→Loop 四层演进模型（与 [[agent-loop|Agent Loop]] 的 Runtime vs Harness 区分相呼应：Harness 是模型外补齐工程能力的完整运行层）

## Entities Mentioned（提及的实体）

- [[ep-harness|EP-Harness]]（得物团队级 Agent 工作系统）
- Multica（开源 managed agents platform，EP-Harness 的技术基座，未单独立页）
- 得物（公司，未单独立页）

## Implications（影响／启示）

"任务进 Issue 可追踪、规则进 Instructions/Workflow 可审查、经验进 Skills 可复用、执行进 Runtime 可复盘、结果进反馈链路可闭环"五句话是团队级 Agent 平台的可迁移检查清单（解读：同样适用于评估其他内部 Agent 平台设计）。

## Limitations（局限）

- 单方官方宣传口径，无第三方评估；成效数字（100+ 修复、2400+→个位数）未给统计口径与时间范围。
- 演进路线一节原文为配图，无文字内容；Multica 项目本身未展开。

## Related Knowledge（相关知识）

- [[ep-harness|EP-Harness]]
- [[agent-loop|Agent Loop]]（Runtime vs Harness 区分的团队平台级实例）

## Source（信源）

- `raw/sources/ai/2026-10-15-ep-harness-team-agent-workflow.md`
