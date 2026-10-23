---
id: wiki-source-spring-async-to-task-table
type: source
title: @Async 扛不住长任务？用任务表 + Worker 把它管起来
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - java
  - spring
  - async-task
sources:
  - raw/sources/architecture/2026-10-20-spring-async-to-task-table.md
related:
  - wiki/concepts/durable-execution.md
  - wiki/sources/completablefuture-async-orchestration.md
  - wiki/sources/async-task-system-design.md
---
# @Async 扛不住长任务？用任务表 + Worker 把它管起来

## Overview（概览）

公众号文章：从一个 @Async 跑分钟级报表任务失败的事故切入，给出「任务表 + 后台 Worker」的完整工程方案——任务落库成为业务对象，Worker 竞争认领、心跳保活、崩溃回收、协作式取消，并划清 @Async 与任务表的适用边界。

## Key Facts（关键事实）

- 任务状态机：WAITING → PROCESSING → SUCCESS/FAILED，取消路径增加 CANCEL_REQUESTED → CANCELLED。
- 提交侧：Controller 在一个 `@Transactional` 内写业务数据 + 任务记录，立即返回 taskId——「先落库再返回」，用户拿到 taskId 时任务必然存在。
- 认领侧：`@Scheduled(fixedDelay=1000)` 扫描 WAITING；多实例竞争用条件 UPDATE 抢占：`SET status='PROCESSING', worker=? WHERE id=? AND status='WAITING'`，以受影响行数判定是否抢到（无需分布式锁）。
- 崩溃恢复：Worker 每 30s 更新 heartbeat_time；Recovery Job 发现心跳超时且仍为 PROCESSING 的任务即重置回 WAITING 重新入队。
- 语义：at-least-once 执行 + 幂等消费兜底——固定 taskNo 路径幂等写、task_id 加唯一约束防重复产出。
- 取消：置 CANCEL_REQUESTED 标志位，Worker 在安全检查点轮询并协作式退出，不是强杀线程。
- 调度优先级：`ORDER BY priority DESC, created_at` 取任务。
- 边界划分：秒级 fire-and-forget 用 @Async 足够；分钟级长任务、需要进度/重试/多实例/取消时才上任务表。

## Important Claims（重要论断）

### Claim 1：长任务的本质是把「执行」变成「业务对象」

任务一旦落库，就有了状态、可见性、可重试性和可运维性——这是 @Async 内存模型给不了的。先写存储后可见、至少一次执行 + 幂等消费、心跳 + 超时回收，三件事凑齐才谈得上可靠（解读：与 [[durable-execution]] 的持久执行三要素同构，一个是数据库队列版，一个是 Agent 运行时版）。

## Concepts Introduced（引入的概念）

- 任务表 + Worker 模式（数据库队列版的持久执行；单信源方案文，未立概念页）

## Entities Mentioned（提及的实体）

- Spring @Async / @Scheduled（框架特性，未立页）

## Implications（影响／启示）

- 「先写存储、再对用户可见」的提交顺序可直接复用到任何异步任务系统的设计评审清单（解读）。
- 条件 UPDATE 抢占替代分布式锁，是单数据库场景下更简单的多实例协调手段（解读）。

## Limitations（局限）

- 方案面向单库单应用场景；秒级高吞吐队列（万级 QPS）任务表会成为瓶颈，需专业 MQ。
- 心跳 30s + fixedDelay 1s 的参数是示例值，生产需按任务时长分布调整。

## Related Knowledge（相关知识）

- [[durable-execution|持久执行（Durable Execution）]]（Agent 运行时版的同一套可靠性三要素）
- [[completablefuture-async-orchestration|CompletableFuture 异步编排（信源页）]]（进程内异步的另一极）
- [[async-task-system-design|异步任务系统设计（信源页）]]（同一任务表路线的生产级完整版：租约/错误分级/协作取消/背压）

## Source（信源）

- `raw/sources/architecture/2026-10-20-spring-async-to-task-table.md`
