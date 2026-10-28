---
id: wiki-source-jdk-26-priorityblockingqueue
type: source
title: 深度解析 PriorityBlockingQueue — JUC 里的"插队之王"
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
  - raw/sources/misc/2026-10-27-jdk-26-priorityblockingqueue.md
related:
  - wiki/concepts/priorityblockingqueue-internals.md
  - wiki/concepts/priorityqueue-internals.md
  - wiki/sources/jdk-12-priorityqueue.md
  - wiki/sources/jdk-source-reading-album.md
---
# 深度解析 PriorityBlockingQueue — JUC 里的"插队之王"

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列 PriorityBlockingQueue 篇，逐段拆解 JUC 的无界优先阻塞队列：本质是 PriorityQueue 的线程安全阻塞版——二叉堆 + 一把 ReentrantLock + 一个 notEmpty Condition。覆盖核心字段、offer/tryGrow/take/上浮下沉源码，重点讲"扩容时先释放主锁、用 CAS 抢 allocationSpinLock 扩容令牌、抢不到 yield"的分阶段扩容设计；附自然序、任务调度、阻塞消费三组示例，与 PriorityQueue 及其他 BlockingQueue 的两张对比表，及迭代器无序等五条避坑要点。

## Key Facts（关键事实）

- 本质公式：PriorityQueue（数组承载小顶堆）+ ReentrantLock + Condition = PriorityBlockingQueue；offer/take 均 O(log n)，peek/size O(1)，contains O(n)。
- 无界队列只有 notEmpty 没有 notFull：`put` 直接调 `offer` 不阻塞（offer 恒返回 true，除非 OOM），`take` 在空队列时 `notEmpty.await()` 阻塞、`lockInterruptibly` 可中断。
- 核心字段：`transient Object[] queue`、`ReentrantLock lock`、`Condition notEmpty`、`volatile int allocationSpinLock`（CAS 扩容令牌）；默认初始容量 11，MAX_ARRAY_SIZE = Integer.MAX_VALUE - 8。
- 扩容 tryGrow 三步：①先 `lock.unlock()` 释放主锁；②CAS 抢 allocationSpinLock（0→1），抢到者独占扩容，抢不到 `Thread.yield()`；③重新 `lock.lock()` 后换数组并 arraycopy。扩容策略与 PriorityQueue 相同：<64 每次 +2，≥64 扩 50%（`oldCap >> 1`）。
- 不用全 CAS 的原因：siftUp/siftDown 涉及多数组元素读写，CAS 复杂度过高，故用全互斥锁（信源归为 Doug Lea 的设计取舍）。
- 迭代器遍历数组物理顺序而非优先级顺序，按序消费只能循环 poll()；入队元素不可改比较字段否则堆结构错乱；不允许 null（NPE）；无界≠不 OOM，需监控队列长度。
- dequeue 细节：取堆顶后末元素补位、原位置置 null 防内存泄漏、再 siftDown。

## Important Claims（重要论断）

### 扩容设计是全文最有技术含量的部分

先释放主锁再 CAS 抢扩容令牌，扩容期间不阻塞其他线程读写；抢不到令牌的线程 yield 让出 CPU——用分阶段扩容消解了"堆扩容必须全程持锁"的吞吐瓶颈（信源观点，标注为作者评价）。

### 迭代器无序是最大的坑

PriorityBlockingQueue 的迭代器不保证优先级序（数组存的是堆结构）；要按序遍历只能不断 poll()。

### 场景选型：多线程按优先级消费

任务调度、紧急消息处理（告警/支付）、Dijkstra、TOP-K；同优先级不保证 FIFO。

## Concepts Introduced（引入的概念）

- [[priorityblockingqueue-internals|PriorityBlockingQueue 并发优先队列设计（堆 + 单锁 + 分阶段扩容）]]

## Entities Mentioned（提及的实体）

- JDK（java.util.concurrent：PriorityBlockingQueue/LinkedBlockingQueue/ArrayBlockingQueue/DelayQueue/SynchronousQueue；java.util：PriorityQueue）、Doug Lea（JUC 作者）

## Implications（影响／启示）

- 无界阻塞队列把"满"这个状态从协议里删掉了，代价是背压消失——生产者失控时 OOM 兜底，监控队列长度成为使用者的责任（解读）。
- "释放主锁 + CAS 小令牌"的分阶段模式可泛化：耗时维护操作（扩容/迁移）不必全程持大锁，只需令牌互斥 + 重入后校验状态（`queue == array`）再提交（解读）。

## Limitations（局限）

- 单一公众号信源，代码示例为教学简化版；对 allocationSpinLock 未讨论 ABA/内存语义细节。
- PriorityQueue 篇承诺的"PriorityBlockingQueue 实现未知"开放问题由本篇闭环；两类的扩容公式在代码层面完全一致（<64 翻倍+2），但本篇正文口语化表述为"少于 64 时每次只加 2"，与其所引代码（`oldCap + (oldCap + 2)`）不符，以代码为准。

## Related Knowledge（相关知识）

- [[priorityqueue-internals|PriorityQueue 二叉堆设计]]（非线程安全原型，堆逻辑完全复用）
- [[jdk-12-priorityqueue|PriorityQueue 源码篇（信源页）]]（同系列前篇）
- [[arrayblockingqueue-internals|ArrayBlockingQueue 单锁阻塞队列设计]]、[[linkedblockingqueue-internals|LinkedBlockingQueue 双锁阻塞队列设计]]（同族阻塞队列对比）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-26-priorityblockingqueue.md`
