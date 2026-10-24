---
id: wiki-entity-aibox
type: entity
title: AiBox
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: medium
tags:
  - entity
  - ai-coding
  - harness
sources:
  - raw/sources/enterprise/2026-10-24-huolala-ai-coding-harness.md
related:
  - wiki/entities/ep-harness.md
  - wiki/concepts/ai-native-organization.md
---
# AiBox

## Overview（概览）

货拉拉自建的统一 AI Coding 工作台，本质是面向组织级 AI Coding 的 Harness / control plane（管控面）：把 1000+ 工程师的 AI 用法（工具、配置、账号、模型调用）收口到一个平台，配套培训与实战场景库，解决"个人提效不等于组织提效"的统一管理问题。

## Identity（身份信息）

- Type（类型）: 内部研发平台（AI Coding Harness / 管控面）
- Organization（所属组织）: 货拉拉
- Role（角色）: 组织级 AI Coding 收口基座（工具准入、配置下发、网关管控、度量）
- Status（状态）: 已在货拉拉千人规模落地使用（官方复盘口径）

## Important Facts（重要事实）

- 集中管理并下发四类配置到每个 IDE：Rules（团队编码约束）、Skills（可复用多步工作流）、Commands（高频动作快捷指令）、MCP（外部服务与数据源接入）；工具准入、用量统计、合规检查与审计由平台统一负责。
- 内置自建网关，所有 IDE 插件/内部工具/CI 经网关调模型，实现四统一：鉴权与用量（按团队配额）、数据安全（敏感信息脱敏或拒发）、审计留痕、模型路由（补全/推理模型分配置，按任务类型与上下文长度路由）。
- 承载多智能体协作流程（需求理解/技术方案/编码/测试/Review 预审五类 Agent），配套四条协作规范：任务边界锁死、任务卡片四字段接口、备份分支失败回退、行为全量可审计。
- 承载 Spec 驱动开发：从 tech/domain/dev/cr\_spec 四个库召回 spec、人工策展出 proposal.md、原子 delta 执行；spec 按命中/误导打分迭代，长期不命中下架。
- 度量三层均在平台之上运行：AI 代码占比（hash 签名三层采集，只认合入主干行）、缺陷率对比、FPY 与返工率；全链路 trace 每次生成/采纳可追溯。

## Products / Projects（产品／项目）

- 无独立子项目页（参考了 OpenSpec 的 spec/delta 结构与 Superpowers 的 Skill 化方法论，均为外部方法论，未立页）

## Relationships（关系）

- [[ep-harness|EP-Harness]]：同类平行实践——得物的团队级 Agent 工作平台偏任务执行面（Issue 驱动 + 本机 daemon 执行），AiBox 偏管控面（配置下发 + 网关 + 度量）（alternative-to / 同类参照）。
- [[ai-native-organization|AI 原生研发组织]]：AiBox 是货拉拉走向"组织原生"的平台载体（part-of 该概念的落地样本）。

## Timeline（时间线）

- 2026-09-16 — 货拉拉技术团队在稀土掘金公开发表复盘，AiBox 作为千人 AI Coding 收口平台完整披露。
- 2026-10-24 — 微信公众号转载版收录入本库。

## Current Understanding（当前认知）

AiBox 代表"公司自建 Harness"路线在研发管控面的具体形态：商业 coding agent 解决个体写代码，AiBox 解决组织如何用同一套纪律写代码。其收口顺序值得注意——先工作台与培训抬下限（80% 的人），再网关收口接入层，再多智能体提上限，最后度量与经验闭环。当前仅单一官方信源，成效数字缺第三方验证。

## Evidence（证据）

- `raw/sources/enterprise/2026-10-24-huolala-ai-coding-harness.md`
