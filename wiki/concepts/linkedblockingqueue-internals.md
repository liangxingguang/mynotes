---
id: wiki-concept-linkedblockingqueue-internals
type: concept
title: LinkedBlockingQueue 双锁阻塞队列设计（链表 + 滚动哨兵 + 跨锁信号）
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
  - raw/sources/misc/2026-10-27-jdk-19-linkedblockingqueue.md
related:
  - wiki/concepts/arrayblockingqueue-internals.md
  - wiki/concepts/reentrantlock-internals.md
  - wiki/concepts/aqs-internals.md
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/sources/jdk-19-linkedblockingqueue.md
---
# LinkedBlockingQueue 双锁阻塞队列设计（链表 + 滚动哨兵 + 跨锁信号）

## Definition（定义）

`java.util.concurrent.LinkedBlockingQueue` 的设计：以单向链表（`Node{item,next}`）承载 FIFO 队列，并发控制拆成两把独立的 `ReentrantLock`——`putLock` 只管入队（put/offer）、`takeLock` 只管出队（take/poll），各自绑定条件 `notFull`/`notEmpty`；元素计数用 `AtomicInteger count` 在双锁间共享；`head` 恒为哨兵节点（item==null），出队时把首元素节点滚动升为新哨兵。容量可选有界，默认 `Integer.MAX_VALUE`。

## Why It Matters（为什么重要）

它是「数据结构决定并发方案」原则的正例：链表天然能把队头/队尾操作分离到不同节点，因此入队与出队可以各持一把锁真正并行，高并发读写混合下吞吐优于单锁方案。它还示范了两个可复用的并发技巧——跨锁信号传递（条件变量绑定在对方锁上时，须先取对方锁再 signal）与用计数旧值做精确唤醒（只在 0→1、满→不满两个临界点跨界通知）。理解它是理解 JUC 阻塞队列家族（对比 [[arrayblockingqueue-internals|ArrayBlockingQueue]]）与线程池任务队列选型的关键一环。

## Core Characteristics（核心特征）

1. 双锁分离：生产者持 putLock 挂尾、消费者持 takeLock 取头，互不阻塞；`size()` 靠 `count.get()` 实现 O(1) 无锁读。
2. 滚动哨兵：`head` 恒指向 item==null 的哨兵；`dequeue` 取 `head.next` 的 item 后置 null 升为新哨兵，旧哨兵 `h.next = h` 自指助 GC——省新建节点，简化空队列边界条件。
3. 精确唤醒：put 后仅 `c == 0`（count 旧值）才 signalNotEmpty，take 后仅 `c == capacity` 才 signalNotFull；同侧余量充裕时只 signal 同侧条件（`c+1 < capacity` 唤 notFull、`c > 1` 唤 notEmpty），避免无效唤醒。
4. 跨锁信号传递：notEmpty 绑在 takeLock、notFull 绑在 putLock，跨界通知须先获取对方锁再 signal（signalNotEmpty/signalNotFull 独立封装）。
5. 全锁操作：`remove`/`contains`/`toArray`/`toString`/`drainTo` 需 fullyLock 同时持两把锁；drainTo 以一次全锁换批量转移，优于 n 次 poll。
6. 拒绝 null 元素（put 抛 NPE），因 null 被用作 take/poll 的"空"返回标识；不支持公平策略（链表天然 FIFO）。
7. 默认容量 `Integer.MAX_VALUE` 近乎无界：生产快于消费时无限膨胀直至 OOM，生产环境必须显式指定容量。

## Structure（结构）

```text
head → [哨兵 item=null] → [e1] → ... → [en] ← last
count: AtomicInteger（双锁共享）
putLock + notFull（生产者侧）   takeLock + notEmpty（消费者侧）
capacity: final int（默认 Integer.MAX_VALUE）
```

## How It Works（运作方式）

- 入队 `put`：`putLock.lockInterruptibly()` → `while (count.get() == capacity) notFull.await()` → `enqueue`（`last = last.next = node` 一行挂尾）→ `c = count.getAndIncrement()` → `c+1 < capacity` 则 signal notFull → 解锁后 `c == 0` 则 `signalNotEmpty()`（取 takeLock 再 signal）。
- 出队 `take`：对称——`takeLock` 内 `while (count.get() == 0) notEmpty.await()` → `dequeue`（滚动哨兵）→ `c = count.getAndDecrement()` → `c > 1` 则 signal notEmpty → 解锁后 `c == capacity` 则 `signalNotFull()`（取 putLock 再 signal）。
- 批量 `drainTo(c, max)`：fullyLock 一次，循环 dequeue 转移 `min(max, count)` 个元素，统一通知生产者。

## Relationships（关系）

### Related Concepts（相关概念）

- [[arrayblockingqueue-internals|ArrayBlockingQueue 单锁阻塞队列设计]]（同一问题的对偶解：数组+单锁；两者对比见 Distinctions）
- [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]（线程池任务队列即 BlockingQueue，其默认 `new LinkedBlockingQueue<>()` 无界用法正是 OOM 隐患的典型场景）

### Dependencies（依赖项）

- [[reentrantlock-internals|ReentrantLock 可重入锁设计]]（两把锁与两个 Condition 的直接提供者）
- [[aqs-internals|AQS 核心机制]]（锁与条件队列的底层基座）

### Distinctions（区分）

- 与 [[arrayblockingqueue-internals|ArrayBlockingQueue]]：双锁链表 vs 单锁循环数组；可选有界（默认无界）vs 必须有界；每次入队 new Node（GC 压力、性能波动大）vs 预分配数组（GC 友好）；滚动哨兵简化边界 vs null 表空位；不支持公平 vs 支持公平/非公平；根因是链表可分离队头队尾原子操作而数组不能（双信源互证）。
- 与 SynchronousQueue：有界缓冲 vs 零容量直接移交。

## Evolution（演进）

- 信源未指明基于的 JDK 版本；后续版本差异未见信源覆盖。
- 系列下期预告 PriorityBlockingQueue（堆序阻塞队列），截至本页创建未见对应信源。

## Open Questions（开放问题）

- 双锁相对单锁的吞吐优势幅度：信源与官方文档均为定性结论（"typically higher throughput but less predictable"），无基准数据。
- 高版本 JDK 对该类是否有实质性改动，当前信源未确立。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-19-linkedblockingqueue.md`

## Related Knowledge（相关知识）

- [[jdk-19-linkedblockingqueue|深度剖析 LinkedBlockingQueue（信源页）]]
- [[jdk-18-arrayblockingqueue|JDK源码阅读系列-ArrayBlockingQueue（信源页）]]
