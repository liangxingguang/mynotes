---
id: wiki-concept-arrayblockingqueue-internals
type: concept
title: ArrayBlockingQueue 单锁阻塞队列设计（循环数组 + 双条件变量）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: medium
tags:
  - concept
  - java
  - jdk
  - concurrency
sources:
  - raw/sources/misc/2026-10-27-jdk-18-arrayblockingqueue.md
  - raw/sources/misc/2026-10-27-jdk-19-linkedblockingqueue.md
related:
  - wiki/concepts/linkedblockingqueue-internals.md
  - wiki/concepts/reentrantlock-internals.md
  - wiki/concepts/aqs-internals.md
  - wiki/concepts/arraydeque-internals.md
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/sources/jdk-18-arrayblockingqueue.md
---
# ArrayBlockingQueue 单锁阻塞队列设计（循环数组 + 双条件变量）

## Definition（定义）

`java.util.concurrent.ArrayBlockingQueue`（JDK 1.5 引入）的设计：以定长循环数组 `Object[] items` 承载 FIFO 队列，`takeIndex`/`putIndex` 两个游标在数组上循环前进（`++idx == items.length` 则回 0），`count` 记元素数；全部并发控制由一把全局 `ReentrantLock` 加两个 `Condition`（`notEmpty`/`notFull`）完成——`put` 满时等 `notFull`、成功后唤 `notEmpty`，`take` 空时等 `notEmpty`、成功后唤 `notFull`，形成对称闭环。容量构造时固定，不可扩容。

## Why It Matters（为什么重要）

它是 JUC 阻塞队列家族的「最简完整样本」：没有 CAS 自旋、没有分段锁，只用「锁 + 条件变量 + 循环数组」三个基本件就解决了有界生产者-消费者缓冲问题。它同时是理解 LinkedBlockingQueue（双锁链表）、PriorityBlockingQueue、DelayQueue 的入口，也是「数据结构决定并发方案」这一原则的反面教材级例证——数组结构无法分离队头队尾操作，所以只能单锁。

## Core Characteristics（核心特征）

1. 单锁模型：put/take/offer/poll/peek/size/clear 全部共用一把锁，任意时刻只有一个线程访问队列；吞吐受锁竞争限制，换来逻辑极简。
2. put/take 对称：`while` 循环（非 `if`）检查条件防虚假唤醒；`lockInterruptibly()` 使阻塞可响应中断。
3. 超时等待标准写法：`nanos = condition.awaitNanos(nanos)`，返回值即剩余时间，`nanos <= 0` 判超时（JUC 通用模式）。
4. 出队置 null 助 GC；dequeue 回调 `itrs.elementDequeued()` 维持迭代器一致性；迭代器为弱一致性（不抛 CME、不保证看到全部元素）。
5. `size()` 也加锁：仅为保证 happens-before，读到最新 count。
6. 内存预分配、GC 友好（对比 LinkedBlockingQueue 每次 new Node）；支持 `fair` 公平锁参数（默认非公平，公平牺牲吞吐）。
7. `drainTo` 批量转移比循环 poll 省多次加锁与条件检查。

## Structure（结构）

```text
items: Object[capacity]   // 循环数组，null 表示空位（拒绝 null 元素，故 null 可安全作空位标记）
takeIndex / putIndex / count
lock: ReentrantLock(fair?)
notEmpty / notFull: Condition
```

## How It Works（运作方式）

- 入队 `put`：`lockInterruptibly` → `while (count == items.length) notFull.await()` → `enqueue`（写 putIndex、游标回绕、count++、`notEmpty.signal()`）→ unlock。
- 出队 `take`：对称——`while (count == 0) notEmpty.await()` → `dequeue`（取 takeIndex、置 null、游标回绕、count--、通知迭代器、`notFull.signal()`）。
- 超时版 `offer(e, timeout, unit)`/`poll(timeout, unit)`：在 while 内用 `awaitNanos` 递减剩余时间，超时返回 false/null。

## Relationships（关系）

### Related Concepts（相关概念）

- [[arraydeque-internals|ArrayDeque 循环数组设计]]（同为循环数组+游标回绕，但非并发容器、可扩容）
- [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]（线程池任务队列即 BlockingQueue，有界队列选型直接影响拒绝策略触发）

### Dependencies（依赖项）

- [[reentrantlock-internals|ReentrantLock 可重入锁设计]]（锁与 Condition 的直接提供者）
- [[aqs-internals|AQS 核心机制]]（Condition 队列与锁同步的底层基座）

### Distinctions（区分）

- 与 LinkedBlockingQueue：单锁 vs 双锁（takeLock/putLock）；预分配数组 vs 每次 new Node；null 表空位 vs 哨兵节点；支持 fair vs 不支持；根因是数组无法分离队头队尾原子操作而链表可以。
- 与 SynchronousQueue：有界缓冲 vs 零容量直接移交（CAS/转移者模式）。

## Evolution（演进）

- 信源基于 JDK 8u 源码；后续版本差异未见信源覆盖。

## Open Questions（开放问题）

- 公平模式下的吞吐损失幅度（信源只说"牺牲一些吞吐量"，无数据）。
- 高版本 JDK（9+）对该类是否有实质性改动，当前信源未确立。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-18-arrayblockingqueue.md`

## Related Knowledge（相关知识）

- [[jdk-18-arrayblockingqueue|JDK源码阅读系列-ArrayBlockingQueue（信源页）]]
