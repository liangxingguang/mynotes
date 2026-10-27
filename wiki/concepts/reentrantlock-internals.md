---
id: wiki-concept-reentrantlock-internals
type: concept
title: ReentrantLock 可重入锁设计
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
  - raw/sources/misc/2026-10-27-jdk-07-reentrantlock.md
related:
  - wiki/concepts/aqs-internals.md
  - wiki/sources/jdk-07-reentrantlock.md
---
# ReentrantLock 可重入锁设计

## Definition（定义）

`java.util.concurrent.locks` 中的显式互斥锁：基于 AQS 实现，支持可重入、公平/非公平两种模式、可中断获取、超时获取与多 Condition 条件等待，是比 synchronized 语义更丰富的 Java 层锁。

## Why It Matters（为什么重要）

它是 AQS 最经典的实现样本，也是 JUC 中使用最广的显式锁；其「公平只差一行检查」「重入即 state 累加」「Condition 精确唤醒」的设计展示了在统一同步基座上扩展语义的范式。

## Core Characteristics（核心特征）

1. **可重入**：持锁线程再次获取时 state 累加（溢出抛 "Maximum lock count exceeded"）；unlock 把 state 减到 0 才真正释放——重入几次就要 unlock 几次。
2. **非公平（默认）**：`lock()` 先 `compareAndSetState(0,1)` 直接抢一次，不排队；吞吐更高但可能令等待线程"饿死"。
3. **公平**：tryAcquire 仅多一行 `hasQueuedPredecessors()` 检查——有人排队就不抢；性能通常只有非公平的 1/10~1/3（信源经验值）。
4. **可中断/超时**：`lockInterruptibly()`、`tryLock(timeout, unit)` 支持响应中断与超时降级。
5. **多 Condition**：一把锁可挂多个条件队列（notFull/notEmpty），实现生产者/消费者精确唤醒，优于 synchronized 单一等待集的 notifyAll 全唤醒。
6. **手动释放**：unlock 必须在 finally 中调用，异常路径不释放则死锁。

## Structure（结构）

```
ReentrantLock
└── Sync extends AQS          // state 语义：0=未锁, >1=重入次数
    ├── NonfairSync           // tryAcquire 不查队列，直接 CAS
    └── FairSync              // tryAcquire 先 hasQueuedPredecessors()
```

## How It Works（运作方式）

- 加锁：非公平先 CAS 抢 → 失败走 AQS acquire 模板（tryAcquire → addWaiter → acquireQueued 自旋/park）。
- 解锁：sync.release(1) → tryRelease 减 state，到 0 清空 owner 返回 true → unparkSuccessor 唤醒 head 后继。
- 排队细节（仅前驱为 head 才重试、SIGNAL 状态传递、park/unpark）全部继承自 [[aqs-internals|AQS]] 骨架。

## Relationships（关系）

### Related Concepts（相关概念）

- [[concurrenthashmap-internals|ConcurrentHashMap 并发设计（JDK 8+）]]（同系列 JUC 并发原语，桶头 synchronized vs AQS 显式锁）

### Dependencies（依赖项）

- [[aqs-internals|AQS（AbstractQueuedSynchronizer）核心机制]]（全部排队/阻塞/唤醒机制的承载者）

### Distinctions（区分）

- 与 synchronized：JVM 层 vs Java 层（AQS）；自动释放 vs 显式 unlock；仅非公平 vs 公平可选；不可中断/超时 vs 支持；单等待集 vs 多 Condition；优化后性能差异不大，ReentrantLock 使用复杂度更高。

## Evolution（演进）

本系列下一篇预告为 ReentrantReadWriteLock——读写锁在同一 AQS state 上共存（高 16 位读/低 16 位写的切分当前信源未覆盖，未知）。

## Open Questions（开放问题）

- Condition 的内部条件队列与等待队列间的转移细节——当前信源仅一笔带过（未知）。
- 公平锁 "1/10~1/3" 性能数据缺基准测试支撑（信源为作者经验值）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-07-reentrantlock.md`

## Related Knowledge（相关知识）

- [[jdk-07-reentrantlock|JDK源码阅读(6) — ReentrantLock（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
