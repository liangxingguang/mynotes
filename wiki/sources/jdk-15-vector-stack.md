---
id: wiki-source-jdk-15-vector-stack
type: source
title: Vector & Stack：被遗忘的元老级集合，它们真的该被淘汰了吗？
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
  - raw/sources/misc/2026-10-27-jdk-15-vector-stack.md
related:
  - wiki/concepts/vector-stack-legacy-design.md
  - wiki/concepts/fail-fast-modcount.md
  - wiki/sources/jdk-01-arraylist.md
  - wiki/sources/jdk-13-arraydeque.md
  - wiki/sources/jdk-source-reading-album.md
---
# Vector & Stack：被遗忘的元老级集合，它们真的该被淘汰了吗？

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列篇目（作者编号第 17 篇，集合框架线），剖析 JDK 1.0 元老 Vector 与 Stack：Vector 全 public 方法 synchronized 但复合操作仍不安全，Stack 用继承而非组合违反 LSP；附多线程"假安全"演示、JDK 6/8/11+ 扩容策略版本差异表、Vector vs ArrayList 与 Stack vs ArrayDeque 双对比表，落点是官方替代方案。

## Key Facts（关键事实）

- Vector 与 ArrayList 同出 AbstractList（Vector 始于 JDK 1.0，ArrayList JDK 1.2 才加入）；差异在所有 public 方法加 synchronized，信源粗略实测 100 万次 add 慢约 20%~50%。
- Vector 扩容有 `capacityIncrement` 机制：>0 按增量扩，否则旧版翻倍；JDK 11+ 已改为「首选扩一半」（`oldCapacity >>> 1`，经 ArraysSupport.newLength），与 ArrayList 趋同；默认初始容量 10。
- 方法级 synchronized 粒度太粗：「先检查后操作」复合操作（如 `if(!v.isEmpty()) v.lastElement()`）依旧线程不安全，仍需外部锁——同步显得鸡肋。
- Vector 的 Iterator 是 fail-fast（抛 ConcurrentModificationException），但更古老的 Enumeration 不抛该异常，会默默出问题（历史遗留）。
- Stack extends Vector（JDK 1.0）：push=addElement、pop=peek+removeElementAt、peek=elementAt(len-1)、search=lastIndexOf 换算；因此 Stack 暴露 Vector 全部 public 方法，可在栈中间插入/删除。
- 官方推荐替代：Vector → ArrayList（或 `Collections.synchronizedList` 包装）；Stack → ArrayDeque（线程安全栈用 ConcurrentLinkedDeque）。

## Important Claims（重要论断）

### Stack extends Vector 是公认的糟糕设计

违反 Liskov 替换原则（栈不允许中间插入/删除，Vector 允许）；正确做法是组合而非继承（内部持有 Deque，只暴露 push/pop/peek）；且继承来全部 synchronized 方法，单线程也付锁开销。

### Vector 的同步「给了你安全感，但没给够」

单方法安全不等于复合操作安全；即使需要全程同步的 List，`Collections.synchronizedList(new ArrayList<>())` 也是更好选择——信源结论：99% 场景不应再用 Vector。

## Concepts Introduced（引入的概念）

- [[vector-stack-legacy-design|Vector/Stack 遗留设计缺陷（方法锁粒度 + 继承之殇）]]

## Entities Mentioned（提及的实体）

- JDK（java.util：Vector/Stack/ArrayList/ArrayDeque/Enumeration）

## Implications（影响／启示）

- 「方法级锁 + 复合操作不安全」是同步包装的通用陷阱——锁的粒度必须匹配业务原子性，而非单个方法（解读，与并发设计普遍原则互证）。
- 扩容策略从翻倍改为扩一半，说明 JDK 自身也在向「省空间」演进；阅读老教程的「Vector 翻倍」结论需注意版本语境（解读）。

## Limitations（局限）

- 单一公众号信源；"慢 20%~50%"为作者粗略实测，未给 benchmark 方法与版本环境。
- Enumeration 不抛 CME 的机理（为何不做 modCount 检查）未展开源码。

## Related Knowledge（相关知识）

- [[jdk-01-arraylist|JDK源码阅读(1) — ArrayList（信源页）]]（对比项：同出 AbstractList 的无锁兄弟）
- [[jdk-13-arraydeque|ArrayDeque 源码篇（信源页）]]（Stack 的官方替代）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-15-vector-stack.md`
