---
id: wiki-source-jdk-08-treeset-vs-hashset
type: source
title: 灵魂拷问：TreeSet 和 HashSet 到底有什么区别？5张图彻底说清楚
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
  - raw/sources/misc/2026-10-27-jdk-08-treeset-vs-hashset.md
related:
  - wiki/sources/jdk-09-hashset-linkedhashset.md
  - wiki/sources/jdk-source-reading-album.md
  - wiki/concepts/treeset-internals.md
  - wiki/concepts/hashset-internals.md
---
# 灵魂拷问：TreeSet 和 HashSet 到底有什么区别？5张图彻底说清楚

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列文章（接 LinkedHashMap 篇），对比拆解 TreeSet 与 HashSet：两者分别是 TreeMap / HashMap 的 key 视图（value 统一为 PRESENT 哑对象）；红黑树 vs 哈希表的结构差异、O(log n) vs O(1) 的复杂度对比、百万级插入实测（TreeSet 慢约 11 倍）、TreeSet 独有的范围操作（floor/ceiling/subSet）与排行榜、IP 段定位两个实战场景。

## Key Facts（关键事实）

- TreeSet 底层是 TreeMap：`add(e)` = `m.put(e, PRESENT) == null`，增删查均为 O(log n)。
- HashSet 底层是 HashMap，平均 O(1)，无序。
- TreeSet 去重依赖 `compareTo()`/`Comparator` 返回 0，**与 equals() 无关**（信源强调的最常见踩坑点）。
- TreeSet 默认不允许 null（compareTo 触发 NPE），可用自定义 Comparator 兼容；HashSet 允许一个 null。
- TreeMap 的 `navigableKeySet()` 迭代 = 红黑树中序遍历 = 天然升序；另有 descendingIterator 降序。
- `subSet()/headSet()/tailSet()` 返回视图而非副本，改视图影响原集合。
- 实测（作者机器，随机整数）：100 万插入 HashSet 152.34ms vs TreeSet 1682.18ms（约 11 倍）；10 万次查询 18.21ms vs 87.63ms（约 5 倍）。
- 两者均非线程安全：TreeSet 用 `Collections.synchronizedSortedSet()` 或 ConcurrentSkipListSet（底层跳表）。

## Important Claims（重要论断）

### 不需要排序用 HashSet，需要排序或范围查询才用 TreeSet

作者选型结论：排序与范围操作（排行榜 topN、IP 段 floor 定位）是 TreeSet 的独占能力，为此付出约一个数量级的插入开销；纯去重/快速查找场景无脑 HashSet。

## Concepts Introduced（引入的概念）

- [[treeset-internals|TreeSet 有序集合设计]]
- [[hashset-internals|HashSet / LinkedHashSet 去重设计]]

## Entities Mentioned（提及的实体）

- JDK（java.util 包：TreeSet/HashSet/TreeMap；java.util.concurrent：ConcurrentSkipListSet）

## Implications（影响／启示）

- 需要并发有序集合时选 ConcurrentSkipListSet 而非加锁 TreeSet（解读）。
- TreeSet 的 compareTo 去重语义要求 Comparator 与 equals 保持一致，否则出现" equals 相等但进不去"的隐性丢数据（解读）。

## Limitations（局限）

- 性能数字为作者单机单次实测（随机整数、未预热），无 JMH 基准；红黑树操作仅作 API 级引用，未展开旋转/变色细节。

## Related Knowledge（相关知识）

- [[hashmap-internals|HashMap 核心设计（JDK 8）]]（HashSet 的底层）
- [[linkedhashmap-internals|LinkedHashMap 有序化设计]]（同系列前篇）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-08-treeset-vs-hashset.md`
