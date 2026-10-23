---
id: wiki-source-async-task-system-design
type: source
title: 异步任务系统怎么设计？从提交、排队、执行到幂等和重试
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - architecture
  - distributed
  - reliability
  - java
sources:
  - raw/sources/architecture/2026-10-22-async-task-system-design.md
related:
  - wiki/concepts/durable-execution.md
  - wiki/concepts/idempotency-design.md
  - wiki/sources/spring-async-to-task-table.md
  - wiki/sources/agent-long-task-reliable-execution.md
  - wiki/sources/async-idempotency-local-message-table.md
---
# 异步任务系统怎么设计？从提交、排队、执行到幂等和重试

## Overview（概览）

以"10 万行 Excel 批量导入"为贯穿案例的系统设计文：论证线程池≠异步任务系统（进程重启任务全丢、用户不知该不该重传），给出可靠异步任务系统的完整构件清单——任务表、状态机、条件更新领取、租约、幂等、错误分级重试、协作式取消、DB/MQ 分工（Outbox）、可观测与背压。

## Key Facts（关键事实）

- 任务即业务数据：任务表字段 task_id/type/payload_location/status/progress/attempt/next_run_at/lease_owner/lease_expire_at/result_location/error_code；大文件写对象存储，任务只存受权限保护的位置+校验值。
- 状态机：PENDING→RUNNING→SUCCEEDED，旁路 RETRY_WAIT→PENDING、FAILED、CANCELLED；`RUNNING→PENDING` 仅"租约过期且确认执行者失联"才允许。
- 领取即条件更新：`UPDATE ... SET status='RUNNING', lease_owner=?, attempt=attempt+1 WHERE task_id=? AND status='PENDING'`，影响行数=1 才算抢到，两实例并发抢同一任务只有一个赢。
- 租约：执行权限时有效、定期续租；完成更新带 owner+version，旧执行者影响行数为 0 无法覆盖新执行者；租约时长须大于心跳抖动又不能拖慢故障恢复。
- 幂等：至少一次执行下重复是常态——批量导入幂等键 `(task_id, row_number)`；报表写确定路径最后原子切换；通知记录通知 ID。**"状态已是 RUNNING"不是幂等保护**。
- 错误三级分类：RETRYABLE（网络/限流/依赖切换，指数退避+抖动+上限）/ PERMANENT（格式/权限/数据不合法，重试无用）/ MANUAL（结果不确定需人工）；超限进 FAILED 或死信，禁止无限重试。
- 进度每 500 行或 2 秒更新一次，只做近似观测不参与正确性；取消是协作协议：置 CANCEL_REQUESTED，Worker 在批次边界检查并清理，**不强杀线程**（会把事务/文件/外部调用留在未知状态）。
- DB 与 MQ 分工：DB 存真相与状态查询，MQ 负责通知削峰；Outbox 模式同事务提交任务+事件，MQ 重复无妨，DB 条件更新定执行权。
- 可观测 8 类指标：各状态任务数与最老年龄、排队 P95/P99、执行时间与成功率、分错误重试次数、租约接管次数、幂等拦截次数、取消响应时间、单租户公平性；积压超水位须限提交/降优先级——**无限接单只会把"立即失败"变成"几小时后失败"**。

## Important Claims（重要论断）

### Claim 1：可靠异步系统的核心不是异步，而是五个"可"

任务状态可追踪、执行权可过期、副作用可去重、失败可分类、积压可控制——线程池只是执行环节的一个零件（信源收尾，全文纲领）。

## Concepts Introduced（引入的概念）

- 与 [[durable-execution|持久执行]] 同构并已并入该概念页（第 4 信源）：租约+fencing、幂等键、冻结/人工分流、Outbox 均与 Agent 长任务 Go+PG 信源逐条对应。

## Entities Mentioned（提及的实体）

（无特定产品实体——通用技术方案）

## Implications（影响／启示）

- 与 [[spring-async-to-task-table]] 互补：那篇解决"@Async 扛不住长任务"的入门迁移，本篇给出生产级完整清单（租约/分级/取消/背压）（解读）。
- MANUAL 错误分级与 Agent 长任务的 PAUSED_HUMAN/PAUSED_INDOUBT 是同一思想：结果不确定时冻结等待人工，而非盲目重试（解读）。

## Limitations（局限）

- 单一作者方案文，无开源实现与生产数据；指标清单为建议性质。

## Related Knowledge（相关知识）

- [[durable-execution|持久执行（概念页）]]
- [[idempotency-design|幂等设计（概念页）]]
- [[spring-async-to-task-table|任务表 + Worker（信源页）]]
- [[agent-long-task-reliable-execution|Agent 长任务可靠执行 Go+PG（信源页）]]
- [[async-idempotency-local-message-table|异步链路幂等实战（信源页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-22-async-task-system-design.md`
