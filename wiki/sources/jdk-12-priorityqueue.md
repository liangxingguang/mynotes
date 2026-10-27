---
id: wiki-source-jdk-12-priorityqueue
type: source
title: JDK源码阅读(13) — PriorityQueue：藏在二叉堆里的优先级天堂
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
  - raw/sources/misc/2026-10-27-jdk-12-priorityqueue.md
related:
  - wiki/concepts/priorityqueue-internals.md
  - wiki/concepts/treeset-internals.md
  - wiki/sources/jdk-08-treeset-vs-hashset.md
  - wiki/sources/jdk-source-reading-album.md
---
# JDK源码阅读(13) — PriorityQueue：藏在二叉堆里的优先级天堂

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列第 (13) 篇（集合框架线），逐段拆解 PriorityQueue：底层 Object[] 数组承载隐式完全二叉堆，父子节点靠下标换算；offer 末尾插入后 siftUp 上浮、poll 取堆顶后末元素 siftDown 下沉；扩容分两档（<64 翻倍+2，≥64 扩 50%）；集合建堆用 Floyd 算法 O(n)。附小顶堆/大顶堆、任务调度器、Top-K 三组示例代码，与 TreeSet/TreeMap/排序数组的选型对比，及五条注意事项。

## Key Facts（关键事实）

- 底层 `transient Object[] queue`，默认初始容量 `DEFAULT_INITIAL_CAPACITY = 11`；父子下标换算：父 `(n-1)>>>1`、左子 `2n+1`、右子 `2n+2`。
- 默认小顶堆（自然排序），支持自定义 Comparator 实现大顶堆；不允许 null（offer(null) 抛 NullPointerException）；非线程安全，并发场景用 PriorityBlockingQueue。
- 复杂度：offer/poll O(log n)，peek O(1)，remove O(n)+O(log n)，contains O(n)，heapify O(n)。
- 扩容 `grow`：容量 <64 时 `oldCapacity + oldCapacity + 2`（翻倍+2），≥64 时 `oldCapacity + (oldCapacity >> 1)`（扩 50%），带 MAX_ARRAY_SIZE 溢出保护。
- `heapify()` 从最后一个非叶子节点 `(n>>>1)-1` 起自底向下 siftDown，Floyd 建堆 O(n)，快于逐个插入的 O(n log n)。
- `removeAt` 补位策略：末元素补到删除位，先 siftDown、若未移动再 siftUp，两次尝试覆盖所有方向。
- 迭代器不保证有序（数组存的是堆结构而非有序序列）；入队后修改元素比较字段不触发重排。

## Important Claims（重要论断）

### 迭代器无序、入队元素应不可变

按优先级遍历必须循环 poll()；入队后修改比较字段会导致出队顺序不确定，确需修改应先 remove 再 offer（信源注意事项）。

### 选型：取最值用堆，去重/有序遍历用 TreeSet

只需频繁取最值（任务调度、Top-K、Dijkstra）→ PriorityQueue；需要去重、有序遍历、范围查询 → TreeSet；不要用 TreeMap 模拟优先队列（信源对比表）。

### Top-K 用大顶堆维持 k 个元素

求最小的 K 个数用容量为 k 的大顶堆，超出即 poll 弹大者，O(n log k) 时间、O(k) 空间（信源示例）。

## Concepts Introduced（引入的概念）

- [[priorityqueue-internals|PriorityQueue 二叉堆设计（数组承载 + 上浮/下沉）]]

## Entities Mentioned（提及的实体）

- JDK（java.util 包：PriorityQueue/TreeSet/TreeMap/Collections；java.util.concurrent：PriorityBlockingQueue）

## Implications（影响／启示）

- PriorityQueue 不做全量排序，只做"堆序"——这是它 peek O(1)、插入 O(log n) 却迭代无序的根本原因（解读）。
- 动态中位数问题可用对顶堆（大顶堆存小半 + 小顶堆存大半）求解——信源文末思考题，未给完整实现（解读）。

## Limitations（局限）

- 未逐行展开 siftUpUsingComparator 变体（仅给 Comparable 版）；PriorityBlockingQueue 仅一句话提及，无源码拆解（属系列后续篇目）。
- 单一公众号信源，代码示例为教学简化版（如 `(a, b) -> b - a` 存在整数溢出风险，信源未提示）。

## Related Knowledge（相关知识）

- [[treeset-internals|TreeSet 红黑树设计]]（对比项：堆 vs 红黑树选型）
- [[jdk-08-treeset-vs-hashset|TreeSet vs HashSet 灵魂拷问（信源页）]]（同系列集合对比篇）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-12-priorityqueue.md`
