---
id: wiki-source-jdk-06-linkedhashmap
type: source
title: JDK源码阅读(5) — LinkedHashMap：双向链表有序化与三行 LRU
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - jdk
  - collections
sources:
  - raw/sources/misc/2026-10-27-jdk-06-linkedhashmap.md
related:
  - wiki/sources/jdk-03-hashmap.md
  - wiki/sources/jdk-source-reading-album.md
  - wiki/concepts/linkedhashmap-internals.md
  - wiki/concepts/hashmap-internals.md
---
# JDK源码阅读(5) — LinkedHashMap：双向链表有序化与三行 LRU

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列文章（作者标题编号"(5)"），拆解 LinkedHashMap：Entry 继承 HashMap.Node 增加 before/after 双链指针，不重写 put 而是借 HashMap 的 newNode/afterNodeAccess/afterNodeInsertion 三个模板方法钩子维护链表；附插入序 vs 访问序 Demo、完整 LRUCache 实现及与 HashMap/TreeMap 三方对比表。

## Key Facts（关键事实）

- 继承自 HashMap（非平级）：拥有哈希表、扩容、红黑树全部能力，外加一条双向链表。
- `Entry<K,V> extends HashMap.Node<K,V>` 增加 `before`/`after` 指针：一个节点身兼哈希桶节点与双链表节点两职。
- 核心字段：`head`（最老节点）、`tail`（最新节点）、`final boolean accessOrder`（true=访问顺序，默认 false=插入顺序）。
- 不重写 put，靠三个钩子维护链表：`newNode`（创建 Entry 并 `linkNodeLast` 尾插）、`afterNodeAccess`（访问序模式下把节点移到尾部）、`afterNodeInsertion`（按 `removeEldestEntry` 返回值删头节点）。
- 迭代沿 `after` 指针走 O(n)：比 HashMap 扫桶数组（有空桶跳过）更快且顺序可预期。
- LRU 实现：构造传 `accessOrder=true` + 重写 `removeEldestEntry` 返回 `size() > maxCapacity`，两行核心代码；淘汰仅在 put 时被动触发。
- 非线程安全；每节点多两个指针，插入性能略低于 HashMap。
- 桶树化后红黑树节点的链表维护也由三个 `afterNode*` 钩子处理（JDK 8）。
- MyBatis 的 `LruCache`、Spring 部分缓存实现、各类工具类 `LRUMap` 均基于此。

## Important Claims（重要论断）

### 模板方法模式的经典应用

HashMap 预留 newNode/afterNodeAccess/afterNodeInsertion 三钩子，LinkedHashMap 不重写 put 即完成有序化，"代码写得干净漂亮"（作者评价）。

### 简单够用优于复杂自研

作者亲历：面试答"LRU 用 LinkedHashMap"即过关——不是性能最好，而是简单、够用、不出 bug（作者观点）。

### 读多业务下 LRU 淘汰会延迟

removeEldestEntry 只在 put 插入时触发检查；大量读操作的场景淘汰滞后，更完善的并发 LRU 应选 Guava/Caffeine 的 ConcurrentLinkedHashMap 系。

## Concepts Introduced（引入的概念）

- [[linkedhashmap-internals|LinkedHashMap 有序化设计（双链表 + 模板方法钩子）]]

## Entities Mentioned（提及的实体）

- MyBatis（LruCache 应用方）
- Spring（部分缓存实现应用方）

## Implications（影响／启示）

- 需要可预期迭代顺序或单线程 LRU 缓存时，LinkedHashMap 是 JDK 内置的最简方案；并发或读多场景需另选 Caffeine 等（解读）。
- "父类留钩子、子类填行为"的模板方法设计，是在不改写核心流程前提下扩展集合行为的范本（解读）。

## Limitations（局限）

- 公众号二次解读，"遍历比 HashMap 快得多"等性能表述无基准数据；源码为精简摘录。
- accessOrder 模式下并发行为的细节（modCount 维护与 fail-fast 交互）未展开。

## Related Knowledge（相关知识）

- [[hashmap-internals|HashMap 核心设计（JDK 8）]]（直接父类与存储基座）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-06-linkedhashmap.md`
