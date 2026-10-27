---
id: wiki-concept-linkedhashmap-internals
type: concept
title: LinkedHashMap 有序化设计（双链表 + 模板方法钩子）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: medium
tags:
  - concept
  - java
  - jdk
  - collections
  - lru
sources:
  - raw/sources/misc/2026-10-27-jdk-06-linkedhashmap.md
related:
  - wiki/concepts/hashmap-internals.md
  - wiki/sources/jdk-06-linkedhashmap.md
---
# LinkedHashMap 有序化设计（双链表 + 模板方法钩子）

## Definition（定义）

LinkedHashMap 继承 HashMap，在每个 Entry 上额外维护 before/after 双向链表指针，使哈希表同时具备可预期的遍历顺序（插入顺序或访问顺序），并通过 `removeEldestEntry` 钩子以两行核心代码实现 LRU 缓存。

## Why It Matters（为什么重要）

它以每节点仅多两个指针的代价补齐了 HashMap 的两个短板：无序遍历与无淘汰机制；MyBatis 的 LruCache、Spring 部分缓存实现均基于此。其「父类留钩子、子类填行为」的结构是模板方法模式的教科书式应用。

## Core Characteristics（核心特征）

1. `Entry<K,V> extends HashMap.Node<K,V>` 增加 before/after：一个节点身兼哈希桶节点（next 指针走拉链）与双链表节点两职。
2. 三字段：`head`（最老）、`tail`（最新）、`final boolean accessOrder`（false=插入序，true=访问序）。
3. **不重写 put**：靠 HashMap 预留的三个钩子维护链表——`newNode`、`afterNodeAccess`、`afterNodeInsertion`（外加 `afterNodeRemoval`）。
4. 迭代沿 after 指针走 O(n)：不扫桶数组、无空桶跳过，比 HashMap 遍历更快且顺序可预期。
5. 访问序模式下 get 触发 `afterNodeAccess` 把节点移到链表尾部，链头即最久未访问节点。
6. 非线程安全；插入性能略低于 HashMap。

## Structure（结构）

继承树：Object → AbstractMap → HashMap → LinkedHashMap。双向链表与哈希桶共用同一批 Entry 对象，内存开销为每节点 +2 个引用。

## How It Works（运作方式）

- 插入：HashMap.putVal 寻址/拉链/树化照旧，newNode 钩子里 `linkNodeLast(p)` 把新节点尾插双链表。
- 访问（accessOrder=true）：get 命中后 `afterNodeAccess` 把节点从当前位置摘下、接到尾部。
- 淘汰：put 完成后 `afterNodeInsertion(evict)` 检查 `removeEldestEntry(head)`（默认返回 false），为 true 则 removeNode 删除头节点——LRU 只需重写该方法返回 `size() > maxCapacity`。
- 淘汰是**被动触发**：只有 put 时才检查，纯读业务下淘汰会延迟。

## Relationships（关系）

### Related Concepts（相关概念）

- [[hashmap-internals|HashMap 核心设计（JDK 8）]]（直接父类：存储结构、扰动、扩容全部复用）

### Dependencies（依赖项）

- 依赖 HashMap 的模板方法钩子与 modCount 机制（afterNodeAccess 中仍维护 modCount，fail-fast 语义保留）。

### Distinctions（区分）

- 与 HashMap：多两个指针、迭代有序且更快、插入略慢、可实现 LRU。
- 与 TreeMap：TreeMap 按自然序/Comparator 排序、O(log n)；LinkedHashMap 按插入/访问序、O(1)。

## Evolution（演进）

JDK 8 起桶树化后，红黑树节点的双链指针维护也由三个 afterNode* 钩子统一处理（信源所述）。生产侧演进：并发或读多场景下被 Guava/Caffeine 的 ConcurrentLinkedHashMap 系取代（信源建议）。

## Open Questions（开放问题）

- 访问序模式下高并发读引发的链表移动竞争如何收敛——当前信源未覆盖，需外部资料（未知）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-06-linkedhashmap.md`

## Related Knowledge（相关知识）

- [[jdk-06-linkedhashmap|JDK源码阅读(5) — LinkedHashMap（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
