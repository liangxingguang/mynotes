---
id: wiki-concept-priorityqueue-internals
type: concept
title: PriorityQueue 二叉堆设计（数组承载 + 上浮/下沉）
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
  - raw/sources/misc/2026-10-27-jdk-12-priorityqueue.md
  - raw/sources/misc/2026-10-27-jdk-26-priorityblockingqueue.md
related:
  - wiki/sources/jdk-12-priorityqueue.md
  - wiki/concepts/priorityblockingqueue-internals.md
  - wiki/concepts/treeset-internals.md
---
# PriorityQueue 二叉堆设计（数组承载 + 上浮/下沉）

## Definition（定义）

PriorityQueue 是 JDK 的无界优先队列：用 `Object[]` 数组承载一棵隐式完全二叉堆，父子关系纯靠下标换算（父 `(n-1)>>>1`、左子 `2n+1`、右子 `2n+2`），通过上浮（siftUp）与下沉（siftDown）维护堆序，使堆顶恒为优先级最高者。

## Why It Matters（为什么重要）

它是"频繁取最值"场景的标准答案：任务调度、Top-K、Dijkstra 都靠它把取最值压到 peek O(1)、增删 O(log n)；同时也是"数组模拟树结构"这一空间压缩手法的教科书样本。

## Core Characteristics（核心特征）

1. 数组即堆：无节点对象，数组下标即完全二叉树层级遍历序，无指针开销。
2. 默认小顶堆（自然排序），传 Comparator 即大顶堆；比较器为 null 时要求元素实现 Comparable。
3. 上浮/下沉对称：offer 末尾插入后 siftUp 逐层与父比较上移；poll 取堆顶后末元素补位 siftDown（每轮取左右子中较小者比较）。
4. 扩容分两档：容量 <64 翻倍+2，≥64 扩 50%（`oldCapacity >> 1`），小容量求快、大容量省空间。
5. Floyd 建堆：从最后一个非叶子节点 `(n>>>1)-1` 自底向下 siftDown，O(n) 优于逐个插入 O(n log n)。
6. 堆序非全序：迭代器无序；入队后改比较字段不触发重排；不允许 null；非线程安全。

## How It Works（运作方式）

offer(e) → 满了先 grow → 放数组末尾 → siftUp：与父节点 `(k-1)>>>1` 比较，更小则父下沉、继续上探，直到不比父小。poll() → 取 `queue[0]` → 末元素补到堆顶 → siftDown：`half = n>>>1` 限定只在非叶子区循环，每轮选左右子较小者，比它大则子上移、继续下探。removeAt(i) → 末元素补位，先 siftDown、未移动再 siftUp，覆盖补位元素两个方向的可能性。

## Relationships（关系）

### Related Concepts（相关概念）

- [[treeset-internals|TreeSet 红黑树设计]]（alternative-to：取最值用堆，去重+有序遍历+范围查询用红黑树）

### Distinctions（区分）

- 与 [[treeset-internals|TreeSet]] 的不同之处：堆允许重复、peek 最值 O(1)、迭代无序、随机查找 O(n)；TreeSet 不允许重复、迭代有序、查找 O(log n)。
- 与 [[priorityblockingqueue-internals|PriorityBlockingQueue]] 的不同之处：堆逻辑（siftUp/siftDown、扩容公式）完全一致，后者加 ReentrantLock+notEmpty 得线程安全与阻塞消费，并以"释放主锁+CAS 令牌"分阶段扩容避免扩容阻塞读写。

## Evolution（演进）

双信源互证（PriorityQueue 篇 + PriorityBlockingQueue 篇，同作者）：siftUp/siftDown 与扩容公式在两类中逐行一致；siftUpUsingComparator 与 siftUpComparable 双变体并存（有无比较器分派），逻辑同构。

## Open Questions（开放问题）

- JDK 各版本间 PriorityQueue 实现的差异（未知）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-12-priorityqueue.md`
- Source: `raw/sources/misc/2026-10-27-jdk-26-priorityblockingqueue.md`（印证堆逻辑与扩容公式一致）

## Related Knowledge（相关知识）

- [[jdk-12-priorityqueue|PriorityQueue 源码篇（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
