---
id: wiki-source-jvm-gc-troubleshooting-arthas
type: source
title: JVM GC 排查实战（Arthas 版）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - java
  - jvm
  - arthas
sources:
  - raw/sources/architecture/2026-10-21-jvm-gc-troubleshooting-arthas.md
related:
  - wiki/entities/arthas.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/sources/gc-log-tuning-practice.md
---
# JVM GC 排查实战（Arthas 版）

## Overview（概览）

实战手册文：Full GC 频繁的 Arthas 排查七步——dashboard 看全局 → jvm/memory 看配置 → 按现象对号根因表 → 晋升过快/堆 dump/元空间三条分支 → 按根因处理 → 验证修复。立场：装了 Arthas 就优先用它，比 jstat/jmap 效率高一个量级。

## Key Facts（关键事实）

- 第一步 dashboard 看趋势：OU 持续上涨→内存泄漏；OU 每次 FGC 后降幅大→晋升过快；Metaspace 接近满→类加载问题。配合 `jvm`（完整启动参数）与 `memory`（各区 used/committed/max）。
- 根因对照表：OU 每次 FGC 后降幅>50%→短命对象提前晋升；OU 持续涨 FGC 后几乎不降→内存泄漏；OU 不高但触发 FGC→CMS 碎片/大对象分配失败；Metaspace>90% 且 FGC 显示 Metadata GCThreshold→元空间不够/类泄漏；FGC+YGC 都频繁→整体堆太小/流量太大。
- 晋升过快三板斧：调大 -Xmn 或调小 NewRatio、调小 SurvivorRatio（8→4）、MaxTenuringThreshold 调到 15。
- 堆 dump：`heapdump --live`（先做 FGC 只留存活对象）→ MAT 三步：Leak Suspects → Dominator Tree 按 Retained Heap 找前 20 → Path to GC Roots（排除 weak/soft/phantom）看谁抓着不放；常见泄漏点：Map/Set 只增不删、ThreadLocal 未 remove、无上限缓存、静态集合、监听器未注销。
- 元空间/类加载器泄漏：`classloader` 看 numberOfInstances（同一 ClassLoader 多份=泄漏）与 loadedCountTotal；隔几分钟对比是否增长；`stack java.lang.ClassLoader loadClass` 定位加载源；`sc *CGLIB*/*Proxy*/*Lambda*` 查动态生成类；参考值：Spring Boot 正常 5000-20000 类、Metaspace 50-120MB，超 200MB 要查。
- 五个处置场景：A 晋升过快（调年轻代）、B 内存泄漏（MAT 定位修代码：缓存上限/remove ThreadLocal/WeakHashMap）、C CMS 碎片（换 G1）、D 元空间（无泄漏设 MaxMetaspaceSize=512M 兜底，有泄漏修 CGLIB/Groovy/反射缓存）、E System.gc()（删代码或 -XX:+DisableExplicitGC）。
- 收尾必须验证：dashboard 对比修复前后 YGC/FGC 频率、单次耗时、OU 趋势、Metaspace 稳定性。

## Important Claims（重要论断）

（无承重论断；操作流程手册。）

## Concepts Introduced（引入的概念）

（无）

## Entities Mentioned（提及的实体）

- [[arthas|Arthas]] / MAT（Eclipse Memory Analyzer，未立页）

## Implications（影响／启示）

- "现象→根因→下一步"的对照表把 [[gc-log-tuning-practice]] 的日志判读落成了可执行决策树，两者可合并成团队排障 SOP（解读）。

## Limitations（局限）

- 参考数值（5000-20000 类、50-120MB Metaspace）为经验口径，随应用规模浮动；以 CMS 为主要示例收集器。

## Related Knowledge（相关知识）

- [[gc-log-tuning-practice|GC 日志分析与调优实战（信源页）]]
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]（方法论上游）

## Source（信源）

- `raw/sources/architecture/2026-10-21-jvm-gc-troubleshooting-arthas.md`
