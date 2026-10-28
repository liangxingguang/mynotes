---
id: wiki-source-jdk-13-arraydeque
type: source
title: ArrayDeque 源码深度剖析：比 LinkedList 更快的双端队列
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
  - raw/sources/misc/2026-10-27-jdk-13-arraydeque.md
related:
  - wiki/concepts/arraydeque-internals.md
  - wiki/sources/jdk-02-linkedlist.md
  - wiki/sources/jdk-source-reading-album.md
---
# ArrayDeque 源码深度剖析：比 LinkedList 更快的双端队列

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列篇目（集合框架线，PriorityQueue 篇之后），逐段拆解 ArrayDeque：底层循环数组（容量恒为 2 的幂）+ head/tail 双指针；addFirst/addLast 位运算环状定位；head==tail 触发 doubleCapacity 翻倍扩容并「分两段拷贝」重排为连续内存；push/pop 复用 addFirst/removeFirst 作栈。附队列/栈/双端/括号匹配/滑动窗口最大值五组示例，及与 LinkedList/Stack 的九维对比表。

## Key Facts（关键事实）

- 底层 `transient Object[] elements`，容量恒为 2 的幂；`MIN_INITIAL_CAPACITY = 8`，默认构造容量 16；head 指队头、tail 指下一个插入位。
- 定位用 `(index) & (elements.length - 1)` 位运算替代取模；`addFirst` 先移 head 再赋值，`addLast` 先赋值再移 tail。
- 初始化 `allocateElements` 用 5 次无符号右移 `>>>` 级联或运算把任意容量向上取整到 2 的幂，负数溢出时 `>>>= 1` 兜底。
- 扩容 `doubleCapacity`：仅当 `head == tail`（满）触发，容量 `n << 1` 翻倍；`System.arraycopy` 分两段拷贝（head→末尾、0→head），重排后 head=0、tail=n，后续访问退化为顺序内存。
- 复杂度：addFirst/addLast 均摊 O(1)（偶发扩容 O(n)），removeFirst/removeLast/getFirst/getLast O(1)，contains O(n)。
- 不允许 null（poll 用 null 表空队列，存 null 无法区分）；非线程安全（并发用 ConcurrentLinkedDeque）；`elements` 数组 transient，自定义 writeObject/readObject 只序列化实际元素。
- 迭代器无显式 modCount：`DeqIterator` 用 `fence` 字段记录创建时 tail，遍历时检查 `cursor != fence`；结构修改后可能取到不一致数据但不抛异常。

## Important Claims（重要论断）

### 官方推荐：栈用 ArrayDeque 替代 Stack，队列替代 LinkedList

Oracle 官方文档建议 "Deque implementations should generally be preferred over Stack"、"ArrayDeque is likely to be faster than LinkedList when used as a queue"；信源称作栈比有锁的 Stack 快 3~5 倍，从 JDK 6 起即为官方推荐方案。

### 扩容重排保证缓存局部性

「分两段拷贝」把环形元素重排为逻辑顺序的连续内存，之后所有操作都是顺序内存访问，CPU 缓存友好——这是 ArrayDeque 相对链表的核心性能来源（信源观点）。

### 内存浪费的代价

容量恒为 2 的幂 + 翻倍扩容，偶有浪费：存 5000 个元素时底层数组长度 8192（信源注意事项）。

## Concepts Introduced（引入的概念）

- [[arraydeque-internals|ArrayDeque 循环数组设计（2 的幂容量 + 位运算定位）]]

## Entities Mentioned（提及的实体）

- JDK（java.util 包：ArrayDeque/LinkedList/Stack/Vector；java.util.concurrent：ConcurrentLinkedDeque）

## Implications（影响／启示）

- ArrayDeque 迭代器的 fence 机制是 fail-fast 家族的一个"弱化变体"——不抛 ConcurrentModificationException 但允许读到不一致快照，与 ArrayList/HashMap 的 modCount 严格 fail-fast 形成谱系（解读）。
- 滑动窗口最大值用递减双端队列维护候选索引，是单调队列这一算法范式的标准模板（信源示例，解读）。

## Limitations（局限）

- 未逐行展开 DeqIterator 的 fence 检查细节；ConcurrentLinkedDeque 仅一句话提及，无源码拆解（属系列后续或超纲内容）。
- 单一公众号信源；"快 3~5 倍"为经验性表述，未给基准测试方法与数据。

## Related Knowledge（相关知识）

- [[jdk-02-linkedlist|LinkedList 源码篇（信源页）]]（对比项：链表队列 vs 循环数组队列）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-13-arraydeque.md`
