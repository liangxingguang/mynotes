---
id: wiki-concept-hashset-internals
type: concept
title: HashSet / LinkedHashSet 去重设计（HashMap key 视图）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: medium
tags:
  - concept
  - java
  - jdk
  - collections
sources:
  - raw/sources/misc/2026-10-27-jdk-09-hashset-linkedhashset.md
  - raw/sources/misc/2026-10-27-jdk-08-treeset-vs-hashset.md
related:
  - wiki/concepts/hashmap-internals.md
  - wiki/concepts/linkedhashmap-internals.md
  - wiki/concepts/treeset-internals.md
  - wiki/concepts/enummap-enumset-internals.md
  - wiki/sources/jdk-09-hashset-linkedhashset.md
---
# HashSet / LinkedHashSet 去重设计（HashMap key 视图）

## Definition（定义）

HashSet 是 HashMap 的 key 集合视图：内部持有一个 HashMap，元素全部作 key，value 统一为静态占位对象 `PRESENT`；去重完全复用 HashMap 的 key 唯一性（hashCode 定位桶 + equals 桶内判同）。LinkedHashSet 通过包级私有构造把底层换成 LinkedHashMap，额外获得插入顺序。

## Why It Matters（为什么重要）

"不重复"是集合体系最高频的需求之一；理解 HashSet = HashMap 壳子，就能把哈希表全部知识（扰动、树化、扩容、fast-fail）直接迁移过来，并解释自定义对象去重失败、可变对象丢失等经典 BUG。

## Core Characteristics（核心特征）

1. 全方法委派：add/remove/contains/size/iterator 都是一行委托；`add(e)` = `map.put(e, PRESENT) == null`（put 返回旧值非 null 即判重失败）。
2. 去重两要素：`hashCode()` 决定入桶、`equals()` 决定判同——重写其一必须重写另一个。
3. LinkedHashSet 的全部增量 = 包级私有构造 `HashSet(capacity, loadFactor, dummy)` 换用 LinkedHashMap；dummy 参数仅区分签名，性能损失约 5~10%（信源经验值）换插入序。
4. 迭代器 = `map.keySet().iterator()`，继承 fast-fail（遍历中改结构抛 CME）。
5. 序列化自控：writeObject 自写 capacity/loadFactor/元素而非序列化 HashMap 本体，为跨 JDK 版本兼容。
6. 允许一个 null；非线程安全（synchronizedSet 或 ConcurrentHashMap.newKeySet()）。

## How It Works（运作方式）

add(e) → `map.put(e, PRESENT)` → hash(e) 定位桶 → 桶内 equals 判同：相等则覆盖旧 value 并返回之（add 返回 false），不等则拉链/树化新增（add 返回 true）。LinkedHashSet 在此之上由 LinkedHashMap 的双向链表维护插入序，迭代可预测。

## Relationships（关系）

### Dependencies（依赖项）

- [[hashmap-internals|HashMap 核心设计（JDK 8）]]（derived-from：HashSet 是其 key 视图）
- [[linkedhashmap-internals|LinkedHashMap 有序化设计]]（derived-from：LinkedHashSet 的有序性来源）

### Related Concepts（相关概念）

- [[treeset-internals|TreeSet 有序集合设计]]（同模式不同底层：红黑树换排序与范围操作）
- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]（迭代语义的机制来源）

## Evolution（演进）

双信源（jdk-08 对比篇 + jdk-09 源码篇）互证 "Map key 视图 + PRESENT" 结构；并发变体 ConcurrentHashMap.newKeySet() 仅提及未展开。

## Open Questions（开放问题）

- ConcurrentHashMap.newKeySet() 的内部实现与语义差异（未知，当前信源未展开）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-09-hashset-linkedhashset.md`
- Source: `raw/sources/misc/2026-10-27-jdk-08-treeset-vs-hashset.md`

## Related Knowledge（相关知识）

- [[jdk-09-hashset-linkedhashset|HashSet & LinkedHashSet 源码篇（信源页）]]
- [[jdk-08-treeset-vs-hashset|TreeSet vs HashSet 对比篇（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
