---
id: wiki-topic-jvm-gc
type: topic
title: JVM 垃圾回收
status: active
created: 2026-10-27
updated: 2026-10-27
confidence: medium
tags:
  - topic
  - java
  - jvm
  - gc
sources:
  - raw/sources/architecture/2026-10-27-jvm-gc-interview-guide.md
  - raw/sources/misc/2026-10-14-jvm-tuning-core-approach.md
  - raw/sources/architecture/2026-10-21-gc-log-tuning-practice.md
  - raw/sources/architecture/2026-10-21-jvm-gc-troubleshooting-arthas.md
---
# JVM 垃圾回收

## Scope（范围）

JVM GC 的判定、算法、收集器、原理、选型与调优：对象可回收判定（引用计数 vs 可达性分析）、标记-清除/复制/整理与分代收集、Serial→Parallel→CMS→G1→ZGC/Shenandoah 的演进与选型、G1/ZGC 内部机制、GC 日志与调优方法论、线上排查。JIT 编译（Graal）仅在信源中连带出现，暂不属于本主题主体。

## Current Understanding（当前认知）

- **判定**：Java 用可达性分析（GC Roots：栈局部变量、JNI、static、final static 常量、synchronized 持有对象），解决引用计数的循环引用缺陷；两次标记 + finalize（Java 9 弃用）。
- **算法落地**：新生代标记-复制（Eden:Survivor = 8:1:1，默认 15 次 Minor GC 晋升），老年代标记-清除/整理；依据弱分代假说。
- **选型主线**（多信源一致）：JDK 8 默认 Parallel、JDK 9+ 默认 G1；通用场景 2~8GB 用 G1，延迟敏感上 ZGC；CMS 已废弃。
- **调优主线**：[[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]——先定量化目标与基线、JFR/GC 日志归因，证据指向 JVM 才动收集器与参数；「90% 问题靠选对收集器+合理内存」。

## Key Concepts（关键概念）

- [[g1-gc|G1 垃圾收集器]]（Region/RSet/SATB/Mixed GC，JDK 9+ 默认）
- [[zgc|ZGC]]（染色指针+读屏障+并发整理，停顿 <10ms 与堆大小无关）
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]（四信源互证的方法论）

## Key Entities（关键实体）

- [[arthas|Arthas]]（GC 排障常用诊断工具）

## Major Developments（重大进展）

- 收集器演进：Serial（JDK 1.3）→ Parallel（1.4）→ CMS（1.5，JDK 9 废弃）→ G1（7u4，JDK 9 默认）→ ZGC（11，15 转正）→ Shenandoah（12，OpenJDK 专属）。
- JDK 21 起分代 ZGC 进入生产视野（货拉拉实践，见 [[jdk21-migration-huolala]]）。

## Disagreements（分歧）

- 暂无信源间实质冲突。ZGC「不分代」为本文（JDK 15 时代视角）表述，与 JDK 21 分代 ZGC 并存——属版本演进而非矛盾。

## Open Questions（开放问题）

- ZGC「16TB 堆停顿 <1ms」、Graal PEA「分配减少 30%-70%」等数字仅见于二次科普信源，未有一手基准佐证。

## Related Topics（相关主题）

- 信源页：[[jvm-gc-interview-guide|JVM GC 面试全讲透]]、[[jvm-tuning-core-approach|JVM 调优核心思路]]、[[gc-log-tuning-practice|GC 日志分析与调优实战]]、[[jvm-gc-troubleshooting-arthas|JVM GC 排查实战（Arthas）]]、[[jvm-troubleshooting-six-tools|JVM 排查 6 工具]]、[[jdk21-migration-huolala|JDK 21 规模化落地（货拉拉）]]
