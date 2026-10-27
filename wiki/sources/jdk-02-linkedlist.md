---
id: wiki-source-jdk-02-linkedlist
type: source
title: JDK源码阅读(2) — LinkedList：双向链表，不只是个List
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
  - raw/sources/misc/2026-10-27-jdk-02-linkedlist.md
related:
  - wiki/sources/jdk-01-arraylist.md
  - wiki/sources/jdk-03-hashmap.md
  - wiki/sources/jdk-source-reading-album.md
  - wiki/concepts/cache-line-and-false-sharing.md
---
# JDK源码阅读(2) — LinkedList：双向链表，不只是个List

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列第 2 篇，拆解 LinkedList 的 Node 结构、linkFirst/linkLast/node()/linkBefore 源码、Deque/Stack 三栖接口与 ListIterator 增强能力，并以内存占用与 CPU 缓存视角给出选型结论。

## Key Facts（关键事实）

- LinkedList 同时实现 `List<E>` 与 `Deque<E>`（继承 `AbstractSequentialList`），兼作列表、双端队列与栈（push→addFirst，pop→removeFirst）。
- 内部节点 `Node` 三字段：`prev/item/next`；头尾指针 `first/last` 均为 transient。
- 头插/尾插只改指针，O(1)；但每次插入都要 new Node，常量开销与 GC 压力大于 ArrayList。
- `node(index)` 按 `index < size >> 1` 折半决定从头还是从尾遍历，最坏 O(n/2)，按索引访问本质仍是 O(n)。
- "中间插入"分两种：已知节点引用时 O(1)（改 4 次指针）；按 index 插入时遍历主导，整体 O(n)。
- JDK 8 指针压缩下一个 Node 约 32 字节（对象头 12 + item 4 + next 4 + prev 4 + 对齐 8），对比 ArrayList 每元素 4 字节引用，约 8 倍内存差距。
- for-i 循环 `get(i)` 遍历 LinkedList 退化为 O(n²)；必须用迭代器（O(n)）。
- LinkedList 的 ListItr（ListIterator）支持双向遍历与遍历中 O(1) 插入/删除/替换。

## Important Claims（重要论断）

### LinkedList 的最佳定位是"混合场景"

（作者观点/解读）纯栈/队列场景 ArrayDeque 性能更好；LinkedList 适合"偶尔按索引访问 + 频繁头尾操作"的双端队列+列表混合需求。

### 内存与缓存决定实战选型

（作者观点/解读）业务开发中 LinkedList 使用率远低于 ArrayList：大多数场景只是遍历容器，连续内存 + 缓存友好天然占优；面试加分项是能讲清指针压缩对 Node 内存的影响与 CPU 缓存行预取。

## Concepts Introduced（引入的概念）

- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]（ListItr 同样以 expectedModCount 检查）

## Entities Mentioned（提及的实体）

- java.util.LinkedList（JDK 集合类，不立实体页）
- ArrayDeque（作为栈/队列的更优替代，仅提及）

## Implications（影响／启示）

- 该文"Node 32 字节、8 倍内存、节点分散缓存命中低"是 [[cache-line-and-false-sharing|CPU 缓存行效应]] 在 JDK 集合上的具体数据点（第三信源互证）。
- "复杂度 O(1) 但常量开销大"提醒：大 O 不是选型的全部（解读）。

## Limitations（局限）

- 单一自媒体信源；32 字节占用为作者按 JDK 8 指针压缩估算，非 JOL 实测。
- 对比表以文字表格呈现（微信排版），数据均可在 JDK 源码层核验。

## Related Knowledge（相关知识）

- [[jdk-01-arraylist|JDK源码阅读(1) — ArrayList（信源页）]]（系列上一篇，互为对比对象）
- [[jdk-03-hashmap|JDK源码阅读(3) — HashMap（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（信源页）]]
- [[cache-line-and-false-sharing|CPU 缓存行效应（概念页）]]
- [[linked-list-vs-array-cache|链表已死？（信源页）]]（同一结论的独立信源）

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-02-linkedlist.md`
