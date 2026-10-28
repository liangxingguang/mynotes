---
id: wiki-concept-arrays-utility-class
type: concept
title: Arrays 工具类设计（策略分派排序 + 并行大杀器）
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
  - raw/sources/misc/2026-10-27-jdk-22-arrays.md
related:
  - wiki/concepts/collections-utility-class.md
  - wiki/concepts/arraydeque-internals.md
---
# Arrays 工具类设计（策略分派排序 + 并行大杀器）

## Definition（定义）

`java.util.Arrays` 是面向原生数组的纯静态工具类（final + 私有构造器，JDK 1.2 起），覆盖排序、二分查找、复制、填充、比较、转换、并行操作等几乎全部数组操作。其设计精髓是**按类型与规模分派策略**：同一 `sort` 入口背后按基本类型/对象、大/小规模选择 DualPivotQuicksort、TimSort 或插入排序。

## Why It Matters（为什么重要）

它浓缩了 JDK 团队几十年的算法调优经验，是「面试官问 sort 用什么算法」的正确答案来源（基本类型≠对象、规模分档）；也是 Collections.sort 的最终落点。parallelSort/parallelPrefix 展示了 JDK 把 ForkJoinPool 包进普通静态方法的「隐形并行」手法。

## Core Characteristics（核心特征）

1. **排序策略分派**：基本类型 → DualPivotQuicksort（双轴快排，JDK 7 引入，平均减少约 20% 比较）；对象 → TimSort（识别天然有序 run，近似有序近 O(n)）；< 47 元素 → 插入排序（INSERTION_SORT_THRESHOLD）。
2. **二分防溢出**：`(low+high)>>>1`；未命中返回 `-(插入点+1)`。
3. **native 拷贝**：copyOf/copyOfRange 底层 System.arraycopy（内存块拷贝），远快于循环。
4. **隐形并行**：parallelSort 按 ForkJoinPool 并行度计算分片阈值（`1 + n/(p<<2)`），过小退化单线程；parallelPrefix 用并行归约做累积运算。收益门槛在百万级以上。
5. **视图陷阱**：asList 返回固定大小的内部 ArrayList 视图，不支持增删、与原数组联动。
6. **深浅两套 API**：一维 equals/toString，多维必须 deepEquals/deepToString；JDK 11 增加 mismatch/compare/compareUnsigned。

## How It Works（运作方式）

sort(int[]) → DualPivotQuicksort.sort；sort(Object[]) → ComparableTimSort.sort（除非 LegacyMergeSort.userRequested）。parallelSort 先算 sizeThreshold，超阈值则分片并行排序+合并，否则退化为单线程 sort。parallelPrefix 构造 ArrayPrefixHelpers.CumulateTask 交由 ForkJoin 框架执行。

## Relationships（关系）

### Related Concepts（相关概念）

- [[collections-utility-class|Collections 工具类设计]]：姊妹工具类；Collections.sort 内部转数组调 Arrays.sort 再写回，两者共享 TimSort。
- [[arraydeque-internals|ArrayDeque 循环数组设计]]：同属「围绕原生数组做工程优化」的 JDK 设计样本。

### Distinctions（区分）

- Arrays（原生数组）vs Collections（集合框架）：前者有并行 sort/prefix 与 deepXxx，后者有同步/不可变/类型检查包装器；排序内核共享，服务对象不同。
- Arrays.asList 的内部 ArrayList vs java.util.ArrayList：同名不同类——前者是固定大小视图，后者是动态数组。

## Evolution（演进）

- 2026-10-28 — 由 JDK 源码阅读系列（Arrays 篇，OpenJDK 23 源码）单信源建立。

## Open Questions（开放问题）

- DualPivotQuicksort 内部更多阈值（如单轴/双轴切换、归并 run 处理）当前信源未展开。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-22-arrays.md`（策略分派源码、47 阈值、>>>1 防溢出、parallelSort 分片公式、asList 视图与 deepEquals 坑）

## Related Knowledge（相关知识）

- [[jdk-22-arrays|JDK源码阅读(23)：Arrays（信源页）]]
- [[jdk-21-collections|JDK源码阅读(21)：Collections（信源页）]]
