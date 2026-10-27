---
id: wiki-source-jdk-05-copyonwritearraylist
type: source
title: JDK源码阅读(4) — CopyOnWriteArrayList：写时复制的线程安全 List
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - jdk
  - concurrency
  - collections
sources:
  - raw/sources/misc/2026-10-27-jdk-05-copyonwritearraylist.md
related:
  - wiki/sources/jdk-04-concurrenthashmap.md
  - wiki/sources/jdk-source-reading-album.md
  - wiki/concepts/copyonwritearraylist-internals.md
  - wiki/concepts/concurrenthashmap-internals.md
  - wiki/concepts/fail-fast-modcount.md
---
# JDK源码阅读(4) — CopyOnWriteArrayList：写时复制的线程安全 List

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列文章（作者标题编号"(4)"），基于 JDK 21 源码拆解 CopyOnWriteArrayList：volatile 数组单字段存储、读完全无锁、写加锁后 O(n) 复制替换引用、COWIterator 快照迭代，附 add/addIfAbsent/remove 源码注释、与 ArrayList/Vector 三方对比表及适用场景清单。

## Key Facts（关键事实）

- 底层只有一个 `transient volatile Object[] array`；volatile 保证数组引用替换的可见性，读写天然隔离。
- 直接实现 `List` 接口而不继承 AbstractList，绕开 `modCount` 机制——根本不需要 fail-fast。
- add 四步：`synchronized(lock)` 加锁 → `Arrays.copyOf` 复制（O(n)）→ 改副本 → `setArray` 替换引用；锁为字段级而非方法级。
- get 仅 volatile read + 数组下标两行代码，无任何同步。
- `addIfAbsent` 先在无锁状态下用快照检查，不存在才加锁并二次确认（snapshot != current 则重新检查）。
- remove 删中间元素需两次 `System.arraycopy` 拼接前后两段。
- COWIterator 持有创建瞬间的数组快照：迭代永不抛 ConcurrentModificationException，代价是看不到迭代期间的新增；迭代器的 remove 直接抛 UnsupportedOperationException。
- 写操作瞬时内存翻倍；文中给出"1 万个元素每次写复制 1 万个"的反面量级。
- Spring 的 ApplicationListener 列表是典型应用；Spring 源码中有几十处使用，多为"回调钩子列表"。

## Important Claims（重要论断）

### 读性能与普通 ArrayList 几乎无区别

读路径只多一层 volatile read，无锁无竞争、CPU 缓存友好（作者表述，无基准数据）。

### 快照迭代是拿一致性换安全的设计选择

迭代安全（永不抛 CME）与实时一致不可兼得；CopyOnWriteArrayList 选择前者，不适合强一致场景。

### 读多写极少是唯一舒适区

写频繁或数据量过万时，O(n) 复制带来的时间与内存开销都不可接受。

## Concepts Introduced（引入的概念）

- [[copyonwritearraylist-internals|CopyOnWriteArrayList 写时复制设计]]

## Entities Mentioned（提及的实体）

- JDK 21（源码基准版本）
- Spring（ApplicationListener 列表为典型应用方）

## Implications（影响／启示）

- 事件监听器列表、缓存黑白名单、启动加载后几乎只读的配置列表应首选 CopyOnWriteArrayList；高频写入、大列表、强一致场景禁用（解读）。
- "乐观无锁检查 + 锁后二次确认"（addIfAbsent）与 ConcurrentHashMap 的 putIfAbsent 思路同源，可迁移到自定义并发结构（解读）。

## Limitations（局限）

- 公众号二次解读，性能表述（"读性能与 ArrayList 几乎没区别"等）为作者经验性结论，无基准测试支撑；源码为精简摘录。
- 未涉及 JDK 9+ 后实现细节变化（如锁实现的演进），以 JDK 21 源码为准但未与旧版对比。

## Related Knowledge（相关知识）

- [[concurrenthashmap-internals|ConcurrentHashMap 并发设计（JDK 8+）]]（JUC 读无锁的另一条路线：CAS+桶头锁 vs 写时复制）
- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]（COW 快照迭代正是对 fail-fast 机制的绕开与替代）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-05-copyonwritearraylist.md`
