---
id: wiki-source-jdk-20-futuretask
type: source
title: JDK源码剖析——FutureTask，线程池里那个「能拿到结果」的秘密武器
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - jdk
  - concurrency
sources:
  - raw/sources/misc/2026-10-27-jdk-20-futuretask.md
related:
  - wiki/concepts/futuretask-internals.md
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/concepts/aqs-internals.md
  - wiki/sources/jdk-14-threadpoolexecutor.md
  - wiki/sources/completablefuture-async-orchestration.md
  - wiki/sources/jdk-source-reading-album.md
---
# JDK源码剖析——FutureTask，线程池里那个「能拿到结果」的秘密武器

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列文章，逐行拆解 JUC 的 FutureTask：既是 Runnable 又是 Future，用约 200 行代码实现单向递增的七态状态机 + CAS + Treiber 无锁栈等待队列；含 run/get/awaitDone/finishCompletion 核心源码走读、与 AQS 的历史沿革（JDK 8 起弃用 AQS）、四种使用场景示例及与 CompletableFuture 的对比选型表。

## Key Facts（关键事实）

- `java.util.concurrent.FutureTask` 实现 `RunnableFuture`（同时继承 Runnable 与 Future）：既是可执行的任务，又是可取结果的承诺；`ExecutorService.submit(Callable)` 底层即把 Callable 包成 FutureTask 交给 worker 线程。
- 七态状态机：`NEW=0 → COMPLETING=1 → NORMAL=2 / EXCEPTIONAL=3`；`NEW → CANCELLED=4`；`NEW → INTERRUPTING=5 → INTERRUPTED=6`。状态单向递增不可回退，多线程下靠 CAS 安全推进。
- 核心字段：`volatile int state`；`Object outcome`（非 volatile，靠 state 的 happen-before 保证可见性）；`volatile Thread runner`；`volatile WaitNode waiters`（Treiber 无锁栈栈顶）。
- `run()` 先判 `state != NEW` 再 CAS 设置 runner——两步共同保证任务只被执行一次；finally 中 `runner = null` 防止任务完成后被 `cancel(true)` 误中断；`s >= INTERRUPTING` 时 `handlePossibleCancellationInterrupt` 让中断者完成。
- `get()` 走 `awaitDone`：等待线程封装为 WaitNode 以 CAS 压入 Treiber 栈（LIFO），用 `LockSupport.park/parkNanos` 阻塞；`COMPLETING` 中间态 `Thread.yield()` 让出 CPU；被中断则 `removeWaiter` 并抛 `InterruptedException`；超时则移除节点返回当前状态。
- `finishCompletion()`：CAS 摘取整个等待栈后逐个 `unpark` 全部等待者，随后调用可重写的 `done()` 钩子并 `callable = null` 助 GC。选 Treiber 栈而非阻塞队列的原因：只需 LIFO、不需要公平性。
- 历史沿革：JDK 7 的 FutureTask 基于 AQS；JDK 8 起弃用 AQS 改为自维护的轻量 CAS 状态机——AQS 的共享锁/条件变量对 FutureTask 过重。
- 取消语义：`cancel(true)` 只是 `Thread.interrupt()` 设中断标志，任务代码不响应中断就停不下来；`cancel(false)` 仅置 CANCELLED，对已开始执行的任务无效。
- 异常处理：任务异常存入 `outcome`、状态置 EXCEPTIONAL；`get()` 检测后包装为 `ExecutionException` 抛出，真正原因需取 `getCause()`——以此区分任务执行异常与 get 调用异常。
- 结果缓存：结果产生后多次 `get()` 只有第一次可能阻塞，多线程同时 get 安全。
- 对比 CompletableFuture：FutureTask 支持手动 set/setException、取消、超时 get，但不支持异步回调与组合编排；CompletableFuture（源码 3000 余行）提供 thenApply/thenCombine/exceptionally/orTimeout 等，适用于复杂异步编排。

## Important Claims（重要论断）

### 单向递增状态机是简化并发控制的关键洞察

状态不可回退使所有线程在同一时刻看到的状态一致，配合 CAS 即可推进，无需内建锁——这是 FutureTask 能用 200 余行实现完整状态机 + 线程间通信的根因（信源核心解读）。

### 简单场景 FutureTask 足够，复杂编排才上 CompletableFuture

「大多数场景 FutureTask + 线程池就够了」；需要链式回调、多任务编排、超时/异常恢复时才用 CompletableFuture（信源选型结论）。

## Concepts Introduced（引入的概念）

- [[futuretask-internals|FutureTask 内部设计（单向状态机 + CAS + Treiber 等待栈）]]

## Entities Mentioned（提及的实体）

- JDK（java.util.concurrent：FutureTask / RunnableFuture；对照：CompletableFuture；依赖：LockSupport / Unsafe CAS；宿主：ExecutorService.submit）

## Implications（影响／启示）

- 印证 [[threadpoolexecutor-internals|ThreadPoolExecutor]] 的 submit 路径：日常 `submit(Callable)` 返回的 Future 即 FutureTask，取消/超时/异常语义均由本篇机制提供（解读，双信源互证）。
- 「一个类单挑一个能力」的最小设计示范：为「以后可能扩展」预先叠加抽象层的反例（信源观点）。

## Limitations（局限）

- 单一公众号信源；代码块在采集稿中为单行压缩形态，细节以 raw 收录原文与 JDK 源码为准。
- 未指明所基于的 JDK 具体版本（仅区分 JDK 7 AQS 版与 JDK 8+ CAS 版）。
- 性能论断（轻量状态机优于 AQS）为定性结论，无基准数据。

## Related Knowledge（相关知识）

- [[jdk-14-threadpoolexecutor|ThreadPoolExecutor 源码深度剖析（信源页）]]（FutureTask 的主要宿主）
- [[completablefuture-async-orchestration|CompletableFuture：异步编排的正确写法（信源页）]]（本篇的对比对象与系列下期预告主题）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-20-futuretask.md`
