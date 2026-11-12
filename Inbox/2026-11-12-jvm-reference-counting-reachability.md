---
id: 2026-11-12-jvm-reference-counting-reachability
title: 【JVM 底层修炼记】如何判断对象该不该回收？聊聊经典的引用计数法与可达性分析算法
source: 知乎
source_url: https://zhuanlan.zhihu.com/p/2103769210321105002
source_type: link
platform: 知乎
created: 2026-11-12
category: 技术
tags: [java, JVM]
asset_ref: Assets/2026/11/jvm-reference-counting-reachability.md
wiki_status: pending
---

# 【JVM 底层修炼记】如何判断对象该不该回收？聊聊经典的引用计数法与可达性分析算法

> JVM 判断对象生死的两套经典机制：引用计数法为每个对象维护引用计数器，引用归零即可回收，实现直观但无法解决循环引用；现代 HotSpot 采用可达性分析，以 GC Roots 为起点向下搜索，只看能否到达而非被引用多少次，循环引用（整体不可达）也能回收。文章还讲清 finalize() 的两次标记、对象复活（仅一次）与四种引用（强/软/弱/虚）。

## 核心要点

- **引用计数法**：为每个对象维护引用计数器，引用增减实时更新，归零即回收。优点：实现简单、及时释放；缺点：每次引用变化需维护计数、多线程下需原子操作、**无法解决循环引用**（互相引用的对象计数永不为 0，但整体可能已不可达）。
- **可达性分析**：以 GC Roots 为根起点，沿引用关系向下搜索，可达即存活、不可达即具备回收条件。F/G 互相引用但整体不可达也能回收，这是其相对引用计数的核心优势。
- **GC Roots 来源**：① 活动线程栈帧中的引用（参数、局部变量，JIT 优化后失效引用会提前剔除）；② 类的静态字段引用；③ JNI 引用（Local/Global）；④ JVM 内部引用。注意"方法区常量引用是 GC Roots"的说法过于简单，需看其是否在根集合或可达路径上。
- **finalize() 与对象复活**：传统机制为"两次标记"——第一次发现不可达，若需终结则安排终结线程执行 finalize()，再重新判断可达性，重新建立外部引用即可复活；同一对象的 finalize() 只自动调用一次。但终结执行时间/顺序不可控、有性能开销、异常会被静默忽略，JDK 9 弃用、JDK 18 标记待移除、JDK 18 起支持 --finalization=disabled、JDK 25 规范允许禁用。
- **四种引用**：强引用（常规引用，可达即不回收）、软引用（内存不足时才清，适合缓存）、弱引用（不再强/软可达即清，如 WeakHashMap）、虚引用（get() 取不到对象，仅配合 ReferenceQueue/Cleaner 感知回收）。三者不是简单从根集合删除，而是由 JVM 按可达性级别管理。
- **总结**：JVM 判断回收的核心不是"被引用了多少次"，而是"能否从 GC Roots 到达"。

## 正文

完整正文见采集稿：[[Assets/2026/11/jvm-reference-counting-reachability.md]]（含引用计数/可达性分析示意图、ReferenceCountDemo 与 Zombie 复活代码、JDK 终结机制版本演进表与官方参考资料链接）。

## 来源

https://zhuanlan.zhihu.com/p/2103769210321105002

## 附件

[[Assets/2026/11/jvm-reference-counting-reachability.md]]
