---
id: wiki-source-jdk-04-concurrenthashmap
type: source
title: JDK源码阅读(3) — ConcurrentHashMap：面试必问的并发HashMap
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - jdk
  - concurrency
  - collections
sources:
  - raw/sources/misc/2026-10-27-jdk-04-concurrenthashmap.md
related:
  - wiki/sources/jdk-03-hashmap.md
  - wiki/sources/jdk-source-reading-album.md
  - wiki/concepts/concurrenthashmap-internals.md
  - wiki/concepts/hashmap-internals.md
---
# JDK源码阅读(3) — ConcurrentHashMap：面试必问的并发HashMap

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列文章（作者标题编号"(3)"，合集顺序为第 4 篇），基于 JDK 21 源码拆解 ConcurrentHashMap：sizeCtl 三态控制字段、put 的 CAS + synchronized(桶头) 并发模型、get 无锁读、多线程协作扩容（transfer/helpTransfer/ForwardingNode）、spread 扰动与 Unsafe 数组操作，附 HashMap/HashTable 三方对比表、多线程计数与缓存两个实战示例及版本演进史。

## Key Facts（关键事实）

- 存储结构与 HashMap 一致：Node 数组 + 链表 + 红黑树；`table` 懒加载，`nextTable` 为扩容临时数组。
- `sizeCtl` 一个 int 承载三态：-1 初始化中；-N 表示 N-1 个线程在扩容；正数为扩容阈值（capacity × loadFactor）。
- putVal 流程：key/value 为 null 直接抛 NPE → 懒初始化 → 空桶 CAS 无锁插入 → 遇 `MOVED` 标识调 `helpTransfer` 帮忙扩容 → 冲突时 `synchronized(f)` 只锁桶头节点 → `binCount >= TREEIFY_THRESHOLD` 树化 → `addCount` 计数并触发扩容检查。
- get 全程无锁：`table` 引用及 Node 的 `val`/`next` 均为 volatile 保证可见性；首节点 hash < 0 时走特殊节点（红黑树/转移节点）的 `find`。
- 扩容多线程协作：每线程按 stride 申领区间（`(n >>> 3) / NCPU`，下限 `MIN_TRANSFER_STRIDE`）搬运，已搬完的桶置 `ForwardingNode`（hash = MOVED）标记。
- `spread(h) = (h ^ (h >>> 16)) & HASH_BITS`（0x7fffffff）：在 HashMap 扰动之上掩最高位保证非负，负值保留给特殊节点。
- `tabAt`/`casTabAt`/`setTabAt` 经 `Unsafe` 按偏移直接读写数组元素，因为 volatile 数组只保证引用可见性、不保证元素级 volatile 语义。
- ConcurrentHashMap 不允许 null key/value：多线程下 `get` 返回 null 无法区分"key 不存在"与"value 为 null"。
- 迭代器为弱一致性：不抛 ConcurrentModificationException，但可能读到旧值/漏读新值。
- `size()` 高并发下为近似值：JDK 21 经 `sumCount()` 对 `baseCount` + `CounterCell` 数组求和。
- 演进史：JDK 1.4- 用 HashTable 全表锁 → JDK 5 Segment 分段锁（16 段，作者称比 HashTable 快 16 倍）→ JDK 7 优化分段锁扩容 → JDK 8 重写为 CAS + synchronized(桶头) + 红黑树。

## Important Claims（重要论断）

### 读性能接近 HashMap

get 全程无锁、靠 volatile 可见性，读性能几乎与 HashMap 持平；整体比 HashMap 慢约 10%-30%（作者经验值）。

### 弱一致性迭代是设计选择而非 bug

为性能放弃遍历期强一致性；需要"遍历期间 map 不变"必须外部加锁。

### 多线程协作扩容是吞吐关键

put 发现扩容时不独占搬迁，只申领区间；其他线程看到 ForwardingNode 主动 helpTransfer，扩容成本由并发线程分摊。

## Concepts Introduced（引入的概念）

- [[concurrenthashmap-internals|ConcurrentHashMap 并发设计（JDK 8+）]]

## Entities Mentioned（提及的实体）

- Doug Lea（JUC 作者，文中提及）
- JDK 21（源码基准版本）

## Implications（影响／启示）

- 高并发读多写少、缓存（`computeIfAbsent`）、多线程计数三类场景应首选 ConcurrentHashMap；单线程或小数据量（<100 条）用 HashMap / `Collections.synchronizedMap()` 更简单。
- "volatile 数组不保证元素可见性"是理解 JUC 大量使用 Unsafe 的通用钥匙。

## Limitations（局限）

- 公众号二次解读，"快 16 倍""慢 10%-30%"等为作者经验性表述，无基准测试数据支撑；源码为精简版摘录而非完整实现。
- 红黑树化的并发细节（TreeBin 读写锁）与 CounterCell 竞争消除机制未展开。

## Related Knowledge（相关知识）

- [[hashmap-internals|HashMap 核心设计（JDK 8）]]（存储结构与扰动函数的共用基座）
- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]（弱一致性迭代的对照面）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-04-concurrenthashmap.md`
