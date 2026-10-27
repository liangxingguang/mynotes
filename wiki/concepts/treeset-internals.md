---
id: wiki-concept-treeset-internals
type: concept
title: TreeSet 有序集合设计（TreeMap key 视图 + 红黑树）
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
  - raw/sources/misc/2026-10-27-jdk-08-treeset-vs-hashset.md
related:
  - wiki/concepts/hashset-internals.md
  - wiki/sources/jdk-08-treeset-vs-hashset.md
---
# TreeSet 有序集合设计（TreeMap key 视图 + 红黑树）

## Definition（定义）

TreeSet 是 JDK 的有序去重集合：内部持有 `NavigableMap`（实际为 TreeMap），元素全部作为 key 存储、value 统一指向哑对象 `PRESENT`；借助红黑树的排序性获得升序遍历与范围操作能力，增删查 O(log n)。

## Why It Matters（为什么重要）

它是 Java 集合体系中"排序 + 去重"需求的唯一标准答案：floor/ceiling/subSet/headSet/tailSet 等范围操作是 HashSet 体系完全不具备的能力，直接支撑排行榜、IP 段定位等典型业务。

## Core Characteristics（核心特征）

1. 组合委派：add = `m.put(e, PRESENT) == null`，remove/contains/iterator 全部委托底层 TreeMap。
2. 排序依据二选一：元素实现 `Comparable.compareTo()` 或构造时传入 `Comparator`。
3. 去重语义：**compareTo()/Comparator 返回 0 即判重，与 equals() 无关**——最常见踩坑点。
4. 遍历有序：`navigableKeySet()` 迭代 = 红黑树中序遍历 = 升序；另有降序迭代器。
5. 默认不允许 null（compareTo NPE），可自定义 Comparator 兼容；非线程安全。

## How It Works（运作方式）

- 插入时 TreeMap 按比较结果把 key 放到红黑树正确位置；key 已存在（compare 返回 0）时 put 返回旧 value（非 null），add 据此返回 false。
- 范围操作返回**视图而非副本**：`subSet(5,12)` 等结果与原集合共享数据，改视图影响原集合。
- 实测对比 HashSet（信源单机数据）：百万级插入慢约 11 倍（1682ms vs 152ms），10 万次查询慢约 5 倍（87.6ms vs 18.2ms）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[hashset-internals|HashSet / LinkedHashSet 去重设计]]（同样的 "Map key 视图" 模式，底层换成哈希表）

### Distinctions（区分）

- 与 [[hashset-internals|HashSet]] 的不同之处：TreeSet 用比较器换有序性与范围操作，代价是 O(log n) 与更高内存（红黑树节点存颜色与父子引用）；HashSet 用 hashCode+equals 换 O(1)，无序且允许一个 null。
- 并发有序需求由 ConcurrentSkipListSet（跳表）承担，而非加锁 TreeSet。

## Evolution（演进）

当前仅有单信源（公众号源码解读）覆盖 API 与委派层；TreeMap 红黑树的旋转/变色/删除修复细节尚无信源覆盖。

## Open Questions（开放问题）

- TreeMap 红黑树插入/删除修复的完整不变量（未知，当前信源未展开）。
- 与 ConcurrentSkipListSet 在有序并发场景的性能对比（未知）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-08-treeset-vs-hashset.md`

## Related Knowledge（相关知识）

- [[jdk-08-treeset-vs-hashset|TreeSet vs HashSet（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
