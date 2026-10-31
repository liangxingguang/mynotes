---
id: wiki-concept-forkjoinpool-internals
type: concept
title: ForkJoinPool 核心设计（每线程双端队列 + 工作窃取 + join 不空等）
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: high
tags:
  - concept
  - java
  - jdk
  - concurrency
  - juc
sources:
  - raw/sources/misc/2026-10-31-forkjoinpool-vs-threadpoolexecutor.md
related:
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/concepts/aqs-internals.md
  - wiki/concepts/virtual-threads-production.md
  - wiki/comparisons/forkjoinpool-vs-threadpoolexecutor-comparison.md
---
# ForkJoinPool 核心设计（每线程双端队列 + 工作窃取 + join 不空等）

## Definition（定义）

ForkJoinPool（JDK 7 引入，Doug Lea 实现，`java.util.concurrent` 包）是面向**分治型任务**的线程池：大任务递归拆成小任务（Fork），小任务各自算完再合并结果（Join）。与 ThreadPoolExecutor 的假设（任务彼此独立、共享一个队列）不同，ForkJoinPool 的假设是任务可递归拆分且依赖「工作线程自己持有队列 + 闲时互相偷活」的调度机制。**Fork 是拆，Join 是合**。

## Why It Matters（为什么重要）

- 它是 JDK 8+ 并行流（`parallelStream()`）、`CompletableFuture`、`Arrays.parallelSort()` 的默认执行器（commonPool）；不理解它就无法解释「一个并行流写阻塞代码，全 JVM 卡顿」这类生产事故。
- 工作窃取 + join 不空等是 JDK 并发调度的核心思想，也是面试高频考点；其「队列分散、两端错开」的竞争消解手法可迁移到其他并行调度设计。
- JDK 21 虚拟线程的载体线程调度器底层也是 ForkJoinPool（异步 FIFO 模式），把虚拟线程与 ForkJoinPool 绑成同一机制族。

## Core Characteristics（核心特征）

1. **每线程一个双端队列**：每个工作线程各自持有 `WorkQueue` 双端队列，另有通用队列接外部提交任务；`fork()` 出来的子任务推进当前线程自己的队列，把「所有线程抢一个队列」降到「基本各玩各的」。
2. **工作窃取两端方向错开**：队列空了的工作线程去别的线程队列偷任务。默认同步模式下，主人从最新入队端（`top`）**LIFO** 取（刚切出的子任务依赖数据还在 CPU 缓存里，命中率最高）；窃取者从最旧端（`base`）**FIFO** 取（最旧的是还没拆开的最大一块，粒度最粗，偷一次够算很久）。口诀：**自己取最近的，偷别人取最远的**。
3. **竞争被压缩到很小**：主人只在 `top` 附近活动、小偷只在 `base` 附近活动，两边几乎碰不到；窃取端可能有多个线程同时来偷，故用 CAS 保证同一任务不被两人拿走，主人端几乎无竞争。
4. **fork() 不启动新线程、不执行任务**：只是把子任务压进当前线程自己的队列，队列原本为空时顺带唤醒空闲工作线程；谁取、什么时候取不是 fork 决定的。
5. **join() 不是单纯阻塞**：工作线程发现任务未完成时会**顺手去别的队列偷活干，一边干一边等**——等待时间被用来做别的任务，CPU 不空转，池子不用靠多开线程维持满载。
6. **fork() 认「当前线程属于哪个池」**：不在 `ForkJoinWorkerThread` 里调用时，任务被丢给 commonPool；自定义池必须经 `pool.invoke(task)` / `pool.submit(task)` 提交。
7. **阻塞是命门**：机制成立的前提是任务纯计算、还能继续拆。混入阻塞（等 DB、抢分布式锁、读磁盘）后，被阻塞线程既不能算也不能偷；池里线程全被卡满 → 整个池「假死」。
8. **ManagedBlocker 是补偿不是解决**：JDK 提供 `ManagedBlocker` 做线程补偿，但补线程受 `maximumPoolSize` 限制，顶到上限补不出新线程会抛 `RejectedExecutionException`；真正靠谱的做法是别把阻塞逻辑塞进 ForkJoinPool。
9. **没有 ThreadPoolExecutor 那套拒绝策略**：任务多了排队不丢；抛 `RejectedExecutionException` 只有两种情形——池已 shutdown/terminating，或内部资源耗尽（JDK 17+ 表现为线程即将在 join/ManagedBlocker 阻塞而线程数顶到 maximumPoolSize，除非构造时传 `saturate` 谓词）。
10. **commonPool 全 JVM 共享**：并行度默认 `availableProcessors() - 1`（单核为 1），属性只在首次初始化时读一次；任何一处阻塞占住的都是所有共用者的并行度。

## Structure（结构）

```
ForkJoinPool
├── WorkQueue[] / per-worker WorkQueue（每线程一个双端队列）
├── external queue（接外部提交）
├── commonPool()（JVM 单例，并行度 = CPU-1）
└── 载体调度器（JDK 21 虚拟线程，专用池，异步 FIFO，并行度 = CPU）
```

任务树：`compute()` 内按阈值决定直接算还是 fork 左右子任务（留一个自己算，省一次入队和唤醒，标准姿势）。

## How It Works（运作方式）

1. 提交：根任务经 `invoke`（阻塞等结果）/ `submit`（返回 ForkJoinTask，可稍后 join）/ `execute`（不等结果）入池；并行流复用当前线程所属池（借池技巧，非官方推荐用法）。
2. 执行：工作线程循环——自己队列非空则取任务；为空则去别人队列 base 端偷一个。
3. fork：子任务压入当前线程自己的队列尾部（top 端附近），队列为空时唤醒空闲线程。
4. join：等待期间若任务未完成，工作线程转向别的队列偷活，干着等，直到目标任务完成再回来。
5. 阻塞：任务混入阻塞 → 线程卡住 → 不能算不能偷 → 全部卡满则池假死。

## Relationships（关系）

### Related Concepts（相关概念）

- [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]（对比：一个共享队列 vs 每线程队列；阻塞等待 vs 偷活等待；四种拒绝策略 vs 无拒绝策略）
- [[aqs-internals|AQS 核心机制]]（ForkJoinPool 的 CAS 窃取、WorkQueue 的操作依赖 JUC 底层机制；同包谱系）

### Distinctions（区分）

- 与 ThreadPoolExecutor 的不同之处：队列分散（每线程一个双端队列 vs 单个共享队列）；等待行为（偷活不空等 vs 挂起等结果）；任务形态假设（可递归拆分 vs 相互独立）；适合任务（CPU 密集可拆分 vs IO 密集/相互独立）；拒绝策略（无 vs 四种内置）；典型使用者（并行流/CF/虚拟线程调度器 vs 业务线程池）。
- 与 commonPool 的关系：ForkJoinPool 是池类型，commonPool 是其 JVM 级共享实例；虚拟线程用的是**专用** ForkJoinPool（异步 FIFO，并行度=核数），与 commonPool（核数-1）互不相干。

## Evolution（演进）

- JDK 7 — ForkJoinPool 引入（Doug Lea），面向分治任务。
- JDK 8 — 并行流与 `CompletableFuture` 默认绑定 commonPool；`CountedCompleter` 引入。
- JDK 17+ — 内部资源耗尽时抛 `RejectedExecutionException`（saturate 谓词可抑制）。
- JDK 21 — 虚拟线程载体线程调度器底层为专用 ForkJoinPool（异步 FIFO 模式）。
- 2026-11-01 — 本页建立：工作窃取两端方向错开 + join 不空等 + 阻塞假死 + commonPool 共享坑 + 虚拟线程调度器机制（来源：公众号面试题解析，单信源，置信度高——机制细节有 JDK 源码字段名支撑）。

## Open Questions（开放问题）

- 工作窃取在不同任务粒度/线程数下的吞吐定量基准（本信源未给实测数字）。
- commonPool 借池技巧（parallelStream 复用当前线程池）属借助内部行为的非官方用法，其跨 JDK 版本的稳定性未验证。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-31-forkjoinpool-vs-threadpoolexecutor.md`

## Related Knowledge（相关知识）

- [[forkjoinpool-vs-threadpoolexecutor-comparison|ForkJoinPool vs ThreadPoolExecutor（对比页）]]
- [[forkjoinpool-vs-threadpoolexecutor|高频面试题信源页]]
- [[virtual-threads-production|虚拟线程生产实践]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
