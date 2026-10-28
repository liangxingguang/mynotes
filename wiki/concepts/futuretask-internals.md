---
id: wiki-concept-futuretask-internals
type: concept
title: FutureTask 内部设计（单向状态机 + CAS + Treiber 等待栈）
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
  - raw/sources/misc/2026-10-27-jdk-20-futuretask.md
related:
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/concepts/scheduledthreadpoolexecutor-internals.md
  - wiki/concepts/aqs-internals.md
  - wiki/sources/jdk-20-futuretask.md
---
# FutureTask 内部设计（单向状态机 + CAS + Treiber 等待栈）

## Definition（定义）

`java.util.concurrent.FutureTask` 的设计：实现 `RunnableFuture`（Runnable × Future），用一个 `volatile int state` 承载单向递增的七态生命周期（NEW→COMPLETING→NORMAL/EXCEPTIONAL，NEW→CANCELLED，NEW→INTERRUPTING→INTERRUPTED），并发控制全部基于 Unsafe CAS（runner 设置、状态推进、等待节点入栈），等待线程以 WaitNode 组成 Treiber 无锁栈（LIFO），用 `LockSupport.park/unpark` 阻塞与唤醒；结果/异常存于非 volatile 的 `outcome`，可见性靠 state 的 happen-before 传递。

## Why It Matters（为什么重要）

它是「取消/等待/取结果」语义的底层载体——日常 `ExecutorService.submit(Callable)` 返回的 Future 就是它，[[threadpoolexecutor-internals|ThreadPoolExecutor]] 的返回值、[[scheduledthreadpoolexecutor-internals|ScheduledThreadPoolExecutor]] 的 ScheduledFutureTask 都建立在这套机制上。它还示范了两个可复用的并发设计要点：单向递增状态免回退大幅简化并发推理；等待者管理只需要 LIFO 时用 Treiber 栈而非阻塞队列。JDK 8 起它弃用 AQS 自维护轻量状态机，是「按需裁剪同步器复杂度」的典型案例。

## Core Characteristics（核心特征）

1. 七态单向递增：状态只增不回退，CAS 即可安全推进，所有线程看到的瞬时状态一致。
2. 单次执行：`run()` 以「state==NEW + CAS 设置 runner」双重检查保证 Callable 只执行一次，多线程重复 run / 线程池重复提交均安全。
3. runner 置空防误伤：finally 中 `runner = null`，避免任务完成后 `cancel(true)` 误中断已结束的任务。
4. Treiber 等待栈：等待 get 的线程封装为 WaitNode 以 CAS 压栈（LIFO），`finishCompletion` 摘栈后逐个 unpark 全部等待者，再调 `done()` 钩子并 `callable = null` 助 GC。
5. COMPLETING 中间态 yield：结果正在设置时 get 不阻塞而是 `Thread.yield()` 让出 CPU，避免对极短中间态无谓 park。
6. 取消语义分级：`cancel(false)` 仅置 CANCELLED（对运行中任务无效）；`cancel(true)` 只设中断标志，任务不响应中断就停不下来——不能强制杀线程。
7. 异常与结果同槽：`outcome` 保存结果或异常对象；EXCEPTIONAL 态下 get 包装为 `ExecutionException` 抛出，真正原因取 `getCause()`；结果缓存后重复 get 不再阻塞。

## Structure（结构）

```text
state: volatile int（NEW 0 / COMPLETING 1 / NORMAL 2 / EXCEPTIONAL 3 / CANCELLED 4 / INTERRUPTING 5 / INTERRUPTED 6）
outcome: Object（结果或异常；非 volatile，靠 state 的 happen-before）
runner: volatile Thread（当前执行线程，供 cancel(true) 中断）
waiters: volatile WaitNode（Treiber 栈顶，WaitNode{thread,next}）
callable: Callable<V>（完成后置 null）
```

## How It Works（运作方式）

- 执行：`run()` 判 `state != NEW` 或 CAS runner 失败即返回 → `callable.call()` → 成功 `set(result)`（NEW→COMPLETING→NORMAL，置 outcome，finishCompletion）/ 异常 `setException(ex)`（→EXCEPTIONAL）→ finally 清 runner、`s >= INTERRUPTING` 时处理取消中断。
- 等待：`get()` 若 `s <= COMPLETING` 进 `awaitDone` 自旋循环——完成态直接返回；COMPLETING 则 yield；首次建 WaitNode、CAS 入栈；随后 `park`（超时版 `parkNanos`）阻塞；被中断则 `removeWaiter` 并抛 `InterruptedException`；超时则摘节点返回。
- 唤醒：`finishCompletion` CAS 将 waiters 摘为 null 后沿 next 逐个 `unpark`，再执行 `done()` 钩子。
- 取消：`cancel(mayInterruptIfRunning)` 按标志走 NEW→CANCELLED 或 NEW→INTERRUPTING→（中断 runner）→INTERRUPTED，随后 finishCompletion 唤醒所有等待者。

## Relationships（关系）

### Related Concepts（相关概念）

- [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]（`submit(Callable)` 即把任务包成 FutureTask 交给 Worker，FutureTask 是其返回值语义的提供者）
- [[scheduledthreadpoolexecutor-internals|ScheduledThreadPoolExecutor 调度设计]]（其 ScheduledFutureTask 继承 FutureTask，叠加触发时间与周期重排队）

### Dependencies（依赖项）

- [[aqs-internals|AQS 核心机制]]（JDK 7 版本的实现基座；JDK 8 起弃用，见 Evolution）

### Distinctions（区分）

- 与 CompletableFuture：FutureTask 只支持单任务的结果/取消/超时，不支持异步回调与组合编排；CompletableFuture 提供 thenApply/thenCombine/exceptionally/orTimeout 等编排能力但实现约 3000 行——简单异步任务用 FutureTask 足够，复杂编排才上 CompletableFuture（信源结论）。
- 与 [[aqs-internals|AQS]] 系同步器（如 [[reentrantlock-internals|ReentrantLock]]）：AQS 提供共享锁与条件变量的通用框架；FutureTask 只需简单状态机，自维护 CAS + Treiber 栈更轻。

## Evolution（演进）

- JDK 7：基于 AQS 实现；JDK 8 起改为自维护 CAS 状态机，理由是 AQS 的共享锁/条件变量对 FutureTask 过重，轻量实现更清晰、性能更好（信源结论，无基准数据）。
- 系列下期预告 CompletableFuture 源码剖析，截至本页创建未见对应信源。

## Open Questions（开放问题）

- 信源未指明所基于的具体 JDK 版本；高版本 JDK 对 FutureTask 是否有实质改动，当前信源未确立。
- 轻量状态机相对 AQS 实现的性能收益幅度：仅定性结论，无基准测试。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-20-futuretask.md`

## Related Knowledge（相关知识）

- [[jdk-20-futuretask|JDK源码剖析——FutureTask（信源页）]]
- [[jdk-14-threadpoolexecutor|ThreadPoolExecutor 源码深度剖析（信源页）]]
