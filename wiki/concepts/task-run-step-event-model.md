---
id: wiki-concept-task-run-step-event-model
type: concept
title: Task/Run/Step/Event 领域模型
status: active
created: 2026-10-23
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - ai-agent
  - architecture
  - event-sourcing
sources:
  - raw/sources/ai/2026-10-23-agent-software-architecture-task-run-step-event.md
  - raw/sources/ai/2026-10-31-codex-agent-harness-architecture-6.md
related:
  - wiki/concepts/agent-loop.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/agent-state-separation.md
---
# Task/Run/Step/Event 领域模型

## Definition（定义）

Agent Runtime 控制平面的显式领域模型：把"任务"拆为四种各有身份与生命周期的对象——**Task**（业务意图，task_id）、**Run**（对 Task 的一次执行尝试，run_id）、**Step**（Run 内一步可描述的模型/工具活动，step_id）、**Event**（已发生的状态变化事实，event_id，append-only）；状态转移只经有限集合的事件进行，由纯函数投影重建状态，事件追加以版本号做乐观并发控制。

## Why It Matters（为什么重要）

没有领域模型时，系统容易在"任务/请求/执行尝试/工具调用/日志"之间共用同一个 ID，简单 Demo 无害，生产中会导致重复付费、状态错乱、无法取消、审计失败。messages 列表只是模型上下文与协议转录本，回答不了审批状态、调度租约、终止原因、副作用确认——控制状态必须显式建模。

## Core Characteristics（核心特征）

1. **四元分离**：Task ≠ Run（一个 Task 因重试/换模型对应多个独立 Run）；Step ≠ Tool Call（Step 是系统层执行记录，Tool Call 是协议层动作提议，一次模型响应可含多个）；Event ≠ Span（领域事实 vs 性能观测，可关联不合并）。
2. **Command/Event/State 三语义**：命令表达意图、可被拒绝；事件是已被接受记录的事实（过去式命名）；状态由事件投影得出，不绕过事件流直接改状态。
3. **守卫条件与状态图同等重要**：单 active Step、暂停只能在 Step 间、终止态不可再进展、step_id 同 Run 内唯一——守卫阻止非法事件顺序且须有自动化测试。
4. **纯函数投影**：`apply_event(state, event) -> state'` 不调模型/文件/网络，同一合法事件流 replay 必得一致状态。
5. **乐观并发控制**：追加事件携带 `expected_version`，冲突抛 `VersionConflict`；同 ID 同数据去重、同 ID 不同数据报冲突。

## Structure（结构）

Run 为聚合根（执行生命周期的一致性边界，所有 Step 转移经其状态验证与版本控制）；Task 是更长期的目标定义，多个 Run 不共享可变 Step 状态。教学状态机六态：CREATED → RUNNING ⇄ WAITING_APPROVAL → COMPLETED/FAILED/CANCELLED（终止态）。

架构四层分离（反 MegaAgent 模式）：Domain（定义有效状态转移）/ Application Service（响应命令、协调领域与端口）/ Ports & Adapters（模型、工具、存储抽象）/ Infrastructure（数据库、沙箱、MQ）。三条流分清：Control Flow（下一步调什么）、Data Flow（什么进模型/工具）、Event Flow（什么事实改变了状态）。

## How It Works（运作方式）

命令校验后产生事件 → 事件追加进 Event Store（版本检查+原子写入）→ 纯函数投影出新 RunState。Step 失败不必然导致 Run FAILED（可换工具继续）；`COMPLETED` 只表示模型自报完成，不等于业务验证成功（真实系统应接 verification job 产生 TASK_SUCCEEDED/REJECTED）。取消不是瞬时事件：cancel requested → 停止调度 → in-flight 取消/超时/确认 → run cancelled。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-loop|Agent Loop]]：本模型是 Loop 的控制平面化——Loop 解决"循环怎么跑"，本模型解决"运行身份、状态与事实怎么管"。
- [[durable-execution|持久执行（Durable Execution）]]：状态重放 ≠ 重新执行 LLM ≠ Durable Execution；本模型的内存事件仓库只是其演进路径第 1 步。
- [[idempotency-design|幂等设计]]：事件去重 ≠ 工具副作用 exactly-once；后者需 Outbox/幂等键/补偿。

### Dependencies（依赖项）

- 事件稳定序列与无副作用投影函数（重放确定性的前提）

### Distinctions（区分）

- 与 [[durable-execution]] 的区分：状态重放只恢复状态视图、绝不再执行工具；Durable Execution 要求崩溃/重启/跨 Worker 迁移后继续正确推进（租约、Outbox、对账）。
- 与"数据库行+状态字段"简化方案的区分：事件溯源是设计选择而非必备；短任务、无审批、无恢复要求的场景用后者更经济，引入事件溯源应有长任务恢复/审批/审计/复盘等明确收益。

## Evolution（演进）

- 2026-10-23 — 自立：《agent-from-scratch》第 5 章信源登记。单一教学信源，置信度 medium：状态机为教材自定义（非行业标准），生产化路径（持久事件仓库→CAS→Worker 租约→Outbox→checkpoint）尚未经多信源互证；与 Go+PG 长任务信源的生产机制（fencing/outbox/IN_DOUBT 对账）存在教学版↔生产版呼应，待后续信源确认或合并表述。

- 2026-10-31 — 新增生产实践信源 `raw/sources/ai/2026-10-31-codex-agent-harness-architecture-6.md`（第 2 信源）。独立印证本页核心设计动机：会话/任务/执行尝试/外部操作/产物五种身份生命周期不同，仅有一个会话 ID 无法判断迟到结果应由谁接收（执行尝试 A 超时派发 B 后，A 的晚到回包须按派发身份被拒并留拒绝记录）——与本页"Run 即执行尝试、Event 即事实、OCC 版本检查"同构；其"要求版本冲突不能凭最后写入覆盖新要求"印证事件提交时的版本校验。该信源以三态分离（执行/操作/产物核验）补充本页状态机的用户态视角，落成概念页 [[agent-state-separation|Agent 状态分离]]。本页置信度维持 medium：两信源均为实践自述，无第三方基准。

## Open Questions（开放问题）

- 多 active Step 并发（并行 Tool Calls）的聚合模型如何演进（ID 集合管理依赖/取消/并行预算）？
- 多 Agent/子任务委派下"一个 Run 聚合管理多个并行 Step"的边界如何调整？
- 事件 schema 版本化与 Upcaster 的长期兼容策略？

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-23-agent-software-architecture-task-run-step-event.md`（全文：5.2 四元定义、5.3 状态机与守卫、5.4–5.5 命令/事件/纯投影、5.7 OCC 与幂等、5.8 四层与聚合根、5.12–5.13 取舍）
- Source: `raw/sources/ai/2026-10-31-codex-agent-harness-architecture-6.md`（第 2 信源：多身份生命周期、晚到回包拒绝、要求版本冲突）

## Related Knowledge（相关知识）

- [[agent-software-architecture-task-run-step-event|第 5 章：Agent 的软件架构设计（信源页）]]
- [[agent-long-task-reliable-execution|Agent 长任务可靠执行 Go+PG（信源页）]]（生产版同构机制）
- [[agent-loop-production-boundaries|从 Chatbot 到 AI Agent（信源页）]]（任务状态机/终态守卫的生产原型互证）
- [[agent-state-separation|Agent 状态分离]]
- [[codex-agent-harness-architecture-6|Codex 桌面客户端开发（六）：Agent Harness 的架构设计（信源页）]]
