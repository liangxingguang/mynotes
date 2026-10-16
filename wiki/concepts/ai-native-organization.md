---
id: wiki-concept-ai-native-organization
type: concept
title: AI 原生研发组织
status: active
created: 2026-10-16
updated: 2026-10-16
confidence: medium
tags:
  - concept
  - ai
  - organization
sources:
  - raw/sources/enterprise/2026-10-14-ai-native-rd-org-alibaba.md
---
# AI 原生研发组织

## Definition（定义）

AI 原生（AI Native）研发组织指整个组织以 AI 深度嵌入生产链路的方式工作的研发组织形态。按阿里云 CTO 线提出的三阶段论，它是继"工具原生"（个人用好 Agent）、"工作流原生"（Agent 贯通多步骤）之后的第三阶段"组织原生"；Agent 进入生产链路被视为真正的分水岭。

## Why It Matters（为什么重要）

AI Native 的首要价值是降本，但更被强调的是竞争维度跃迁：当代码变便宜，组织、流程与责任的重构成为新的竞争焦点。人类首次需要与非人智能体协作，"人与 AI 的新契约"（目标、权限、验收、追责）尚无既定答案。

## Core Characteristics（核心特征）

1. **三阶段演进路径**：工具原生 → 工作流原生 → 组织原生。
2. **技术范式**：智能体计算 = 模型 + Harness + Context；平台需求收敛为任务可靠执行（规范即代码、多 Agent 编排、自动验收）、经验持续积累（Skill/MCP 资产化闭环）、协作进入组织（Agent 身份权限、Human+Agent 混编）。
3. **任务分层**：标准可评测可回滚的由 Agent 做、人审批；跨领域低风险的由 Owner 借 Agent 闭环；高风险、高歧义、不可逆的由专业人员主导。
4. **组织形态变化**：打破职能边界、增加 overlap；Owner 从目标负责到验收；Human+Agent 混编团队（如 2 人 + 1 Leader Agent + 6 Worker Agent）。

## Structure（结构）

当前信源未确立统一组织结构；已知探索以"样板间"为单位推进——须满足进生产、有可观测业务结果、可复用三条件。

## How It Works（运作方式）

推进方式（阿里云 CTO 线实践）："北极星、留白、沙箱"——北极星目标动员、留白允许跨岗试验、沙箱隔离生产风险；过程指标只观测不考核，防止局部优化变形。问题分两类："成长型"（现有框架内全链路极致优化）与"进化型"（在 AI 能力与客户价值间重构一切）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[mcp|MCP]]：信源将 Skill/MCP 资产化列为平台"经验持续积累"需求的组成部分

### Distinctions（区分）

- 与"单点提效"的区别：重点不在个人工具效率，而在组织、流程与责任的重构。

## Evolution（演进）

- 2026-10（云栖大会）：阿里云 CTO 线披露三个月探索的阶段性观察与 7 个生产样板间；承认仍处早期，目标/权限/验收/追责无统一做法，后续将发 7 篇专题详解。

## Open Questions（开放问题）

- Agent 的目标、权限、验收与追责的统一框架：各团队仍在分别界定，无共识。
- 经验沉淀（Context、Skill、Eval、Harness）能否跨团队复用：待更多生产数据验证。
- "人与 AI 新契约"的具体形态：尚无答案。

## Evidence（证据）

- Source: `raw/sources/enterprise/2026-10-14-ai-native-rd-org-alibaba.md`

## Related Knowledge（相关知识）

- [[ai-native-rd-org-forum|AI 进入生产后，研发组织怎么变（阿里云 AI 原生研发组织论坛回顾）]]
