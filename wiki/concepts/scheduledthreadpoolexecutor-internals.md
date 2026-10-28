---
id: wiki-concept-scheduledthreadpoolexecutor-internals
type: concept
title: ScheduledThreadPoolExecutor 调度设计（最小堆延迟队列 + Leader-Follower）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: medium
tags:
  - concept
  - java
  - jdk
  - concurrency
  - juc
sources:
  - raw/sources/misc/2026-10-27-jdk-16-scheduledthreadpool.md
related:
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/concepts/reentrantlock-internals.md
  - wiki/concepts/priorityqueue-internals.md
  - wiki/concepts/futuretask-internals.md
  - wiki/sources/jdk-16-scheduledthreadpool.md
---
# ScheduledThreadPoolExecutor 调度设计（最小堆延迟队列 + Leader-Follower）

## Definition（定义）

JUC 的定时/周期任务调度线程池：继承 ThreadPoolExecutor，不改其执行模型，仅通过两处替换获得调度能力——任务包装为带触发时间的 ScheduledFutureTask，workQueue 固定为内部 DelayedWorkQueue（数组最小堆，按触发时间排序）；周期任务执行成功后重设下次触发时间并重新入队。

## Why It Matters（为什么重要）

它是 Java 定时任务的第一选择（信源论断：比 Timer 多线程/纳秒精度/异常隔离，比 Quartz 轻量）；其「延迟队列 + 触发时间重排」模型是心跳、轮询、定期同步等场景的标准底座，也是「组合优于改造」的设计样本。

## Core Characteristics（核心特征）

1. 构造约束：maximumPoolSize 固定 Integer.MAX_VALUE，workQueue 强制 DelayedWorkQueue（无界），只开放 corePoolSize/threadFactory。
2. DelayedWorkQueue：初始 16 的数组最小堆，按触发时间升序；ReentrantLock + Condition（available）保护；与 PriorityQueue 同为数组堆但阻塞化。
3. Leader-Follower 等待：take() 中仅 leader 对堆顶任务 awaitNanos(delay)，follower 无条件 await；leader 取走后 signal 继任者，避免全部线程争抢定时唤醒。
4. period 符号编码语义：fixedRate 存正 period（`time += p`，按上次触发时间累加，执行超周期会追尾堆积并 catch up 补跑）；fixedDelay 存负 period（`time = triggerTime(-p)`，按执行完的当前时间算，不重叠）。
5. 周期执行闭环：run() → runAndReset() 成功 → setNextRunTime() → reExecutePeriodic() 重新入队；失败（含异常）则任务终结。
6. 异常吞噬坑：周期任务未捕获异常 → runAndReset 返回 false → 静默取消且无日志，必须任务体内 try-catch。

## How It Works（运作方式）

schedule(scheduleAtFixedRate/scheduleWithFixedDelay) → 包装为 ScheduledFutureTask（triggerTime ± period）→ delayedExecute 入堆并 ensurePrestart → Worker take()：堆顶到期则 finishPoll 取出执行；未到期则 leader awaitNanos、follower await → 非周期任务 run 完即结束；周期任务 runAndReset 成功后重设 time 再入堆等待下一轮。

## Relationships（关系）

### Related Concepts（相关概念）

- [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]（derived-from：继承其 Worker/execute 执行模型，仅换队列与任务包装）
- [[reentrantlock-internals|ReentrantLock 可重入锁设计]]（depends-on：DelayedWorkQueue 用 ReentrantLock + Condition available 做精准唤醒）
- [[priorityqueue-internals|PriorityQueue 二叉堆设计]]（related：同为数组承载最小堆，DelayedWorkQueue 是其阻塞化、定时化变体）

### Distinctions（区分）

- 与 Timer 的不同之处：STPE 多线程、纳秒级、支持 Runnable+Callable、单任务异常不影响全局；Timer 单线程、毫秒级、依赖系统时间、一个异常整个挂掉（信源对比表）。
- fixedRate vs fixedDelay：前者按触发时间累加（可能重叠/堆积补跑），后者按执行完时间顺延（天然串行）；源码差异仅 period 正/负号。

## Evolution（演进）

单信源（公众号源码解读）；JDK 1.5 随 JUC 引入（信源未展开版本史，标注为推断）。

## Open Questions（开放问题）

- shutdown 后对未到期延迟任务的策略开关（executeExistingDelayedTasksAfterShutdown 等）细节当前信源未覆盖（未知）。
- 大规模周期任务下 DelayedWorkQueue 堆操作的开销量级（无信源数据）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-16-scheduledthreadpool.md`

## Related Knowledge（相关知识）

- [[jdk-16-scheduledthreadpool|ScheduledThreadPoolExecutor 源码篇（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
