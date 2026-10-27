---
id: wiki-concept-concurrenthashmap-internals
type: concept
title: ConcurrentHashMap 并发设计（JDK 8+）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: medium
tags:
  - concept
  - java
  - jdk
  - concurrency
  - collections
sources:
  - raw/sources/misc/2026-10-27-jdk-04-concurrenthashmap.md
related:
  - wiki/concepts/hashmap-internals.md
  - wiki/concepts/fail-fast-modcount.md
  - wiki/concepts/copyonwritearraylist-internals.md
  - wiki/sources/jdk-04-concurrenthashmap.md
---
# ConcurrentHashMap 并发设计（JDK 8+）

## Definition（定义）

JDK 8 起 ConcurrentHashMap 的并发模型：在 HashMap 的"数组+链表+红黑树"存储基座上，以 CAS 做空桶无锁插入、以 synchronized 只锁桶头节点处理冲突、以 volatile 保证读路径全程无锁、以多线程协作完成扩容，从而把锁粒度从"全表"压缩到"单桶"。

## Why It Matters（为什么重要）

ConcurrentHashMap 是 JUC 中使用率最高的并发容器，其"读无锁 + 写细粒度锁 + 协作式扩容"三板斧是 Java 并发容器设计的范式；sizeCtl 三态复用、ForwardingNode 协作标记、Unsafe 数组元素级操作等技巧可迁移到自定义并发结构设计。

## Core Characteristics（核心特征）

1. 读全程无锁：`table` 引用与 Node 的 `val`/`next` 均为 volatile，get 靠可见性而非互斥，读性能接近 HashMap。
2. 写锁粒度 = 桶头节点：空桶 CAS 插入；冲突时 `synchronized(桶首节点)` 遍历链表/红黑树插入，默认 16 个桶可并发写。
3. `sizeCtl` 单字段三态：-1 初始化中、-N 表示 N-1 个线程扩容中、正数为扩容阈值。
4. 协作式扩容：线程按 stride（`(n>>>3)/NCPU`，下限 MIN_TRANSFER_STRIDE）申领区间搬迁，已搬桶置 ForwardingNode（hash=MOVED）；后续 put 见到 MOVED 会 helpTransfer 帮忙。
5. 元素级可见性靠 Unsafe：volatile 数组不保证元素的 volatile 语义，`tabAt`/`casTabAt`/`setTabAt` 用 `Unsafe.getObjectAcquire`/`compareAndSetObject` 按偏移直读写。
6. 不支持 null key/value：并发下 get 返回 null 无法区分"不存在"与"值为 null"，属刻意设计。
7. 弱一致性迭代器 + 近似 size()：不抛 CME 但可能见旧值；size 经 baseCount + CounterCell 求和，高并发下非精确值。

## Structure（结构）

继承自 `AbstractMap`、实现 `ConcurrentMap`（与 HashMap 是兄弟而非父子）；底层 `transient volatile Node<K,V>[] table` + 扩容期 `nextTable`，结构与 [[hashmap-internals|HashMap 核心设计（JDK 8）]] 同源。

## How It Works（运作方式）

putVal：null 检查 → 懒初始化 → 空桶 CAS → 遇 MOVED 帮扩 → 锁桶头插入并按 TREEIFY_THRESHOLD 树化 → addCount 计数并检查扩容。get：spread 定位 → 首节点命中即返回；hash<0 走特殊节点 find；否则 volatile 链遍历。spread 在 HashMap 扰动基础上 `& 0x7fffffff` 保证非负，负 hash 留给 ForwardingNode/TreeBin 等特殊节点。

## Relationships（关系）

### Related Concepts（相关概念）

- [[hashmap-internals|HashMap 核心设计（JDK 8）]]：存储结构、扰动思路、树化阈值的共用基座。
- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]：HashMap 用 modCount 做强失败检测，ConcurrentHashMap 刻意选择弱一致性迭代——两种一致性策略的对照。

### Distinctions（区分）

- 与 HashTable：HashTable 全表 synchronized 串行化；ConcurrentHashMap 读无锁、写锁单桶。
- 与 HashMap：HashMap 单线程最快但线程不安全；ConcurrentHashMap 整体慢约 10%-30%（信源作者经验值）换取线程安全。
- 与 JDK 5/7 的自身：JDK 5/7 用 Segment 分段锁（16 段）；JDK 8 抛弃分段锁改 CAS + synchronized(桶头)，粒度更细。

## Evolution（演进）

- JDK 1.4-：HashTable 全表锁。
- JDK 5：Segment 分段锁（16 段）。
- JDK 7：分段锁优化扩容。
- JDK 8：全面重写，CAS + synchronized(桶头) + 红黑树 + 多线程协作扩容；JDK 8+ 持续优化。
- 2026-10-28 — 由《JDK源码阅读(3) — ConcurrentHashMap》单信源建立。

## Open Questions（开放问题）

- 树化后的并发读写在 TreeBin 上的锁机制（读锁/写锁）本信源未展开。
- addCount/CounterCell 的分桶计数与 LongAdder 的关系未展开（系列后续原子类/LongAdder 篇摄入后应回填）。
- "比 HashTable 快 16 倍""比 HashMap 慢 10%-30%"为信源作者经验值，缺基准数据。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-04-concurrenthashmap.md`（putVal/get/transfer 源码注释、三方对比表、演进史、实战示例）

## Related Knowledge（相关知识）

- [[jdk-04-concurrenthashmap|JDK源码阅读(3) — ConcurrentHashMap（信源页）]]
