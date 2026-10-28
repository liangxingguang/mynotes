---
id: wiki-source-jdk-21-collections
type: source
title: JDK源码阅读(21)：Collections工具类——被低估的瑞士军刀
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
  - raw/sources/misc/2026-10-27-jdk-21-collections.md
related:
  - wiki/concepts/collections-utility-class.md
  - wiki/concepts/fail-fast-modcount.md
  - wiki/concepts/copyonwritearraylist-internals.md
  - wiki/sources/jdk-22-arrays.md
  - wiki/sources/jdk-source-reading-album.md
---
# JDK源码阅读(21)：Collections工具类——被低估的瑞士军刀

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列文章，基于 OpenJDK 21 源码逐方法剖析 `java.util.Collections` 工具类：算法操作（sort/shuffle/binarySearch）、三类包装器工厂（同步/不可变/类型检查）、零开销集合创建（emptyList/singletonList），含核心源码片段、性能复杂度对照表、与 Arrays 及 Java 9 工厂方法的对比。

## Key Facts（关键事实）

- `Collections` 是 final 工具类、私有构造器，定位是集合框架的「算法库+工厂车间+安全卫士」；从设计模式看是 Facade + Factory Method + Decorator 的混合体。
- `sort()` 委托 `List.sort()`：List 转数组 → `Arrays.sort`（TimSort）→ 写回 List；最坏 O(n log n)，数据接近有序时最好 O(n)。
- `shuffle()` 用 Fisher-Yates 洗牌保证每个排列等概率；对非 RandomAccess 列表（LinkedList）先转数组再洗，`SHUFFLE_THRESHOLD` 仅为 5。
- `binarySearch` 用 `(low+high)>>>1` 无符号右移防 int 溢出；对非 RandomAccess 列表走迭代器版本（`iteratorBinarySearch`）；未找到返回 `-(插入点+1)`。
- `synchronizedXxx` 是装饰器：每个方法 `synchronized(mutex)`（mutex 默认为包装器自身），但**迭代器必须在外部手动同步**，否则并发修改抛 ConcurrentModificationException。
- `unmodifiableXxx` 所有修改方法直接抛 UnsupportedOperationException，且是**零拷贝视图**——原始集合变更会反映到视图；真正不可变要 Java 9 的 `List.of()` 或 Java 10 的 `List.copyOf()`。
- `emptyList()/emptySet()/emptyMap()` 返回单例实例，零内存分配；`reverseOrder()` 同样缓存单例 Comparator。
- `checkedList` 在插入时做运行时类型校验（不符即 ClassCastException），用于遗留 raw type 代码整合。
- 性能对照：sort O(n log n)、shuffle O(n)、binarySearch O(log n) 仅适用 RandomAccess、rotate/fill/copy/frequency 均 O(n)。

## Important Claims（重要论断）

### Java 9 的 List.of() 没有让 Collections 失去存在必要

`List.of()` 只替代了 `unmodifiableList` + `singletonList` 的部分场景；sort/shuffle/binarySearch 算法操作、synchronizedList 包装、frequency/rotate 等小功能仍无可替代（信源明确结论）。

### 高并发场景不要用 synchronizedList

`synchronizedList` 性能远不如 CopyOnWriteArrayList 或 ConcurrentHashMap；同步包装只适合在已有集合上临时加锁的场景（信源选型建议）。

## Concepts Introduced（引入的概念）

- [[collections-utility-class|Collections 工具类设计（算法委托 + 三类包装器）]]

## Entities Mentioned（提及的实体）

- JDK（java.util：Collections / List.sort / TimSort；对照：Arrays、Java 9 `List.of()`、CopyOnWriteArrayList、ConcurrentHashMap）

## Implications（影响／启示）

- 印证 [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]：synchronizedList 的迭代器不加外部锁时并发修改即抛 CME，再次说明 fail-fast 是编程错误检测器而非线程安全机制（解读）。
- 「List → 数组 → 排序 → 写回」三步走与 [[jdk-22-arrays|Arrays 篇]] 形成闭环：Collections.sort 的终点就是 Arrays.sort（解读）。

## Limitations（局限）

- 单一公众号信源；代码块在采集稿中为单行压缩形态，细节以 raw 收录原文与 JDK 源码为准。
- 「比快排快很多」「性能远不如」等均为定性结论，无基准数据。

## Related Knowledge（相关知识）

- [[jdk-22-arrays|JDK源码阅读(23)：Arrays（信源页）]]（姊妹工具类，本篇对比对象）
- [[copyonwritearraylist-internals|CopyOnWriteArrayList 写时复制设计]]（synchronizedList 的高并发替代）
- [[fail-fast-modcount|Fail-Fast 迭代器（概念页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-21-collections.md`
