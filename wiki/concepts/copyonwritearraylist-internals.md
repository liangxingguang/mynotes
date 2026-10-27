---
id: wiki-concept-copyonwritearraylist-internals
type: concept
title: CopyOnWriteArrayList 写时复制设计
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: medium
tags:
  - concept
  - java
  - jdk
  - concurrency
  - collections
sources:
  - raw/sources/misc/2026-10-27-jdk-05-copyonwritearraylist.md
related:
  - wiki/concepts/concurrenthashmap-internals.md
  - wiki/concepts/fail-fast-modcount.md
  - wiki/sources/jdk-05-copyonwritearraylist.md
---
# CopyOnWriteArrayList 写时复制设计

## Definition（定义）

JUC 中的线程安全 List：以「写入时复制」实现并发安全——读操作完全无锁、直接读 volatile 数组引用；写操作加锁后复制一份新数组、在副本上修改、再整体替换数组引用，读写因此天然隔离。

## Why It Matters（为什么重要）

它给出了与「加锁保护现有数据」相反的并发设计范式：用写时的 O(n) 复制成本换取读路径零同步开销，是读多写极少场景（监听器列表、黑白名单、运行期只读配置）的标准答案；Spring 的 ApplicationListener 列表即典型应用。

## Core Characteristics（核心特征）

1. 唯一存储是 `transient volatile Object[] array`：volatile 保证数组引用替换的可见性，读线程拿旧数组、写线程换新数组，互不干扰。
2. 读无锁：get 仅 volatile read + 下标取元素两行代码。
3. 写串行 + 复制：`synchronized(lock)`（字段级细粒度锁）→ `Arrays.copyOf` → 改副本 → `setArray` 替换引用，每次写 O(n)。
4. 快照迭代：COWIterator 持有创建瞬间的数组快照，永不抛 ConcurrentModificationException，但看不到迭代期间的变更。
5. `addIfAbsent` 乐观策略：先在无锁状态下用快照检查存在性，不存在才加锁并做二次确认。

## Structure（结构）

直接实现 `List<E>, RandomAccess, Cloneable, Serializable`，**不继承 AbstractList**——因此绕开 modCount 机制，压根不需要 fail-fast。所在包 `java.util.concurrent`。

## How It Works（运作方式）

- add：加锁 → 复制长度+1 的新数组 → 末尾写入 → 替换引用；旧数组无人持有后被 GC。
- remove：删中间元素需两次 `System.arraycopy` 拼接前后两段到新数组。
- iterator：`new COWIterator(getArray(), 0)`，快照引用 final，迭代器 remove 直接抛 UnsupportedOperationException。

## Relationships（关系）

### Related Concepts（相关概念）

- [[concurrenthashmap-internals|ConcurrentHashMap 并发设计（JDK 8+）]]——同为 JUC「读无锁」容器，但写路径策略相反（CAS+桶头锁 vs 全量复制）

### Distinctions（区分）

- 与 [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]] 的不同之处在于：fail-fast 用计数器比对「检测并报警」，COW 用快照「隔离并容忍」，两者解决的是不同问题（编程错误检测 vs 并发读写隔离）。
- 与 ArrayList/Vector：ArrayList 无线程安全；Vector 全表锁读写皆慢；COW 读极快、写 O(n)、迭代无异常、写时内存瞬时翻倍。

## Evolution（演进）

源码基准为 JDK 21（信源）；旧版 `java.util.Observable` 用 Vector 存观察者，现代实现多改用 CopyOnWriteArrayList（信源所述）。

## Open Questions（开放问题）

- 「数据量过万即不适用」的量级边界缺乏基准测试量化（当前信源为经验性表述）。
- 大数据量下写操作引发的 GC 压力未量化。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-05-copyonwritearraylist.md`

## Related Knowledge（相关知识）

- [[jdk-05-copyonwritearraylist|JDK源码阅读(4) — CopyOnWriteArrayList（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
