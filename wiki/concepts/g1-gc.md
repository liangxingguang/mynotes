---
id: wiki-concept-g1-gc
type: concept
title: G1 垃圾收集器（Garbage-First）
status: active
created: 2026-10-27
updated: 2026-10-27
confidence: high
tags:
  - concept
  - java
  - jvm
  - gc
sources:
  - raw/sources/architecture/2026-10-27-jvm-gc-interview-guide.md
related:
  - wiki/concepts/zgc.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/topics/jvm-gc.md
---
# G1 垃圾收集器（Garbage-First）

## Definition（定义）

G1 是 JDK 7u4 推出、JDK 9 起成为默认的服务端垃圾收集器。它将堆划分为多个大小相等的 Region（1~32MB，2 的幂次方），以 Region 为单位回收，并优先回收垃圾最多的 Region（"Garbage-First" 得名由来），目标是在大堆（约 4~64GB）上兼顾吞吐量与可预测的低停顿。

## Why It Matters（为什么重要）

G1 打破了传统分代收集器要求连续内存的划分方式，是「可控停顿」收集器的分水岭：用户可用 `-XX:MaxGCPauseMillis` 设定期望停顿上限，G1 据此选择每轮回收的 Region 集合。JDK 9 至今的默认地位使它成为大多数 Java 服务的实际运行底座。

## Core Characteristics（核心特征）

1. **Region 分区**：Eden/Survivor/Old 均为动态 Region 集合，不需连续内存；另有 Humongous Region 专存超过 Region 大小 50% 的大对象。
2. **RSet（Remembered Set）**：每个 Region 记录「哪些外部 Region 引用了我的对象」，解决跨代引用扫描，避免 Minor GC 扫全老年代；基于 Card Table（512 字节卡）+ 写屏障标脏实现，空间代价约为堆的 5%~10%。
3. **SATB（Snapshot-At-The-Beginning）**：并发标记开始时对堆拍逻辑快照，经 pre-write barrier 记录赋值前旧值，保证「宁可多标（浮动垃圾），绝不漏标」。
4. **Mixed GC**：并发标记周期（老年代占用达 IHOP 阈值触发）完成后，分批回收全部新生代 Region + 一批「性价比最高」的老年代 Region，避免一次性长停顿。
5. **可预测停顿**：按用户设定的停顿目标决定每次回收多少 Region。

## How It Works（运作方式）

GC 模式：Young GC（只清 Eden/Survivor，STW）→ 老年代占用达 IHOP（默认约 45%）触发并发标记周期（初始标记 STW → 并发标记 → 重新标记 STW → 清理）→ 多次 Mixed GC 分批回收老年代 → 极端情况退化为单线程 Serial Full GC（应尽量避免）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[zgc|ZGC]]：低延迟路线的后继者；G1 转移对象仍需 STW，ZGC 靠染色指针+读屏障实现并发整理。
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]：G1 是该方法论下「通用场景默认选项」，IHOP/停顿目标调整是其典型单变量实验。

### Distinctions（区分）

- 与 CMS：CMS 用标记-清除（有碎片、并发失败退化 Serial Old），G1 整体标记-整理 + 局部复制，无碎片且停顿可预测；CMS 自 JDK 9 废弃。
- 与 [[zgc|ZGC]]：G1 分代、停顿几十~几百毫秒且与堆弱相关；ZGC（该信源所述）不分代、停顿 <10ms 与堆大小无关，但吞吐量略低、内存占用更高。

## Evolution（演进）

- JDK 7u4 引入 → JDK 9 成为默认收集器（取代 Parallel）。

## Open Questions（开放问题）

- 小堆（<4GB）下 G1 可能不如 Parallel/CMS，具体拐点依赖负载形态，需各自压测。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-jvm-gc-interview-guide.md`

## Related Knowledge（相关知识）

- [[jvm-gc|JVM 垃圾回收（主题）]]
- [[jvm-gc-interview-guide|JVM 垃圾回收面试全讲透（信源页）]]
