---
id: wiki-concept-synchronousqueue-internals
type: concept
title: SynchronousQueue 直接交接设计（零容量 + 双模式无锁配对）
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
  - raw/sources/misc/2026-10-27-jdk-28-synchronousqueue.md
related:
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/concepts/arrayblockingqueue-internals.md
  - wiki/concepts/linkedblockingqueue-internals.md
  - wiki/concepts/futuretask-internals.md
  - wiki/concepts/atomic-variables-cas.md
  - wiki/concepts/exchanger-internals.md
  - wiki/sources/jdk-28-synchronousqueue.md
---
# SynchronousQueue 直接交接设计（零容量 + 双模式无锁配对）

## Definition（定义）

SynchronousQueue 是 JUC 容量恒为 0 的阻塞队列：内部不存储任何元素，生产者的 put 必须等消费者的 take 接手（反之亦然），实现线程间无缓冲的直接交接。整体无锁，基于 CAS + LockSupport.park/unpark 实现。

## Why It Matters（为什么重要）

它回答"如何让任务/数据在线程间零延迟、零内存开销地传递"的问题；是 `Executors.newCachedThreadPool()` 的工作队列选择——corePoolSize=0 搭配零容量队列使"任务不排队、无空闲线程立即新建线程"的语义得以成立。

## Core Characteristics（核心特征）

1. 零容量语义：size() 恒 0；offer/poll 非阻塞立即返回（无配对对象即失败）；put/take 阻塞直至配对。
2. 单 transfer 方法双角色：抽象 `Transferer.transfer(e, timed, nanos)`，e 非空为 put、null 为 take，核心逻辑高度内聚。
3. 双模式策略：默认非公平 TransferStack（LIFO，吞吐高但有饥饿风险）；fair=true 换 TransferQueue（FIFO 先来先服务）。
4. TransferStack = Treiber 栈 + 配对标记：节点 mode 三态 REQUEST/DATA/FULFILLING；同类入栈等待、异类 CAS 配对并 unpark 对方、他人配对中则帮忙推进；配对成功双节点一起弹栈。
5. awaitFulfill 两段等待：先按 CPU 核数自旋（配对通常很快，避免上下文切换），自旋耗尽才 park；中断/超时走 tryCancel + clean。
6. 默认非公平的缘由（信源）：LIFO 下新线程更"热"、缓存命中率高、吞吐更好。

## How It Works（运作方式）

put(e) → transfer(e, false, 0)：栈空或栈顶同类则 CAS 头插入栈 → awaitFulfill 等待被配对 → 被异类线程配对成功后 unpark 返回；遇异类节点则自设 FULFILLING 头节点 → casMatch 配对 → unpark 对方 → 双弹栈完成交接。take() 即 transfer(null, ...) 的对称路径。

## Relationships（关系）

### Related Concepts（相关概念）

- [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]（part-of：newCachedThreadPool 以其为工作队列实现不排队语义）
- [[atomic-variables-cas|Atomic 原子类设计（volatile + CAS 自旋）]]（depends-on：全队列无锁靠 CAS 原语）
- [[futuretask-internals|FutureTask 内部设计]]（related：同样使用 Treiber 无锁栈管理等待线程）

### Distinctions（区分）

- 与 [[arrayblockingqueue-internals|ArrayBlockingQueue]]：ABQ 有界预分配数组 + 单锁双条件，队列满才阻塞；SQ 零容量无锁，每次交接都要配对。
- 与 [[linkedblockingqueue-internals|LinkedBlockingQueue]]：LBQ 双锁链表、默认近无界、不支持公平；SQ 无缓冲、支持公平模式（TransferQueue）。
- 与 [[exchanger-internals|Exchanger 双向交换设计]]：同属一对一配对交接（CAS + park/unpark + 先自旋后阻塞）；SQ 单向传递（生产者不给消费者拿东西回来），Exchanger 双向互换且要求线程成对。

## Evolution（演进）

单信源（公众号源码解读）。

## Open Questions（开放问题）

- TransferQueue 公平模式的配对源码细节信源未展开（只给了 QNode 字段结构）。
- 非公平模式饥饿风险无量化数据。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-28-synchronousqueue.md`

## Related Knowledge（相关知识）

- [[jdk-28-synchronousqueue|深度剖析 SynchronousQueue（信源页）]]
