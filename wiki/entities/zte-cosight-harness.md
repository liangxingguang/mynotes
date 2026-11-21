---
id: wiki-entity-zte-cosight-harness
type: entity
title: 中兴 Co-Sight Harness
status: active
created: 2026-11-22
updated: 2026-11-22
confidence: medium
tags:
  - entity
  - ai
  - agent
  - harness
  - open-source
sources:
  - raw/sources/ai/2026-11-20-zte-cosight-harness.md
related:
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-evaluation.md
  - wiki/concepts/durable-execution.md
  - wiki/entities/helixharness.md
  - wiki/entities/ep-harness.md
  - wiki/entities/deepseek-harness.md
---
# 中兴 Co-Sight Harness

## Overview（概览）

中兴通讯开源的企业级 Agent 执行底座（Harness）：支撑 2000 人研发团队跑通 200+ 步骤的生产级研发工作流，从业务、执行、资产、证据四层改造，在不换底座模型的前提下把长链路无人干预完成率、组织级任务成功率等指标显著拉升。Apache 2.0 开源于 GitHub（ZTE-AICloud/Co-Sight 仓库下的独立目录），可作为插件装进 Claude Code 或 DSH 运行时。

## Identity（身份信息）

- Type（类型）: 企业级 Agent Harness / Agent 底座系统（开源）
- Organization（所属组织）: 中兴通讯（ZTE），开源于 ZTE-AICloud/Co-Sight 仓库
- Role（角色）: 支撑长链路（200+ 步）生产级研发工作流的执行控制、知识资产与评测证据体系
- Status（状态）: 已按 Apache 2.0 开源（信源发布时点）；仓库活跃度与版本未核验

## Important Facts（重要事实）

- 四层架构：业务层（步骤五维打分分流、11 个专职子 Agent、agent-genesis 需求自动编译）→ 执行层 Drive（声明式工作流+状态机+Hook、五岗位流转、打回重做、断点续跑）→ 资产层（运行态检索+生产态构建双引擎、语义对齐、经验回写）→ 证据层（三级指标下钻、Golden Set、回归门禁）。
- 量化结果（内部自报）：业务域 A 200 步链路无人干预完成率 50%→100%，端到端 440→159 分钟（-64%）；检索召回率 56%→91.67%，生成 F1 68%→91.25%；组织级任务成功率 60%→90%。
- agent-genesis：口头需求自动编译为标准控制文件（路线图/执行计划/验收标准/测试用例等），新场景接入 2-4 小时→5-10 分钟；验证 Agent 在隔离上下文运行，严禁查看设计方案，防「自己改自己的作业」。
- 跨团队复用：业务域 C 多卡适配跨人移交（非原作者 7 天切换配置、门禁下 5 小时自动跑通）；业务域 B 非原班人马 4 天接管。
- 开源组件 8 个：agent-genesis、drive（含 817 个测试）、GoldEval（零依赖评测器）、skill-optimizer、cosight-viewer 等；一键安装、自带依赖、可完全离线运行。

## Products / Projects（产品／项目）

- 核心组件：`agent-genesis`（需求编译）、`drive`（执行引擎）、`GoldEval`（零依赖评测器）、`skill-optimizer`、`cosight-viewer`（共 8 个组件，信源未逐一列全）。
- 仓库：github.com/ZTE-AICloud/Co-Sight（独立目录）。

## Relationships（关系）

- [[harness-engineering|Harness Engineering]]：本实体是该概念的企业级、长链路（200+ 步）实例，四层改造对应其「执行循环/上下文与记忆/多 Agent 协调/扩展机制」等观察面。
- [[agent-evaluation|业务 Agent 全生命周期评测]]：证据层提供三级指标下钻、Golden Set 逐节点比对与回归门禁的落地样例。
- [[durable-execution|持久执行]]：Drive 的断点续跑、依赖自动分批并行、每批强制对账为持久执行的运行时控制实例。
- [[helixharness|HelixHarness]]、[[ep-harness|EP-Harness]]、[[deepseek-harness|DeepSeek Harness]]：同类 Harness 产品实例，定位与约束各有不同。

## Timeline（时间线）

- 2026-11-22 — 由微信信源 `raw/sources/ai/2026-11-20-zte-cosight-harness.md` 引入本知识库（开源事件的具体日期信源未给出）。

## Current Understanding（当前认知）

企业级 Harness 的代表性开源样本：以「模型外控制层」为核心主张，用业务分流、流程固化、知识双引擎与证据门禁把超长链路交付从 50% 拉到 100%（内部数据）。所有量化指标为中兴内部自报、单信源转述，采用前需核验仓库与一手资料；其「提升团队交付下限而非个体提效」的方法论主张与 [[harness-engineering]] 的多信源结论同调。

## Evidence（证据）

- `raw/sources/ai/2026-11-20-zte-cosight-harness.md`
