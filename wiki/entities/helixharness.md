---
id: wiki-entity-helixharness
type: entity
title: HelixHarness
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: medium
tags:
  - entity
  - ai-agent
  - harness
  - ai-coding
sources:
  - raw/sources/ai/2026-11-20-helixharness-ai-coding.md
related:
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/artifact-verification-delivery.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/context-management.md
  - wiki/entities/deepseek-harness.md
  - wiki/entities/ep-harness.md
---
# HelixHarness

## Overview（概览）

滴滴开源的项目级 AI Coding Harness：不替代 Codex、Claude Code 等底层 Coding Agent（Agent Runtime），而是在其之上提供约束、工作流、任务状态、质量检查与完成标准，把业务知识、工程约束、需求契约、检查机制和经验归档串联成一套研发体系。核心是 Propose → Apply → Archive 三阶段工作流与配套的框架评测平台。项目仓库：https://github.com/didi/helixharness

## Identity（身份信息）

- Type（类型）: 开源项目（Agent Harness / AI Coding 工作流框架）
- Organization（所属组织）: 滴滴（Didi），开源
- Role（角色）: 建在 Codex / Claude Code 等 Agent Runtime 之上的项目级 Harness，面向开发者插件 + 面向框架维护者的观测评测平台
- Status（状态）: 开源（公开 README、使用指南与上下文加载协议为主要依据）

## Important Facts（重要事实）

- 三层分工（原文概念表）：Agent Runtime（模型调用、对话、工具执行、上下文与会话，如 Pi、Codex、Claude Code）→ Agent Harness（约束、工作流、任务状态、质量检查、完成标准，即 HelixHarness）→ 业务能力层（具体业务逻辑与专业工具，如 API 测试、知识检索、Agent 评测）。原文概括："Runtime 决定 Agent 能不能干活，Harness 决定 Agent 应该怎样干活、做到什么程度才算完成。"
- 与普通 Skills 集合的区别：不仅告诉 Agent 有哪些能力，还定义使用这些能力的条件、顺序、约束和验收要求。
- 仓库分两个子项目：`helixharness/`（开发者：Agent 插件、命令、宿主适配、运行时测试）与 `helixharness-platform/`（维护者：观测、版本评测、受控框架改进）；另有 `examples/`、`docs/`。
- 三个架构原则：不替代底层 Agent Runtime（模型调用/工具执行/交互界面仍由宿主提供）；插件运行不依赖平台（平台离线不阻断正常研发）；平台的评测对象是 Harness 本身而非通用业务代码评分。
- 三阶段工作流：**Propose**（自然语言需求 → `spec.md` + `tasks.md` 可执行契约，含测试范围/前置条件/场景/验收条件/交付工件）→ **Apply**（执行≠完成，以证据链判定：用例生成检查→有效用例收集→覆盖达标→执行达标→证据完整→报告校验）→ **Archive**（核对完成条件、证据迁入归档区，稳定经验经人工确认后沉淀为项目知识）。
- 证据一致性纪律：实现经评审后再次变更时，归档须识别变化；不重新评审可记录人工确认，但**不能把变化后的内容标记为已评审**——验证对象必须与交付对象一致。
- 九个命令（位于 Codex/Claude Code 对话界面，非 Shell 可执行程序）：`/helix:init` `propose` `apply` `archive` `bug-fix` `ut` `update` `status` `config`；`--loop` 串联三阶段，遇人工决策或真实阻断暂停，可按需求名续跑。
- 任务恢复：工件落盘于 `docs/specs/active|completed`、`docs/harness/knowledge`、`eval/`，不依赖对话记忆，换会话可凭磁盘上的工作流状态、Spec、验证证据恢复。
- 上下文按需加载：`docs/harness/index.md` + `docs/knowledge/index.md` 三列索引（文件/定位/加载时机）决定读取内容；Propose/Apply/Archive 各阶段加载策略不同；未登记文件不允许绕过索引猜测读取（`loading-protocol.md`）。规则驱动的上下文选择，非向量检索；依赖索引完整性。
- Workspace 多仓协调：`/helix:init --workspace --repos ./api-service ./web-console`，各仓保留独立 Spec 与验证依据。
- Platform 评测：Base/Candidate 对比，冻结框架版本与场景，独立执行环境；真实评测条件含可复现 Git 提交、已发布且校准的 Case、模型配置、独立 Worker；Token 预算仅记录，默认不作为中断上限（超时/工具调用/磁盘预算独立控制）。
- 自进化：平台形成改进假设、生成隔离候选修改并进入版本评测，**采纳由人决定**；Demo 为合成数据与 Mock 执行，不能据此认定真实质量提升比例。
- 与 Superpowers（研发 Skills 与方法）、OpenSpec（规范驱动变更）定位不同、不互斥：Skills 管方法、Spec 管变更一致性、Harness 管工作流状态/证据门禁/持续评测。

## Products / Projects（产品／项目）

- [HelixHarness 仓库](https://github.com/didi/helixharness)（`helixharness/` 插件 + `helixharness-platform/` 平台）

## Relationships（关系）

- [[harness-engineering|Harness Engineering]]：HelixHarness 是该概念下"项目级 Harness"的落地实例，其三阶段工作流为"执行循环/质量检查"观察面提供具体实现。
- [[artifact-verification-delivery|产物核验与独立交付]]：Apply 阶段"执行≠完成"、以证据链判定与证据一致性管理与之同调。
- [[durable-execution|持久执行（Durable Execution）]]：工件落盘、换会话凭磁盘状态恢复是任务恢复机制的实例。
- [[context-management|上下文管理]]：索引式按需加载是规则驱动的上下文选择实践。
- [[deepseek-harness|DeepSeek Harness]]、[[ep-harness|EP-Harness]]：同为 Harness 类产品实例。

## Timeline（时间线）

- 2026-11-20 — 采集：微信公众号开源项目技术解读文章（本信源）。滴滴开源 HelixHarness，提供九命令、三阶段工作流与配套平台。

## Current Understanding（当前认知）

公开资料支持的结论：HelixHarness 定义并提供了框架观测、受控评测与候选改进的工程路径，三阶段工作流与证据门禁设计完整。**不能**据此认定其已在真实企业场景中取得具体比例的质量提升（Demo 为合成数据，原文明确声明）。本文为项目解读文章，依据为官方 README、使用指南与加载协议，非项目源码级验证。

## Evidence（证据）

- `raw/sources/ai/2026-11-20-helixharness-ai-coding.md`（微信开源项目技术解读，含九命令表、三阶段工作流、Platform 评测与对比表）
