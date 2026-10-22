---
id: wiki-source-jvm-tuning-core-approach
type: source
title: 一文掌握 JVM 调优核心思路
status: active
created: 2026-10-22
updated: 2026-10-22
confidence: high
tags:
  - java
  - performance
  - jvm
sources:
  - raw/sources/misc/2026-10-14-jvm-tuning-core-approach.md
related:
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/concepts/cpu-funnel-coding.md
---
# 一文掌握 JVM 调优核心思路

## Overview（概览）

一篇 JVM 调优方法论短文：反对"症状驱动式调参"（慢了调 -Xmx、FGC 多换收集器、OOMKilled 缩堆），主张把顺序反过来——先定可验收目标、留基线，用 JFR 与 GC 日志确认时间和内存去向，证据指向 JVM 后才动堆大小、收集器与 GC 参数；每轮只改一个变量并备好回退。

## Key Facts（关键事实）

- JFR 标准 profiling recording 开销通常低于 2%（Oracle 文档说法，信源强调需在自己流量下验证）。
- JDK 9+ 统一日志参数：`-Xlog:gc*,safepoint:file=...:time,uptime,level,tags:filecount=10,filesize=100M`。
- JFR 的 Heap Statistics 默认关闭，启用后会额外触发 Old GC，测延迟时会被采集动作污染。
- `-XX:MaxGCPauseMillis` 是目标值而非硬上限；从 200ms 改到 50ms 不代表每次暂停 <50ms，G1 可能改用更小更频繁的回收批次并抬高 CPU。
- JVM 进程内存 ≠ Java Heap：还包括 Metaspace、Code Cache、线程栈、Direct Buffer、GC 数据结构与 JNI 分配。
- 容器 4 GiB limit 示例：`InitialRAMPercentage=50.0 / MaxRAMPercentage=75.0` 约给堆留 3 GiB；显式配置 `-Xms/-Xmx` 时以显式参数为准。
- Native Memory Tracking（`-XX:NativeMemoryTracking=summary` + `jcmd VM.native_memory summary`）必须在启动时开启且有额外开销，适合定位而非永久开启。

## Important Claims（重要论断）

### Claim 1：调优顺序应该反过来

先定目标、留基线、再判断瓶颈；等证据指向 JVM，才轮到堆大小、收集器和 GC 参数。参数改得越多，没有证据支撑就越难解释。

### Claim 2：GC 日志的正确看法

不要数一天多少次 GC，要看 Young GC 间隔、单次/累计暂停、GC 后 Old 水位、Full GC 触发原因、分配与晋升速度。YGC 变密但 Old 稳定是分配速率问题；GC 后 Old 持续上涨才查保留链；调大堆只是把 Full GC 推后。

### Claim 3：每轮调优是单变量实验

保留原始参数、流量、JFR、GC 日志与回退条件；P99 降了但 CPU 长期翻倍，不算调优成功。

## Concepts Introduced（引入的概念）

- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]

## Entities Mentioned（提及的实体）

- JDK Flight Recorder（JFR）、G1 收集器、Native Memory Tracking（NMT）——均为 JVM 自带工具/机制，信源未引入独立商业实体。

## Implications（影响／启示）

性能问题的归因必须先排除 JVM 之外的因素（数据库、锁、下游超时），否则调参只是在错误的方向上加杠杆；与编码级降对象实践（[[cpu-funnel-coding]]）形成"代码优先、参数殿后"的完整方法论。

## Limitations（局限）

- 为经验性短文，所有示例数字（2000 QPS / P99 800→300ms / 4 GiB limit）均为示意，非基准测试结论。
- JFR 开销 <2% 为 Oracle 官方说法，信源明确指出不能当保证。
- 未覆盖具体收集器选型对比（G1/ZGC/Shenandoah），只给方法论。

## Related Knowledge（相关知识）

- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]
- [[cpu-funnel-coding|CPU 漏斗（编码级性能模型）]]

## Source（信源）

- `raw/sources/misc/2026-10-14-jvm-tuning-core-approach.md`
