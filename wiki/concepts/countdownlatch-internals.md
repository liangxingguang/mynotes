---
id: wiki-concept-countdownlatch-internals
type: concept
title: CountDownLatch 门闩设计（AQS 共享模式）
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
  - raw/sources/misc/2026-10-27-jdk-10-countdownlatch.md
  - raw/sources/misc/2026-10-27-jdk-11-cyclicbarrier.md
  - raw/sources/misc/2026-10-28-semaphore-countdownlatch-practices.md
related:
  - wiki/concepts/aqs-internals.md
  - wiki/concepts/cyclicbarrier-internals.md
  - wiki/sources/jdk-10-countdownlatch.md
  - wiki/sources/semaphore-countdownlatch-practices.md
---
# CountDownLatch 门闩设计（AQS 共享模式）

## Definition（定义）

CountDownLatch 是 JUC 的一次性倒数门闩：让一个或多个线程等待其他 N 个线程完成。内部类 Sync 继承 AQS，构造时把 count 写入 state；await() 在 state≠0 时把线程封装为共享节点入 CLH 队列阻塞，countDown() 把 state 减 1，减到 0 时广播唤醒全部等待线程。

## Why It Matters（为什么重要）

它是"一等多"协作的标准原语（主线程等 worker 汇总、多线程统一起跑），也是 AQS **共享模式**最简洁的完整样本——与 ReentrantLock 的独占模式对照，能把 AQS 的 state 语义抽象看清。

## Core Characteristics（核心特征）

1. state 即计数器：构造 `setState(count)`，count<0 抛异常，count=0 时 await 直接放行。
2. `tryAcquireShared`：state==0 返回 1（放行），否则 -1（入队等待）——共享模式钩子。
3. `tryReleaseShared`：自旋+CAS 减 1，`nextc==0` 返回 true 触发 `doReleaseShared()` 唤醒全部等待线程。
4. await 可中断（acquireSharedInterruptibly），另有超时版 `await(timeout,unit)` 等不到返回 false。
5. 一次性：计数到 0 不可重置，无可重入概念。
6. `getCount()` 只是快照值，多线程下拿到即过期。

## How It Works（运作方式）

await() → `sync.acquireSharedInterruptibly(1)` → state≠0 时 tryAcquireShared 返回 -1 → 线程封装为 SHARED 节点入 CLH 队列 park 阻塞。countDown() → `sync.releaseShared(1)` → CAS 减 state → 减到 0 时 doReleaseShared 沿队列唤醒所有共享节点（广播）。

## Relationships（关系）

### Dependencies（依赖项）

- [[aqs-internals|AQS 核心机制]]（derived-from：共享模式子类实现）

### Distinctions（区分）

- 与 [[cyclicbarrier-internals|CyclicBarrier]] 的不同之处：CountDownLatch 是一等多、计数 N→0、不可重置；CyclicBarrier 是线程互相等待到达屏障、count 自减归零破障、Generation 换代自动重置可循环（双信源对比表互证）。
- 与 [[reentrantlock-internals|ReentrantLock]] 的不同之处：同为 AQS 子类，Latch 用共享模式（全唤醒）、无持有者与重入；Lock 用独占模式（逐个唤醒）、有 owner 与重入计数。

## Evolution（演进）

- 2026-10-27 单信源（公众号源码解读）；doReleaseShared 的 propagate 级联唤醒细节未逐行展开。
- 2026-10-31: [[semaphore-countdownlatch-practices]] 第三信源补用法模式：`await(timeout)` 避免无限阻塞便于降级、配合线程池优雅关闭（全部 countDown 后 await 再 shutdown）；并印证"计数不可重置"是与 CyclicBarrier 的核心区分（见 Distinctions 选型对比）。

## Open Questions（开放问题）

- 共享模式 PROPAGATE 状态与级联唤醒的完整机制（未知，当前信源未覆盖）。
- 与 Phaser 等更灵活同步器的取舍（未知）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-10-countdownlatch.md`（AQS 共享模式机制）
- Source: `raw/sources/misc/2026-10-28-semaphore-countdownlatch-practices.md`（用法模式：await 超时降级、优雅关闭、3 个坑、选型对比表）

## Related Knowledge（相关知识）

- [[jdk-10-countdownlatch|CountDownLatch 源码篇（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
