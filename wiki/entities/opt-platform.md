---
id: wiki-entity-opt-platform
type: entity
title: OPT 平台（One Person Team）
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - entity
  - ai-agent
  - platform
sources:
  - raw/sources/ai/2026-11-20-acceptance-agent-opt.md
related:
  - wiki/concepts/acceptance-agent.md
  - wiki/concepts/ai-native-sdlc.md
  - wiki/entities/kongming-ai-dev-platform.md
---
# OPT 平台（One Person Team）

## Overview（概览）

OPT（One Person Team）是腾讯医疗相关业务研发团队自建的人与 Agent 协同研发平台：以 CodeBuddy 等 CLI 为底层运行时，通过多个 Agent 组成小队，协同完成需求分析、规划、开发等工作，让 AI 从辅助编码参与到完整的需求交付。其需求交付小队在「编码实现」之后引入后端验收 Agent，打通从需求理解到开发验收的完整交付链路。

## Identity（身份信息）

- Type（类型）: AI 研发协作平台（自建，人与 Agent 协同）
- Organization（所属组织）: 腾讯（医疗相关业务研发团队，据信源）
- Role（角色）: 多 Agent 需求交付小队的编排平台；后端验收 Agent 的宿主平台
- Status（状态）: 生产使用（信源披露其需求交付小队全流程已打通）

## Important Facts（重要事实）

- 以 CodeBuddy 等 CLI 为底层运行时打造（CodeBuddy 在本文中仅作为运行时被提及，无更多独立信息）。
- 需求交付小队按「需求分析 → 方案规划 → 编码实现 → 代码验收」协同工作：Leader 负责整体调度，各环节由对应 Agent 执行，人负责确认需求预期、方案和最终交付结论。
- 后端验收 Agent 位于代码实现与代码质量验收之后，仅在涉及后端变更时进入；验收不通过则打回代码实现，修复后重新验收，通过后输出验收报告（执行内核为 api-acceptance Skill，见 [[acceptance-agent|验收 Agent]]）。
- 后端验收 Agent 作为首个落地业务已运行 160+ 次，覆盖 30+ 个需求、80+ 个入口接口、800+ 个 Gherkin 场景，发现 20+ 条问题并触发打回修复；30+ 个需求中 10+ 次验收未通过（作者自报数据）。
- 按典型后端需求测算，单次验收人工投入从约 2 小时降至约 20 分钟，预计下降 80%+（作者测算）。
- 验收方法已推广到其他医疗相关业务使用，减少重复摸索验收方法的成本。
- 医疗业务通过内部研发平台支撑应用构建、部署等运维全生命周期管理，其上封装了命令行工具供验收 Skill 对接完成编译发布。
- 正在持续探索端侧 E2E 验收 Agent（H5 和小程序），完善需求开发交付链路。

## Products / Projects（产品／项目）

- [[acceptance-agent|验收 Agent]] / api-acceptance Skill：后端验收能力，OPT 需求交付小队的一环，已沉淀为可跨业务复用的 Skill。

## Relationships（关系）

- [[acceptance-agent|验收 Agent]]：OPT 平台上后端验收 Agent 的方法论载体，本文为其实践出处。
- [[ai-native-sdlc|AI 原生 SDLC]]：OPT 是 AI 原生 SDLC 的国内平台实例之一（多 Agent 小队闭环交付）。
- [[kongming-ai-dev-platform|孔明（AI 研发平台）]]：同为自建多 Agent 研发交付平台（验收工作流 + 验证快照 + 脚本核对），可对照其验收机制设计。

## Timeline（时间线）

- 2026-11-20 — 实践经微信公众号「腾讯云开发者」（作者吴思）公开披露并采集登记；文章发布日期信源未载明，平台上线时间当前信源未确立。

## Current Understanding（当前认知）

OPT 是一个「小队编排」式的多 Agent 研发平台：不是单一大 Agent，而是按需求交付阶段拆分角色、由 Leader 调度、人在预期确认与最终结论处守闸门。其对知识库建设（业务测试知识库、鉴权说明、测试账号、数据构造方法）的强调，与「事实密度影响 Agent 可靠性」的通用判断一致。平台细节（内部研发平台形态、TAPD 集成深度、端侧 E2E 进展）目前仅有本文一个信源。

## Evidence（证据）

- `raw/sources/ai/2026-11-20-acceptance-agent-opt.md`（§01 平台背景、§2.2 交付小队编排、§03 实践效果与复用）
