---
id: wiki-source-jdk-11-cyclicbarrier
type: source
title: JDK源码阅读(12) — CyclicBarrier：循环栅栏，让线程"凑一桌"再出发
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
  - raw/sources/misc/2026-10-27-jdk-11-cyclicbarrier.md
related:
  - wiki/sources/jdk-10-countdownlatch.md
  - wiki/sources/jdk-07-reentrantlock.md
  - wiki/sources/jdk-source-reading-album.md
  - wiki/concepts/cyclicbarrier-internals.md
---
# JDK源码阅读(12) — CyclicBarrier：循环栅栏，让线程"凑一桌"再出发

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列第 (12) 篇，逐行拆解 CyclicBarrier：基于 ReentrantLock + Condition（trip）实现的可循环线程屏障；parties 固定、count 递减归零破障；Generation（代）对象隔离每轮状态实现"循环"；最后一个到达的线程执行 barrierAction 并 nextGeneration() 唤醒所有人。附与 CountDownLatch 双对比表、并行分阶段计算示例与踩坑提醒。

## Key Facts（关键事实）

- 内部结构：`ReentrantLock lock` + `Condition trip`；`parties` 构造固定，`count` 初始等于 parties，每个到达线程 `--count`，归零破障。
- Generation 仅含 `boolean broken` 标记；每轮 `nextGeneration()` 新建 Generation、重置 count、`signalAll()`——"循环"即靠换代实现。
- `dowait()` 核心流程：检查 broken/中断 → `--count` → 最后线程（index==0）执行 barrierAction 后 nextGeneration() 返回 0；其余线程在 trip 上 await，醒来后按 `g.broken`（抛 BrokenBarrierException）/ `g != generation`（正常返回 index）/ 超时（breakBarrier）分支处理。
- 触发 breakBarrier() 的四种情况：等待超时、等待线程被中断、barrierAction 抛异常、外部调用 reset()；一旦破碎所有等待线程收 BrokenBarrierException，须 reset() 才能复用。
- await() 返回到达次序 index；最后到达者返回 0 且全程不阻塞。
- 内部非无锁：ReentrantLock + Condition，高并发下锁竞争是主要开销；barrierAction 耗时会延迟唤醒全体。
- 坑：线程池线程数少于 parties 时永远凑不齐，所有线程死等（信源示例：parties=5 配 3 线程池）。

## Important Claims（重要论断）

### 最后一个线程负责制

最后一个到达的线程是唯一不阻塞的线程，负责执行 barrierAction 收尾并唤醒所有人——避免了额外的通知线程（信源设计解读）。

### 与 CountDownLatch 的本质区别

CountDownLatch 是一等多、一次性、谁都能 countDown；CyclicBarrier 是互相等、可循环、每个线程都必须 await 且必须凑齐 parties（信源双对比表）。

## Concepts Introduced（引入的概念）

- [[cyclicbarrier-internals|CyclicBarrier 循环屏障设计（Generation 换代）]]

## Entities Mentioned（提及的实体）

- JDK（java.util.concurrent 包：CyclicBarrier/ReentrantLock/Condition/ExecutorService）

## Implications（影响／启示）

- "多线程分阶段处理"场景（并行计算分轮汇总、分批读取统一处理、游戏开局就绪）直接用 CyclicBarrier 比手写 Lock + Condition 优雅（信源建议）。
- 不要在线程池中混用不同 barrier timeout 的任务，一个超时触发 breakBarrier 会让所有线程全废（信源提醒）。

## Limitations（局限）

- 单一自媒体信源的源码解读，未覆盖 JDK 版本差异与 Phaser 等替代同步器的对比；示例代码中 `phaseSum` 非线程安全的累加仅作演示。

## Related Knowledge（相关知识）

- [[jdk-10-countdownlatch|JDK源码阅读(11) — CountDownLatch（信源页）]]（同系列前篇，对比对象）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-11-cyclicbarrier.md`
