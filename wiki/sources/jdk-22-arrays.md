---
id: wiki-source-jdk-22-arrays
type: source
title: JDK源码阅读 (23)：Arrays —— 被低估的瑞士军刀
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
  - raw/sources/misc/2026-10-27-jdk-22-arrays.md
related:
  - wiki/concepts/arrays-utility-class.md
  - wiki/concepts/collections-utility-class.md
  - wiki/sources/jdk-21-collections.md
  - wiki/sources/jdk-source-reading-album.md
---
# JDK源码阅读 (23)：Arrays —— 被低估的瑞士军刀

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列文章，基于 OpenJDK 23 源码剖析 `java.util.Arrays` 工具类：排序策略分派（DualPivotQuicksort/TimSort/插入排序阈值）、binarySearch 防溢出、parallelSort/parallelPrefix 基于 ForkJoinPool 的并行操作、copyOf 的 native 拷贝，以及 asList 视图、deepEquals 等常见坑。

## Key Facts（关键事实）

- `Arrays.sort` 是策略分派：基本类型数组走 **DualPivotQuicksort**（JDK 7 引入的双轴快排，平均减少约 20% 比较次数）；对象数组走 **TimSort**（2002 年 Tim Peters 为 Python 发明，识别天然有序片段 run，近似有序数据接近 O(n)）；小于 **47** 个元素退化**插入排序**（小规模常数优势）。
- `binarySearch` 用 `(low+high)>>>1` 防溢出；未找到返回 `-(low+1)`，还原插入点用 `index = -ret - 1`。
- `copyOf/copyOfRange` 底层走 native 的 `System.arraycopy`（内存块拷贝，类 memcpy），比 for 循环快一个数量级。
- `parallelSort`（JDK 8）：按 `ForkJoinPool` 并行度分片，规模阈值 `(1 + n/(p<<2))`，太小退化单线程；千万级大数组加速明显，几十万以内调度开销可能倒贴。
- `parallelPrefix`（JDK 8）：ForkJoinPool 并行归约做累积运算（前缀和/累积乘/最大值传播），百万级以上大数组收益明显。
- `Arrays.asList` 返回 Arrays 内部类 ArrayList——**固定大小视图**，不支持增删，且与原数组联动；要用需 `new ArrayList<>(Arrays.asList(...))`。
- 多维数组必须用 `deepEquals`/`deepToString`（递归比较/打印）；普通 equals 只比引用。
- JDK 11 新增 `mismatch`（找首个不同位置）、`compare`/`compareUnsigned`（字典序/无符号比较）。
- `Collections.sort` 本质是 List 转数组调 `Arrays.sort` 再写回——面试题「两者区别」的标准答案。

## Important Claims（重要论断）

### 日常排序不用纠结，Arrays.sort 已做最优选择

只有多核 + 百万级以上大数据量才值得换 parallelSort；几十万以内并行反而倒贴调度开销（信源选型结论）。

### 数组复制别手写循环

copyOf 走的 System.arraycopy 是 native 内存块拷贝，比手写循环快一个数量级（信源结论，定性无基准）。

## Concepts Introduced（引入的概念）

- [[arrays-utility-class|Arrays 工具类设计（策略分派排序 + 并行大杀器）]]

## Entities Mentioned（提及的实体）

- JDK（java.util：Arrays / DualPivotQuicksort / ComparableTimSort / LegacyMergeSort；并发底座：ForkJoinPool；对照：Collections、java.util.ArrayList）

## Implications（影响／启示）

- 与 [[collections-utility-class|Collections 工具类设计]] 互为镜像：Collections.sort 的终点是 Arrays.sort，两者共享 TimSort 内核（解读，双信源互证）。
- parallelSort/parallelPrefix 的「分片阈值 + 退化单线程」模式是 ForkJoinPool 类并行工具的统一形态：并行不是免费的，规模阈值是工程经验（解读）。

## Limitations（局限）

- 单一公众号信源；代码块在采集稿中为单行压缩形态，细节以 raw 收录原文与 JDK 源码为准。
- 「减少约 20% 比较次数」「快一个数量级」等均为定性结论，无基准环境。
- 采集稿存在笔误（正文 mismathc 应为 mismatch），以 JDK 源码为准。

## Related Knowledge（相关知识）

- [[jdk-21-collections|JDK源码阅读(21)：Collections（信源页）]]（姊妹工具类，本篇含两者对比表）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-22-arrays.md`
