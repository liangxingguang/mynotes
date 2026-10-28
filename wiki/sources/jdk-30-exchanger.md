---
id: wiki-source-jdk-30-exchanger
type: source
title: Exchanger：一个被严重低估的线程间数据交换神器
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
  - raw/sources/misc/2026-10-27-jdk-30-exchanger.md
related:
  - wiki/concepts/exchanger-internals.md
  - wiki/concepts/cache-line-and-false-sharing.md
  - wiki/concepts/synchronousqueue-internals.md
  - wiki/sources/jdk-source-reading-album.md
---
# Exchanger：一个被严重低估的线程间数据交换神器

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码系列第 35 篇（作者编号）：剖析 JUC 中冷门的 Exchanger——让两个线程在汇合点**双向交换数据**的工具。API 仅两个 exchange 方法，内部集中了 CAS、动态自旋、park/unpark、缓存行填充等并发技巧。核心剖析单槽（Slot）到多槽 Arena 的渐进式扩容设计、防伪共享的 @Contended/手动填充，以及按 CPU 核数与 hash 值调整的自旋策略；附基本交换与流水线双 buffer 两个完整示例，及与 SynchronousQueue/BlockingQueue/CountDownLatch/CyclicBarrier 的五工具对比表。

## Key Facts（关键事实）

- 定位：`java.util.concurrent.Exchanger<V>`，JDK 1.5 引入，不实现任何接口；核心语义是两个线程在同一汇合点互换数据，先到者把自己放入 Slot 等待，后到者取走数据、留下自己的数据并唤醒对方。
- API 仅两个：`exchange(V x)`（无限等待）与 `exchange(V x, long timeout, TimeUnit unit)`（超时抛 TimeoutException）。
- 数据结构：Node（@jdk.internal.vm.annotation.Contended 注解，含 index/bound/collides/hash/item/volatile match/volatile Thread parked）；Slot extends AtomicReference<Object>，手动填充 15 个 long（q0~qe）防伪共享；每个线程经 ThreadLocal 持有一个 Node（participant）。
- slotExchange 算法：slot 非空则 CAS 置 null 抢配对（取 q.item、写 q.match、unpark 对方）；slot 为空则 CAS 把自己放入等待。
- Arena 多槽模式：`volatile Node[] arena` + `volatile int bound`；槽位索引 `j = (i + m) & (a.length - 1)`，按线程 hash 分散配对压力，属渐进式扩容。
- 自旋策略：SPINS = 1<<10 = 1024；NCPU > 1 才自旋（单核直接 park）；实际自旋次数按 hash 值动态计算、步长递减。
- 硬限制：线程数须成对，奇数个必有一个永久阻塞；无超时的 exchange 在对方永不到达时永久卡死，生产环境应用带超时版本。
- 适用场景（信源给出）：遗传算法基因交叉、流水线数据传递（双 buffer 一对一生产消费，全程只有两个 buffer 对象流转）、双线程实时对账。不适用：一对多分发（用 BlockingQueue）、多对多消息（用 Disruptor/Kafka）、日志汇聚（用 CountDownLatch + Queue）。
- 五工具对比表（信源给出）：Exchanger 是 JUC 中唯一**双向交换数据**的工具；SynchronousQueue 一对一但单向传递；BlockingQueue N 对 M 单向；CountDownLatch/CyclicBarrier 只同步不传数据。

## Important Claims（重要论断）

### Exchanger 是 JUC 中唯一双向交换数据的工具
作者对比同包五个同步/传递工具后得出：SynchronousQueue 虽一对一但只单向，其余均为单向或纯同步；双向交换是 Exchanger 的独占语义（信源观点）。

### 满足"恰好两线程 + 双方都要对方数据 + 汇合点明确"三条件就该用 Exchanger
作者给出的选型判据，示例为实时对账系统（线程 A 算余额、线程 B 算流水，汇合点交换结果）（信源观点）。

### "90% 的 Java 程序员没用过 Exchanger"
作者开篇的经验性判断，无数据支撑（信源观点，未经证实）。

## Concepts Introduced（引入的概念）

- [[exchanger-internals|Exchanger 双向交换设计（Slot→Arena 渐进扩容 + 动态自旋）]]

## Entities Mentioned（提及的实体）

- 公众号「Java解忧杂货铺」（单一自媒体信源，暂不立实体页）
- Doug Lea（JUC 作者，文中提及，不立新实体页）

## Implications（影响／启示）

- 从单槽到 Arena 的渐进式扩容（竞争失败才分散压力）与 LongAdder 的 base→Cell 升级、ConcurrentHashMap 的桶级分散同属"按需分散竞争点"家族（解读）。
- 防伪共享在 JDK 内部是"注解 + 手动填充"双轨制：Node 用 @Contended、Slot 手动垫 long——与 Disruptor 选手工填充弃 @Contended 的工程取舍互为对照（解读）。
- 系列导航：本文作者编号第 35 篇，文末预告下一篇为 ConcurrentLinkedQueue（Michael-Scott 无锁队列算法）（信源事实）。

## Limitations（局限）

- 单一公众号信源；文中源码为作者简化版（自述"简化版"），arenaExchange 的降级/扩容细节未展开（原文以"..."略过）。
- "伪共享可致 50% 性能差距""90% 程序员没用过"等量级表述无基准数据。
- 文末引导关注语写的是「程序猿技术漫谈」，与笔记及合集页署名「Java解忧杂货铺」不一致（疑为作者复制粘贴残留），不影响正文内容。

## Related Knowledge（相关知识）

- [[cache-line-and-false-sharing|CPU 缓存行效应：局部性与伪共享（概念页）]]（@Contended 与手动填充的又一 JDK 实例）
- [[synchronousqueue-internals|SynchronousQueue 直接交接设计（概念页）]]（同系列姊妹篇：一对一单向传递 vs 双向交换）
- [[jdk-source-reading-album|JDK 源码阅读合集（系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-30-exchanger.md`
