---
id: wiki-comparison-forkjoinpool-vs-threadpoolexecutor
type: comparison
title: ForkJoinPool vs ThreadPoolExecutor
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: high
tags:
  - comparison
  - java
  - jdk
  - concurrency
sources:
  - raw/sources/misc/2026-10-31-forkjoinpool-vs-threadpoolexecutor.md
related:
  - wiki/concepts/forkjoinpool-internals.md
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/concepts/virtual-threads-production.md
---
# ForkJoinPool vs ThreadPoolExecutor

## Scope（范围）

Java 并发中最常用的两种线程池（`java.util.concurrent`）在设计假设、队列结构、等待行为与适用任务上的对比。结论一句话：**不是「谁更快」，而是「任务能不能拆」——能递归拆的优先 ForkJoinPool，相互独立、尤其带阻塞的用 ThreadPoolExecutor。**

## Comparison Matrix（对比矩阵）

| Dimension（维度） | ThreadPoolExecutor | ForkJoinPool |
|---|---|---|
| 任务假设 | 相互独立、互不依赖 | 可递归拆分的分治任务（Fork=拆，Join=合） |
| 队列结构 | 一个共享阻塞队列 | 每线程一个双端队列（WorkQueue）+ 通用外部队列 |
| 队列竞争 | 线程越多抢一个队列竞争越激烈 | fork 推进自己队列，基本各玩各的 |
| 等待行为 | 线程挂起等结果，被占住 | 工作线程 join 时去别的队列偷活干，不空等 |
| 适合任务 | IO 密集、相互独立 | CPU 密集、可拆分 |
| 队列满/任务过多 | 可配置四种拒绝策略 | 无拒绝策略；任务排队不丢，invoke/get 等结果时提交者被阻塞 |
| 抛 RejectedExecutionException | 拒绝策略触发 | 仅 shutdown/terminating 或内部资源耗尽（JDK 17+ 线程顶到 maximumPoolSize 补不出） |
| 并行度 | 核心/最大线程数构造指定 | commonPool 默认 CPU-1；自建池构造指定 |
| 典型使用者 | 业务线程池 | 并行流、CompletableFuture、Arrays.parallelSort、虚拟线程调度器 |
| 阻塞任务后果 | 队列堆积、可配置拒绝 | 线程全卡满→整个池假死（命门） |

## Analysis（分析）

ForkJoinPool 的两层速度优势：① 队列分散到每线程一个双端队列 + 工作窃取两端取方向错开（主人 LIFO 取最新端、小偷 FIFO 取最旧端），把竞争降到极低；② `join` 等待时顺手偷活干，等待时间被利用，CPU 不空转。代价是对阻塞毫无办法：被阻塞线程既不能算也不能偷，池全卡满即假死。ThreadPoolExecutor 靠「一个队列 + 挂起等待 + 拒绝策略」换来对独立任务的简单可靠，阻塞任务交给队列削峰即可。

`new ForkJoinPool(n)` vs `commonPool()`：生命周期（自建自 shutdown / JVM 单例）、并行度（构造指定 / CPU-1 系统属性可调且仅首次初始化时读）、是否被并行流默认使用（不会 / 默认）、阻塞影响范围（只影响自己 / 影响全 JVM 共用者）。

JDK 21 加分项：虚拟线程载体线程调度器底层是**专用 ForkJoinPool**（异步 FIFO 模式，非默认 LIFO；并行度=核数），与 commonPool（核数-1）互不相干。虚拟线程价值在 IO 密集，拿去做 CPU 密集计算不划算——工作窃取解决「有的线程没活干」，解决不了「活本来就比核多」。

## Best Fit（适用场景）

### ForkJoinPool is preferable when

- 任务是纯计算且能递归拆分（求和、矩阵乘、归并排序、大数组处理）。
- 想用并行流/`CompletableFuture` 且任务无阻塞（默认 commonPool 即够用）。
- 面试场景：需要讲清工作窃取与 join 不空等机制。

### ThreadPoolExecutor is preferable when

- 任务相互独立、尤其带阻塞（等 DB、抢锁、读磁盘）。
- 需要队列削峰 + 拒绝策略兜底的生产后台任务。
- 想给并行流划定独立并行度/隔离性：借池技巧（`pool.submit(() -> list.parallelStream()...)`）是借助内部行为的非官方用法；只想跑后台任务直接建 TPE 更省心。

## Important Caveats（重要提醒）

- `fork()` 认的是「当前线程属于哪个池」：不在 `ForkJoinWorkerThread` 里调用，任务被丢给 commonPool；自定义池必须经 `pool.invoke/submit` 提交。
- commonPool 全 JVM 共享：一处阻塞占住的是所有共用者的并行度；并行度属性只在首次初始化时读一次（须写 JVM 启动参数）。
- 「ForkJoinPool 更快」是误区：只在可拆分的 CPU 密集任务上更快。
- ManagedBlocker 是补偿机制不是解决：补线程受 maximumPoolSize 限制，顶到上限抛 RejectedExecutionException。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-31-forkjoinpool-vs-threadpoolexecutor.md`
- 互证：[[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]（ctl/Worker/AQS/拒绝策略四特征）、[[virtual-threads-production|虚拟线程生产实践]]（载体调度器机制）
