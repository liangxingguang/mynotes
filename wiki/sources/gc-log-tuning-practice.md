---
id: wiki-source-gc-log-tuning-practice
type: source
title: GC 日志分析与调优实战
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - java
  - jvm
  - gc
sources:
  - raw/sources/architecture/2026-10-21-gc-log-tuning-practice.md
related:
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/sources/jvm-tuning-core-approach.md
---
# GC 日志分析与调优实战

## Overview（概览）

公众号实战文：从"调优不是拍脑袋改 -Xmx"开场，给出 GC 日志的开启方法、Minor/Full GC 日志逐段读法、三项量化指标、四步调优闭环、G1/ZGC 参数模板、jstat 实时观测、内存泄漏早期信号与生产告警规则——一句话：开日志→读指标→定假设→压测验证。

## Key Facts（关键事实）

- 开日志（JDK9+ 统一 -Xlog）：`-Xlog:gc*:file=gc-%t.log:time,uptime,level,tags:filecount=10,filesize=100M`；JDK8 用老式 PrintGCDetails 系列，目的一样。
- 读日志：Minor GC 看 Eden 清空、Survivors 自适应、Heap 回收量；`Times: real` 才是真实停顿，user+sys>real 是多线程并行累加。Full GC 重点看 real 与触发原因（Allocation Failure/Metadata GC Threshold/Ergonomics/System.gc()），频繁 Full GC 是红色警报。
- 三项量化指标：吞吐量=(运行时间−GC时间)/运行时间（后台服务经验值 >95%~99%）；平均/最大停顿（SLA 卡最大停顿）；停顿频率。`jstat -gcutil pid 1s` 实时看，`FGCT` 在涨立刻警惕。
- 四步闭环：定目标（吞吐 vs 延迟，调法相反）→ 看现状（开日志+压测留基线）→ 定假设（最可能改善的那一个参数）→ 压测验证（**改一处量一次**，有效固化、无效回滚）——"调优是科学实验不是玄学"。
- G1 模板要点：MaxGCPauseMillis 是"目标"不是"保证"，设 50 比设 200 吞吐差很多；老年代涨得快调低 IHOP（案例：45→35，FGC 从每小时 6 次×800ms 降到 0.5 次×<100ms，P99 1.2s→380ms，吞吐 92%→98.5%）；G1ReservePercent 防晋升失败；HeapDumpOnOutOfMemoryError 是底线。
- ZGC 调优极简：基本不用调收集器参数，管好堆上限并验证日志 Pause 行真在 10ms 内。
- 反模式：只加 -Xmx 不换收集器；同时开矛盾参数（G1+CMS）；不看日志凭感觉调；生产不开日志。
- 内存泄漏早期信号：老年代锯齿但整体上移（Full GC 后回不到低位）、FGC 单调递增且 FGCT 占比升高、Survivor 持续偏高（提前晋升）——别等 OOM，抓堆快照定位常驻大对象；`O` 列只涨不跌且 FGC 增加基本是泄漏。
- G1 日志进阶：Concurrent Mark 过长=堆大或存活多；Rebuild Remembered Sets 开销大=跨代引用多；Pause Remark 长可调 ParallelGCThreads。
- 生产告警：老年代>85% 预警、5 分钟 Full GC>3 告警、最大停顿>1s 告警——意义是在 OOM 前暴露趋势。
- 团队沉淀：记基线、写决策记录（为什么设这个参数/依据哪次压测）、建参数模板进脚手架、OOM 复盘归因（代码/配置/容量）。

## Important Claims（重要论断）

### Claim 1：调优值钱的不是背参数，而是可复用、文档化的方法论

"先观测、再假设、慢验证、勤记录"；一次只动一个参数，否则永远不知道哪个起作用（信源收尾）。

## Concepts Introduced（引入的概念）

（无——方法论与 [[evidence-first-jvm-tuning]] 完全同构，作为其第二信源）

## Entities Mentioned（提及的实体）

- G1 / ZGC / GCeasy / GCViewer（工具与收集器，未立页）

## Implications（影响／启示）

- IHOP 45→35 的单变量案例是"基线→假设→验证"方法论的教科书式演示，可直接引用于团队培训（解读）。

## Limitations（局限）

- 参数值为示例；告警阈值（85%/3 次/1s）需按业务 SLA 校准。

## Related Knowledge（相关知识）

- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]（同一方法论的概念页）
- [[jvm-tuning-core-approach|JVM 调优核心思路（信源页）]]（第一信源）

## Source（信源）

- `raw/sources/architecture/2026-10-21-gc-log-tuning-practice.md`
