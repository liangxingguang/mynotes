---
id: wiki-concept-cyclicbarrier-internals
type: concept
title: CyclicBarrier 循环屏障设计（Generation 换代）
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
  - raw/sources/misc/2026-10-27-jdk-11-cyclicbarrier.md
related:
  - wiki/concepts/countdownlatch-internals.md
  - wiki/concepts/reentrantlock-internals.md
  - wiki/sources/jdk-11-cyclicbarrier.md
---
# CyclicBarrier 循环屏障设计（Generation 换代）

## Definition（定义）

CyclicBarrier 是 JUC 的可循环线程屏障：让一组线程相互等待，直到全部到达公共屏障点后一起继续执行；所有线程通过后屏障自动重置，可迎接下一轮。内部用 ReentrantLock + Condition（trip）实现，不继承 AQS。

## Why It Matters（为什么重要）

它是"多线程分阶段协作"（每轮凑齐→统一汇总→进入下一阶段）的标准原语，也是"换代（Generation）隔离轮次状态"这一并发设计技巧的最简洁样本；与 CountDownLatch 构成 JUC 两种屏障语义的对照组。

## Core Characteristics（核心特征）

1. parties 固定、count 递减：构造指定 parties，count 初始等于 parties，每个线程到达 `--count`，归零即破障。
2. Generation 换代：每轮一个 Generation 对象（仅含 `broken` 标记）；等待线程用 `g != generation` 判正常通过、`g.broken` 判异常。
3. 最后线程特权：`index == 0` 的线程不阻塞，执行可选的 barrierAction 后调 nextGeneration()（signalAll + 重置 count + new Generation）。
4. 损坏传播：中断、超时、barrierAction 抛异常、外部 reset() 均触发 breakBarrier()，所有等待线程收 BrokenBarrierException，须 reset() 才能复用。
5. 有返回值：await() 返回到达次序 index（最后到达者返回 0）。

## How It Works（运作方式）

线程 await() → `dowait()`：持锁检查 broken/中断 → `--count` → 若 index==0：执行 barrierAction、`nextGeneration()` 唤醒全部并换代、返回 0；否则在 trip 条件队列上 await（可限时），醒来后依次检查 `g.broken`（抛 BrokenBarrierException）→ `g != generation`（正常返回 index）→ 超时（breakBarrier 并抛 TimeoutException）。

## Relationships（关系）

### Dependencies（依赖项）

- [[reentrantlock-internals|ReentrantLock 可重入锁设计]]（depends-on：lock + newCondition 条件队列）

### Distinctions（区分）

- 与 [[countdownlatch-internals|CountDownLatch]] 的不同之处：CyclicBarrier 可自动重置循环使用、计数自减+阻塞、必须凑齐 parties、有 barrierAction 收尾、异常以 BrokenBarrierException 传播；CountDownLatch 一次性、外部 countDown() 递减、一等多即可放行（信源对比表）。
- 与 ReentrantLock 直接用法的区别：CyclicBarrier 把"凑齐-放行-换代"封装为原语，手写 Lock + Condition 需自行处理轮次状态与异常传播（解读）。

## Evolution（演进）

单信源（公众号源码解读）；与 Phaser（支持动态注册 parties）的取舍未覆盖。

## Open Questions（开放问题）

- 不同 JDK 版本间实现是否有实质差异（未知，当前信源未标注版本）。
- 高并发下锁竞争的量化开销与无锁替代方案（未知）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-11-cyclicbarrier.md`

## Related Knowledge（相关知识）

- [[jdk-11-cyclicbarrier|CyclicBarrier 源码篇（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
