---
id: wiki-concept-ai-native-sdlc
type: concept
title: AI 原生 SDLC
status: active
created: 2026-10-17
updated: 2026-10-23
confidence: medium
tags:
  - concept
  - ai
  - sdlc
  - engineering-practice
sources:
  - raw/sources/ai/2026-10-14-anthropic-ai-native-sdlc-handbook.md
  - raw/sources/ai/2026-10-17-ai-coding-delivery-evolution.md
  - raw/sources/enterprise/2026-10-20-huolala-ai-coding-workflow.md
related:
  - wiki/concepts/ai-native-organization.md
  - wiki/concepts/mcp.md
---
# AI 原生 SDLC

## Definition（定义）

AI 原生 SDLC（AI-Native Software Development Lifecycle，亦称 Agent 化 SDLC）是重新设计的软件开发生命周期：保留传统 SDLC 的控制目标（问责、质量、合规），改用新的执行机制——流程不再线性流转而是闭环，AI 嵌入规划、设计、构建、测试、部署、维护每一个环节，交接自动化并由被接受的制品自动触发下一阶段。

## Why It Matters（为什么重要）

Agent 编码使构建阶段塌缩到以小时计，而规划、评审/测试、部署仍按人速运行，瓶颈转移到构建两侧；逐行手工评审和委员会例外治理在 Agent 产出速度下难以为继。不改造流程，Agent 的生产力增益会被周边流程吃掉，或在评审不足下带病上线。

## Core Characteristics（核心特征）

1. **制品提交链即闭环即审计轨迹**：intent.md → spec.md → plan.md → diff 及测试 → 带评审发现的 PR → 故障记录；每阶段提交制品收尾、读取上阶段制品开始，谁要求、AI 产出什么、谁批准全程可追溯。
2. **人守闸门**：凡是需要判断的决定最终责任由人承担；支配原则是"Agent 可以一路做到生产闸门，但不能越过它"。
3. **三层控制模型**：CLAUDE.md（工作知识，一页内，错误犯第二次即写入）→ Skill（建议性控制，承载政策）→ Hook（确定性控制与审批闸门，allow/ask/block）。
4. **驾驭 Agent 的配置享受代码同等待遇**：CLAUDE.md/Skill/Hook 的变更触发 evals 回归，通过率下降须评审；每次生产故障补一条常驻评测。
5. **无状态闭环**：维护阶段由确定性检测（控制带、Western Electric 规则）唤起 Claude，诊断以 intent.md 写回阶段一，回路自我供给。

## Structure（结构）

六阶段各自的核心打法（据 Anthropic 手册）：

| 阶段 | 核心机制 | 关键制品/闸门 |
|---|---|---|
| 规划 | 意图只捕捉一次、用提出人自己的话 | intent.md；产品负责人 PR 合并/关闭 |
| 设计 | 需求与设计压缩进同一会话，政策即时应用 | spec.md；Skill 编码约束 |
| 构建 | plan 模式默认起点；并行 worktree；子 Agent | plan.md；auto 模式需护栏成熟 |
| 测试 | 反馈回路每轮运行；验证器全新上下文；evals 进 CI | make test 单命令；失败测试先提交 |
| 部署 | 多层 Agent 评审，人只判意图与风险 | REVIEW.md；PreToolUse Hook 闸门；MCP 白名单部署 |
| 维护 | 控制带突破唤起无头诊断，分级响应（1σ/2σ/3σ） | 诊断写成 intent.md 回流 |

## How It Works（运作方式）

起步态是手工逐句提示每一步；终态是闭环——被接受的 intent.md 触发设计、被批准的 spec.md 触发 plan 模式、被合入的 PR 触发流水线、被突破的控制带写下一份 intent.md。各打法模块化、有前置依赖，可从任何无前置的"起点打法"开始改造。对遗留系统（Jira/ServiceNow/Figma/变更委员会），每种制品指定唯一事实来源：仓库为准、遗留系统为准、或互相挂链（记录 ID ↔ commit SHA）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[ai-native-organization|AI 原生研发组织]]：同一"AI 原生"命题的组织层对应物——本概念管流程与制品，组织概念管目标、权限、验收、追责与团队形态；前者为后者的开放问题（追责框架）提供了制品链审计这一具体机制。
- [[mcp|MCP]]：在本概念中承担两处连接——部署/回滚能力经 MCP 白名单暴露给 Agent；遗留系统为事实来源时经 MCP 连接器写回。

### Distinctions（区分）

- 与传统 SDLC 的不同之处：控制目标不变，但交接从文档/工单/签字改为制品自动流转，治理从事后评审周期改为动作发生当下（Hook）执行，QA 闸门从阶段边界改为织进实现过程的 evals。
- 与"单点 AI 提效"的不同：不以个人编码速度为目标，衡量取自 PR 元数据、CI、故障跟踪与 DORA 等系统级指标。

## Evolution（演进）

- 2026-08-21：Anthropic（Louis Claxton，Applied AI 团队）发布《The AI-Native SDLC playbook》，系统化六阶段打法与治理配置。
- 2026-10-17：公众号「架构师」《AI 写代码越来越快，研发交付系统该怎么演进？》从交付系统视角印证同一命题：交付建模为七态状态机（当前意图→候选变更→已持久化→已合并→已验证→可部署→已生效），每次推进记录状态/版本/证据/发起者五要素，证据绑定不可变版本；提出"人从 in the loop 移到 on the loop"（Kief Morris）与本概念"人守闸门"呼应，并引 METR 实验（熟悉仓库的开发者用 AI 反慢 19%）与 DORA 2025（AI 是组织能力放大器）佐证局部提速 ≠ 端到端提速。
- 2026-10-20：货拉拉技术公开千人规模落地实践（普及→规范驱动→AI Native 三阶段），提供国内大厂一手印证：SDD 五步产线（澄清/方案/拆任务/实现/审查）对应本概念制品链；spec 打分回写/下架机制是"知识当缓存"的治理实例；度量三层（AI 代码占比三层签名、FPY 首次正确率、全链路 trace）落地了"衡量取自系统级指标"；主从双 Agent 对抗审查（副 Agent 独立回源码核对）与"评审=Agent 一审+人复审"是"人守闸门"的工程化；自治分级 L1-L3（当前 L2：人定目标、AI 起草、人决审）。

## Open Questions（开放问题）

- 各打法的先行/滞后指标只有口径、无公开前后对照数据，实际成效待第三方验证。
- 打法与 Anthropic 产品栈（托管设置、Claude Security/Tag 等 beta 能力）深度绑定，向其他 Agent 栈的迁移路径尚无信源确立。
- 意图存活率、闸门等待时长等指标的合理阈值：当前信源未确立。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-anthropic-ai-native-sdlc-handbook.md`
- Source: `raw/sources/ai/2026-10-17-ai-coding-delivery-evolution.md`（印证：制品链↔交付状态机、人守闸门↔on the loop；补充交付质量指标与证据链五要素）
- Source: `raw/sources/enterprise/2026-10-20-huolala-ai-coding-workflow.md`（印证：千人规模 SDD 产线/spec 治理/FPY 度量/主从双 Agent 评审，国内大厂一手案例）

## Related Knowledge（相关知识）

- [[ai-native-sdlc-playbook|Anthropic AI 原生 SDLC 实施手册（信源页）]]
- [[ai-coding-delivery-evolution|AI 写代码越来越快，研发交付系统该怎么演进？（信源页）]]
- [[huolala-ai-coding-workflow|货拉拉 AI Coding 流程化落地（信源页）]]
- [[ai-native-organization|AI 原生研发组织]]
