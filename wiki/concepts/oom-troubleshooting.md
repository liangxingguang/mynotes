---
id: wiki-concept-oom-troubleshooting
type: concept
title: OOM 排查方法论
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - java
  - jvm
  - troubleshooting
sources:
  - raw/sources/architecture/2026-10-28-jvm-interview-guide.md
  - raw/sources/architecture/2026-10-28-java-online-troubleshooting-arthas.md
related:
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/topics/jvm-gc.md
  - wiki/sources/jvm-interview-guide.md
  - wiki/sources/java-online-troubleshooting-arthas.md
  - wiki/concepts/jmm-happens-before.md
  - wiki/concepts/class-loading-parent-delegation.md
  - wiki/entities/arthas.md
---
# OOM 排查方法论

## Definition（定义）

针对 `OutOfMemoryError` 的系统化排查方法：先按错误关键词定类型，再按类型选工具定位根源，全程「保留现场 → 命令行快查 → dump 深度分析 → 验证」四步。核心原则：**生产环境禁止直接 `jmap -dump`**（进程停顿成本），优先轻量命令行快查；OOM 只是症状，90%+ 的根因在代码。

## Why It Matters（为什么重要）

OOM 是线上最常见也最致命的 JVM 事故，且错误信息只告诉你「哪里爆」不告诉你「为什么爆」。没有提前配置的 dump 参数与 GC 日志，OOM 现场就是「瞎子摸象」——进程已死、日志戛然而止，只能靠猜测。方法论的价值在于把「先配参数、现场留存、按类型路由工具、证据闭环」固化为可重复流程。

## Core Characteristics（核心特征）

1. **6 类 OOM 速查表**（错误关键词 → 病灶 → 排查动作 → 解药）：

   | 错误关键词 | 病灶 | 排查动作 | 解药 |
   |---|---|---|---|
   | Java heap space | 堆 | jmap -histo 看大户 → MAT 看引用链 | 扩堆/修代码（大对象加载、集合泄漏） |
   | Metaspace | 元空间 | jstat -gc 看 MU/MC | 调 MaxMetaspaceSize、减动态类生成（CGLIB/反射/Groovy） |
   | Direct buffer memory | 直接内存 | 查 NIO/Netty 堆外释放 | MaxDirectMemorySize、修泄漏 |
   | StackOverflowError | 栈 | 递归无终止/循环依赖 | 修代码、调 -Xss |
   | unable to create native thread | 线程/系统 | ps -eLf 数线程 | 有界线程池、调小 -Xss |
   | GC overhead limit exceeded | 堆（严重） | GC 日志确认 98% 时间 GC 只回收 2% | 扩堆、减少对象产生 |

2. **排查五步法**：看日志定类型 → 保留现场（提前配 `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=...`）→ 命令行快查（jps/jstat/jmap -histo/jstack）→ MAT 深度分析（Histogram/Dominator Tree/Leak Suspects）→ 压测验证+监控。

3. **生产纪律**：
   - 禁直接 `jmap -dump`（STW 停顿），先 jstat/jstack 轻量快查，确认必要才 dump；
   - dump 文件指定 `-XX:HeapDumpPath` 到单独挂载点并定期清理（一个几百 MB）；
   - 监控先行：Prometheus + JMX Exporter，老年代 >85% 持续 5 分钟告警，「台阶式上涨不回落」是泄漏征兆。

4. **概念区分**：内存溢出（确实不够）≠ 内存泄漏（不用了但回收不掉，最终导致溢出）。`GC overhead limit exceeded` 比 heap space 更危险——98% 时间花在 GC 只回收 2%，堆接近耗尽且回收无效。

5. **结论导向**：JVM 参数只是缓兵之计，90%+ 的 OOM 是代码问题（集合只增不减、无上限缓存、ThreadLocal 未 remove、大对象加载、静态集合持有）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]：方法论上游——「拿到证据再动手、单变量实验、参数最后」；OOM 排查是该方法论在内存事故场景的实例化。
- [[jmm-happens-before|Java 内存模型与 happens-before]] / [[class-loading-parent-delegation|类加载与双亲委派]]：JVM 运行时机制谱系（同信源族）。

### Distinctions（区分）

- **OOM 排查 vs GC 调优**：前者处理「已经爆了的事故」（现场留存+根因定位），后者处理「没爆但慢/抖」（基线+归因+参数）；两者共用 [[evidence-first-jvm-tuning]] 的证据纪律，但工具路线不同（前者 jmap/MAT/dmesg，后者 jstat/GC 日志/JFR）。
- **JVM OOM vs OOM Killer**：进程消失时先看有没有 GC 日志/dump/OutOfMemoryError——有则是 JVM 自己 OOM；日志戛然而止且 `dmesg` 有 `Killed process (java)` 记录则是 Linux OOM Killer 杀（系统内存不足），两者处置完全不同。

## Evolution（演进）

- 2026-10-28 — 随 JVM 面试题信源提出 6 类 OOM 速查表与排查五步法（理论框架）。
- 2026-10-28 — Java 线上排查实战信源以真实复现数据印证同一流程：`-Xmx128m -XX:+HeapDumpOnOutOfMemoryError` 自动留现场 → `jmap -histo` 看大户（byte 数组 7434 实例占 63MB）→ MAT 分析引用链；并补充闪退场景的 OOM Killer 区分法（dmesg）。

## Open Questions（开放问题）

- 6 类 OOM 速查表为单一二手信源归纳；Direct buffer memory 与 native thread 两类的排查细节（如 `jcmd GC.class_histogram`、`/proc/<pid>/task` 数线程）在本文中仅点到，未展开。
- Metaspace 告警阈值（>85%）与 GC 调优阈值（老年代 >80%）出自不同信源、口径不同，未做统一。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-jvm-interview-guide.md`（6 类 OOM 速查表、五步法、生产纪律、监控口径）
- Source: `raw/sources/architecture/2026-10-28-java-online-troubleshooting-arthas.md`（印证：heap dump 参数+jmap -histo+MAT 实战；OOM Killer 与 JVM OOM 的闪退区分）

## Related Knowledge（相关知识）

- [[jvm-interview-guide|JVM 面试题最全整理（信源页）]]
- [[java-online-troubleshooting-arthas|Java 线上排查实战（信源页）]]
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]
- [[jvm-gc|JVM 垃圾回收（主题）]]
