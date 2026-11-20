---
id: wiki-entity-gaode-ad-linglingqi
type: entity
title: 广告凌凌漆（高德广告 AI 原生生产系统）
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: medium
tags:
  - entity
  - ai-coding
  - agent
  - acceptance
sources:
  - raw/sources/ai/2026-11-20-gaode-ad-linglingqi.md
related:
  - wiki/concepts/personal-dev.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/acceptance-agent.md
  - wiki/concepts/ai-coding-evidence-boundary.md
  - wiki/concepts/ai-native-sdlc.md
  - wiki/sources/2026-11-20-gaode-ad-linglingqi.md
---
# 广告凌凌漆（高德广告 AI 原生生产系统）

## Overview（概览）

高德搜索、推荐、广告技术团队建设的面向广告工程的 **AI 原生生产系统**（数字员工），通过问题排查、主动走查和数据分析形成需求洞察并持续跟进，把数字员工、研发执行、长期工作环境、工程上下文和可信验收组织成一套协同系统。是《信息业务 AI Native Builder》系列的数字员工篇核心对象。高德技术一手自述，单信源，置信度中。

## Identity（身份）

- **归属**：高德（Amap）搜索、推荐、广告技术团队。
- **性质**：面向广告工程的 AI 原生生产系统 / 广告数字员工（交互入口为钉钉上的"小七"）。
- **系列定位**：《信息业务 AI Native Builder》系列数字员工篇；同系列含总纲篇、交付篇（星舰 10X、星舰 Cloud Agent）、现场篇（轻舟 Agent）。
- **核心目标**：让 Agent 承担更完整的任务，让任务被承接和持续推进、结果被证据约束、经验在下一次任务中重新验证。

## Important Facts（重要事实）

- **规模数据**：截至 2026-09-18 阶段性快照，广告数字员工任务台账 362 条，349 条已办结，办结率 96.4%；"办结"仅表示台账状态完成/关闭，不等同于答案正确率、研发交付率或业务结果达成率。研发辅助与需求准入、用户问题排查、运维与报警分析三类合计 274 条，占 75.7%。
- **能力接入**：22 项专业能力入口，六类——需求与研发、代码与质量、引擎与实验、运维与数据、客资与计费、知识与协同。高风险动作（回帖/配置或数据写入/赔付）必须由责任人确认或沿用原系统审批链路，数字员工不因能调工具而自动获业务授权。
- **历史样本**：另一批历史问题分析提炼 8 类共性问题、沉淀 16 项标准答复（口径与任务快照不同，不参与办结率计算）。
- **四层架构**：交互协作（小七）、任务控制（Main Agent）、研发执行（Coding Harness）、工程上下文与验收（CodeGraph/Knowledge/Memory/Evidence/Evaluator）。
- **执行路径**：数字员工原生闭环（小七直接完成）、自动化工作流、专业研发闭环（委托 Main Agent）；Main Agent 不是所有任务必经之路。
- **执行引擎**：前期用 OpenCode，后 Codex Harness 在 Personal Dev 部分正式研发路径中逐步成为默认（非全面迁移）；执行引擎收敛为可替换适配层，任务体系不被锁定。核心纪律：自主执行≠自主授权。见 [[harness-engineering|Harness 工程]]。
- **研发环境**：自建 Personal Dev（个人研发环境），逻辑环境独立于计算实例，单 Writer + lease/fencing。见 [[personal-dev|个人研发环境]]。
- **工程上下文**：CodeGraph（影响分析导航，须关联 repo_id/commit_sha/artifact_digest）、Knowledge+Mem0（经验治理）、Evidence、Evaluator。
- **研发契约**：Dev Loop，Goal + Constraints + Acceptance Evidence；四概念分离 Contract/Trajectory/Evidence/EvalResult；验收三层次 开发完成≠交付完成≠效果确认。见 [[acceptance-agent|验收 Agent]]。
- **真实案例**：广告推荐引擎混合版本配置兼容任务——17/17 定向测试 PASS、BUILD SUCCESS、研发验收 PASS，但 testCompile 无通过证据、CR 未创建、发布与线上验证未执行；结论最多到"研发验收通过、具备进入代码评审条件"。

## Products / Projects（产品／项目）

- 广告凌凌漆（广告数字员工生产系统）
- 小七（数字员工交互入口）
- 星舰 10X、星舰 Cloud Agent、轻舟（同系列其他 Agent 实践，未立页）

## Relationships（关系）

- **与 Personal Dev**：凌凌漆的复杂研发依赖 Personal Dev 提供稳定工作区，见 [[personal-dev|个人研发环境]]。
- **与 Harness 工程**：执行引擎可替换边界与"自主执行≠自主授权"是 [[harness-engineering|Harness 工程]] 的实证案例。
- **与验收 Agent**：Dev Loop 契约、四概念分离、验收三层次是 [[acceptance-agent|验收 Agent]] 的工程化实现。
- **与证据边界**："当前行为 vs 目标行为"区分、模型推断作假设，印证 [[ai-coding-evidence-boundary|AI 编码的证据边界]]。
- **与 AI 原生 SDLC**：契约驱动、证据约束、人守闸门，是 [[ai-native-sdlc|AI 原生 SDLC]] 的一种团队落地。

## Timeline（时间线）

- 2026-09-18：任务台账阶段性快照（362 条、办结率 96.4%）。
- 2026-11-02：14 个广告核心仓库三环境制品身份一致性核验（14/14）。
- 2026-11-20：信源文发布（数字员工篇）。
- 2026-11-21：首次立实体页。

## Current Understanding（当前理解）

广告凌凌漆的核心变化不是接入多少工具或模型能生成多少代码，而是把数字员工、研发执行、长期工作环境、工程上下文和可信验收组织成**协同系统**：任务能被承接和持续推进，结果能被证据约束，经验能在下一次任务中重新验证。**解读**：其价值主张是"稳定提高下一次真实任务成功的概率"，而非偶尔完成一次复杂任务；办结率等口径被作者明确限定，避免被误读为正确率或交付率。

## Evidence（证据）

- 信源：`raw/sources/ai/2026-11-20-gaode-ad-linglingqi.md`（专题导读、一至七章：能力接入、四层架构、可替换 Harness、Personal Dev、CodeGraph、Knowledge+Mem0、Dev Loop、真实案例、下一步）。
