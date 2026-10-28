---
id: wiki-concept-collections-utility-class
type: concept
title: Collections 工具类设计（算法委托 + 三类包装器）
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
  - raw/sources/misc/2026-10-27-jdk-21-collections.md
related:
  - wiki/concepts/fail-fast-modcount.md
  - wiki/concepts/copyonwritearraylist-internals.md
  - wiki/concepts/arrays-utility-class.md
---
# Collections 工具类设计（算法委托 + 三类包装器）

## Definition（定义）

`java.util.Collections` 是服务于整个集合框架的纯静态工具类（final + 私有构造器），提供三类能力：算法操作（sort/shuffle/binarySearch 等）、包装器工厂（synchronized/unmodifiable/checked）、零开销集合创建（emptyList/singletonList 单例）。它是 Facade + Factory Method + Decorator 模式的混合体，把「一次实现、到处可用」的算法从各集合实现类中收敛到一处。

## Why It Matters（为什么重要）

它是集合框架的「最后一块拼图」：接口定规范、实现类给功能，Collections 提供横切的算法与安全包装。理解其委托链（Collections.sort → List.sort → Arrays.sort）与视图语义（包装器零拷贝、原集合变了视图跟着变），是避免 CME、误以为不可变等经典线上事故的前提。

## Core Characteristics（核心特征）

1. **算法委托而非自实现**：sort 委托 List.sort（内部转数组走 TimSort）；shuffle 用 Fisher-Yates；binarySearch 二分查找。
2. **RandomAccess 分路**：shuffle/binarySearch 对 RandomAccess 列表直接下标操作，对 LinkedList 等转数组或走迭代器（SHUFFLE_THRESHOLD 仅 5，对链表随机访问极不信任）。
3. **包装器即装饰器 + 视图**：synchronized/unmodifiable/checked 三类包装器不复制数据、不修改接口；同步包装每方法 `synchronized(mutex)`，不可变包装的修改方法直接抛 UnsupportedOperationException。
4. **迭代是同步包装器的盲区**：迭代器不加外部 `synchronized(包装器)` 则在并发修改下抛 CME——文档明写但极易踩坑。
5. **不可变视图 ≠ 不可变集合**：unmodifiableXxx 原集合变更视图跟随；真不可变是 Java 9 `List.of()`（且不允许 null）。
6. **零分配单例**：emptyList/singletonList/reverseOrder 返回缓存单例，零内存分配零 GC 压力。
7. **防溢出细节**：二分查找 `(low+high)>>>1` 替代 `/2` 防 int 溢出。

## How It Works（运作方式）

sort 三步走：`toArray()` → `Arrays.sort(TimSort)` → ListIterator 写回。同步包装器把每个方法体包进 `synchronized(mutex)`，mutex 默认为包装器自身、可指定外部锁；checkedXxx 在插入路径插入类型检查，不符立即抛 ClassCastException。

## Relationships（关系）

### Related Concepts（相关概念）

- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]：synchronizedList 迭代不同步时抛的 CME 正是 fail-fast 机制在并发场景的表现——它是错误检测器而非线程安全保证。
- [[copyonwritearraylist-internals|CopyOnWriteArrayList 写时复制设计]]：高并发读多写少场景下 synchronizedList 的替代。
- [[arrays-utility-class|Arrays 工具类设计]]：姊妹工具类，Collections 的 sort/binarySearch 最终落在 Arrays 实现上。

### Distinctions（区分）

- 与 Arrays 的不同：Collections 服务 Collection 框架（含同步/不可变包装器），Arrays 服务原生数组（含并行 sort/prefix），互不可替代。
- synchronizedList 与并发容器的不同：前者是「单方法粒度加锁的视图」，迭代不保证；后者（COW/CHM）在数据结构层设计并发语义。

## Evolution（演进）

- 2026-10-28 — 由 JDK 源码阅读系列第 21 篇（OpenJDK 21 源码）单信源建立。

## Open Questions（开放问题）

- BINARYSEARCH_THRESHOLD 等其余阈值的具体取值与调优依据，当前信源未给出。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-21-collections.md`（委托链源码、SHUFFLE_THRESHOLD=5、三类包装器实现、迭代器外部同步要求、与 Java 9 工厂方法对比表）

## Related Knowledge（相关知识）

- [[jdk-21-collections|JDK源码阅读(21)：Collections（信源页）]]
- [[jdk-22-arrays|JDK源码阅读(23)：Arrays（信源页）]]
