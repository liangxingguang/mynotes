---
id: wiki-source-jdk-27-delayqueue
type: source
title: DelayQueue —— 延迟队列，让任务"迟到"的艺术
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
  - raw/sources/misc/2026-10-27-jdk-27-delayqueue.md
related:
  - wiki/concepts/delayqueue-internals.md
  - wiki/concepts/priorityqueue-internals.md
  - wiki/concepts/priorityblockingqueue-internals.md
  - wiki/concepts/scheduledthreadpoolexecutor-internals.md
  - wiki/sources/jdk-source-reading-album.md
---
# DelayQueue —— 延迟队列，让任务"迟到"的艺术

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列 DelayQueue 篇：剖析 JUC 无界延迟阻塞队列——本质是 PriorityQueue（按到期时间的小顶堆）+ ReentrantLock + Condition + leader-follower 优化，元素须实现 Delayed 接口、只有到期才能被取走。覆盖成员变量、offer/take/poll 源码、leader 机制如何避免惊群效应，附订单超时取消完整可运行示例、五条注意事项及与 ScheduledThreadPoolExecutor/Timer/Netty 时间轮的对比表。

## Key Facts（关键事实）

- 本质公式：PriorityQueue + ReentrantLock + Condition + leader-follower = DelayQueue；整个类约 300 行代码。
- 元素必须实现 `Delayed`（继承 `Comparable`）：`getDelay(TimeUnit)` 返回剩余到期时间，`compareTo` 决定堆排序（最早到期在队首）。
- 成员变量：`ReentrantLock lock`、`PriorityQueue<E> q`、`Thread leader`、`Condition available`。
- offer 时仅当新元素成为队首（`q.peek() == e`）才 `leader = null` 并 `available.signal()`，避免无效唤醒；无界故 put 直接调 offer 不阻塞。
- take 核心循环：队首为 null 则 `available.await()`；到期（`getDelay(NANOSECONDS) <= 0`）则 `q.poll()` 返回；未到期且无 leader 则自己成为 leader 并 `awaitNanos(delay)` 精确等待，已有 leader 则 follower 无限 `await()`。
- leader-follower 效果：平均每个元素只唤醒 1~2 个线程，消除 thundering herd（惊群）；take 的 finally 中若队列非空再 `signal()` 唤醒下一个。
- poll() 非阻塞（未到期返回 null）；poll(timeout) 等待时间取 `min(delay, nanos)`。
- 注意事项：getDelay 必须按当前时间动态计算（返回固定值是经典错误）；无界须防 OOM；不允许 null（PriorityQueue 底层不允许）；drainTo 只导出已到期元素。
- 对比表（信源给出）：DelayQueue 精度高（毫秒级）、消费者自拉；ScheduledThreadPoolExecutor 用线程池执行且支持周期任务；Timer 单线程性能差；Netty HashedWheelTimer 用时间轮达 O(1) 并发性能。

## Important Claims（重要论断）

### leader-follower 模式是本文最有价值的点
作者自述从 DelayQueue 学到的最大收获是 leader-follower："有时候唤醒一个就够了"，并称该模式在 Timer、ScheduledThreadPoolExecutor 及 Netty 等高性能框架中常见（信源观点）。

### JDK 9 后 take 方法有微调
作者称 take 在 JDK 9 之后从"awaitNanos(delay) 加循环自旋"改为"更精确的 awaitNanos + leader 机制"（信源观点，未给出具体 commit 佐证）。

## Concepts Introduced（引入的概念）

- [[delayqueue-internals|DelayQueue 延迟阻塞队列设计（堆 + leader-follower）]]

## Entities Mentioned（提及的实体）

- 公众号「Java解忧杂货铺」（单一自媒体信源，暂不立实体页）

## Implications（影响／启示）

- 典型应用场景（信源评级）：订单超时取消、缓存过期清理（五星）；简单定时任务调度、会话超时管理（四星）；长轮询/延迟重试（三星）；周期任务应改用 ScheduledThreadPoolExecutor。
- leader-follower 是可迁移的通用并发优化模式，不限于本类（解读）。

## Limitations（局限）

- 单一公众号信源，源码引述经作者简化排版；"JDK 9 微调"等历史性断言无一手佐证。

## Related Knowledge（相关知识）

- [[priorityqueue-internals|PriorityQueue 二叉堆设计]]（底层排序结构）
- [[priorityblockingqueue-internals|PriorityBlockingQueue 并发优先队列设计]]（同系上篇，同为堆+单锁但无延迟语义）
- [[scheduledthreadpoolexecutor-internals|ScheduledThreadPoolExecutor 调度设计]]（内部 DelayedWorkQueue 同样用 Leader-Follower 等待）
- [[jdk-source-reading-album|JDK 源码阅读合集（系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-27-delayqueue.md`
