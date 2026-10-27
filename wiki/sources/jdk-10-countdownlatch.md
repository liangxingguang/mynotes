---
id: wiki-source-jdk-10-countdownlatch
type: source
title: JDK源码阅读(11) — CountDownLatch：门闩的等待与唤醒
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
  - raw/sources/misc/2026-10-27-jdk-10-countdownlatch.md
related:
  - wiki/sources/jdk-07-reentrantlock.md
  - wiki/sources/jdk-source-reading-album.md
  - wiki/concepts/countdownlatch-internals.md
  - wiki/concepts/aqs-internals.md
---
# JDK源码阅读(11) — CountDownLatch：门闩的等待与唤醒

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列第 (11) 篇（JUC 锁机制之后转入同步工具），逐行拆解 CountDownLatch：内部类 Sync 继承 AQS 共享模式，构造时把 count 设为 state；await() 走 acquireSharedInterruptibly，state≠0 时线程封装为共享节点入 CLH 队列阻塞；countDown() 自旋+CAS 减 state，减到 0 触发 doReleaseShared 广播唤醒全部等待线程。附线程池配合示例、与 CyclicBarrier 六维对比表与五条常见坑。

## Key Facts（关键事实）

- `Sync extends AQS`：构造时 `setState(count)`，state 即计数器；count < 0 抛 IllegalArgumentException，count=0 时 await 直接放行。
- `tryAcquireShared`：state==0 返回 1（放行），否则返回 -1（入队等待）。
- `tryReleaseShared`：自旋+CAS 把 state 减 1；`nextc==0` 返回 true 触发 `doReleaseShared()` 唤醒等待队列所有共享节点。
- `await()` = `sync.acquireSharedInterruptibly(1)`（可中断）；`await(timeout, unit)` = `tryAcquireSharedNanos`，超时返回 false。
- `getCount()` 只是 state 快照值，多线程下拿到即过期。
- 计数不可重置：一次性用品，区别于可 `reset()` 的 CyclicBarrier（后者是线程互相等待到达屏障、计数方向相反）。
- 等待线程以**共享节点（SHARED）** 入 CLH 队列——AQS 共享模式的具体用例。

## Important Claims（重要论断）

### countDown() 必须放 finally

worker 抛异常导致 countDown 未执行时计数永不归零，所有等待线程死等（信源最佳实践）。

### 一等多是核心语义

CountDownLatch 让一个或多个线程等待其他线程完成——主线程等 worker 汇总、多线程就绪后统一起跑是其典型场景（信源论断）。

## Concepts Introduced（引入的概念）

- [[countdownlatch-internals|CountDownLatch 门闩设计（AQS 共享模式）]]

## Entities Mentioned（提及的实体）

- JDK（java.util.concurrent 包：CountDownLatch/CyclicBarrier/ExecutorService）

## Implications（影响／启示）

- count 取值需匹配实际任务数：太小提前放行、太大永远等不到（信源提醒）；动态任务数场景应考虑其他同步器（解读）。
- latch 只管计数不关心执行者，与线程池配合天然解耦（信源说明）。

## Limitations（局限）

- 共享模式的 propagate 唤醒链（doReleaseShared 级联细节）未逐行展开；CyclicBarrier 仅作对比表出现，无源码拆解。

## Related Knowledge（相关知识）

- [[reentrantlock-internals|ReentrantLock 可重入锁设计]]（AQS 独占模式对照，同系列前篇）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-10-countdownlatch.md`
