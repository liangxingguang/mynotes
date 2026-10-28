---
id: wiki-source-jdk-28-synchronousqueue
type: source
title: 深度剖析 SynchronousQueue — 零容量的神奇队列
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
  - raw/sources/misc/2026-10-27-jdk-28-synchronousqueue.md
related:
  - wiki/concepts/synchronousqueue-internals.md
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/concepts/arrayblockingqueue-internals.md
  - wiki/concepts/linkedblockingqueue-internals.md
  - wiki/sources/jdk-source-reading-album.md
---
# 深度剖析 SynchronousQueue — 零容量的神奇队列

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列 SynchronousQueue 篇：剖析容量恒为 0、不存储任何元素的"直接交接"阻塞队列——一个 transfer 方法靠参数 e 是否为 null 同时实现 put 和 take。重点讲双模式实现：非公平 TransferStack（Treiber 栈 + CAS + FULFILLING 配对标记）与公平 TransferQueue（FIFO），awaitFulfill 的先自旋后 park 优化，并解释 newCachedThreadPool 为何选用它；附生产者消费者完整示例、Dubbo 应用场景及与 ArrayBlockingQueue/LinkedBlockingQueue 的对比表。

## Key Facts（关键事实）

- 容量恒为 0：size() 恒返回 0，元素不停留；put 必须等 take 接手，"一手交钱一手交货"；不允许 null（put(null) 抛 NPE）。
- 抽象 `Transferer.transfer(E e, boolean timed, long nanos)`：e 非空为 put（生产者）、null 为 take（消费者），单方法承载双角色。
- 默认非公平模式 TransferStack：`volatile SNode head`；节点 mode 三态 REQUEST(0)/DATA(1)/FULFILLING(2)。
- TransferStack transfer 三分支：①栈空或栈顶同类 → CAS 头插入栈并 awaitFulfill 等待；②栈顶异类且非配对中 → 自设为 FULFILLING 节点，CAS 配对成功则 unpark 对方并双弹出栈返回；③栈顶正在配对中 → 帮忙推进（casHead 弹出已配对节点）。
- awaitFulfill 等待策略：按 CPU 核数决定先自旋（maxTimedSpins/maxUntimedSpins），自旋耗尽才 `LockSupport.park`；中断或超时则 tryCancel 并 clean。
- 公平模式 TransferQueue：FIFO 队列（QNode head/tail），先来先服务。
- 默认非公平的理由（信源）：LIFO 下新来的线程更"热"、CPU 缓存命中率更高、吞吐更好；代价是等待线程有饥饿风险。
- newCachedThreadPool 配置：corePoolSize=0、maximumPoolSize=Integer.MAX_VALUE、60s 闲置回收、SynchronousQueue 工作队列——offer 无空闲线程接手即返回 false，线程池立即新建线程。
- 坑：勿用 size()/isEmpty() 判断；offer/poll 非阻塞立即返回（等价 transfer(e, true, 0)）；任务处理慢会导致大量线程阻塞在 put 上堆积。
- 对比表（信源给出）：SynchronousQueue 吞吐极高（无锁实现）、内存占用几乎为 0；ArrayBlockingQueue 有界预分配数组；LinkedBlockingQueue 默认近无界链表、不支持公平模式。

## Important Claims（重要论断）

### "中间商不赚差价"是直接交接的核心哲学
没有中间缓存意味着没有延迟、没有内存占用，但要求生产消费双方步调一致——频率相近的双方用它最合适（信源观点）。

### Dubbo 线程池可选用 SynchronousQueue
Dubbo 线程池配置可指定 SynchronousQueue 实现"任务不排队、直接分配线程"，配合拒绝策略避免任务积压导致 OOM（信源转述，未给配置细节）。

## Concepts Introduced（引入的概念）

- [[synchronousqueue-internals|SynchronousQueue 直接交接设计（零容量 + 双模式无锁配对）]]

## Entities Mentioned（提及的实体）

- 公众号「Java解忧杂货铺」（单一自媒体信源，暂不立实体页）
- Dubbo（应用场景提及，未立页）

## Implications（影响／启示）

- 选型直觉：需要"任务必须立即被执行"语义的线程池（如缓存线程池）选 SynchronousQueue；需要削峰缓冲选有界队列（解读）。
- 先自旋后 park 的等待优化与 Treiber 栈配对算法在无锁并发编程中反复出现（解读）。

## Limitations（局限）

- 单一公众号信源；TransferQueue 公平模式只给了字段结构、未剖析其配对源码；"Dubbo 使用"为转述性断言。

## Related Knowledge（相关知识）

- [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]（newCachedThreadPool 的宿主）
- [[arrayblockingqueue-internals|ArrayBlockingQueue 单锁阻塞队列设计]]、[[linkedblockingqueue-internals|LinkedBlockingQueue 双锁阻塞队列设计]]（对比表对象）
- [[jdk-source-reading-album|JDK 源码阅读合集（系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-28-synchronousqueue.md`
