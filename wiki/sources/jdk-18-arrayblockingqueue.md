---
id: wiki-source-jdk-18-arrayblockingqueue
type: source
title: JDK源码阅读系列-ArrayBlockingQueue：用一把锁撑起的数组阻塞队列
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - jdk
  - concurrency
sources:
  - raw/sources/misc/2026-10-27-jdk-18-arrayblockingqueue.md
related:
  - wiki/concepts/arrayblockingqueue-internals.md
  - wiki/concepts/reentrantlock-internals.md
  - wiki/sources/jdk-19-linkedblockingqueue.md
  - wiki/sources/jdk-07-reentrantlock.md
  - wiki/sources/jdk-source-reading-album.md
---
# JDK源码阅读系列-ArrayBlockingQueue：用一把锁撑起的数组阻塞队列

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列文章，拆解 JUC 中最经典的阻塞队列 ArrayBlockingQueue（JDK 8u 源码）：定长循环数组 items + takeIndex/putIndex/count，全部并发控制用一把 ReentrantLock + 两个条件变量（notEmpty/notFull）完成。逐方法讲 put/enqueue/take/dequeue/超时 offer 源码，附生产者-消费者完整示例、与 LinkedBlockingQueue/SynchronousQueue 的三方对比表与踩坑经验。

## Key Facts（关键事实）

- 所在包 `java.util.concurrent`，继承 `AbstractQueue<E>`，实现 `BlockingQueue<E>`；数组支持的有界 FIFO 阻塞队列，容量构造时指定、不可再变。
- 核心字段：`final Object[] items`（循环数组）、`int takeIndex/putIndex/count`、`final ReentrantLock lock`、`Condition notEmpty/notFull`。
- put：`lockInterruptibly()` 加锁（可响应中断）→ `while (count == items.length) notFull.await()` → `enqueue`；enqueue 中 `++putIndex == items.length` 则回 0（循环数组），`count++` 后 `notEmpty.signal()`。take/dequeue 完全对称（等 notEmpty、唤 notFull、出队位置 null 助 GC）。
- 超时版 offer/poll 用 `nanos = notFull.awaitNanos(nanos)`，返回值即剩余等待时间，`nanos <= 0` 判超时——JUC 超时等待标准写法。
- 构造参数 `fair=true` 时锁公平（按等待时间顺序获取），牺牲吞吐量，默认 false。
- 所有操作（put/take/offer/poll/peek/size/clear）共用同一把锁：任意时刻只有一个线程能访问队列；`size()` 也要加锁以保证 happens-before。
- 迭代器弱一致性：迭代过程中允许修改队列，不抛 ConcurrentModificationException，但不保证看到全部元素；dequeue 会回调 `itrs.elementDequeued()`。
- `drainTo` 批量转移元素到目标集合，比循环 poll 少多次加锁/条件检查开销。
- 与 LinkedBlockingQueue 差异：单锁 vs 双锁（takeLock/putLock）；预分配数组（GC 友好）vs 每次 new Node；null 表空位 vs 哨兵节点；支持 fair vs 不支持；数组结构无法分离队头队尾操作是只能单锁的根因。
- 作者实践：容量固定，生产长期大于消费会阻塞全部 put 甚至死锁；可用 offer 超时+降级丢弃兜底；容量经验值 ≈ 峰值 QPS × 可容忍延迟秒数 × 1.5。

## Important Claims（重要论断）

### 数组结构决定了单锁设计

信源核心解读：LinkedBlockingQueue 能用双锁是因为链表天然可分离队头队尾的原子操作；ArrayBlockingQueue 的入队/出队可能访问同一数组位置，无法分离，只能一把全局锁——数据结构决定并发方案。

### while 而非 if 是防虚假唤醒的经典模式

某些操作系统上 `await()` 可能在条件未满足时返回（虚假唤醒）；while 循环重新检查确保被虚假唤醒后重回等待，而非在错误状态下执行入队/出队。

## Concepts Introduced（引入的概念）

- [[arrayblockingqueue-internals|ArrayBlockingQueue 单锁阻塞队列设计（循环数组 + 双条件变量）]]

## Entities Mentioned（提及的实体）

- JDK（java.util.concurrent：ArrayBlockingQueue/BlockingQueue；对照：LinkedBlockingQueue/SynchronousQueue；依赖：ReentrantLock/Condition）

## Implications（影响／启示）

- "锁 + 条件变量 + 循环数组"三要素糅合的最简阻塞队列样本，是理解 LinkedBlockingQueue/PriorityBlockingQueue/DelayQueue 的入口（解读）。
- 有界阻塞队列即天然的背压机制：容量估算公式（峰值 QPS × 可容忍延迟 × 1.5）+ offer 超时降级是生产可用的兜底组合（信源经验值，解读）。

## Limitations（局限）

- 单一公众号信源；基于 JDK 8u 源码，未覆盖后续版本差异。
- 容量公式与踩坑案例为作者经验值，无基准数据；迭代器弱一致性与 itrs 机制仅点到为止。
- 对比表中 SynchronousQueue 仅一行带过（CAS/转移者模式），未展开。

## Related Knowledge（相关知识）

- [[jdk-19-linkedblockingqueue|深度剖析 LinkedBlockingQueue（信源页）]]（本文的对照篇：双锁链表方案）
- [[jdk-07-reentrantlock|JDK源码阅读(6) — ReentrantLock（信源页）]]（本队列的锁与 Condition 即由它提供）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-18-arrayblockingqueue.md`
