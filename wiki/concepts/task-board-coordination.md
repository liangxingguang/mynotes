---
id: wiki-concept-task-board-coordination
type: concept
title: 任务看板（共享状态协作）
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: medium
tags:
  - concept
  - ai-agent
  - architecture
  - multi-agent
sources:
  - raw/sources/ai/2026-11-05-multi-agent-control-shift.md
related:
  - wiki/topics/multi-agent-collaboration-architecture.md
  - wiki/concepts/advisor-on-demand-consultation.md
  - wiki/concepts/ticket-task-persistence.md
  - wiki/concepts/router-worker-architecture.md
  - wiki/concepts/super-agent.md
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/event-driven-agent.md
---
# 任务看板（共享状态协作）

## Definition（定义）

以共享任务看板为协调介质的多 Agent 协作架构：看板记录待处理任务、负责人、依赖关系、执行状态和产出物，各 Agent 根据自己的能力和当前状态**主动领取**任务，而非等待中心节点点名。调度不再表现为"Master Agent 发出命令"，而表现为"共享状态暴露机会"——这是控制权从中心节点向共享状态下沉的一步。

## Why It Matters（为什么重要）

任务数量与并行度上升后，让中心节点逐个判断"下一步该叫谁"越来越沉重。看板把中心调度的压力转移到状态管理和一致性上，牺牲一部分直观性，换来更好的并行能力、弹性扩展和故障恢复能力；只要任务协议稳定，新增一个 Agent 通常不需要改动一个巨大的路由器。

## Core Characteristics（核心特征）

1. **调度 = 暴露机会**：Agent 按能力与空闲容量自选任务，完成任务后更新看板，新状态使后续任务变为可执行。
2. **任务状态机**：PENDING → CLAIMED → RUNNING → SUCCEEDED；失败进入 FAILED 或 RETRYING。
3. **领取竞争用锁或租约解决**：两个 Agent 同时看到同一任务时，凭锁/租约决定谁能领取。
4. **崩溃回收靠租约到期**：领取任务的 Agent 崩溃后，任务在其租约到期后被回收，由其他 Worker 接手；配合有限重试与幂等提交，只补做未完成批次，避免整轮重跑。
5. **产出经稳定引用传递**：任务产出最好通过稳定的引用传递，而不是把所有内容塞进下一次提示词。
6. **依赖解除**：一个任务完成后，下游依赖随之变为可执行；状态变化需要留下历史记录。

## Structure（结构）

看板记录字段（信源 §3.2）：待处理任务、负责人、依赖关系、执行状态、产出物。

状态流转（信源 §3.2）：

```text
PENDING → CLAIMED → RUNNING → SUCCEEDED
                        ↘ FAILED / RETRYING
```

## How It Works（运作方式）

典型链路（巡检案例，信源 §5）：Inspector Agent 把工作拆成"指标＋目标批次＋时间窗口"的独立任务发布到看板 → 多个 Worker 按能力和空闲容量并行领取 → Worker 调用确定性工具计算后提交精简证据（异常保留明细、正常压缩为汇总，原始时序留在工具层）→ 某 Worker 中途退出时，其已领取任务的租约到期后由其他 Worker 接管，只补做未完成批次 → Inspector 核对任务覆盖范围，区分当前异常、窗口内已恢复、数据不足。

可靠性前提：任务协议（领取/回收/依赖/幂等四项协作协议）稳定；单纯"把任务写进数据库再定时读取"不会自动可靠。

## Relationships（关系）

### Related Concepts（相关概念）

- [[multi-agent-collaboration-architecture]]：本概念是该主题页三种协作架构之一
- [[advisor-on-demand-consultation]]：看板解决"工作怎样被领取"，Advisor 解决"关键判断缺第二意见"
- [[router-worker-architecture]]：看板是 Router/Worker 双层之下、Worker 层内部的并行协调方式
- [[ticket-task-persistence]]：Ticket 是超级 Agent 语境下"工作项持久化"的具体模型；看板是更通用的共享状态协调形态（见 Distinctions）
- [[idempotency-design]]：重复领取/接管场景下"只补做未完成批次"依赖幂等提交
- [[durable-execution]]：租约回收与断点恢复是持久执行的协作层对应物

### Dependencies（依赖项）

- 任务状态机与锁/租约机制
- 幂等提交（[[idempotency-design]]）
- 稳定引用传递产出物

### Distinctions（区分）

- **看板 vs Master Agent**：前者由共享状态暴露机会、Agent 主动领取；后者由中心节点拆解路由、Worker 被动等待指派。
- **看板（通用概念）vs Ticket 任务持久化（具体模型）**：Ticket 把一项工作抽象为跨 Session 持久对象，绑定订阅与 PR 跟踪、任务结束由外部事件驱动；看板聚焦"领取—执行—回收"的协作协议。看板中的任务项可看作 Ticket 的轻量形态，Ticket 可看作看板任务的持久化特化。

## Evolution（演进）

- 2026-11-05 — 新建，信源为得物技术《多 Agent 架构的三次反转》（任务看板一节 + 巡检案例）。与 [[ticket-task-persistence]]（DeepSeek Super-agent 拆解）互证：两者都强调状态机/租约/幂等是可靠性来源。

## Open Questions（开放问题）

- 看板模式在大规模（成百上千并发任务）下的状态管理与一致性成本，信源未量化。
- 任务拆分粒度的判据（"指标＋批次＋时间窗口"之外是否通用），信源只给巡检场景示例。
- 看板与 Ticket 持久化的混合形态（持久任务 + 临时看板）如何设计，当前两信源各自独立，未交叉讨论。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-05-multi-agent-control-shift.md`（§3.2 任务看板：状态机/锁租约/幂等/稳定引用；§5 巡检案例：租约接管自愈、只补做未完成批次）

## Related Knowledge（相关知识）

- [[2026-11-05-weixin-multi-agent-control-shift|多 Agent 架构的三次反转：从中心调度到自驱协作（信源页）]]
- [[multi-agent-collaboration-architecture|多 Agent 协作架构与控制权下沉（主题页）]]
- [[ticket-task-persistence|Ticket 任务持久化模型]]
- [[super-agent|Super-agent]]
