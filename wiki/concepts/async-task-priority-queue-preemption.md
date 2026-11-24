---
id: wiki-concept-async-task-priority-queue-preemption
type: concept
title: 异步任务优先级队列与抢占式执行
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - concept
  - java
  - 系统设计
  - 异步任务
  - 并发
sources:
  - raw/sources/architecture/2026-11-24-weixin-async-priority-queue-preemptive.md
related:
  - wiki/concepts/priorityblockingqueue-internals.md
  - wiki/concepts/retry-governance.md
  - wiki/sources/2026-11-24-weixin-async-priority-queue-preemptive.md
---
# 异步任务优先级队列与抢占式执行

## Definition（定义）

一套保障异步任务 SLA 的设计范式：用**优先级队列**让高优先任务先出，用**抢占式执行**打断正在运行的低优任务，用**优先级调度**（提升/衰减/继承）防饥饿与抢占过度，用**资源隔离**按优先级分线程池，四层配合解决"紧急任务被阻塞、低优任务占资源"的问题。

## Why It Matters（为什么重要）

订单、推送、报表等异步任务按提交顺序执行时，突发的紧急任务只能排队等待，SLA 完全无保障；而单纯加线程池只提高并发，不改变"谁先执行"的决策。该范式把"执行顺序"与"可抢占性"显式建模，使核心业务在并发压力下仍能获得可量化的响应保障。

## Core Characteristics（核心特征）

1. **优先级队列**：任务按优先级出队（`PriorityBlockingQueue` 或自定义队列，见[[priorityblockingqueue-internals|PriorityBlockingQueue 内部机制]]），支持运行中动态调整优先级。
2. **抢占式执行**：高优任务到来时中断正在运行的低优任务；前提是任务**可中断 + 有检查点**，否则低优任务从头重来，抢占收益被抵消。
3. **优先级调度**：定时按等待时间提升优先级（等 60s 升 1 级，防饥饿等 120s 升 2 级）；待执行队列出现优先级 >8 的任务且运行中有 <5 的低优任务时触发抢占。
4. **资源隔离**：按优先级分线程池，高优池不受低优任务挤占——性能数据表明这是高优响应数量级改善的主要来源。

## Structure（结构）

典型实现由四层组成（教学骨架见信源页）：

- **模型层**：`PriorityTask`（Comparable，先比优先级再比创建时间，字段含 taskId/priority/createTime/timeout/status）。
- **队列层**：`PriorityTaskQueueService`，六态状态机（PENDING/RUNNING/COMPLETED/FAILED/INTERRUPTED/TIMEOUT），维护 allTasks/runningTasks 两个映射。
- **执行层**：`PreemptiveTaskExecutorService`，线程循环取任务；`taskThreads` 记录任务-线程映射，`preemptTask` 调 interrupt；任务实现 `InterruptibleTask`（`executeWithInterruption` + `checkInterruption()`）。
- **调度与监控层**：`PrioritySchedulerService`（提级/抢占两个定时任务）、`TaskMonitorService`（队列/运行数/失败数阈值告警）。

## How It Works（运作方式）

1. **提交**：任务入优先级队列，状态 PENDING；调度器按业务分级建议赋初始优先级（支付 10 / 订单 8 / 通知 6 / 报表 4 / 归档 2）。
2. **执行**：执行线程循环取队首任务运行，记录任务-线程映射供抢占定位。
3. **提级防饥饿**：定时器扫描等待中任务，按等待时长升优先级，避免低优任务长期饿死。
4. **抢占**：触发条件为"待执行队列有优先级 >8 任务且运行中有 <5 的低优任务"；用智能抢占抑制抖动——优先级差 >8，或差 >5 且已运行 10s 才 interrupt。
5. **续跑**：被中断任务经检查点（CheckpointTask）与状态保存（StatefulTask）恢复，从断点继续而非重头执行。
6. **衰减与防占用**：等 5 分钟未执行降 1 级，防止提级后长期占用资源。

## Relationships（关系）

### Related Concepts（相关概念）

- [[priorityblockingqueue-internals|PriorityBlockingQueue 内部机制]]：JDK 优先级队列的底层实现，本范式的队列层基础。
- [[retry-governance|重试与容错治理]]：FAILED/TIMEOUT 状态机、监控告警与重试策略互为补充。

### Distinctions（区分）

- 与[[async-task-system-design|异步任务系统怎么设计]]的区分：后者覆盖异步任务全链路（提交、排队、执行、幂等、重试），本概念聚焦其中的**执行顺序决策**——优先级出队与运行中抢占，是其上的一个子域。

- 与[[delayqueue-internals|延迟队列]]的区分：延迟队列解决"什么时候执行"（按延迟时间出队），本范式解决"谁先执行、能否插队"（按优先级出队 + 运行中抢占），二者可组合使用。
- 与[[scheduledthreadpoolexecutor-internals|ScheduledThreadPoolExecutor]]的区分：后者是定时/延迟执行的引擎，本范式关注执行顺序与抢占决策，调度器层可借助前者实现。

## Evolution（演进）

- 从"单一线程池 + 顺序执行"（无优先级概念）→ 引入优先级队列（可排序、不可抢占）→ 引入线程中断 + 检查点（可抢占、可续跑）→ 引入定时调度与资源隔离（防饥饿、保 SLA）。
- 性能参照（文章自报，4 核 8G、1 万并发、10%/30%/60% 高/中/低优）：高优平均响应 5000ms→150ms，P95 10s→300ms；吞吐 2000/s→1600/s（代价）。

## Open Questions（开放问题）

- 性能数据为单篇自报、无复现路径，外推需谨慎。
- 教学骨架未覆盖分布式多实例：跨节点优先级同步、队列分片下的抢占一致性均未讨论。
- 智能抢占阈值（差 >8 / 差 >5 且 10s）为经验值，缺乏按业务调参的方法论。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-24-weixin-async-priority-queue-preemptive.md`（系统设计类公众号文章，无第一方验证）

## Related Knowledge（相关知识）

- [[priorityblockingqueue-internals|PriorityBlockingQueue 内部机制]]
- [[retry-governance|重试与容错治理]]
- [[2026-11-24-weixin-async-priority-queue-preemptive|异步任务优先级队列 + 抢占式执行（信源页）]]
