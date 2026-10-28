---
id: wiki-source-jdk-19-linkedblockingqueue
type: source
title: 深度剖析 LinkedBlockingQueue：链表实现的阻塞队列，为什么比 ArrayBlockingQueue 快？
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
  - raw/sources/misc/2026-10-27-jdk-19-linkedblockingqueue.md
related:
  - wiki/concepts/linkedblockingqueue-internals.md
  - wiki/concepts/arrayblockingqueue-internals.md
  - wiki/sources/jdk-18-arrayblockingqueue.md
  - wiki/sources/jdk-07-reentrantlock.md
  - wiki/sources/jdk-source-reading-album.md
---
# 深度剖析 LinkedBlockingQueue：链表实现的阻塞队列，为什么比 ArrayBlockingQueue 快？

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列文章，逐行拆解 JUC 双锁阻塞队列 LinkedBlockingQueue：单向链表 + 哨兵节点 + takeLock/putLock 读写分离 + AtomicInteger 计数，附生产者-消费者完整示例、drainTo/remove 全锁操作说明与 ArrayBlockingQueue 的八维对比表和选型建议。

## Key Facts（关键事实）

- `java.util.concurrent.LinkedBlockingQueue`：可选有界阻塞队列，单向链表实现，FIFO；默认容量 `Integer.MAX_VALUE`（约 21 亿），不指定容量时生产快于消费会无限膨胀最终 OOM。
- 核心字段：`head`（哨兵节点，item==null）/`last` 尾指针、`AtomicInteger count`、两把 `ReentrantLock`（takeLock 管 take/poll、putLock 管 put/offer）与各自条件 notEmpty/notFull。
- 入队 `enqueue` 一行完成：`last = last.next = node`（从右往左执行）；入队只持 putLock，不碰 take 侧字段。
- 出队 `dequeue` 用「滚动哨兵」：把首元素节点滚动变为新哨兵（旧哨兵 `h.next = h` 助 GC，首节点取走 item 后置 null 升为新哨兵），不新建节点。
- 唤醒精确化：put 后仅当 `c == 0`（count 旧值，即队列从空变非空）才 `signalNotEmpty()`；take 后仅当 `c == capacity`（从满变不满）才 `signalNotFull()`；其余情况只 signal 同侧条件（`c + 1 < capacity` 唤 notFull、`c > 1` 唤 notEmpty）。
- 跨锁信号传递：notEmpty 绑定在 takeLock 上，生产者要通知消费者须先获取 takeLock 再 signal（signalNotEmpty/signalNotFull 独立方法完成）。
- count 用 AtomicInteger 的原因：两把锁下生产者和消费者会并发修改计数，必须保证原子性；`size()` 直接返回 `count.get()`，O(1) 且不加锁。
- `remove(Object)`/`contains(Object)`/`toArray()`/`toString()` 为全锁操作（fullyLock 同时持两把锁），防止遍历期间并发改乱链表结构。
- `drainTo(c, maxElements)` 一次全锁批量转移 n 个元素，优于循环 poll n 次（每次拿锁）。
- 明确拒绝 null 元素（put 抛 NPE），因 null 被 take/poll 返回值用作"队列空"标识。
- 官方文档原话："Linked queues typically have higher throughput than array-based queues but less predictable performance in most concurrent applications."（吞吐更高但性能波动更大，因链表涉及内存分配与 GC）。
- 与 ArrayBlockingQueue 对比：链表+双锁 vs 循环数组+单锁；可选有界（默认近乎无界）vs 必须有界；动态 Node 分配 vs 预分配数组；不支持公平策略（链表天然 FIFO）vs 支持公平/非公平。
- 选型建议：并发量高、读写比接近 → LinkedBlockingQueue；线程少且并发确定不高、GC 敏感 → ArrayBlockingQueue；批量 drainTo 两者性能差异不大。

## Important Claims（重要论断）

### 双锁读写分离是吞吐优势的根因

信源核心解读：putLock 只管入队、takeLock 只管出队，生产者与消费者互不阻塞，高并发读写混合场景吞吐显著优于单锁的 ArrayBlockingQueue；代价是实现更复杂，且引入跨锁信号传递这一特有模式。

### 默认无界是生产事故隐患

不指定容量时默认约 21 亿上限，生产速度持续大于消费速度时队列无限膨胀直至 OOM——生产环境必须显式指定容量。

## Concepts Introduced（引入的概念）

- [[linkedblockingqueue-internals|LinkedBlockingQueue 双锁阻塞队列设计（链表 + 滚动哨兵 + 跨锁信号）]]

## Entities Mentioned（提及的实体）

- JDK（java.util.concurrent：LinkedBlockingQueue；对照：ArrayBlockingQueue/PriorityBlockingQueue（下期预告）；依赖：ReentrantLock/Condition/AtomicInteger）

## Implications（影响／启示）

- 与 [[arrayblockingqueue-internals|ArrayBlockingQueue 单锁设计]] 互为镜像：链表天然可分离队头队尾原子操作，故能双锁；数组做不到，只能单锁——同一原则（数据结构决定并发方案）的正反两面（解读，双信源互证）。
- 阻塞队列选型无银弹：吞吐、内存/GC、公平性三者不可兼得，按并发度与 GC 敏感度取舍（信源结论）。

## Limitations（局限）

- 单一公众号信源；代码块在采集稿中为单行压缩形态，细节以 raw 收录原文与 JDK 源码为准。
- 性能结论无基准测试数据支撑（吞吐对比为定性描述+官方文档引语）。
- 未指明所基于的 JDK 具体版本；示例代码存在笔误（`currentThread().currentThread()`）。

## Related Knowledge（相关知识）

- [[jdk-18-arrayblockingqueue|JDK源码阅读系列-ArrayBlockingQueue（信源页）]]（本文的直接对照篇）
- [[jdk-07-reentrantlock|JDK源码阅读(6) — ReentrantLock（信源页）]]（两把锁与 Condition 的提供者）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-19-linkedblockingqueue.md`
