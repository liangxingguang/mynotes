---
id: wiki-concept-evidence-first-jvm-tuning
type: concept
title: 证据驱动的 JVM 调优
status: active
created: 2026-10-22
updated: 2026-10-27
confidence: high
tags:
  - concept
  - java
  - performance
  - jvm
sources:
  - raw/sources/misc/2026-10-14-jvm-tuning-core-approach.md
  - raw/sources/architecture/2026-10-21-gc-log-tuning-practice.md
  - raw/sources/architecture/2026-10-23-jdk21-migration-huolala.md
  - raw/sources/architecture/2026-10-27-jvm-gc-interview-guide.md
related:
  - wiki/concepts/cpu-funnel-coding.md
  - wiki/concepts/virtual-threads-production.md
  - wiki/concepts/g1-gc.md
  - wiki/concepts/zgc.md
  - wiki/topics/jvm-gc.md
  - wiki/sources/jvm-tuning-core-approach.md
---
# 证据驱动的 JVM 调优

## Definition（定义）

一种 JVM 性能调优方法论：不从参数开始，而是先固定可验收的量化目标并留下基线，用 JFR 与 GC 日志确认时间与内存的真实去向，仅在证据指向 JVM 之后才调整堆大小、收集器与 GC 参数；每轮改动是只改一个变量、可回退的实验。

## Why It Matters（为什么重要）

"症状驱动式调参"（接口慢调 -Xmx、FGC 多换收集器、OOMKilled 缩堆）看似在处理问题，但没有确认瓶颈归属，参数越改越难解释；且只看 GC 日志容易把数据库慢、锁等待、下游超时误算到 JVM 头上。先证据后参数能避免在错误的方向上加杠杆。

## Core Characteristics（核心特征）

1. **目标可验收**：如 2000 QPS 下 P99 从 800ms 降到 300ms 内，或批处理吞吐 +20% 且内存不越 limit；延迟、吞吐、占用互相制约，不可同时无限优化。
2. **基线先行**：相同流量、相同时长下留基线，业务指标（QPS/P99/错误率）与运行时指标（GC 后堆水位、分配速率、暂停、CPU、RSS、容器内存）一起看。
3. **JFR 归因**：线程/方法热点/锁/IO/GC 同时间线判读——RUNNABLE 久看 CPU 热点，BLOCKED 集中看锁竞争，Socket Read 占大头慢点在下游；业务线程停顿与 GC 时间线对上才追 GC。
4. **GC 日志看结构不数次数**：Young GC 间隔、暂停、GC 后 Old 水位、Full GC 触发原因、分配与晋升速度。
5. **堆外留位置**：容器 limit 不能全给 -Xmx，Metaspace/Code Cache/线程栈/Direct Buffer 等都要占内存。
6. **单变量实验纪律**：每轮只改一个主要变量，保留原始参数、流量、JFR、GC 日志与回退条件。

## How It Works（运作方式）

定目标 → 留基线 → JFR 定位时间去向 → GC 日志定位内存去向 → 证据指向代码则回代码（减临时对象、修锁与 IO），证据指向 JVM 才比较堆大小/暂停目标/收集器 → 单变量验证 → 对照基线验收或回退。

## Relationships（关系）

### Related Concepts（相关概念）

- [[cpu-funnel-coding|CPU 漏斗（编码级性能模型）]]：编码侧减少无效解析与临时对象，是本方法论"问题落在对象分配就先改代码"的具体手段；两信源一致主张调参是最后手段（互相印证）。

### Distinctions（区分）

- 与"症状驱动调参"的区别：后者以症状直接映射参数（慢→大堆、FGC→换收集器），前者要求先完成瓶颈归因再动参数。
- 与收集器选型的区别：本方法论不预设任何收集器信仰，收集器比较发生在"确认暂停时间确实影响业务"之后。

## Evolution（演进）

- 2026-10-14 — 随《一文掌握 JVM 调优核心思路》提出完整流程。
- 2026-10-21 — 《GC 日志分析与调优实战》独立印证同一闭环（定目标→看基线→定假设→压测验证，一次只动一个参数），并补充 GC 日志专项读法：real 才是真实停顿、吞吐量经验值 >95%~99%、内存泄漏三早期信号（老年代锯齿上移/FGC 单调递增/Survivor 持续偏高）、IHOP 45→35 单变量案例（FGC 每小时 6 次→0.5 次，P99 1.2s→380ms）。
- 2026-10-23 — 《JDK 21 规模化落地实践（货拉拉）》第三信源印证并补充容器化细则：G1 停顿目标从 200ms 起步、IHOP 45→35~40 同法；MaxRAMPercentage G1 取 70~75、分代 ZGC 取 65~70（ZGC 自身占用更高，堆占比不超 85%）；InitialRAMPercentage 约上限一半且不等于上限（防节点超卖先被杀）；System.gc() 用 -XX:+ExplicitGCInvokesConcurrent 改并发回收而非 DisableExplicitGC（NIO 要靠它回收 DirectByteBuffer）；堆外显式 MaxDirectMemorySize；JDK 21 起 JVM 读容器配额，堆大小用百分比不写死 -Xmx；排障顺序在虚拟线程时代变为 GC 日志→JFR→钉住跟踪→聚合指标。
- 2026-10-27 — 《JVM 垃圾回收面试全讲透》第四信源印证同一闭环：「黄金 6 步」（定位→定目标→选收集器→调内存→调参数→压测验证）与先证据后参数同构；补充监控阈值经验值（Minor GC >100ms 关注、Full GC 一小时多次为严重、平均 >2s 影响可用性、老年代 >80% 持续上涨需关注）与「90% 问题靠选对收集器+合理内存、代码优化 > GC 调优」的优先级判断。

## Open Questions（开放问题）

- JFR 标准 profile 开销 <2% 为 Oracle 说法，在不同负载形态下的真实开销需各自验证。
- `MaxRAMPercentage` 等比例参数留下的堆外余量是否够用，取决于线程数、堆外缓存与实际 RSS，无通用安全值。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-14-jvm-tuning-core-approach.md`
- Source: `raw/sources/architecture/2026-10-21-gc-log-tuning-practice.md`（印证：同一四步闭环 + GC 日志读法与告警规则）
- Source: `raw/sources/architecture/2026-10-23-jdk21-migration-huolala.md`（印证 + 容器化细则：堆百分比、ZGC 堆占比、ExplicitGCInvokesConcurrent、观测换代）
- Source: `raw/sources/architecture/2026-10-27-jvm-gc-interview-guide.md`（印证：黄金 6 步闭环 + 监控阈值经验值）

## Related Knowledge（相关知识）

- [[jvm-tuning-core-approach|一文掌握 JVM 调优核心思路]]
- [[cpu-funnel-coding|CPU 漏斗（编码级性能模型）]]
- [[gc-log-tuning-practice|GC 日志分析与调优实战（信源页）]]
- [[jdk21-migration-huolala|JDK 21 规模化落地实践（信源页）]]
- [[virtual-threads-production|虚拟线程生产实践]]
