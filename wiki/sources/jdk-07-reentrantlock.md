---
id: wiki-source-jdk-07-reentrantlock
type: source
title: JDK源码阅读(6) — ReentrantLock：可重入锁与 AQS 的优雅实现
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
  - raw/sources/misc/2026-10-27-jdk-07-reentrantlock.md
related:
  - wiki/sources/jdk-04-concurrenthashmap.md
  - wiki/sources/jdk-source-reading-album.md
  - wiki/concepts/aqs-internals.md
  - wiki/concepts/reentrantlock-internals.md
---
# JDK源码阅读(6) — ReentrantLock：可重入锁与 AQS 的优雅实现

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列文章（作者标题编号"(6)"，系列由集合框架转入 JUC 锁机制），拆解 ReentrantLock 与其基座 AQS：volatile state + CLH 变体 FIFO 双向等待队列 + acquire 模板方法；NonfairSync/FairSync 的 tryAcquire 差异、addWaiter/acquireQueued 入队自旋 park 流程、release/unparkSuccessor 唤醒链，附与 synchronized 九维对比表及计数器、超时锁、有界缓冲区三个实战示例。

## Key Facts（关键事实）

- AQS 核心字段：`volatile int state`（ReentrantLock 语义：0=未锁定，1=锁定，>1=重入次数）+ `exclusiveOwnerThread`（持有锁线程）。
- 等待队列为 CLH 锁队列变体：FIFO 双向链表，Node 含 waitStatus（0/CANCELLED/SIGNAL/CONDITION/PROPAGATE）、prev、next、thread。
- 非公平 `lock()` 先 `compareAndSetState(0,1)` 直接抢一次，失败才走 `acquire(1)` = tryAcquire + addWaiter + acquireQueued 模板流程。
- 公平锁与非公平锁唯一区别：tryAcquire 中多一行 `hasQueuedPredecessors()` 检查，有人排队就不抢。
- 可重入：持锁线程再次 tryAcquire 时 state 累加；`nextc < 0` 抛 "Maximum lock count exceeded"。
- acquireQueued 自旋规则：仅前驱为 head 的节点重试 tryAcquire；否则 `shouldParkAfterFailedAcquire` 把前驱置 SIGNAL 后 `park()` 阻塞，等 unpark。
- 解锁：`tryRelease` 把 state 减到 0 才真正释放并清空 owner；release 成功后 `unparkSuccessor(head)` 唤醒 head 后继。重入几次就要 unlock 几次。
- 公平锁性能通常只有非公平的 1/10~1/3（作者经验值）。
- 多 Condition（notFull/notEmpty）实现生产者/消费者精确唤醒，优于 synchronized 单一等待集的 notifyAll 全唤醒。

## Important Claims（重要论断）

### AQS 是整个 JUC 锁体系的基石

"搞懂了 ReentrantLock，你就搞懂了一半的 JUC"（作者论断）——CountDownLatch、ReentrantReadWriteLock 等均为 AQS 子类实现。

### 非公平是吞吐与公平的取舍

非公平锁允许新线程不排队直接 CAS 抢锁，可能令等待线程"饿死"，但换来更高吞吐量；无硬性公平要求应默认非公平。

### unlock 必须在 finally 中调用

ReentrantLock 不像 synchronized 由 JVM 自动释放；业务抛异常时锁永不释放，"轻则死锁，重则整个系统挂掉"。

## Concepts Introduced（引入的概念）

- [[aqs-internals|AQS（AbstractQueuedSynchronizer）核心机制]]
- [[reentrantlock-internals|ReentrantLock 可重入锁设计]]

## Entities Mentioned（提及的实体）

- JDK（java.util.concurrent.locks 包）

## Implications（影响／启示）

- 需要可中断、超时获取、公平性或多条件等待时用 ReentrantLock；简单互斥用 synchronized 更省事（解读）。
- `tryLock(timeout)` 超时降级是防死锁的实用模式，适用于响应时间敏感系统（解读）。

## Limitations（局限）

- 公众号二次解读，"公平锁性能 1/10~1/3"为作者经验值，无基准测试；源码为精简摘录。
- Condition 的内部条件队列实现仅一笔带过；锁降级、共享模式（CountDownLatch 类）未涉及。

## Related Knowledge（相关知识）

- [[concurrenthashmap-internals|ConcurrentHashMap 并发设计（JDK 8+）]]（同系列前篇，JUC 容器的另一条并发路线）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-07-reentrantlock.md`
