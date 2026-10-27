---
id: wiki-source-jvm-gc-interview-guide
type: source
title: JVM 垃圾回收面试全讲透：从引用计数到 ZGC 调优
status: active
created: 2026-10-27
updated: 2026-10-27
confidence: high
tags:
  - java
  - jvm
  - gc
sources:
  - raw/sources/architecture/2026-10-27-jvm-gc-interview-guide.md
related:
  - wiki/concepts/g1-gc.md
  - wiki/concepts/zgc.md
  - wiki/topics/jvm-gc.md
---
# JVM 垃圾回收面试全讲透：从引用计数到 ZGC 调优

## Overview（概览）

微信公众号长文（约 3.5 万字符），以面试问答体系统覆盖 JVM GC：可回收判定（引用计数 vs 可达性分析）、四大回收算法与分代收集、Serial/Parallel/CMS/G1/ZGC/Shenandoah 六收集器对比选型、G1 原理（Region/RSet/SATB/Mixed GC）、ZGC 原理（染色指针/并发整理）、GC 调优黄金 6 步与参数速查、JDK 17 Graal JIT 优化。

## Key Facts（关键事实）

- Java 采用可达性分析而非引用计数；GC Roots 含虚拟机栈局部变量、JNI 引用、static 变量、final static 常量、synchronized 持有对象；回收前经两次标记，`finalize()` Java 9 起弃用。
- 新生代 Eden:Survivor = 8:1:1，默认熬过 15 次 Minor GC 晋升老年代。
- 收集器时间线：Serial（JDK 1.3）→ Parallel（1.4）→ CMS（1.5）→ G1（7u4）→ ZGC（11）→ Shenandoah（12）；JDK 8 默认 Parallel，JDK 9+ 默认 G1，CMS 自 JDK 9 废弃，ZGC 于 JDK 15 转正。
- G1：Region 1~32MB（2 的幂），Humongous 存超过 Region 50% 的大对象；RSet 约占堆 5%~10%；IHOP 阈值触发并发标记周期与后续 Mixed GC。
- ZGC：64 位指针高 4 位做染色（Marked0/Marked1/Remapped/Finalizable），多视图映射零开销解引用；仅初始/最终标记两个极短 STW，停顿 <10ms 且与堆大小无关；文中称实测 16TB 堆最大停顿 <1ms。
- 调优监控阈值：Minor GC 耗时 >100ms 关注；Full GC 一小时多次为严重；Full GC 平均 >2s 影响可用性；老年代 >80% 且持续上涨需关注。
- Graal JIT：Java 编写、Sea-of-Nodes IR；部分逃逸分析（PEA）为招牌优化；libgraal 把编译器 AOT 为本地库实现零预热；文中称 Lambda/Stream 密集代码收益最大（+35%）。

## Important Claims（重要论断）

### Claim 1：90% 的 GC 问题靠「选对收集器 + 合理内存」解决

只有 10% 需要深入调参数；且「代码优化 > GC 调优」。与 [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]] 的「证据先行、调参最后」一致（印证）。

### Claim 2：选型经验法则

JDK8 用 Parallel、JDK11+ 用 G1、JDK17+ 低延迟直接上 ZGC；堆 2~8GB 用 G1 基本不出错，停顿居高不下立刻换 ZGC；堆 <8G 上 ZGC 意义不大。

### Claim 3：G1 Mixed GC 与 ZGC 并发整理的本质差异

G1 只有部分阶段并发，转移对象仍需短暂 STW；ZGC 转移期间靠读屏障转发，几乎不停顿。

## Concepts Introduced（引入的概念）

- [[g1-gc|G1 垃圾收集器]]
- [[zgc|ZGC]]

## Entities Mentioned（提及的实体）

- 无独立实体页（Graal JIT 仅一节，暂不开页）

## Implications（影响／启示）

- 是 wiki 中 JVM GC 理论侧的第一篇系统信源：此前信源偏排障/调优实战（[[jvm-tuning-core-approach]]、[[gc-log-tuning-practice]]、[[jvm-gc-troubleshooting-arthas]]），本篇补齐收集器原理与选型依据。
- 「黄金 6 步」（定位→定目标→选收集器→调内存→调参数→压测验证）为 [[evidence-first-jvm-tuning]] 提供第四信源印证。

## Limitations（局限）

- 二次科普信源（微信公众号，非官方文档），数字如「16TB 堆停顿 <1ms」「PEA 减少分配 30%-70%」未给基准出处，引用时宜标注来源层级。
- Graal JIT 一节标题「JDK 17 默认 GraalVM JIT」本身被正文纠正（需 GraalVM 发行版或手动启用），标题有误导性。
- Shenandoah 仅概览，无原理拆解。

## Related Knowledge（相关知识）

- [[jvm-gc|JVM 垃圾回收（主题）]]
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]

## Source（信源）

- `raw/sources/architecture/2026-10-27-jvm-gc-interview-guide.md`
