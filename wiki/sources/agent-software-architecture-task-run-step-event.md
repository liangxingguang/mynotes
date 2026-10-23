---
id: wiki-source-agent-software-architecture-task-run-step-event
type: source
title: 第 5 章：Agent 的软件架构设计（Task/Run/Step/Event 领域模型）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - ai-agent
  - architecture
  - event-sourcing
sources:
  - raw/sources/ai/2026-10-23-agent-software-architecture-task-run-step-event.md
related:
  - wiki/concepts/task-run-step-event-model.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/durable-execution.md
---
# 第 5 章：Agent 的软件架构设计（Task/Run/Step/Event 领域模型）

## Overview（概览）

知乎专栏《agent-from-scratch》第 5 章（配套仓库 github.com/apsaras-ai/agent-from-scratch，Python 3.11+ 标准库、离线可复现）。从第 4 章可运行的 `AgentKernel`（Agent Loop）出发，为 Agent 平台设计"控制平面"领域模型：Task/Run/Step/Event 四元分离、Run 状态机与守卫条件、纯函数事件投影、乐观并发控制的内存事件仓库。只实现内存事件流与状态投影，明确不实现分布式可靠执行。

## Key Facts（关键事实）

- 四元各有身份：Task（task_id，业务意图）/ Run（run_id，一次执行尝试）/ Step（step_id，Run 内一步活动）/ Event（event_id，append-only 事实）；Task ≠ Run、Step ≠ Tool Call、Event ≠ Span
- Run 状态机六态：CREATED/RUNNING/WAITING_APPROVAL/COMPLETED/FAILED/CANCELLED（教学定义，非行业标准）；守卫条件与状态图同等重要（单 active Step、暂停只能在 Step 间、终止态不可再进展）
- `COMPLETED` 只表示模型自报完成，不等于业务验证成功——不能以模型自报完成数作为任务成功率的成功次数
- 事件追加携带 `expected_version` 做乐观并发控制（v_expected = v_actual 才允许追加）；同 ID 同数据去重、同 ID 不同数据抛 `EventIdentityConflict`、版本过时抛 `VersionConflict`、非法转移抛 `InvalidTransition`
- `apply_event(state, event) -> state'` 纯函数投影使状态可 replay 重建；教学示例一次算术 Run 共 13 个事件、5 个 Step，`replay == snapshot`
- 实验为"执行完成后事后映射事件"（`capture_kernel_run`），不是执行中实时持久化；进程崩溃无事件可恢复
- 内存 Event Store 用 Python `RLock` 保证单进程线程安全，不保证跨进程/跨主机/崩溃后持久性

## Important Claims（重要论断）

### Claim 1：messages 列表不能替代控制状态

messages 只是模型上下文和协议转录本，回答不了审批状态、调度租约、终止原因、副作用确认等问题；应分离 Task/Run 元数据、Messages/Context、工具执行记录、领域事件、Traces/Metrics、Artifacts 六类数据。

### Claim 2：状态重放 ≠ 重新执行 LLM ≠ Durable Execution

三种"replay"是根本不同的东西。状态重放只恢复状态视图、绝不应再执行工具；Durable Execution Replay 以持久化历史驱动确定性协调并复用历史 Activity 结果。本章只实现第 1 种，不能因 replay 正常就宣称"断点续跑能力"。

### Claim 3：事件去重 ≠ 工具副作用 exactly-once

先调外部 API 再写事件，可能支付成功而事件丢失；先写事件再调工具，可能崩溃后永远未执行。需要 Outbox、Worker Claim、幂等键、结果确认与补偿机制。

### Claim 4：事件溯源是设计选择，不是 Agent 必备

短任务用数据库行+状态字段更经济；引入事件溯源应有明确收益：长任务恢复、复杂审批、执行审计、复现实验、长期追溯"Agent 为什么做了这个决策"。

### Claim 5：反对 MegaAgent 反模式

Domain / Application Service / Ports & Adapters / Infrastructure 四层分离，Run 为聚合根；纯领域函数应能不启动任何模型或工具就完成状态机测试。

## Concepts Introduced（引入的概念）

- [[task-run-step-event-model|Task/Run/Step/Event 领域模型]]

## Entities Mentioned（提及的实体）

- Temporal（Workflows/Activities/Event History，作为 Durable Execution 成熟方案参照，未建页）
- OpenTelemetry（GenAI Agent Span 约定，未建页）
- agent-from-scratch（GitHub 教学仓库 apsaras-ai，未建页）

## Implications（影响／启示）

- 为 Wiki 中 Agent 基础设施线（[[agent-loop]] → [[durable-execution]]）补上中间一层：从"循环能跑"到"控制平面可验证"的领域建模方法，与 Go+PG 长任务信源的状态机/fencing/outbox 形成教学版↔生产版呼应
- 与 [[durable-execution]] 页"Pi Durable 明确不采用事件溯源"形成路线对照：本章给出事件溯源路线的适用边界与成本清单，两信源互补不矛盾
- 升级路径六步（内存事件仓库→持久 append-only→CAS+幂等命令→Worker 租约→Outbox+恢复协调→checkpoint/版本化/回放兼容测试）可作为 Agent Runtime 生产化路线图参照

## Limitations（局限）

- 教学实现：内存事件仓库、单写者 `emit`、串行单 active Step，不具备生产持久化、多租户、强制取消能力（作者明示）
- `run.completed` 事件仍保存结果文本，未做脱敏/引用化（作者自承真实平台应分类、加密、只存引用）
- 状态机为本书自定义，非行业标准；取消缺少 CANCELLING 中间态
- 单一信源（教材专栏），状态定义与分层建议未经多信源互证

## Related Knowledge（相关知识）

- [[agent-loop|Agent Loop]]（第 4 章 AgentKernel 即其实现，本章是其控制平面化）
- [[durable-execution|持久执行（Durable Execution）]]（本章明确自己还不是；5.12 节失败窗口 A–D 与其崩溃恢复语义呼应）
- [[agent-long-task-reliable-execution|Agent 长任务可靠执行 Go+PG（信源页）]]（生产版同构：状态机/乐观并发/Outbox/幂等）
- [[idempotency-design|幂等设计]]（事件去重与副作用幂等的分层呼应）

## Source（信源）

- `raw/sources/ai/2026-10-23-agent-software-architecture-task-run-step-event.md`
