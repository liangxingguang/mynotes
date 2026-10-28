---
id: wiki-concept-delayqueue-internals
type: concept
title: DelayQueue 延迟阻塞队列设计（优先级堆 + leader-follower 精确等待）
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
  - raw/sources/misc/2026-10-27-jdk-27-delayqueue.md
related:
  - wiki/concepts/priorityqueue-internals.md
  - wiki/concepts/priorityblockingqueue-internals.md
  - wiki/concepts/reentrantlock-internals.md
  - wiki/concepts/scheduledthreadpoolexecutor-internals.md
  - wiki/sources/jdk-27-delayqueue.md
---
# DelayQueue 延迟阻塞队列设计（优先级堆 + leader-follower 精确等待）

## Definition（定义）

DelayQueue 是 JUC 的无界延迟阻塞队列：元素必须实现 `Delayed` 接口（`getDelay` + `compareTo`），内部用 [[priorityqueue-internals|PriorityQueue]] 按到期时间排小顶堆，队首恒为最早到期元素；消费者只能取走已到期（`getDelay <= 0`）的元素，未到期则阻塞等待。

## Why It Matters（为什么重要）

它回答"如何让任务在指定延迟后才被消费"这一经典问题：订单超时取消、缓存过期清理、会话超时管理等场景的标配组件；其 leader-follower 等待机制是消解除惊群效应的教科书式实现，并被 ScheduledThreadPoolExecutor 的 DelayedWorkQueue 沿用。

## Core Characteristics（核心特征）

1. 无界单锁：一把 ReentrantLock + 一个 `available` Condition；put 直接调 offer 不阻塞，无界须自行防 OOM。
2. 延迟语义外包给元素：排序与到期判断都依赖元素自身的 `getDelay`/`compareTo`，两者语义必须一致，且 getDelay 必须按当前时间动态计算（返回固定值是经典错误）。
3. offer 精准唤醒：仅当新元素成为队首（`q.peek() == e`）才重置 leader 并 signal，避免无效唤醒。
4. take 的 leader-follower：第一个发现队首未到期的线程成为 leader，用 `awaitNanos(delay)` 精确等待剩余时间；其余 follower 无限 `await()`；leader 取走元素后在 finally 中 signal 一个 follower 接任。平均每个元素只唤醒 1~2 个线程，消除惊群。
5. 杂项语义：poll() 非阻塞、poll(timeout) 上限取 `min(delay, nanos)`；drainTo 只导出已到期元素；不允许 null。

## How It Works（运作方式）

offer(e) → 持锁入堆 → 若成为队首则重置 leader、signal 等待者 → 返回 true。take() → 可中断持锁循环：队首 null 则 await；到期则 poll 返回；未到期时若已有 leader 则无限 await，否则自任 leader 并 awaitNanos(剩余时间)，醒来后归还 leader 身份重新检查。

## Relationships（关系）

### Related Concepts（相关概念）

- [[priorityqueue-internals|PriorityQueue 二叉堆设计]]（derived-from：堆排序与队首语义直接复用）
- [[reentrantlock-internals|ReentrantLock 可重入锁设计]]（depends-on：互斥与 Condition 的底座）
- [[scheduledthreadpoolexecutor-internals|ScheduledThreadPoolExecutor 调度设计]]（related：内部 DelayedWorkQueue 同为延迟堆 + Leader-Follower 等待）

### Distinctions（区分）

- 与 [[priorityblockingqueue-internals|PriorityBlockingQueue]]：同为 PriorityQueue 堆 + 单锁，但 PBQ 无延迟语义（按优先级即取），DelayQueue 多出 leader-follower 定时等待。
- 与 Timer / ScheduledThreadPoolExecutor / Netty HashedWheelTimer（信源对比表）：DelayQueue 精度高但消费者自拉、不支持周期任务；周期任务用 ScheduledThreadPoolExecutor；极高并发延迟任务用时间轮（O(1)）。

## Evolution（演进）

单信源（公众号源码解读）。作者称 take 在 JDK 9 后由"awaitNanos 加循环自旋"调整为"awaitNanos + leader 机制"（信源观点，未见一手 commit 佐证）。

## Open Questions（开放问题）

- leader 线程在 awaitNanos 期间被中断/异常退出时的 follower 接管时延未量化。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-27-delayqueue.md`

## Related Knowledge（相关知识）

- [[jdk-27-delayqueue|DelayQueue 延迟队列（信源页）]]
