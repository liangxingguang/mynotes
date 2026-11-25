---
id: wiki-source-2026-11-25-agent-architecture-harness-runtime-orchestrator
type: source
title: 一文搞懂 Agent 技术架构：Harness、Runtime、Orchestrator、Framework，到底有什么区别？
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: medium
tags:
  - source
  - ai
  - agent
  - harness
sources:
  - raw/sources/ai/2026-11-25-agent-architecture-harness-runtime-orchestrator.md
related:
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-loop.md
---
# 一文搞懂 Agent 技术架构：Harness、Runtime、Orchestrator、Framework，到底有什么区别？

## Overview（概览）

微信公众号技术科普文。主张用工程模型式划分理解执行型 Agent：先给出总公式 `Agent = Model + Harness + Tools + Memory + Environment`，再逐层拆开 Harness 的七项职责，接着讲 Agent Runtime 的生命周期管理、Execution Loop 的七步拆解，然后以"各回答什么问题"的对照表区分 Harness / Runtime / Orchestrator / Framework 四个常混用概念，用客服投诉案例串起各组件协作，最后给出构建 Harness 的五项基础能力与"会行动→能交付"的判断标准。作者明确声明该划分是便于理解的工程模型，并非业界统一标准定义。

## Key Facts（关键事实）

- 总公式：`Agent = Model + Harness + Tools + Memory + Environment`，五组件分工表（Model 理解输入/推理/提出行动建议；Harness 组织模型与执行过程、管理反馈/状态/权限/验证；Tools 提供对外部系统的行动或读取能力；Memory 保存任务状态或后续可能需要的信息；Environment 提供实际运行空间与资源边界）。
- Harness 七项职责：①上下文构建（并非越长越好，需检索/筛选/摘要/补充查询）；②Agent Loop（准备上下文→调用模型→判断行动→执行工具→接收反馈，但 Loop 本身不保证正确，也不提供权限/持久化/验证）；③工具路由与执行（校验参数、处理超时报错；读操作与写操作风险不同，高风险需审批）；④状态与 Memory（长任务需持久化关键状态）；⑤权限与环境控制（最小权限、沙箱、凭证隔离；提示词无法强制阻止 API 调用，限制须由执行系统落实）；⑥结果观察与验证（依据应来自实际执行结果或权威系统，而非模型自述）；⑦失败处理与停止条件（区分失败类型，副作用操作不能无限重试，需幂等键；达到验收条件才能报告完成）。
- Runtime 可能提供：会话/进程的创建调度销毁、工作目录/容器等隔离环境、工具/模型/凭证接入、任务状态/检查点/恢复、资源限制/并发控制/运行日志；不同产品对 Runtime 范围定义不一致，与 Harness 可能交叠甚至同属一个服务。
- Execution Loop 七步拆解：Context 准备 → Reason 推理 → Act 检查并执行 → Observe 读取反馈 → Update 更新状态 → Verify/Recover 验证与恢复 → Finish 按完成条件结束；作者强调这不是要求七个独立模块，而是检查执行链条缺口的分析框架。
- 四概念对照：Harness 回答"当前 Agent 怎样在约束下执行并验证任务"；Runtime 回答"Agent 在哪里运行、如何管理运行状态和生命周期"；Orchestrator 回答"多个步骤、任务或 Agent 如何协作"；Framework/SDK 回答"开发者用什么接口和组件构建 Agent"。四者非互斥，选型应看实际功能而非产品名。
- Orchestrator ≠ Agent Loop：Loop 描述单个 Agent 内部"推理—行动—反馈"的反复过程；Orchestrator 处理任务步骤或多个执行者之间的调度；简单任务可能只需一个 Loop，跨服务/跨 Agent/带审批的长任务才更需要编排机制。
- 客服投诉案例：Orchestrator 安排查订单物流与审批分流、Runtime 提供环境与工具接入、Harness 组织上下文与权限检查、Model 决策、Tools 实际读写系统、Memory 保存进度、Environment 限制权限；超时按策略重试、超授权范围暂停走审批、最终重新查询确认操作落地。
- 构建 Harness 的五件事：可靠性（状态可恢复、副作用幂等）、安全性（最小权限+审批）、可观测性（步骤/调用/错误可追踪）、可评估性（真实样例+验收标准）、可运营性（失败监控、人工接管、可暂停回滚）。
- 判断标准：Agent 真正能交付 = 在明确权限规则内执行、根据真实结果更新状态、能处理失败、用可检查的证据确认任务完成。

## Important Claims（重要主张）

- "工具接通不代表调用就一定安全、可靠"——参数校验、权限检查、超时处理和结果解析仍须由系统负责（与 [[harness-engineering|Harness Engineering]] 权限/验证观察面互证）。
- "自然语言规则无法强制阻止 API 调用"——涉及高风险操作时限制应由执行系统落实，不能只寄希望于模型遵守提示（解读：该主张与本库 [[agent-permission-model]]、[[agent-sandboxing|Agent 沙箱隔离]] 的边界口径一致）。
- "Loop 本身不保证行动正确，也不自动提供权限、持久化和结果验证"——Harness 要为 Loop 准备运行条件并管理每轮行动后果（与 [[agent-loop|Agent Loop]] 的"可靠 Loop 五条边界"互证）。
- "模型提出了工具调用，不代表系统就应该无条件执行"——读/写操作风险分层，高风险需审批或二次确认。
- "达到验收条件才能报告完成"，无法继续时应说明阻塞，而不是把部分完成描述成全部完成（与 [[artifact-verification-delivery|产物核验与独立交付]] 一致）。

## Concepts Introduced（引入概念）

- [[harness-engineering|Harness Engineering]]（本页为其提供五组件公式、七职责清单、构建五能力等教学化表述）
- [[agent-loop|Agent Loop]] 与 Execution Loop 七步拆解
- Runtime（运行环境与生命周期管理）
- Orchestrator（跨步骤/跨执行者调度，与 Agent Loop 区分）
- Framework / SDK（开发者构建接口）
- Memory 与 Context 的区分（Memory=跨步骤/跨会话保留；Context=某轮调用实际看到的输入）

## Entities Mentioned（提及实体）

- 无具体产品/公司实体；Components：Model、Harness、Tools、Memory、Environment、Runtime、Orchestrator、Framework/SDK。

## Implications（启示）

- 选型纪律（解读）：检查实际功能而非产品名——Framework 可含基础 Loop、Runtime 可内置 Harness、Orchestrator 可启动 Runtime，边界随实现而变。
- 建设顺序（解读）：先聚焦五项基础能力（可靠性/安全性/可观测性/可评估性/可运营性），而非一开始追求复杂多 Agent 架构。
- 验证纪律（解读）：验证依据尽量来自实际执行结果或权威系统；记忆可能过时，涉及实时业务状态应重新查询权威系统。

## Limitations（局限）

- 作者自述为"便于理解的工程模型，并非业界统一标准定义"，不同产品会把能力组合在不同层次——概念划分不具规范性。
- 概念性科普文，无实测数据、无源码或产品实现佐证，所有主张均为作者论述；与既有页面的量化信源（如 ZTE、HelixHarness）相比置信度较低。
- 四概念对照表中 Runtime 与 Harness 边界"可能交叠、甚至同属一个服务"，未给出可操作的判定细则。

## Related Knowledge（相关知识）

- [[harness-engineering|Harness Engineering（Agent 执行系统工程）]]
- [[agent-loop|Agent Loop]]
- [[context-management|上下文管理]]（上下文构建职责）
- [[durable-execution|持久执行]]（状态持久化与恢复）
- [[agent-evaluation|业务 Agent 全生命周期评测]]（可评估性）
- [[agent-production-four-layer-model|Agent 生产化四层模型]]（守业务约束须写代码的判断）

## Source（来源）

- [一文搞懂 Agent 技术架构：Harness、Runtime、Orchestrator、Framework，到底有什么区别？](https://mp.weixin.qq.com/s/Tce5C6XrCapOhwq7K0U39w)
