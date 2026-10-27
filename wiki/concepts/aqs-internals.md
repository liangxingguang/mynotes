---
id: wiki-concept-aqs-internals
type: concept
title: AQS（AbstractQueuedSynchronizer）核心机制
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
  - raw/sources/misc/2026-10-27-jdk-10-countdownlatch.md
related:
  - wiki/concepts/reentrantlock-internals.md
  - wiki/concepts/countdownlatch-internals.md
  - wiki/sources/jdk-07-reentrantlock.md
---
# AQS（AbstractQueuedSynchronizer）核心机制

## Definition（定义）

JUC 锁体系的抽象基座：一个 `volatile int state`（同步状态，语义由子类定义）+ 一个 CLH 锁队列变体（FIFO 双向链表等待队列）+ 模板方法骨架（acquire/release），子类只需实现 tryAcquire/tryRelease 等钩子即可构建各种同步器。

## Why It Matters（为什么重要）

ReentrantLock、CountDownLatch、ReentrantReadWriteLock 等 JUC 同步器全部是 AQS 的子类实现——"搞懂 ReentrantLock 就搞懂了一半的 JUC"（信源论断）；其 state 语义抽象 + 队列排队机制是 Java 层并发原语设计的通用范式。

## Core Characteristics（核心特征）

1. `volatile int state`：同步状态。ReentrantLock 中 0=未锁定、>1=重入次数；语义完全由子类解释。
2. `exclusiveOwnerThread`：独占模式下持有锁的线程（AbstractOwnableSynchronizer）。
3. 等待队列 Node：`waitStatus`（0/CANCELLED/SIGNAL/CONDITION/PROPAGATE）、`prev`/`next`（双向链表）、`thread`、`nextWaiter`（条件队列用）。
4. 模板方法：`acquire(arg)` = tryAcquire（子类实现）→ addWaiter（入队）→ acquireQueued（自旋/阻塞）；`release(arg)` = tryRelease（子类实现）→ 唤醒后继。
5. 排队机制：CAS + 自旋 + park/unpark——只有前驱为 head 的节点才重试获取，其余 park 阻塞。

## Structure（结构）

```
AQS
├── state: volatile int           // 同步状态
├── exclusiveOwnerThread: Thread  // 独占持有者
└── CLH 变体 FIFO 双向队列         // Node{waitStatus, prev, next, thread, nextWaiter}
    ├── head ── 已持有/刚释放锁的哨兵
    └── tail ── 新失败线程 CAS 尾插
```

## How It Works（运作方式）

- **入队**：addWaiter 先尝试 CAS 快速尾插，失败走 `enq()` 自旋安全入队。
- **自旋获取**：acquireQueued 循环——前驱是 head 才 tryAcquire（保证 FIFO）；否则 `shouldParkAfterFailedAcquire` 把前驱 waitStatus 置 SIGNAL，然后 `parkAndCheckInterrupt()` 真正阻塞。
- **唤醒**：release 中 tryRelease 成功后，若 head.waitStatus != 0 则 `unparkSuccessor(head)` 唤醒 head 的后继节点。
- **异常兜底**：acquireQueued 的 finally 中 failed 时 `cancelAcquire(node)` 取消节点。

## Relationships（关系）

### Related Concepts（相关概念）

- [[reentrantlock-internals|ReentrantLock 可重入锁设计]]（AQS 最经典的独占模式子类实现）
- [[countdownlatch-internals|CountDownLatch 门闩设计]]（AQS 共享模式子类实现：tryAcquireShared/tryReleaseShared + doReleaseShared 广播唤醒）

### Distinctions（区分）

- 与 synchronized（JVM monitor）的不同之处在于：AQS 是 Java 层实现（state+CAS+队列），支持公平性选择、可中断、超时获取与多条件队列；synchronized 由 JVM 的 monitorenter/monitorexit 实现，语义固定但自动释放。

## Evolution（演进）

- 2026-10-28：以 ReentrantLock 为样本讲解独占模式（jdk-07 信源）。
- 2026-10-28：jdk-11 信源补入共享模式样本（CountDownLatch：state 作计数器、SHARED 节点入队、doReleaseShared 广播唤醒）；Condition 内部条件队列的完整实现仍无信源覆盖。

## Open Questions（开放问题）

- 共享模式 doReleaseShared 的 PROPAGATE 级联唤醒链细节——jdk-11 信源只到"广播唤醒全部共享节点"，未逐行展开（未知）。
- CLH 变体与原始 CLH 队列的差异（如显式 prev 指针）当前信源未展开（未知）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-07-reentrantlock.md`
- Source: `raw/sources/misc/2026-10-27-jdk-10-countdownlatch.md`

## Related Knowledge（相关知识）

- [[jdk-07-reentrantlock|JDK源码阅读(6) — ReentrantLock（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
