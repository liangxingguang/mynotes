---
id: wiki-concept-vector-stack-legacy-design
type: concept
title: Vector/Stack 遗留设计缺陷（方法锁粒度 + 继承之殇）
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
  - raw/sources/misc/2026-10-27-jdk-15-vector-stack.md
related:
  - wiki/concepts/fail-fast-modcount.md
  - wiki/concepts/arraydeque-internals.md
  - wiki/sources/jdk-01-arraylist.md
  - wiki/sources/jdk-15-vector-stack.md
---
# Vector/Stack 遗留设计缺陷（方法锁粒度 + 继承之殇）

## Definition（定义）

JDK 1.0 元老 Vector（全方法 synchronized 的动态数组）与 Stack（继承 Vector 的 LIFO 栈）上的两组经典设计缺陷：① 方法级同步锁粒度过粗，复合操作仍不安全；② Stack 用继承而非组合实现栈，违反 LSP 并暴露无关方法。两者共同解释为何官方推荐 ArrayList / ArrayDeque 取而代之。

## Why It Matters（为什么重要）

这是面试高频题（"Vector 和 ArrayList 区别""Stack 用什么替代"）的底层答案，更是两条通用设计原则的反面教材：锁粒度必须匹配业务原子性；is-a 关系不成立时用继承会泄漏父类全部行为。

## Core Characteristics（核心特征）

1. Vector 全 public 方法 synchronized：单线程也付锁开销（信源粗略实测 100 万次 add 慢 ArrayList 约 20%~50%，JVM 偏向锁/轻量级锁优化后仍有代价）。
2. 复合操作不安全：`if(!v.isEmpty()) v.lastElement()` 这类「先检查后操作」在两次方法调用之间可被穿插，仍需外部锁——同步形同鸡肋。
3. 扩容双机制：`capacityIncrement > 0` 按增量扩，否则旧版翻倍（JDK 6/8），JDK 11+ 改为首选扩一半（`oldCapacity >>> 1`），与 ArrayList 趋同；默认初始容量 10。
4. 双迭代器割裂：Iterator fail-fast（抛 CME），古老的 Enumeration 不做该检查、默默出错（历史遗留）。
5. Stack 继承之殇：extends Vector 违反 LSP——栈不该允许中间插入/删除，却因继承暴露 `add(0,x)`/`remove(2)`/`insertElementAt` 等全部 Vector 方法且都不报错；正确设计是组合（内部持 Deque，只暴露 push/pop/peek）。
6. 官方替代：Vector → ArrayList / synchronizedList 包装；Stack → ArrayDeque（并发栈用 ConcurrentLinkedDeque）。

## How It Works（运作方式）

Vector.add：synchronized 方法内 modCount++ → 容量满则 grow()（ArraysSupport.newLength 按 capacityIncrement 或扩一半算新容量）→ Arrays.copyOf 搬家。Stack.push 直接调 addElement；pop = peek()（elementAt(len-1)）+ removeElementAt(len-1)；search 用 lastIndexOf 换算距栈顶位置。

## Relationships（关系）

### Related Concepts（相关概念）

- [[arraydeque-internals|ArrayDeque 循环数组设计]]（alternative-to：Stack 的官方替代，无锁 + 正确 API 边界）
- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]（related：Vector Iterator 沿用 fail-fast，Enumeration 是不做检查的前 modCount 时代遗物）

### Distinctions（区分）

- 与 ArrayList 的不同之处：同出 AbstractList、同为数组，差别仅在 synchronized 全方法覆盖与 capacityIncrement 扩容选项；新版 JDK 扩容倍率已趋同（均扩一半）。
- 与 CopyOnWriteArrayList 的不同之处：同为"线程安全 List"解法，Vector 用互斥锁（复合操作仍不安全），COW 用写时复制换读无锁（适合读多写极少）。

## Evolution（演进）

- JDK 1.0 引入 Vector/Stack；JDK 1.2 集合框架引入 ArrayList 后 Vector 被边缘化；JDK 6 起官方文档建议用 Deque 实现替代 Stack；JDK 11+ Vector 扩容由翻倍改为扩一半（信源版本对比表）。

## Open Questions（开放问题）

- Enumeration 不做 fail-fast 检查的具体实现原因（信源仅陈述现象，未展开源码）。
- "慢 20%~50%"的严谨基准数据（信源为粗略实测，未给环境与方法）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-15-vector-stack.md`

## Related Knowledge（相关知识）

- [[jdk-15-vector-stack|Vector & Stack 源码篇（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
