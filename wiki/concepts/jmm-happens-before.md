---
id: wiki-concept-jmm-happens-before
type: concept
title: Java 内存模型与 happens-before
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - java
  - jvm
  - concurrency
sources:
  - raw/sources/architecture/2026-10-28-jvm-interview-guide.md
related:
  - wiki/concepts/oom-troubleshooting.md
  - wiki/sources/jvm-interview-guide.md
  - wiki/topics/jvm-gc.md
---
# Java 内存模型与 happens-before

## Definition（定义）

Java Memory Model（JMM）是定义多线程程序中共享变量可见性与有序性语义的抽象规范，解决并发三大问题：原子性、可见性、有序性。**JMM ≠ JVM 运行时内存结构**——后者是 HotSpot 的具体内存分区（堆/栈/方法区），前者是线程间交互的契约。happens-before 是 JMM 的核心关系：若 A happens-before B，则 A 的写入对 B 可见，且编译器/JVM 的重排序不能把 A 的效果排到 B 之后。

## Why It Matters（为什么重要）

并发 bug 的根因几乎都可归结为「线程看不到其他线程的修改」或「语句执行顺序被重排打乱」。happens-before 提供了不依赖时间先后的推理契约：只要为共享变量找到一条 happens-before 链，可见性就有保证；找不到链，就必须显式加 volatile/synchronized 等同步手段。volatile 禁重排是 DCL 双检锁单例必须加 volatile 的唯一理由——否则第二个线程可能看到半初始化对象。

## Core Characteristics（核心特征）

1. **主内存/工作内存模型**：线程不直接读写主内存，而是拷贝副本到工作内存、用完写回——这一副本机制正是可见性问题的物理根源。
2. **happens-before 的 8 条规则**（传递性是组合核心）：
   - 程序顺序规则：同一线程中前面的操作 hb 后面的操作（被重排序约束，非时间约束）；
   - volatile 规则：volatile 变量的写 hb 后续读；
   - 锁规则：解锁 hb 后续加锁；
   - 线程启动：`start()` 前的操作 hb 新线程内操作；
   - 线程终止：线程内操作 hb 其他线程 `join()` 成功返回；
   - 线程中断：`interrupt()` 的调用 hb 被中断线程检测到中断；
   - 对象终结：对象初始化完成 hb 其 `finalize()`；
   - 传递性：A hb B 且 B hb C ⇒ A hb C。
3. **volatile 双重语义**：保证可见性 + 禁止指令重排（通过内存屏障实现）；不保证原子性（i++ 仍非原子）。
4. **synchronized 三性俱全**：原子性 + 可见性 + 有序性，是比 volatile 更强的同步原语。

## Relationships（关系）

### Related Concepts（相关概念）

- [[oom-troubleshooting|OOM 排查方法论]]：JMM 属 JVM 运行时机制谱系，同出一篇面试题信源。
- [[jvm-gc|JVM 垃圾回收（主题）]]：GC 的可达性分析与 JMM 的引用语义互补（回收看可达性，并发看可见性）。

### Distinctions（区分）

- **时间先后 ≠ happens-before**：先发生的写若不在 hb 链上，对后续读不保证可见。
- **JMM vs JVM 内存结构**：JMM 是并发语义规范，JVM 内存区域是实现载体；讨论「线程私有/共享内存」用后者，讨论「可见性契约」用前者。

## Open Questions（开放问题）

- 本文为单一二手信源（公众号面试题），8 条规则表述与主流教材（如《Java 并发编程的艺术》）一致，但未与 Oracle 官方 JMM 规范原文逐条比对。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-jvm-interview-guide.md`（JMM 一节：主内存/工作内存、8 条 hb 规则、volatile/synchronized 语义、DCL 误区纠正）

## Related Knowledge（相关知识）

- [[jvm-interview-guide|JVM 面试题最全整理（信源页）]]
- [[oom-troubleshooting|OOM 排查方法论]]
