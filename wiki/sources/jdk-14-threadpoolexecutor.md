---
id: wiki-source-jdk-14-threadpoolexecutor
type: source
title: ThreadPoolExecutor 源码深度剖析｜Java线程池的核心实现
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
  - raw/sources/misc/2026-10-27-jdk-14-threadpoolexecutor.md
related:
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/concepts/aqs-internals.md
  - wiki/sources/jdk-07-reentrantlock.md
  - wiki/sources/jdk-source-reading-album.md
---
# ThreadPoolExecutor 源码深度剖析｜Java线程池的核心实现

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列篇目（作者编号第 16 篇，JUC 并发线），逐段拆解 `java.util.concurrent.ThreadPoolExecutor`：ctl 单 int 打包状态+线程数、execute 三步流程与二次检查、addWorker 双层循环 CAS、Worker 继承 AQS 实现不可重入锁、runWorker/getTask 主循环与线程回收、四种拒绝策略，附 Executors 快捷方法 OOM 风险表与完整示例。

## Key Facts（关键事实）

- `ctl`（AtomicInteger）高 3 位存运行状态、低 29 位存工作线程数（COUNT_BITS=29）；五态 RUNNING(-1)/SHUTDOWN(0)/STOP(1)/TIDYING(2)/TERMINATED(3) 按数值有序，可用 `<`/`>=` 直接比较（`isRunning(c)` 即 `c < SHUTDOWN`）。
- 构造方法 7 参数：corePoolSize / maximumPoolSize / keepAliveTime / unit / workQueue / threadFactory / handler。
- execute 三步：① workerCount < corePoolSize 直接 addWorker（即使有空闲核心线程也新建，懒加载到 core 为止）；② 入队成功须 recheck——池已 shutdown 则 remove 回滚并 reject，workerCount==0 则补一个空任务 Worker 消费队列；③ 队列满走 addWorker(false) 建非核心线程，失败（超 maxPoolSize）则 reject。
- addWorker 用 `retry:` 标签双层循环：外层查状态、内层 CAS 自旋增 workerCount，成功后才真正 new Worker 并 `t.start()`。
- Worker 继承 AQS 实现不可重入独占锁（tryAcquire 仅 CAS 0→1），构造时 `setState(-1)` 禁止中断直到 runWorker 开始；锁用于 shutdown 中断时不打乱正在执行的关键操作。
- getTask 控制线程存活：超出 corePoolSize 的线程用 `poll(keepAliveTime)` 超时回收，核心线程用 `take()` 死等（除非 `allowCoreThreadTimeOut(true)`）；SHUTDOWN 且队列空或 STOP 时返回 null 退出线程。
- 四种拒绝策略均为内部类：AbortPolicy（默认，抛 RejectedExecutionException）、CallerRunsPolicy（调用者线程自己跑，负反馈）、DiscardPolicy（静默丢弃）、DiscardOldestPolicy（丢队列头部最老任务后重试 execute）。
- Executors 快捷方法风险：newFixedThreadPool/newSingleThreadExecutor 用无界 LinkedBlockingQueue（任务积压 OOM）；newCachedThreadPool 用 SynchronousQueue + maxPoolSize=Integer.MAX_VALUE（线程无限创建 OOM）。

## Important Claims（重要论断）

### 生产环境应手动 new ThreadPoolExecutor

信源援引阿里规约：不要用 Executors 快捷方法，因为无界队列/无限线程数扛不住突发流量；线程数设置无万能公式（CPU 密集 Ncpu+1、IO 密集 2*Ncpu 起步），须压测+监控调优。

### execute 提交的任务异常会被吞掉

execute() 提交的任务抛异常时 Worker 退出并自动补新 Worker，但异常无处可查；submit() 包装的 FutureTask 会把异常包进 ExecutionException。信源建议实现 afterExecute 钩子或 UncaughtExceptionHandler 监控。

## Concepts Introduced（引入的概念）

- [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计（ctl 打包 + Worker/AQS + 拒绝策略）]]

## Entities Mentioned（提及的实体）

- JDK（java.util.concurrent：ThreadPoolExecutor/Executors/Worker/AQS）

## Implications（影响／启示）

- ctl 的「一个 int 装两样东西 + CAS 更新」与 ArrayDeque 的位运算取模同属 JDK 位运算优化谱系——用数值有序性替代状态枚举比较是并发状态机的实用手法（解读）。
- CallerRunsPolicy 本质是反压（backpressure）机制：让提交者自己跑任务，天然降低提交速率（解读）。

## Limitations（局限）

- 单一公众号信源；addWorker 的状态检查分支在信源中被精简（"我精简一下核心逻辑"），未逐行展开。
- 线程数公式（Ncpu+1 / 2*Ncpu）为经验起点，信源自述无万能公式。

## Related Knowledge（相关知识）

- [[jdk-07-reentrantlock|JDK源码阅读(6) — ReentrantLock（信源页）]]（AQS 基座，Worker 锁的底层）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-14-threadpoolexecutor.md`
