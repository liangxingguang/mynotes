---
id: wiki-source-jdk-16-scheduledthreadpool
type: source
title: 深度剖析 ScheduledThreadPoolExecutor——JDK 定时任务调度引擎
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - jdk
  - concurrency
  - juc
sources:
  - raw/sources/misc/2026-10-27-jdk-16-scheduledthreadpool.md
related:
  - wiki/concepts/scheduledthreadpoolexecutor-internals.md
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/sources/jdk-14-threadpoolexecutor.md
  - wiki/sources/jdk-source-reading-album.md
---
# 深度剖析 ScheduledThreadPoolExecutor——JDK 定时任务调度引擎

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列篇目（JUC 并发线），拆解 ScheduledThreadPoolExecutor（STPE）：在 ThreadPoolExecutor 之上几乎零改动地获得定时调度——任务包装为带触发时间的 ScheduledFutureTask，workQueue 强制为内部 DelayedWorkQueue（数组最小堆，按触发时间排序），take() 用 Leader-Follower 模式等待，周期任务 runAndReset 成功后 setNextRunTime 并重新入队。附与 Timer / TPE 对比表及 fixedRate vs fixedDelay 辨析。

## Key Facts（关键事实）

- 构造固定 `maximumPoolSize = Integer.MAX_VALUE`、keepAlive 默认 10ms、workQueue 强制为内部 DelayedWorkQueue（不允许传入其他队列）；corePoolSize 由用户指定。
- DelayedWorkQueue：初始容量 16 的数组实现最小堆，按触发时间排序；内部用 ReentrantLock + Condition（available）保证线程安全；无界。
- take() 采 Leader-Follower 模式：仅 leader 线程对最早到期任务 `awaitNanos(delay)`，其余 follower 无条件 `await()`；leader 取走任务后 signal 唤醒一个 follower 继任——减少多线程争抢。
- schedule 系方法把任务包装为 ScheduledFutureTask（带 triggerTime），delayedExecute 入队后 `ensurePrestart()` 确保至少一个 Worker；shutdown 后按 canRunInCurrentRunState 决定取消。
- fixedRate 与 fixedDelay 的唯一区别是 period 正/负号：fixedRate（p>0）`time += p` 按上次触发时间累加——任务执行超周期会"追尾"堆积并集中补跑（catch up）；fixedDelay（p<0）`time = triggerTime(-p)` 按执行完的当前时间算——不重叠。
- 周期任务 run()：`runAndReset()` 成功才 `setNextRunTime()` + `reExecutePeriodic(outerTask)` 重新入队。
- 经典坑：周期任务未捕获异常时 runAndReset 返回 false，任务被静默取消且无日志，必须任务体内 try-catch。
- 对比 Timer：STPE 多线程、纳秒精度、支持 Callable、单任务异常不拖垮全局；Timer 单线程、毫秒级、一个异常全挂——信源结论"新代码一律用 STPE，90% 定时场景够用"。

## Important Claims（重要论断）

### 对 TPE 改动几乎为零，却获得完整定时调度能力

信源核心解读：STPE 没有改造 TPE 的执行模型（仍是 Worker 从队列取任务），只在任务包装（ScheduledFutureTask 带触发时间）与队列（DelayedWorkQueue 最小堆排序）上做文章，周期任务执行完重新设时间入队。

### 周期任务异常吞噬是最经典的坑

`scheduleAtFixedRate`/`scheduleWithFixedDelay` 任务体内未捕获的异常不打印日志，且该任务此后永不执行；必须内部 try-catch。fixedRate 的另一个坑是 DelayedWorkQueue 无界 + catch up：任务执行慢于周期时堆积后集中补跑，应改用 fixedDelay 规避。

## Concepts Introduced（引入的概念）

- [[scheduledthreadpoolexecutor-internals|ScheduledThreadPoolExecutor 调度设计（最小堆延迟队列 + Leader-Follower）]]

## Entities Mentioned（提及的实体）

- JDK（java.util.concurrent：ScheduledThreadPoolExecutor/DelayedWorkQueue/ScheduledFutureTask；java.util.Timer）

## Implications（影响／启示）

- Leader-Follower 是「多线程等待单一事件源」的通用降竞争模式，与 TPE Worker 锁的不可重入设计同属 JDK 并发细节手法谱系（解读）。
- 「period 正/负号编码两种调度语义」是极简接口设计的样本：一个符号位承载 fixedRate/fixedDelay 分叉（解读）。

## Limitations（局限）

- 单一公众号信源；decorateTask 钩子、shutdown 时对未到期延迟任务的处理细节（`getExecuteExistingDelayedTasksAfterShutdownPolicy` 等）未展开。
- "比 Quartz 轻量、比 ElasticJob 简单，90% 场景够用"为经验论断，无对比数据。

## Related Knowledge（相关知识）

- [[jdk-14-threadpoolexecutor|ThreadPoolExecutor 源码篇（信源页）]]（STPE 的父类与执行模型底座）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-16-scheduledthreadpool.md`
