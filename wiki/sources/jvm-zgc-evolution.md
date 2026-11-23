---
id: wiki-source-jvm-zgc-evolution
type: source
title: 【JVM 底层修炼记】从 JDK 8 到 JDK 21：ZGC 与低延迟垃圾回收器的演进
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - java
  - jvm
  - gc
  - zgc
sources:
  - raw/sources/architecture/2026-11-23-jvm-zgc-evolution.md
related:
  - wiki/concepts/zgc.md
  - wiki/topics/jvm-gc.md
---
# 【JVM 底层修炼记】从 JDK 8 到 JDK 21：ZGC 与低延迟垃圾回收器的演进

## Overview（概览）

知乎专栏《JVM 底层修炼记》系列的收官篇。系统讲解 ZGC 的低停顿机制（染色指针 + 读屏障自愈）、从 JDK 11 实验到 JDK 21 分代 ZGC 的版本演进，并给出 JDK 8→21 的 GC 选型建议与运行监控要点。

## Key Facts（关键事实）

- 传统 GC 瓶颈：Parallel GC 以 STW 为主；CMS/G1 虽并发，但初始标记、最终标记、对象转移等阶段仍需停顿，并发回收依赖写/读屏障等协调机制带来额外开销。
- ZGC 设计目标：最大停顿亚毫秒级、停顿不随堆容量与存活集大小简单增长、支持从较小堆到多 TB 级堆。
- 版本演进：JDK 11 实验性引入 → JDK 15 转正生产可用 → JDK 17 非分代 → JDK 21 引入分代 ZGC（可选实验性）→ JDK 23 分代成默认 → JDK 24 移除非分代。
- 版本对照：JDK 8 默认 Parallel GC（G1 自 7u4 实验性、`-XX:+UseG1GC` 可用）；JDK 17 默认 G1、ZGC 生产可用但非分代；JDK 21 默认 G1、分代 ZGC 需 `-XX:+UseZGC -XX:+ZGenerational` 显式开启。
- 分代 ZGC 原理：弱分代假说下的代际划分，写屏障记录跨代引用，收益为降低 GC CPU 开销、堆内存开销与分配停顿风险。
- 选型与监控：延迟敏感（风控、高频交易、P99/P999 微服务）与大内存高分配速率场景优先 ZGC；小堆且 G1 已满足不必强切；须监控分配速率、Live Set、堆余量、GC CPU、分配停顿、P99/P999，用 `-Xlog:gc*` 观察，最终压测对比 G1 与 ZGC。

## Important Claims（重要论断）

### 监控数据与业务诉求，永远是垃圾回收器选型的第一准则

ZGC 是并发回收器，须为并发回收预留堆空间；低停顿并非无成本（屏障处理、并发 GC 占 CPU），选型必须以真实压测与监控数据为准，而非为新技术而切换。

### 业务线程修改引用关系不意味着 GC 一定退化成长时间 STW

真正影响停顿的是暂停阶段必须完成多少工作、这些工作能否有效转移到并发阶段——这是 ZGC 设计思路的出发点。

## Concepts Introduced（引入的概念）

- [[zgc]]（染色指针、读屏障自愈、分代 ZGC，本篇为核心补充信源）
- 读屏障自愈（Self-Healing：查转发表→修正旧引用→写回→返回新引用）
- 弱分代假说在 ZGC 中的落地（代际划分 + 跨代引用写屏障）

## Entities Mentioned（提及的实体）

- Oracle JDK（ZGC 官方文档与发布说明，支持数百 MB 至 16TB 堆）
- OpenJDK ZGC 项目
- G1、Parallel GC、CMS（传统收集器对照）

## Implications（影响／启示）

- 该篇为 ZGC 提供了从原理、版本演进到选型监控的完整链路，与既有 [[zgc]] 概念页、[[jvm-gc]] 主题页互为印证，补强了「选型决策须以压测与监控数据为准」的方法论。

## Limitations（局限）

- 单信源（知乎专栏科普），非 Oracle 官方文档；引用了 Oracle 官方文档与 OpenJDK Wiki 作为参考资料，但正文论断未经一手基准验证。
- 「亚毫秒级停顿」「16TB 堆」等数字来自信源转述，引用时需注意出处。

## Related Knowledge（相关知识）

- [[zgc]]（ZGC 概念页，本篇主要更新对象）
- [[jvm-gc]]（JVM 垃圾回收主题页，本篇主要更新对象）
- [[evidence-first-jvm-tuning]]（证据驱动调优方法论，与本篇选型总纲互证）

## Source（信源）

- `raw/sources/architecture/2026-11-23-jvm-zgc-evolution.md`
