---
id: wiki-concept-priorityblockingqueue-internals
type: concept
title: PriorityBlockingQueue 并发优先队列设计（堆 + 单锁 + 分阶段扩容）
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
  - raw/sources/misc/2026-10-27-jdk-26-priorityblockingqueue.md
related:
  - wiki/concepts/priorityqueue-internals.md
  - wiki/concepts/reentrantlock-internals.md
  - wiki/concepts/arrayblockingqueue-internals.md
  - wiki/concepts/linkedblockingqueue-internals.md
  - wiki/sources/jdk-26-priorityblockingqueue.md
---
# PriorityBlockingQueue 并发优先队列设计（堆 + 单锁 + 分阶段扩容）

## Definition（定义）

PriorityBlockingQueue 是 JUC 的无界优先阻塞队列：在 [[priorityqueue-internals|PriorityQueue]] 的数组二叉堆之上加一把 ReentrantLock 与一个 notEmpty Condition，使出队按优先级（堆顶恒为最高优先级）而非 FIFO，并在空队列时支持阻塞消费。

## Why It Matters（为什么重要）

它回答了"多线程场景下如何按优先级消费"这一独特问题：任务调度、紧急消息处理等场景需要线程安全 + 优先级语义 + 阻塞等待三者同时具备；其"扩容时释放主锁、CAS 令牌互斥"的分阶段扩容是锁内做耗时维护操作的经典解法。

## Core Characteristics（核心特征）

1. 无界：只有 notEmpty 没有 notFull；put 直接调 offer 不阻塞、offer 恒 true（除非 OOM）；take 空队列时阻塞、可中断。
2. 全互斥单锁：所有读写操作持同一把 ReentrantLock；因 siftUp/siftDown 涉及多数组元素读写，无法用 CAS 实现堆操作，故放弃无锁路线。
3. 分阶段扩容（tryGrow）：先释放主锁 → CAS 抢 allocationSpinLock（0→1）独占扩容 → 抢不到的线程 yield → 重新持锁后校验 `queue == array` 再换数组拷贝；扩容期间不阻塞其他读写。
4. 扩容阈值与 PriorityQueue 相同：容量 <64 每次 +2，≥64 扩 50%。
5. 堆语义全继承：迭代器无序（数组物理序）、入队元素不可改比较字段、不允许 null、复杂度 offer/take O(log n)、peek O(1)、contains O(n)。

## How It Works（运作方式）

offer(e) → 持锁 → 容量满则 tryGrow（释放锁、CAS 抢令牌扩容、重持锁提交）→ siftUp 上浮入堆 → size++ → notEmpty.signal 唤醒消费者。take() → 可中断持锁 → 空则 notEmpty.await → dequeue：取堆顶、末元素补位置 null、防泄漏、siftDown 下沉。堆的上浮/下沉代码与 PriorityQueue 完全一致。

## Relationships（关系）

### Related Concepts（相关概念）

- [[priorityqueue-internals|PriorityQueue 二叉堆设计]]（derived-from：堆数据结构与 siftUp/siftDown 直接复用，加锁与阻塞是其增量）
- [[reentrantlock-internals|ReentrantLock 可重入锁设计]]（depends-on：互斥与 Condition 阻塞的底座）

### Distinctions（区分）

- 与 [[arrayblockingqueue-internals|ArrayBlockingQueue]]：同为单锁阻塞队列，但 ABQ 有界双条件（notEmpty+notFull）、FIFO、循环数组不扩容；PBQ 无界单条件、优先级序、分阶段扩容。
- 与 [[linkedblockingqueue-internals|LinkedBlockingQueue]]：LBQ 双锁读写分离、FIFO、可选有界；PBQ 单锁、优先级序、无界。

## Evolution（演进）

单信源（公众号源码解读）；作者将分阶段扩容归为 Doug Lea 对并发性能的取舍设计（信源观点）。

## Open Questions（开放问题）

- 高锁竞争下与 Disruptor 等无锁方案的实际吞吐差距（当前信源未给基准数据）。
- JDK 各版本间 tryGrow 实现差异（未知）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-26-priorityblockingqueue.md`

## Related Knowledge（相关知识）

- [[jdk-26-priorityblockingqueue|PriorityBlockingQueue 源码篇（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
