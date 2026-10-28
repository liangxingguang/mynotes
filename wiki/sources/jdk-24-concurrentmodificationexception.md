---
id: wiki-source-jdk-24-concurrentmodificationexception
type: source
title: 深扒 ConcurrentModificationException：Java 集合中最常见的运行时异常，你真的搞懂了吗？
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
  - raw/sources/misc/2026-10-27-jdk-24-concurrentmodificationexception.md
related:
  - wiki/concepts/fail-fast-modcount.md
  - wiki/concepts/copyonwritearraylist-internals.md
  - wiki/concepts/concurrenthashmap-internals.md
  - wiki/sources/jdk-source-reading-album.md
---
# 深扒 ConcurrentModificationException：Java 集合中最常见的运行时异常，你真的搞懂了吗？

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列的 ConcurrentModificationException（CME）专题。剖析 ArrayList$Itr 的 fail-fast 检测机制（modCount vs expectedModCount），对比 fail-fast 与 fail-safe 两条设计路线，给出遍历删除的正确姿势与 subList 陷阱。

## Key Facts（关键事实）

- CME 出现频率最高的场景是**单线程** foreach 里直接 `list.remove()`，而非多线程并发修改。
- 检测机制：集合结构性修改（add/remove/clear）使 `modCount++`；迭代器创建时快照 `expectedModCount = modCount`；`next()`/`remove()` 前 `checkForComodification()` 比对两者，不等即抛 CME。`set()` 改值不算结构性修改。
- 迭代器自身的 `remove()` 删除后执行 `expectedModCount = modCount` 重新同步，因此安全；Java 8 的 `removeIf()` 内部同样自行维护 expectedModCount。
- `java.util` 包下所有集合（ArrayList、HashMap、Hashtable 等）都是 fail-fast；`java.util.concurrent` 包（CopyOnWriteArrayList、ConcurrentHashMap）走 fail-safe 弱一致，不做 modCount 检测。
- `subList()` 返回的是原集合视图（SubList 内部类），持 parent modCount 副本并每次操作校验；改原集合后 subList 立即失效。
- JDK 官方文档明确：fail-fast 是 best-effort，不保证 100% 检测到并发修改。

## Important Claims（重要论断）

### fail-fast 与 fail-safe 是两种设计权衡

fail-fast 牺牲容错性换取数据一致性与低开销（仅一次 int 比较）；fail-safe 牺牲实时一致性换取高并发可用性（快照/副本迭代，开销在复制数组或 CAS）。

### "99% 的 CME 来自单线程 foreach 删元素"

作者论断：绝大多数 CME 并非并发问题，正确姿势是迭代器 `remove()` 或 `removeIf()`；多线程场景应直接用 CopyOnWriteArrayList。

## Concepts Introduced（引入的概念）

- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]（本信源为其专题篇，回填第六信源）

## Entities Mentioned（提及的实体）

- 公众号「Java解忧杂货铺」（单一自媒体信源，不立实体页）

## Implications（影响／启示）

- 面试高频点：fail-fast vs fail-safe 对比（代表类/检测机制/一致性/开销/场景五个维度）。
- 编码纪律：拿到 subList 后不要再动原集合；遍历删除一律走 Iterator.remove() / removeIf()（解读）。

## Limitations（局限）

- 单一公众号信源；示例代码中 removeIf 源码片段为示意性摘录（与 JDK 实际实现有出入），结论性事实以 Itr/HashIterator 源码摘录为准。
- modCount int 溢出（约 20 亿次操作）一节为作者附注，无实际影响论证。

## Related Knowledge（相关知识）

- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]（概念页）
- [[copyonwritearraylist-internals|CopyOnWriteArrayList 写时复制设计]]（fail-safe 代表：快照迭代不抛 CME）
- [[concurrenthashmap-internals|ConcurrentHashMap 并发设计（JDK 8+）]]（fail-safe 代表：Traverser 无 modCount 弱一致）
- [[jdk-source-reading-album|JDK 源码阅读合集]]（本系列索引页）

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-24-concurrentmodificationexception.md`
