---
id: wiki-concept-hashmap-internals
type: concept
title: HashMap 核心设计（JDK 8）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: medium
tags:
  - concept
  - java
  - jdk
  - collections
  - hashmap
sources:
  - raw/sources/misc/2026-10-27-jdk-03-hashmap.md
related:
  - wiki/concepts/fail-fast-modcount.md
  - wiki/sources/jdk-03-hashmap.md
---
# HashMap 核心设计（JDK 8）

## Definition（定义）

JDK 8 HashMap 的底层设计：哈希桶数组 + 链表 + 红黑树的三层结构，配合扰动函数、2 的幂容量与负载因子驱动的翻倍扩容，在哈希分布良好时提供均摊 O(1) 的存取，分布恶劣时以红黑树兜底 O(log n)。

## Why It Matters（为什么重要）

HashMap 是 Java 集合体系的地基：LinkedHashMap、HashSet、ConcurrentHashMap 等均在其设计上演进或复用其结构；其常量体系（16/0.75/8/6/64）与扩容拆分算法是面试与生产调优的共同语言。

## Core Characteristics（核心特征）

1. 容量恒为 2 的幂（默认 16，最大 `1 << 30`），使 `(n - 1) & hash` 位运算等效取模且不丢信息；`tableSizeFor` 把任意初始容量向上对齐到 2 的幂。
2. 扰动函数 `(h = key.hashCode()) ^ (h >>> 16)` 让高 16 位参与桶定位，缓解小容量下"只有低位有效"导致的碰撞。
3. 负载因子 0.75：空间与时间的折中；`size > capacity × loadFactor` 即触发翻倍扩容。JDK 注释称此负载下链表长度达 8 的概率约 0.00000006（泊松分布）。
4. 树化双阈值：链表长度 ≥ 8 且数组长度 ≥ 64 才转红黑树；数组 < 64 时优先扩容（让链表自然变短）。退化阈值 6 与 8 之间留缓冲防抖动。
5. 扩容拆分：容量翻倍后，原桶元素按 `hash & oldCap == 0` 一次位运算拆为"原位置"与"j + oldCap"两条链，不重新计算 hash。
6. 懒加载：table 数组在首次 put 时才经 resize() 分配。

## How It Works（运作方式）

put：扰动后的 hash 定位桶 → 空桶直接放 / 同 key（hash 相等且 equals）覆盖 / 桶首为 TreeNode 走红黑树插入 / 否则链表尾插并在长度达阈值时尝试树化 → `++size > threshold` 触发 resize。get 为对称的只读路径。resize 翻倍容量与阈值，逐桶搬移：单节点直接重定位、TreeNode 走 split、链表按高低位拆分。自定义 key 必须同时重写 hashCode 与 equals，否则相等对象落入不同桶、get 返回 null。

## Relationships（关系）

### Related Concepts（相关概念）

- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]：HashMap 同样以 modCount 实现遍历期的结构修改检测。

### Distinctions（区分）

- 与 JDK 7 的不同：JDK 7 为数组+链表、头插法、4 次位运算+5 次异或的扰动、扩容逐个 rehash；JDK 8 引入红黑树、改尾插（消除并发 resize 成环死循环）、扰动减为 1 次异或、扩容改高低位链拆分。
- 树化是"分布恶劣的兜底"而非常态——链表长度 ≥ 8 在理想 hashCode 下几乎不发生。

## Evolution（演进）

- 2026-10-28 — 由《JDK源码阅读(3) — HashMap》单信源建立；系列后续 LinkedHashMap/ConcurrentHashMap/HashSet 篇摄入后应回填本页。

## Open Questions（开放问题）

- 当前仅单信源（公众号源码解读），常量归因（0.75、阈值 8 的泊松分布论证）转述自 JDK 注释，未直接引用 JDK 源码原文。
- 红黑树化的 rotate/balance 细节本信源未展开。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-03-hashmap.md`（常量定义、put/resize/treeifyBin 源码注释、JDK 7 vs 8 对比表、面试问答）

## Related Knowledge（相关知识）

- [[jdk-03-hashmap|JDK源码阅读(3) — HashMap（信源页）]]
