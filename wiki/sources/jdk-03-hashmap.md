---
id: wiki-source-jdk-03-hashmap
type: source
title: JDK源码阅读(3) — HashMap：面试之王，一文打透
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - jdk
  - collections
  - hashmap
sources:
  - raw/sources/misc/2026-10-27-jdk-03-hashmap.md
related:
  - wiki/sources/jdk-01-arraylist.md
  - wiki/sources/jdk-02-linkedlist.md
  - wiki/sources/jdk-source-reading-album.md
  - wiki/concepts/hashmap-internals.md
  - wiki/concepts/fail-fast-modcount.md
---
# JDK源码阅读(3) — HashMap：面试之王，一文打透

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列第 3 篇，全量拆解 HashMap：常量体系、Node/TreeNode 结构、hash 扰动、put/get/resize/treeifyBin 源码流程、tableSizeFor 容量对齐、JDK 7 vs 8 对比与高频面试问答。

## Key Facts（关键事实）

- 核心常量：默认容量 16（`1 << 4`）、最大容量 `1 << 30`、负载因子 0.75、树化阈值 8、退化阈值 6、最小树化容量 64。
- hash 扰动：`(h = key.hashCode()) ^ (h >>> 16)`，高 16 位异或低 16 位；桶定位 `(n - 1) & hash`，要求容量为 2 的幂。
- table 懒加载：首次 put 时经 resize() 初始化。
- put 流程：定位桶 → 空桶直接放 / 同 key 覆盖 / TreeNode 走红黑树插入 / 链表尾插（JDK 8 改尾插）→ 链表长度 ≥ 8 时若数组 < 64 先扩容、否则树化。
- resize 翻倍扩容，链表搬移用 `hash & oldCap == 0` 一次位运算拆为"原位置 j"与"j + oldCap"两条链，无需重新 rehash。
- `tableSizeFor` 把初始容量对齐到 ≥ cap 的最小 2 的幂（位或扩散 +1）。
- 阈值 8 与 6 之间留缓冲，避免链表/红黑树在边界频繁切换。
- 作者引 JDK 源码注释：负载因子 0.75 下链表长度达 8 的概率约 0.00000006（泊松分布）。
- 自定义 key 必须同时重写 hashCode 与 equals，否则 get 返回 null。
- HashMap 允许一个 null key（hash 按 0 处理）。

## Important Claims（重要论断）

### JDK 8 重构解决两个问题

哈希碰撞下链表过长性能骤降 → 红黑树把查询从 O(n) 降为 O(log n)；并发 resize 死循环 → 尾插 + 高低位链拆分（JDK 7 头插在并发 resize 时成环）。

### 数组 < 64 时优先扩容而非树化

扩容能让链表自然变短，比引入红黑树更划算——"能不能不做复杂操作，用更简单的替代方案"的权衡实例。

### 容量预估公式

已知数据量按 `new HashMap<>(initialSize / 0.75f + 1)` 预设，避免多次 resize。

## Concepts Introduced（引入的概念）

- [[hashmap-internals|HashMap 核心设计]]
- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]

## Entities Mentioned（提及的实体）

- java.util.HashMap / TreeNode / LinkedHashMap.Entry（JDK 类，不立实体页）
- ConcurrentHashMap / ConcurrentSkipListMap / Collections.synchronizedMap（线程安全替代，仅提及）

## Implications（影响／启示）

- 本文是系列后续 LinkedHashMap/HashSet/ConcurrentHashMap 篇的共同地基（TreeNode 继承 LinkedHashMap.Entry 的伏笔已埋下），概念层抽象见 [[hashmap-internals]]（解读）。

## Limitations（局限）

- 单一自媒体信源；hash 扰动一节的数值例子作者自认"不太好"（n=16 时扰动效果受限，真正收益在扩容后），阅读时以源码逻辑为准。
- "JDK 7 非并发下 get 也可能造成死循环"一句表述存疑（死循环一般发生于并发 resize），未经第二信源证实。
- "0.75 是泊松分布经验最优值"等归因出自 JDK 注释转述，非一手论证。

## Related Knowledge（相关知识）

- [[jdk-01-arraylist|JDK源码阅读(1) — ArrayList（信源页）]]
- [[jdk-02-linkedlist|JDK源码阅读(2) — LinkedList（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（信源页）]]
- [[hashmap-internals|HashMap 核心设计（概念页）]]
- [[fail-fast-modcount|Fail-Fast 迭代器（概念页）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-03-hashmap.md`
