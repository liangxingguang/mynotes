---
id: wiki-source-weixin-jvm-gc-log-heap
type: source
title: 一行 log.info 打掉 8G 堆：每秒 500MB 大对象，是怎么把老年代喂满的
status: active
created: 2026-11-02
updated: 2026-11-02
confidence: high
tags:
  - source
  - java
  - jvm
  - gc
  - logging
  - arthas
sources:
  - raw/sources/architecture/2026-11-02-weixin-jvm-gc-log-heap.md
related:
  - wiki/concepts/g1-gc.md
  - wiki/concepts/log4j2-async-logging-thread-blocking.md
  - wiki/entities/arthas.md
  - wiki/sources/jvm-gc-troubleshooting-arthas.md
  - wiki/concepts/evidence-first-jvm-tuning.md
---
# 一行 log.info 打掉 8G 堆：每秒 500MB 大对象，是怎么把老年代喂满的

## Overview（概览）

JVM GC 故障复盘：报表接口在 `log.info` 里打印 5000 行查询结果的 JSON（单次 35MB、QPS 15、约 500MB/s 分配速率），G1 把 >2MB 的对象按 humongous 直接放进老年代，又被异步日志队列的强引用钉住，Full GC 每 2 分钟一次却"空转"收不掉。作者用 jstat → GC.class_histogram → heap_dump+MAT 三步 10 分钟定位到那行代码，Arthas 改日志级别先止血，根治改为打印"条数+耗时+裁剪样本"。

## Key Facts（关键事实）

- **故障现象**：P99 GC 停顿 2.8s；扩容两台无效（CPU 仅 20%，瓶颈是 STW 不是算力）；老年代 99%、Full GC 每 2 分钟一次、STW 2.5s、5xx 12%。
- **判据**：Full GC 频繁分两种——垃圾太多（加内存能缓解）vs 活对象太多（只能改代码）；只看 Full GC 后老年代水位降不降。本例 Full GC 后老年代只从 98% 掉到 95%。
- **排查三步**：`jstat -gcutil` 初筛（不停不触发 GC，看 O 回收后不降 → 强引用钉住）→ `GC.class_histogram` 摘流后看大对象（`[C` char[] 476 万个占 3.8GB）→ heap_dump + MAT Path to GC Roots 找到 LoggingEvent 队列钉住 62 个 35MB 字符串共 2.1GB。
- **根因两步放大**：G1 humongous 分配（>region 一半 2MB 直接进老年代，不经年轻代筛选）；异步日志队列把生命周期拉长（落盘速度跟不上生产速度，队列没满所以无感知）。
- **止血**：Arthas 动态调日志级别 `logger --level WARN`，1 分钟把 Full GC 从 2 分钟一次压到 40 分钟一次。
- **根治**：日志改打印"条数+耗时+裁剪样本（首行截断 200 字符）"；`toJSONString` 在参数位一定提前执行，级别/异步都救不了，只有 Supplier 或 `isInfoEnabled` 守卫能延迟求值。
- **反直觉**：调大 queueSize 只是允许把 1024×35MB 钉在内存里——队列只缓冲"小对象+尖峰"，大对象必须源头掐掉。
- **效果**：老年代 98%~99%→12%~18%，Full GC 2 分钟一次→0 次/天，接口 P99 3.1s→55ms；且大日志不止一处，另一接口异常分支打印完整请求体需一并改掉。
- **避坑**：参数位方法调用必执行；别用日志打印集合/响应体/SQL 结果集（含 MyBatis DEBUG 结果集）；异步队列不是内存保护；`jmap -histo:live` 别在高峰机器上跑；看到 Full GC 先看回收后水位（>85% 查活对象而非加堆）。

## Important Claims（重要论断）

- **GC 类故障水平扩容常是负收益**：CPU 只用 20%，瓶颈不是算力而是 STW 期间所有线程停着；加机器只是多制造同样的大对象，让 Full GC 来得更快。
- **异步队列不是内存保护**：AsyncAppender 是有界队列，钉住的是强引用；队列扩容只会让"活对象"更多，大对象必须从源头掐掉。
- **日志参数位方法调用必执行**：`log.info("x: {}", JSON.toJSONString(rows))` 里的 `toJSONString` 是提前执行的，和级别开不开、异步不同步都无关；只有 Supplier 或显式守卫能延迟求值。

## Concepts Introduced（引入的概念）

- 无新立概念页；本信源印证并深化 [[g1-gc|G1 垃圾收集器]] 的 humongous 分配机制、[[log4j2-async-logging-thread-blocking|异步日志线程阻塞]] 的队列引用问题（本例为内存钉住而非线程阻塞，互补视角）、[[arthas|Arthas]] 的动态日志级别调整。

## Entities Mentioned（提及的实体）

- [[arthas|Arthas]]（动态调日志级别止血）
- G1（Garbage-First 收集器，humongous 分配机制）
- AsyncAppender / ArrayBlockingQueue（异步日志队列，强引用钉住大对象）
- MAT（Eclipse Memory Analyzer，Path to GC Roots 定位持有者）
- JFR（JFR profile 常开做分配采样，`jdk.ObjectAllocationSample` 定位分配热点）

## Implications（影响／启示）

- Full GC 频繁的判据从"次数"推进到"回收后水位"：次数高可能是垃圾多，水位降不下去才是活对象多——这与 [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]] 的"先目标基线再归因"方法论一致。
- jstat → GC.class_histogram → heap_dump 三步排查法比 [[jvm-gc-troubleshooting-arthas|Arthas 版七步排查法]] 更轻量（不依赖 Arthas attach），适合快速初筛；两者可合并为团队排障 SOP（解读）。

## Limitations（局限）

- 文章使用 logback（非 Log4j2），AsyncAppender 为 logback 类；异步队列强引用钉住大对象的机制在 log4j2 中同样存在，但类名与配置项不同。
- 压测数据（35MB JSON、QPS 15、500MB/s）为单案例口径，随业务负载浮动。
- JFR 分配采样结果配图未收录（原文提及"JSON.toJSONString 占据最大样本占比"但配图未抓取）。

## Related Knowledge（相关知识）

- [[g1-gc|G1 垃圾收集器]]（humongous 分配机制）
- [[log4j2-async-logging-thread-blocking|Log4j2 异步日志线程阻塞]]（异步队列问题，本例为内存钉住视角）
- [[arthas|Arthas]]（动态日志级别调整）
- [[jvm-gc-troubleshooting-arthas|JVM GC 排查实战（Arthas 版）]]（七步排查法）
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]（方法论上游）

## Source（信源）

- `raw/sources/architecture/2026-11-02-weixin-jvm-gc-log-heap.md`
