---
id: wiki-source-arraylist-vs-linkedlist
type: source
title: 为什么 ArrayList 比 LinkedList 快？集合框架底层原理，一次讲清
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: high
tags:
  - source
  - java
  - jdk
  - collections
sources:
  - raw/sources/misc/2026-11-04-arraylist-vs-linkedlist.md
related:
  - wiki/concepts/arraylist-vs-linkedlist.md
  - wiki/sources/jdk-01-arraylist.md
  - wiki/sources/jdk-02-linkedlist.md
  - wiki/concepts/hashmap-internals.md
---
# 为什么 ArrayList 比 LinkedList 快？集合框架底层原理，一次讲清

## Overview（概览）

微信公众号「从CRUD到架构师」专辑《架构师之路》第 01 期，Java 集合框架三件套底层原理拆解：ArrayList（动态数组）vs LinkedList（双向链表）的复杂度对比与选型，HashMap 四层考点（哈希桶数组/冲突链表/JDK 8 树化/负载因子扩容），附线程安全坑与面试答法。属面试八股向教程，与已收录的 JDK 源码阅读系列（[[jdk-01-arraylist]]、[[jdk-02-linkedlist]]、[[jdk-03-hashmap]]）互为印证。

## Key Facts（关键事实）

- 开头案例：`LinkedList` 上用 `get(i)` 下标遍历 10 万次 = O(n²)，换 for-each 或 ArrayList 立即解决。
- ArrayList 底层：`Object[]` 动态数组，默认初始容量 10，扩容为原容量 1.5 倍（`oldCapacity + (oldCapacity >> 1)`），`Arrays.copyOf` 新建+复制；连续内存 → 随机访问 O(1)、CPU 缓存友好；代价是中间插入/删除需移位，最坏 O(n)。
- LinkedList 底层：双向链表 Node（数据+前后指针），内存不连续，每节点多约 24 字节开销；头尾插入/删除 O(1)，但 `get(index)` 从头遍历 O(n)。
- 选型表：随机读取/尾部追加/内存占用/缓存友好均 ArrayList 胜；仅中间插入、头部插入 LinkedList 胜。实际开发 90% 场景 ArrayList 够用；需要头尾操作队列/栈时用 `ArrayDeque`（比 LinkedList 更快），而不是 LinkedList。
- HashMap 四层考点：① 哈希桶数组，`hash & (capacity-1)` 位运算定位；② 冲突用链表串接；③ JDK 8 链表长度≥8 且数组≥64 转红黑树（查询 O(n)→O(log n)），≤6 退化回链表；④ 默认容量 16、负载因子 0.75，size>12 触发翻倍扩容。
- 线程安全：HashMap 非线程安全，JDK 7 并发 put 可能死循环（扩容时链表倒序），JDK 8 用 tail 指针避免但仍有数据覆盖风险；多线程用 `ConcurrentHashMap`。
- 面试加分项：ArrayList 扩容 1.5 倍 vs Vector 2 倍；HashMap 容量恒为 2 的幂（为了位运算替代取模）；HashMap 允许一个 null key（hash 特殊处理为 0，固定放桶 0 位），HashTable 不允许。

## Important Claims（重要论断）

### 循环里用下标遍历 LinkedList 是 O(n²) 的经典坑

`get(i)` 每次从头遍历，嵌套循环下复杂度平方级爆炸；for-each（迭代器）或 ArrayList 即解。这是"数据结构选型影响算法复杂度"的最直观教学案例。

### 90% 场景应选 ArrayList

随机读取、尾部追加、缓存友好、内存占用四项全胜；LinkedList 仅在中间/头部频繁插入时有优势，而该场景少见。队列/栈场景的正确答案是 `ArrayDeque` 而非 LinkedList。与 [[jdk-01-arraylist]] 的"90% 场景应选 ArrayList"论断互证。

### HashMap 四层考点是面试的结构化答法

桶数组 → 冲突链表 → JDK 8 树化（≥8 且数组≥64，≤6 退化）→ 负载因子 0.75/默认 16/size>12 扩容，四层递进对应"定位/冲突/兜底/扩容"四个面试追问点。与 [[hashmap-internals|HashMap 核心设计]] 概念页互证。

## Concepts Introduced（引入的概念）

- [[arraylist-vs-linkedlist|ArrayList vs LinkedList 选型]]

## Entities Mentioned（提及的实体）

- java.util.ArrayList / LinkedList / HashMap / ArrayDeque / ConcurrentHashMap / HashTable / Vector（JDK 集合类，不立实体页）

## Implications（影响／启示）

- 复杂度数字（O(1)/O(n)/O(n²)）不是背出来的，是由底层数据结构（连续内存 vs 指针跳跃）决定的——选型先看访问模式（随机/顺序/头尾/中间）再定结构。
- 默认容量 10 与 1.5 倍扩容意味着 ArrayList 在"已知数据量"场景应预分配容量，避免多次 O(n) 拷贝（与 [[jdk-01-arraylist]] 的容量预分配建议同源）。
- "面试八股"与"生产选型"在集合框架这一层高度重合：底层原理可直接转化为编码纪律（预分配、避免下标遍历链表、多线程用 ConcurrentHashMap）。

## Limitations（局限）

- 单一自媒体信源（公众号面试向文章），未引 JDK 源码原文；复杂度与容量数字与 JDK 源码阅读系列两信源互证，可靠性较高。
- "每节点多约 24 字节"为粗略估算（未区分指针宽度/对象头），精确值依 JVM 实现而定。
- 树化阈值、扩容公式等关键常量未附 JDK 源码注释出处（对照 [[hashmap-internals]] 已有源码注释级证据）。

## Related Knowledge（相关知识）

- [[arraylist-vs-linkedlist|ArrayList vs LinkedList 选型（概念页）]]
- [[jdk-01-arraylist|JDK源码阅读(1) — ArrayList（信源页）]]（初始容量/1.5 倍扩容互证）
- [[jdk-02-linkedlist|JDK源码阅读(2) — LinkedList（信源页）]]
- [[jdk-03-hashmap|JDK源码阅读(3) — HashMap（信源页）]]（四层考点互证）
- [[hashmap-internals|HashMap 核心设计（概念页）]]

## Source（信源）

- `raw/sources/misc/2026-11-04-arraylist-vs-linkedlist.md`
