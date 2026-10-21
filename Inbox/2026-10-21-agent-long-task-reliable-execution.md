---
id: 2026-10-21-agent-long-task-reliable-execution
title: AI Agent 长任务可靠执行：Go + PostgreSQL 状态机/Checkpoint/Fencing/对账
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/UpJRHy-PN1iEg1KxHXgTAw
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [AI, 分布式系统, 工程实践]
asset_ref: Assets/2026/10/agent-long-task-reliable-execution.md
wiki_status: pending
---

# AI Agent 长任务可靠执行：状态机、Checkpoint、Fencing 与可对账副作用

> 单进程 Agent Loop 的根因问题：把工作流进度和执行权隐式绑定到进程生命周期。方案=七态状态机（QUEUED/RUNNING/WAITING_TOOL/PAUSED_INDOUBT/PAUSED_HUMAN/终态）+ PostgreSQL 事务协议：Claim 用 SKIP LOCKED+fencing_token 代际递增领取可失效执行权；Checkpoint 主表 version+快照+Outbox 事件同一事务原子提交；工具副作用三段式（Tx1 持久化 OUTBOUND_INTENT→出网→Tx2 结果与进度同事务）；结果未知一律冻结 PAUSED_INDOUBT 走对账，绝不盲目重发。核心认知：Fencing 只挡旧 Worker 写库、挡不住它出网；Outbox 保证至少一次不是 exactly-once；LLM 决策必须先持久化再执行，恢复时不得重新采样工具参数。

## 核心要点

- **六条不变量**：仅 RUNNING/WAITING_TOOL 持 lease（DB CHECK 强制）；每次推进校验 (run_id, lease_owner, fencing_token, version)；出网前先持久化幂等键+请求快照；OUTBOUND_INTENT≠已发送；工具结果+checkpoint+事件必须同事务；LLM 已决决策必须落库
- **version vs fencing_token 不能互换**：version 是 checkpoint CAS 版本，fence 是每次领取递增的执行代际；Heartbeat 必须带 `lease_expires_at > clock_timestamp()` 防旧 Worker"复活"
- **提交结果未知的恢复**：用同一个 event_id 查——checkpoint 和 event 都在=已提交；都不在=同输入重试；只存在一个=告警冻结，绝不重新生成 event ID
- **唯一键冲突≠允许重发**：tool_executions 的 (run_id, step_key)/(tool_name, idempotency_key) 冲突说明账本已存在，应读状态走 Tx2 或对账
- **错误四分类**：可确定无副作用→重试；暂态→QUEUED+指数退避 jitter；结果未知→PAUSED_INDOUBT 先对账；永久失败→FAILED/PAUSED_HUMAN；attempt_count≥max_attempts 必须转人工
- **诚实的边界**：kubectl delete pod --force 只删 API 对象不能证明进程已停；任何"旧 Worker 不能写 PG 所以不会外部重复"的说法都是错的；下游保护只能靠幂等键去重/fence 验证/可查询契约，缺则冻结人工审
- **验收靠故障注入矩阵**：checkpoint 后崩溃、工具响应前崩溃、过期 fence、Outbox ACK 后崩溃等六类实验+证据归档模板，没证据只能称"设计预期"

## 正文

全文（含完整 DDL、Claim/SaveCheckpoint Go 代码、Tx1/Tx2/冻结事务 SQL、验收矩阵与上线清单）见 [[Assets/2026/10/agent-long-task-reliable-execution]]。

## 来源

[AI Agent 长任务可靠执行：基于 Go + PostgreSQL 的状态机、Checkpoint、Fencing 与可对账副作用](https://mp.weixin.qq.com/s/UpJRHy-PN1iEg1KxHXgTAw)

## 附件

- [[Assets/2026/10/agent-long-task-reliable-execution]]
