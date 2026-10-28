---
id: wiki-concept-fail-fast-modcount
type: concept
title: Fail-Fast 迭代器（modCount）
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
  - raw/sources/misc/2026-10-27-jdk-01-arraylist.md
  - raw/sources/misc/2026-10-27-jdk-02-linkedlist.md
  - raw/sources/misc/2026-10-27-jdk-03-hashmap.md
  - raw/sources/misc/2026-10-27-jdk-15-vector-stack.md
  - raw/sources/misc/2026-10-27-jdk-21-collections.md
related:
  - wiki/concepts/hashmap-internals.md
  - wiki/concepts/vector-stack-legacy-design.md
  - wiki/concepts/collections-utility-class.md
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

## How It Works（运作方式）

以 ArrayList.Itr 为典型：字段 `expectedModCount` 初始化时快照 modCount；`next()` 首行检查；`remove()` 删除后执行 `expectedModCount = modCount` 重新同步。HashMap 的 keySet/entrySet 迭代器同理。LinkedList 的 ListItr 在 add/remove 时执行 `expectedModCount++` 保持同步。

## Relationships（关系）

### Related Concepts（相关概念）

- [[hashmap-internals|HashMap 核心设计（JDK 8）]]：modCount 是 HashMap 字段之一。

### Distinctions（区分）

- Fail-Fast 是**单线程编程错误的检测器**，不是线程安全机制——多线程下抛不抛异常都不可靠，并发场景应用 CopyOnWriteArrayList / ConcurrentHashMap 等并发容器（信源明确：ArrayList/HashMap 均无线程同步）。
- "结构性修改"不含纯值替换（set），set 不触发 modCount 递增。

## Evolution（演进）

- 2026-10-28 — 由 JDK 源码阅读系列第 1、2、3 篇（ArrayList / LinkedList / HashMap，同作者三信源）合并提炼建立；系列第 24 篇（ConcurrentModificationException 专题）摄入后应回填。
- 2026-10-28 — jdk-15 信源补入第四信源：Vector 的 Iterator 沿用 fail-fast，但更古老的 Enumeration 不做 modCount 检查、不抛 CME，属前 fail-fast 时代的历史遗留变体。
- 2026-10-28 — jdk-21 信源补入第五信源：Collections.synchronizedList 的迭代器不加外部 synchronized 时，并发修改仍由 fail-fast 抛 CME——佐证 fail-fast 是错误检测器而非线程安全机制（方法级同步管不住复合的迭代操作）。

## Open Questions（开放问题）

- "非结构性修改不动 modCount"的具体边界（哪些方法算结构性）当前信源未枚举完整。
- 三篇信源出自同一公众号，尚非同源互证意义上的独立信源。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-01-arraylist.md`（modCount/expectedModCount 机制、Itr 源码、foreach 删除必抛、removeIf 正确姿势）
- Source: `raw/sources/misc/2026-10-27-jdk-02-linkedlist.md`（ListItr 的 checkForComodification 与 expectedModCount++ 同步）
- Source: `raw/sources/misc/2026-10-27-jdk-03-hashmap.md`（HashMap 遍历删除抛 CME、Iterator/removeIf 两种安全写法）
- Source: `raw/sources/misc/2026-10-27-jdk-15-vector-stack.md`（Vector Iterator fail-fast；Enumeration 不抛 CME 的历史遗留）
- Source: `raw/sources/misc/2026-10-27-jdk-21-collections.md`（synchronizedList 迭代器须外部手动同步，否则并发修改抛 CME）

## Related Knowledge（相关知识）

- [[jdk-01-arraylist|JDK源码阅读(1) — ArrayList（信源页）]]
- [[jdk-02-linkedlist|JDK源码阅读(2) — LinkedList（信源页）]]
- [[jdk-03-hashmap|JDK源码阅读(3) — HashMap（信源页）]]
- [[jdk-15-vector-stack|Vector & Stack 源码篇（信源页）]]
- [[jdk-21-collections|JDK源码阅读(21)：Collections（信源页）]]
