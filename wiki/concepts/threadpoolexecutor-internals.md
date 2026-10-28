---
id: wiki-concept-threadpoolexecutor-internals
type: concept
title: ThreadPoolExecutor 核心设计（ctl 打包 + Worker/AQS + 拒绝策略）
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
  - raw/sources/misc/2026-10-27-jdk-14-threadpoolexecutor.md
related:
  - wiki/concepts/aqs-internals.md
  - wiki/concepts/reentrantlock-internals.md
  - wiki/concepts/scheduledthreadpoolexecutor-internals.md
  - wiki/concepts/futuretask-internals.md
  - wiki/sources/jdk-14-threadpoolexecutor.md
---
# ThreadPoolExecutor 核心设计（ctl 打包 + Worker/AQS + 拒绝策略）

## Definition（定义）

Java 线程池的标准实现（j.u.c，继承 AbstractExecutorService）：用一个 `AtomicInteger ctl`（高 3 位运行状态 + 低 29 位工作线程数）统一管理池状态，execute 按「核心线程→队列→非核心线程→拒绝」四级漏斗接纳任务，Worker 线程封装为 AQS 不可重入锁，空闲线程由 getTask 的 poll/take 超时策略回收。

## Why It Matters（为什么重要）

它是 Java 异步任务执行的底座——Executors 全部快捷方法、ScheduledThreadPoolExecutor 都构建于其上；其「资源复用 + 排队削峰 + 拒绝兜底」模型是面试与生产调参（核心/最大线程数、队列选型、拒绝策略）的共同语言。

## Core Characteristics（核心特征）

1. ctl 单 int 打包：状态与线程数一次 CAS 原子更新，省一把锁；五态 RUNNING(-1)<SHUTDOWN(0)<STOP(1)<TIDYING(2)<TERMINATED(3) 数值有序，`c < SHUTDOWN` 即判运行中。
2. execute 四级漏斗：未满 corePoolSize 直接建 Worker（即使有空闲核心线程）→ 入 workQueue（含 shutdown 二次检查回滚）→ 队列满建非核心线程至 maxPoolSize → 超则走 RejectedExecutionHandler。
3. Worker 继承 AQS 实现不可重入独占锁（state 0=空闲/1=占用，构造时 setState(-1) 禁止中断），保证 shutdown 中断不打乱执行关键段。
4. getTask 控存活：超 corePoolSize 线程 `poll(keepAliveTime)` 超时退出，核心线程 `take()` 死等（allowCoreThreadTimeOut 可改）；SHUTDOWN+队列空或 STOP 时返回 null 回收线程。
5. 四种内置拒绝策略：AbortPolicy（默认抛异常）、CallerRunsPolicy（调用者跑，负反馈反压）、DiscardPolicy（静默丢）、DiscardOldestPolicy（丢队头重试）。
6. 钩子可扩展：beforeExecute/afterExecute/terminated 留给子类。

## Structure（结构）

```
ThreadPoolExecutor
├── ctl: AtomicInteger        // 高3位状态 | 低29位线程数
├── workers: HashSet<Worker>  // Worker extends AQS implements Runnable
│   └── Worker{thread, firstTask, completedTasks}
├── workQueue: BlockingQueue<Runnable>
└── handler: RejectedExecutionHandler  // Abort/CallerRuns/Discard/DiscardOldest
```

## How It Works（运作方式）

execute(command) → ① `workerCountOf(c) < corePoolSize` 则 addWorker(command, true)；② 否则 isRunning 且 `workQueue.offer` 成功 → recheck：状态变了 remove 回滚并 reject，workerCount==0 补空任务 Worker；③ 否则 addWorker(command, false)，失败则 reject。addWorker 内层 CAS 增 workerCount、外层 retry 复查状态，成功后 new Worker 并 start。runWorker 循环：先跑 firstTask，再 getTask() 取任务，取到 null（超时/该关闭）则 processWorkerExit 退出。

## Relationships（关系）

### Related Concepts（相关概念）

- [[aqs-internals|AQS 核心机制]]（depends-on：Worker 的不可重入锁即 AQS 独占模式子类，tryAcquire 仅 CAS 0→1）
- [[scheduledthreadpoolexecutor-internals|ScheduledThreadPoolExecutor 调度设计]]（derived-from 反向：STPE 继承 TPE，仅换队列与任务包装即获得定时调度能力）

### Distinctions（区分）

- 与 [[reentrantlock-internals|ReentrantLock 可重入锁]] 的不同之处：Worker 的锁刻意不可重入（防止同线程重入打乱任务执行），ReentrantLock 的 state 则累加重入次数；两者同为 AQS 独占模式的不同语义解释。
- 与 Executors 快捷方法的不同之处：newFixedThreadPool/newSingleThreadExecutor 用无界队列（积压 OOM）、newCachedThreadPool 线程数无上限（创建 OOM）；手动 new TPE 才能控制队列与上限（信源援引阿里规约）。

## Evolution（演进）

单信源（公众号源码解读，JDK 17 语境）；作者称全类约 3000 余行。

## Open Questions（开放问题）

- addWorker 完整状态检查分支（SHUTDOWN 下空任务 Worker 的接纳条件等）信源做了精简，未逐行覆盖（部分未知）。
- 核心线程数/队列容量的量化调参方法（信源只给经验起点，须压测确定）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-14-threadpoolexecutor.md`

## Related Knowledge（相关知识）

- [[jdk-14-threadpoolexecutor|ThreadPoolExecutor 源码篇（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
