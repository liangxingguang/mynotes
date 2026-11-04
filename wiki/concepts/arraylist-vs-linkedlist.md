---
id: wiki-concept-arraylist-vs-linkedlist
type: concept
title: ArrayList vs LinkedList 选型
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: high
tags:
  - concept
  - java
  - jdk
  - collections
sources:
  - raw/sources/misc/2026-11-04-arraylist-vs-linkedlist.md
  - raw/sources/misc/2026-10-27-jdk-01-arraylist.md
  - raw/sources/misc/2026-10-27-jdk-02-linkedlist.md
related:
  - wiki/concepts/hashmap-internals.md
  - wiki/concepts/arraydeque-internals.md
  - wiki/concepts/cache-line-and-false-sharing.md
  - wiki/concepts/fail-fast-modcount.md
  - wiki/sources/jdk-01-arraylist.md
  - wiki/sources/jdk-02-linkedlist.md
  - wiki/sources/arraylist-vs-linkedlist.md
---
# ArrayList vs LinkedList 选型

## Definition（定义）

Java List 两大实现的结构与复杂度差异：ArrayList 是动态数组（连续内存、随机访问 O(1)），LinkedList 是双向链表（指针跳跃、头尾操作 O(1)、按位访问 O(n)）。选型结论：按访问模式（随机/顺序/头尾/中间插入）定结构，绝大多数场景选 ArrayList。

## Why It Matters（为什么重要）

- 结构决定复杂度：同一操作在两种结构上可能是 O(1) 与 O(n) 之差，最坏情形（循环下标遍历 LinkedList）直接落到 O(n²)。
- 缓存与内存代价：连续内存对 CPU 缓存友好，链表每节点多约 24 字节指针开销——"LinkedList 更灵活"的直觉在多数场景不成立。
- 选型错误是隐性性能税：代码能跑，但复杂度与内存占用差一个量级，压测/线上才暴露。

## Core Characteristics（核心特征）

1. **ArrayList**：`Object[]` 动态数组；默认初始容量 10；扩容为原容量 1.5 倍（`oldCapacity + (oldCapacity >> 1)`），`Arrays.copyOf` 新建+复制；get/set 下标直取 O(1)；中间插入/删除需移位，最坏 O(n)。
2. **LinkedList**：双向链表 Node（数据+前后指针）；头尾插入/删除 O(1)；`get(index)` 从头遍历 O(n)（或从尾向头走半程，仍 O(n)）；每节点多约 24 字节开销；内存不连续。
3. **选型表**：随机读取/尾部追加/内存占用/缓存友好四项 ArrayList 胜；仅中间插入、头部插入 LinkedList 胜。
4. **实践结论**：实际开发约 90% 场景 ArrayList 够用；队列/栈场景用 `ArrayDeque`（比 LinkedList 更快），不是 LinkedList。
5. **经典坑**：循环里用 `get(i)` 下标遍历 LinkedList 是 O(n²)——10 万次遍历的量级爆炸，换 for-each（迭代器）或 ArrayList 即解。

## Structure（结构）

| 维度 | ArrayList | LinkedList |
|---|---|---|
| 底层结构 | `Object[]` 动态数组 | 双向链表 Node |
| 默认初始容量 | 10（无参构造懒加载，首次 add 分配） | 无（节点按需创建） |
| 扩容 | 1.5 倍（`oldCapacity + (oldCapacity >> 1)`） | 不扩容（每节点独立） |
| 随机访问 get(i) | O(1) | O(n) 从头遍历 |
| 尾部追加 add | 摊还 O(1)（触发扩容时 O(n)） | O(1) |
| 中间插入/删除 | O(n) 移位 | O(n) 定位 + O(1) 改指针（定位仍是瓶颈） |
| 内存 | 连续、紧凑 | 每节点多约 24 字节指针开销 |
| 缓存友好 | 是（连续内存） | 否（指针跳跃） |

（复杂度与容量数字经 [[jdk-01-arraylist]] / [[jdk-02-linkedlist]] 源码级信源互证；"每节点约 24 字节"为粗略估算。）

## How It Works（运作方式）

访问模式决定结构收益：顺序遍历/随机访问/尾部追加 → 数组的连续内存带来缓存行局部性（相邻元素同缓存行，见 [[cache-line-and-false-sharing]] 对 LinkedList Node 内存膨胀的分析）；头部/中间频繁插入 → 链表避免整体移位。判断口诀（信源给出）：先问"怎么访问"，再问"怎么插入"。

## Relationships（关系）

### Related Concepts（相关概念）

- [[hashmap-internals|HashMap 核心设计]]：同属集合框架底层原理，HashMap 的桶数组同样是"连续内存 + 位运算定位"的受益者；本页附录含 HashMap 四层考点的互证。
- [[arraydeque-internals|ArrayDeque 循环数组设计]]：队列/栈场景的推荐替代（比 LinkedList 更快）。
- [[cache-line-and-false-sharing|CPU 缓存行效应]]：ArrayList 缓存友好性与 LinkedList Node 内存膨胀的机理层。
- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]：两种 List 迭代器共用的并发修改检测机制。

### Dependencies（依赖项）

- [[jdk-01-arraylist]] / [[jdk-02-linkedlist]]（源码级信源：容量公式、扩容路径、Node 结构）

### Distinctions（区分）

- 与"LinkedList 更灵活所以更安全"的直觉不同：链表的优势仅限头尾/中间插入场景，随机访问与缓存表现全面落后。
- 与 Vector 的不同：Vector 同为动态数组但扩容 2 倍且方法同步（历史包袱），ArrayList 1.5 倍扩容、非同步。

## Evolution（演进）

- 2026-10-28 — 概念背景由 JDK 源码阅读系列（1）ArrayList 篇建立（默认容量 10、1.5 倍扩容、1000 元素扩容路径实测）。
- 2026-11-05 — 由面试向信源 `raw/sources/misc/2026-11-04-arraylist-vs-linkedlist.md` 独立建立本概念页：选型表、O(n²) 遍历坑、ArrayDeque 替代建议、HashMap 四层考点互证；关键数字与 JDK 源码阅读系列两信源互证，confidence=high。

## Open Questions（开放问题）

- "每节点多约 24 字节"的精确值依 JVM 实现（指针压缩/对象头）而定，两信源均为估算口径。
- 超大规模数据下 List 接口本身的局限（内存驻留 vs 流式处理）：当前信源未讨论。

## Evidence（证据）

- Source: `raw/sources/misc/2026-11-04-arraylist-vs-linkedlist.md`（选型表、O(n²) 案例、HashMap 四层考点、JDK 7/8 并发坑、ArrayDeque 建议、Vector 对比）
- Source: `raw/sources/misc/2026-10-27-jdk-01-arraylist.md`（源码级互证：DEFAULT_CAPACITY=10、懒加载、1.5 倍扩容、Arrays.copyOf）
- Source: `raw/sources/misc/2026-10-27-jdk-02-linkedlist.md`（源码级互证：双向链表 Node 结构、头尾操作）

## Related Knowledge（相关知识）

- [[arraylist-vs-linkedlist|ArrayList vs LinkedList 选型（信源页）]]
- [[jdk-01-arraylist|JDK源码阅读(1) — ArrayList（信源页）]]
- [[jdk-02-linkedlist|JDK源码阅读(2) — LinkedList（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（信源页）]]
