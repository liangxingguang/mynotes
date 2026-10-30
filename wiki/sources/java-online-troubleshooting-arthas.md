---
id: wiki-source-java-online-troubleshooting-arthas
type: source
title: Java 线上排查实战：OOM、超时、闪退、GC 抖动、死锁
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: high
tags:
  - source
  - java
  - jvm
  - arthas
  - troubleshooting
sources:
  - raw/sources/architecture/2026-10-28-java-online-troubleshooting-arthas.md
related:
  - wiki/entities/arthas.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/topics/jvm-gc.md
---
# Java 线上排查实战：OOM、超时、闪退、GC 抖动、死锁

## Overview（概览）

实战手册文：在 Ubuntu 24.04 / JDK 17 / Arthas 4.3.5 环境真实复现五类线上事故（OOM、接口超时、应用闪退、GC 抖动、线程死锁与阻塞），从复现到定位根因走完整排查流程，并给出"进程在→实时诊断、不在→看日志现场"的通用套路与生产环境配置建议。

## Key Facts（关键事实）

- **OOM**：`-Xmx128m -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=...` 自动留现场；`jmap -histo <PID>` 看对象大户（示例 byte 数组 7434 实例占 63MB）；堆满后 JVM 自动 dump（66MB）交 MAT 分析引用链；进程活着时 Arthas `dashboard` 实时看内存。
- **接口超时**：Arthas `trace` 从外到内逐层追——正常请求 102ms、慢请求 2077ms 中 `queryData()` 占 96.32%（2001ms）；继续下钻抓到 `callRemoteApi()` 慢时 3000ms/正常 20ms；`watch {params,returnObj}` 抓入参返回值确认场景。
- **闪退两种根因的区分**：有 GC 日志、dump、`OutOfMemoryError` → JVM 自己 OOM（Full GC 243M→243M、Humongous regions 242 为关键信号）；日志戛然而止、无 error、`dmesg` 有 `Killed process XXXX (java)` → 被 Linux OOM Killer 杀。
- **GC 抖动**：P99 尖刺、平均 RT 正常时先查 GC。`jstat -gc` 看频率、GC 日志看停顿。单变量案例：年轻代 32MB→256MB，Young GC 从每秒 2.3 次（130 次/53 秒）降到 0.5 次（8 次/16 秒），单次停顿 5-10ms→13-16ms 反而变长但频率降 4 倍多，RT 从 30-37ms 抖动到稳定 30ms。
- **死锁/阻塞**：CPU 不高但接口全超时先查线程。`jstack` 直接报 `Found 1 deadlock`（含代码行号）；`thread --state BLOCKED/WAITING` 看全貌；`thread -b` 一句话定位"lock-holder-thread 持 ReentrantLock 阻塞 5 个线程"。线程池耗尽无拒绝策略 = 请求无限等待，表现为接口超时。
- **生产建议**：必开 `-XX:+HeapDumpOnOutOfMemoryError` 与 GC 日志（JDK17 用 `-Xlog:gc*:file=gc.log`）；dump 用 `-XX:HeapDumpPath` 放单独挂载点定期清理；Arthas 用完记得 `stop`（常驻有额外开销）。

## Important Claims（重要论断）

### GC 调优的核心权衡

「不是让每次 GC 更快，而是让 GC 总共更少」——调大年轻代后单次停顿变长但总开销大降。与 [[gc-log-tuning-practice]]、[[evidence-first-jvm-tuning]] 的调优观一致（多信源互证）。

### 通用排查套路

「拿到证据再动手——不要凭经验猜，先用工具拿数据」；第一步先判进程是否还在（在→Arthas/jmap 实时诊断，不在→dmesg/GC 日志/dump 现场），第二步按现象对号工具（内存→jmap -histo、超时→trace+watch、闪退→GC 日志+dmesg、GC 抖动→jstat、线程→jstack+thread -b）。

## Concepts Introduced（引入的概念）

- 无新概念页；方法论印证 [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]。

## Entities Mentioned（提及的实体）

- [[arthas|Arthas]]（trace/watch/thread -b/dashboard 实战用法）/ MAT / jmap / jstat / jstack（未立页）

## Implications（影响／启示）

- 五场景路由表（现象→工具）可与 [[jvm-gc-troubleshooting-arthas]] 的 FGC 七步决策树互补，合成一份覆盖更广的线上排障 SOP（解读）。
- 「进程在/不在」作为排查第一步是简单有效的分叉点：活着的进程才有实时诊断价值，不在的进程只能靠预先配置的日志与 dump 现场——这从反面论证了生产建议中「必开 dump 参数与 GC 日志」的必要性（解读）。

## Limitations（局限）

- 均为 4GB 内存 / 2 核虚拟机上的模拟数据，量级（128MB 堆、秒级停顿）远小于真实生产；数值只用于说明方法，不可直接套用到生产容量判断。
- 闪退排查只覆盖 JVM OOM 与 OOM Killer 两类，未涉及 JVM crash（hs_err）、容器 cgroup OOM 等其他形态。

## Related Knowledge（相关知识）

- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]（方法论上游，第五信源）
- [[jvm-gc-troubleshooting-arthas|JVM GC 排查实战（Arthas 版）]]（同族实战手册）
- [[jvm-gc|JVM 垃圾回收（主题）]]

## Source（信源）

- `raw/sources/architecture/2026-10-28-java-online-troubleshooting-arthas.md`
