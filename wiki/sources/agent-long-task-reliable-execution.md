---
id: wiki-source-agent-long-task-reliable-execution
type: source
title: AI Agent 长任务可靠执行：Go + PostgreSQL 状态机、Checkpoint、Fencing 与可对账副作用
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - ai
  - agent
  - durable-execution
  - go
sources:
  - raw/sources/ai/2026-10-21-agent-long-task-reliable-execution.md
related:
  - wiki/concepts/durable-execution.md
  - wiki/concepts/agent-loop.md
  - wiki/sources/spring-async-to-task-table.md
---
# AI Agent 长任务可靠执行：Go + PostgreSQL 状态机、Checkpoint、Fencing 与可对账副作用

## Overview（概览）

硬核工程长文：把 Agent 长任务（数分钟到数天、等审批/定时器/外部恢复）从"进程内 for 循环"重建为 PostgreSQL 上的持久化工作流——状态机 + 租约/fencing 竞争执行权 + 原子 checkpoint + 出网意图三段式 + Outbox + 对账，附 K8s 故障验收矩阵与上线清单。

## Key Facts（关键事实）

- 根因诊断：丢进度不是 Go 协程不可靠，而是把**工作流进度和执行权隐式绑定到了进程生命周期**；K8s 维持期望副本数，不承诺某次内存循环持续存在。职责划分：调度器管短暂执行权、持久化 Workflow 管可恢复历史、Agent 决策器只提下一步、工具适配器在审计/授权/幂等边界内执行副作用。
- 状态机：QUEUED → RUNNING ⇄（checkpoint/heartbeat 自循环）→ WAITING_TOOL → RUNNING → COMPLETED；异常路径：可重试错误+backoff 回 QUEUED、审批/预算拦截进 PAUSED_HUMAN、结果未知进 PAUSED_INDOUBT、不可恢复进 FAILED。
- 六条不变量：① 仅 RUNNING/WAITING_TOOL 持 lease；② 每次推进校验 (run_id, lease_owner, fencing_token, version)；③ 出网前先持久化稳定幂等键+请求快照；④ OUTBOUND_INTENT ≠ 已发送，未证明结果默认不自动重发；⑤ 工具结果+checkpoint+状态+事件同一事务提交；⑥ 已确定的 LLM 决策必须持久化，恢复时不得重新采样。
- 所有时间判断用 PostgreSQL `clock_timestamp()` 而非 Worker 本地时钟；外部请求绝不能在持有任务行锁的事务中发出。
- Claim/Heartbeat：Worker 经条件 UPDATE 竞争执行权并获递增 fencing_token；旧 Worker 苏醒后用旧 fence 做 CAS 写入 → 0 rows / ErrLostLease。**Fencing 是受控存储写入的必要保护，但不是外部副作用的充分保护**——旧 Worker 可能在接管后才发出早已准备好的请求；保护下游需：下游验证单调 fence / 按业务幂等键持久去重 / 可按幂等键查询结果 / 否则保守冻结+人工审核。
- 工具副作用三段式：Tx1（确认 lease/fence、写 OUTBOUND_INTENT、commit）→ HTTP（稳定 idempotency key）→ Tx2（工具结果+checkpoint+outbox 原子提交）；超时/断线/崩溃标 IN_DOUBT 并释放 lease。
- 提交结果未知的恢复：用同一个 event_id 查询——checkpoint 与 event 都在视为已提交；都不在才可用**同一输入**重试；只存其一触发一致性告警并冻结 Run，绝不重新生成 event ID（那会破坏可判定性）。
- LLM 可复现边界：模型不必确定，但外部副作用前的业务决策必须可重放——checkpoint 持久化决策原文+JSON Schema 校验、工具名/参数 hash/step key、模型/提示词/工具 schema 版本、上下文 hash、Token 与预算。
- 错误分类表：可确定无副作用→重试；可重试暂态→QUEUED+指数退避+jitter（`min(base*2^attempt, cap)+bounded_jitter` 写入 next_attempt_at）；结果未知→PAUSED_INDOUBT 先对账；永久失败→FAILED/PAUSED_HUMAN；attempt_count 达上限转人工，不允许无限循环。
- Outbox：业务事务内插 outbox，Relay 发出后标 published_at；ACK 后崩溃会重复发布，故消费者必须幂等（本地事务先插 consumed_events，唯一键冲突即已处理）。
- 选型：自建 Go+PG vs Temporal vs DBOS——**不存在"超过 30 分钟就必须用 Temporal"的普适阈值**；即使选成熟引擎，支付/退款/邮件/库存等外部副作用仍需业务幂等与对账。

## Important Claims（重要论断）

### Claim 1：可靠 Agent Runtime 的本质不是永不失败，而是让失败成为数据库可识别、可审计、可恢复的状态

PG 保证本地事务边界、Fencing 拒绝旧 Worker 写受控状态、Checkpoint 恢复已提交进度、Outbox 保存待发事件——但没有任何一个能单独证明外部调用的 exactly-once；面对结果未知，系统应诚实选择：下游幂等、查询式对账或人工介入。

## Concepts Introduced（引入的概念）

- OUTBOUND_INTENT / Tx1-出网-Tx2 三段式、PAUSED_INDOUBT 冻结对账（[[durable-execution]] 的数据库队列实现形态，并入该概念页）

## Entities Mentioned（提及的实体）

- Temporal / DBOS（持久执行框架，提及未立页）

## Implications（影响／启示）

- "任何'旧 Worker 不能写库所以不会造成外部重复'的说法都是错误的"——fencing 认知误区的明确纠正，可直接进评审清单（解读）。
- 上线清单（不变量测试/并发 Claim/旧 fence/ACK 后崩溃/schema 滚动升级等九项）可直接复用为长任务系统验收模板（解读）。

## Limitations（局限）

- 方案重：完整落地需要状态机+DDL 约束+对账器+Outbox Relay，小任务场景杀鸡用牛刀（信源自建/Temporal/DBOS 选型表亦承认）。
- 代码为核心片段示意，非完整可运行实现。

## Related Knowledge（相关知识）

- [[durable-execution|持久执行]]（本信源是该概念在 Go+PG 技术栈的完整工程化，第三信源）
- [[spring-async-to-task-table|任务表 + Worker（信源页）]]（Java 版的同构简化方案：条件 UPDATE 抢占、心跳回收、at-least-once+幂等）
- [[agent-loop|Agent Loop]]（被持久化的正是 Loop 的推进状态）

## Source（信源）

- `raw/sources/ai/2026-10-21-agent-long-task-reliable-execution.md`
