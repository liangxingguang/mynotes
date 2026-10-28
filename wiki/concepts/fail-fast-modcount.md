---
id: wiki-concept-fail-fast-modcount
type: concept
title: Fail-Fast 迭代器（modCount）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - concept
  - java
  - jdk
  - collections
sources:
  - raw/sources/misc/2026-10-27-jdk-01-arraylist.md
  - raw/sources/misc/2026-10-27-jdk-02-linkedlist.md
  - raw/sources/misc/2026-10-27-jdk-03-hashmap.md
  - raw/sources/misc/2026-10-27-jdk-15-vector-stack.md
  - raw/sources/misc/2026-10-27-jdk-21-collections.md
  - raw/sources/misc/2026-10-27-jdk-24-concurrentmodificationexception.md
related:
  - wiki/concepts/hashmap-internals.md
  - wiki/concepts/vector-stack-legacy-design.md
  - wiki/concepts/collections-utility-class.md
  - wiki/concepts/copyonwritearraylist-internals.md
  - wiki/concepts/concurrenthashmap-internals.md
---
# Fail-Fast 迭代器（modCount）

## Definition（定义）

JDK 非线程安全集合（ArrayList、LinkedList、HashMap 等）的通用防御机制：集合维护结构修改计数器 `modCount`，迭代器创建时快照 `expectedModCount = modCount`，每次迭代操作前比对，不一致即抛 `ConcurrentModificationException`，尽早暴露"遍历中被结构性修改"的编程错误。

## Why It Matters（为什么重要）

它把"并发/交叉修改导致的不确定性坏状态"转化为确定性的快速失败，是 foreach（底层即迭代器）中直接 add/remove 必抛异常的原因；也是日常编码中"遍历时删除"必须走 `Iterator.remove()` / `removeIf()` 的依据。

## Core Characteristics（核心特征）

1. `modCount` 定义于 AbstractList / HashMap 等基类，add、remove、clear 等结构性修改使其 +1（非结构修改如 ArrayList 的 set 不计）。
2. 迭代器在 next()/remove() 等操作前调用 `checkForComodification()` 比对两个计数。
3. 迭代器自身的 remove()/add() 会同步 `expectedModCount`，因此合法。
4. foreach 语法糖底层就是迭代器，与显式 Iterator 同等受检。
5. Java 8+ 的 `removeIf()` 内部使用迭代器并正确同步计数，是安全的遍历删除方式。
6. CME 出现频率最高的场景是**单线程** foreach 里直接 `list.remove()`，而非多线程并发修改（jdk-24 专题信源）。
7. fail-fast 是 best-effort 机制：JDK 官方文档明确"不保证 100% 检测到并发修改"（fail-fast operations throw ConcurrentModificationException on a best-effort basis）。
8. 视图类集合同样受检：ArrayList 的 `subList()` 返回 SubList 视图，持 parent modCount 副本并每次操作校验；获取 subList 后修改原集合，subList 再操作立即抛 CME。

## How It Works（运作方式）

以 ArrayList.Itr 为典型：字段 `expectedModCount` 初始化时快照 modCount；`next()` 首行检查；`remove()` 删除后执行 `expectedModCount = modCount` 重新同步。HashMap 的 keySet/entrySet 迭代器同理。LinkedList 的 ListItr 在 add/remove 时执行 `expectedModCount++` 保持同步。

## Relationships（关系）

### Related Concepts（相关概念）

- [[hashmap-internals|HashMap 核心设计（JDK 8）]]：modCount 是 HashMap 字段之一，HashIterator 用同一套 if 判断。

### Distinctions（区分）

- Fail-Fast 是**单线程编程错误的检测器**，不是线程安全机制——多线程下抛不抛异常都不可靠，并发场景应用 CopyOnWriteArrayList / ConcurrentHashMap 等并发容器（信源明确：ArrayList/HashMap 均无线程同步）。
- "结构性修改"不含纯值替换（set），set 不触发 modCount 递增。
- 与 fail-safe（[[copyonwritearraylist-internals|CopyOnWriteArrayList]] / [[concurrenthashmap-internals|ConcurrentHashMap]] 的迭代策略）相对：fail-fast 用 modCount 检测、强一致、开销仅一次 int 比较；fail-safe 操作快照/副本、弱一致、不检测不抛 CME，开销在复制数组或 CAS。fail-fast 牺牲容错换一致性与低开销，fail-safe 牺牲实时一致换高并发可用性（jdk-24 信源五维对比表）。

## Evolution（演进）

- 2026-10-28 — 由 JDK 源码阅读系列第 1、2、3 篇（ArrayList / LinkedList / HashMap，同作者三信源）合并提炼建立。
- 2026-10-28 — jdk-15 信源补入第四信源：Vector 的 Iterator 沿用 fail-fast，但更古老的 Enumeration 不做 modCount 检查、不抛 CME，属前 fail-fast 时代的历史遗留变体。
- 2026-10-28 — jdk-21 信源补入第五信源：Collections.synchronizedList 的迭代器不加外部 synchronized 时，并发修改仍由 fail-fast 抛 CME——佐证 fail-fast 是错误检测器而非线程安全机制（方法级同步管不住复合的迭代操作）。
- 2026-10-28 — jdk-24（CME 专题）信源补入第六信源：CME 高频场景是单线程 foreach 删元素；fail-fast vs fail-safe 五维对比表；subList 视图同步校验陷阱；JDK 官方文档 best-effort 声明；modCount int 溢出（约 20 亿次）为理论注记无实际影响。置信度由 medium 升 high。

## Open Questions（开放问题）

- "非结构性修改不动 modCount"的具体边界（哪些方法算结构性）当前信源未枚举完整。
- 六篇信源出自同一公众号，尚非同源互证意义上的独立信源。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-01-arraylist.md`（modCount/expectedModCount 机制、Itr 源码、foreach 删除必抛、removeIf 正确姿势）
- Source: `raw/sources/misc/2026-10-27-jdk-02-linkedlist.md`（ListItr 的 checkForComodification 与 expectedModCount++ 同步）
- Source: `raw/sources/misc/2026-10-27-jdk-03-hashmap.md`（HashMap 遍历删除抛 CME、Iterator/removeIf 两种安全写法）
- Source: `raw/sources/misc/2026-10-27-jdk-15-vector-stack.md`（Vector Iterator fail-fast；Enumeration 不抛 CME 的历史遗留）
- Source: `raw/sources/misc/2026-10-27-jdk-21-collections.md`（synchronizedList 迭代器须外部手动同步，否则并发修改抛 CME）
- Source: `raw/sources/misc/2026-10-27-jdk-24-concurrentmodificationexception.md`（CME 专题：单线程 foreach 高频场景、fail-fast vs fail-safe 对比、subList 视图校验、官方 best-effort 声明）

## Related Knowledge（相关知识）

- [[jdk-01-arraylist|JDK源码阅读(1) — ArrayList（信源页）]]
- [[jdk-02-linkedlist|JDK源码阅读(2) — LinkedList（信源页）]]
- [[jdk-03-hashmap|JDK源码阅读(3) — HashMap（信源页）]]
- [[jdk-15-vector-stack|Vector & Stack 源码篇（信源页）]]
- [[jdk-21-collections|JDK源码阅读(21)：Collections（信源页）]]
- [[jdk-24-concurrentmodificationexception|深扒 ConcurrentModificationException（信源页）]]
