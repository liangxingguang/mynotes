---
id: wiki-source-2026-11-12-jvm-reference-counting-reachability
type: source
title: JVM 如何判断对象该不该回收：引用计数法与可达性分析算法
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: high
tags:
  - java
  - jvm
  - gc
sources:
  - raw/sources/architecture/2026-11-12-jvm-reference-counting-reachability.md
related:
  - wiki/topics/jvm-gc.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/concepts/jvm-runtime-memory-areas.md
---
# JVM 如何判断对象该不该回收：引用计数法与可达性分析算法

## Overview（概览）

系统讲解 JVM 判断对象生死的两套经典机制：引用计数法为每个对象维护引用计数器，引用归零即可回收，实现直观但无法解决循环引用；现代 HotSpot 采用可达性分析，以 GC Roots 为起点向下搜索，只看能否到达而非被引用多少次，循环引用（整体不可达）也能回收。文章还讲清 finalize() 的两次标记、对象复活（仅一次）与四种引用（强/软/弱/虚），并给出 JDK 终结机制版本演进表与官方参考资料。

## Key Facts（关键事实）

- 引用计数法核心：为每个对象维护引用计数器，记录当前有多少有效引用指向它，归零即回收。
- 引用计数法优点：原理简单、及时更新计数、及时识别不可达对象、部分实现可及时释放资源。
- 引用计数法缺点：每次引用变化需维护计数器、多线程需原子操作、**无法解决循环引用**。
- 循环引用本身不一定造成内存泄漏，真正的问题是引用计数法无法判断一组相互引用的对象是否已整体不可达；Python 等采用引用计数+循环垃圾检测结合，Java HotSpot 不依赖简单引用计数。
- 可达性分析核心：以 GC Roots 为根起点，沿引用关系向下搜索，可达即存活、不可达即具备回收条件。
- GC Roots 四类来源：①活动线程栈帧引用（参数、局部变量，JIT 优化后失效引用提前剔除）；②类静态字段引用；③JNI 引用（Local/Global）；④JVM 内部引用。
- "方法区常量引用是 GC Roots"的说法过于简单，需看其是否在根集合或可达路径上。
- finalize() 传统两次标记：第一次发现不可达→安排终结→执行 finalize()→重新判断可达性；同一对象 finalize() 只自动调用一次。
- 对象复活：在 finalize() 中将 this 保存到外部可达位置（如静态字段），对象重新变得可达；复活只能发生一次。
- JDK 版本演进：JDK 9 弃用 Object.finalize()；JDK 18 标记待移除、支持 --finalization=disabled；JDK 25 规范允许禁用终结机制。
- 四种引用：强引用（可达即不回收）、软引用（内存不足时清，适合缓存）、弱引用（不再强/软可达即清，如 WeakHashMap）、虚引用（get() 取不到对象，配合 ReferenceQueue/Cleaner 感知回收）。
- 参考资料含 JLS Chapter 12、HotSpot GC Tuning Guide、JEP 421。

## Important Claims（重要论断）

### Claim 1：引用计数法的核心缺陷是循环引用

互相引用的两个对象计数永不为 0，即使整体已不可达。这是引用计数法无法单独解决的问题，也是 Java HotSpot 采用可达性分析的根本原因。

### Claim 2：可达性分析关注"能否到达"而非"被引用多少次"

从 GC Roots 出发搜索，F/G 互相引用但整体不可达也能回收。这是其相对引用计数的核心优势，也是 Java GC 能处理循环引用的原因。

### Claim 3：GC Roots 不是固定清单，"常量引用是 GC Roots"的说法过于简单

GC Roots 的具体组成和扫描方式受 JVM 实现及垃圾收集器影响。方法区常量引用是否属于 GC Roots，需看对应引用是否属于当前根集合或能从根集合到达，而非所有常量池引用都天然属于 GC Roots。

### Claim 4：finalize() 不推荐使用

执行时间不可控、执行顺序不可控、性能开销、可能导致对象复活、异常被静默忽略。现代 Java 已不推荐，JDK 9 弃用、JDK 18 标记待移除、JDK 25 允许禁用。不应依赖 finalize() 释放文件、数据库连接等外部资源。

### Claim 5：软/弱/虚引用不是简单从根集合删除，而是由 JVM 按可达性级别管理

四种引用具有不同可达性级别，GC 对它们的处理方式不同。虚引用无法通过 get() 获取对象，主要用于配合 ReferenceQueue 跟踪回收状态。

## Concepts Introduced（引入的概念）

- [[jvm-gc|JVM 垃圾回收]]（对象可回收判定机制）
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]

## Entities Mentioned（提及的实体）

- Oracle HotSpot VM、Java SE 规范（JLS/JEP）

## Implications（影响／启示）

- JVM 判断对象回收的核心不是"被引用了多少次"，而是"能否从 GC Roots 到达"——理解这一本质有助于正确选择引用类型与设计缓存策略。
- finalize() 的弃用演进说明 JVM 正在简化对象终结机制，现代开发应使用 try-with-resources / Cleaner 等替代方案管理外部资源。
- GC Roots 的四类来源是可达性分析的基础，理解其组成有助于排查内存泄漏（如静态字段持有大对象、JNI 引用未释放）。

## Limitations（局限）

- 全文为单信源（知乎专栏），以 Java SE 规范和 HotSpot 常见实现为基础讲解，具体 GC 算法、根集合扫描方式和终结处理流程可能因 JVM 实现及版本而不同。
- 未涉及具体 GC 收集器（G1/ZGC）的可达性分析实现差异。
- 四种引用的内存回收时机描述为概念级，未给具体阈值或策略。

## Related Knowledge（相关知识）

- [[jvm-gc|JVM 垃圾回收]]（第 9 信源）
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]
- [[jvm-runtime-memory-areas|JVM 运行时内存区域]]
- [[jvm-memory-evidence-chain-troubleshooting|JVM 内存证据链排查]]

## Source（信源）

- `raw/sources/architecture/2026-11-12-jvm-reference-counting-reachability.md`
