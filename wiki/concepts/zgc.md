---
id: wiki-concept-zgc
type: concept
title: ZGC（低延迟垃圾收集器）
status: active
created: 2026-10-27
updated: 2026-11-23
confidence: high
tags:
  - concept
  - java
  - jvm
  - gc
sources:
  - raw/sources/architecture/2026-10-27-jvm-gc-interview-guide.md
  - raw/sources/architecture/2026-11-06-jvm-parameters-by-version.md
  - raw/sources/architecture/2026-11-23-jvm-zgc-evolution.md
related:
  - wiki/concepts/g1-gc.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/concepts/jvm-parameter-versioning.md
  - wiki/topics/jvm-gc.md
---
# ZGC（低延迟垃圾收集器）

## Definition（定义）

ZGC 是 JDK 11 引入、JDK 15 转正的低延迟垃圾收集器，基于 Region，目标是停顿时间 <10ms 且与堆大小无关，支持 8GB 至 TB 级堆。核心技术三件套：染色指针（Colored Pointers）、读屏障自愈、完全并发整理。分代状态随版本变化：JDK 21 分代需显式开启，JDK 23 起分代为默认，JDK 24 起仅剩分代（见 Evolution）。其设计目标是将最大停顿控制在亚毫秒级、停顿不随堆容量与存活集大小简单增长、支持从较小堆到多 TB 级大型堆（第三信源补充）。

## Why It Matters（为什么重要）

传统收集器的停顿随堆增大而变长，ZGC 把 STW 收敛到「只扫 GC Roots」，使停顿与堆大小解耦——堆从 8GB 扩到 1TB 停顿基本不变。这把 Java 带进了金融交易、实时通信、微服务网关等此前不敢用大堆的低延迟场景。传统 GC 的瓶颈在于：Parallel GC 以 STW 为主、停顿随回收工作量增大；CMS/G1 虽并发，但初始标记、最终标记、对象转移等阶段仍需停顿，且并发回收依赖写/读屏障等协调机制带来额外开销——真正影响停顿的是暂停阶段必须完成多少工作、这些工作能否转移到并发阶段（第三信源）。

## Core Characteristics（核心特征）

1. **染色指针**：把标记/重映射元数据存进 64 位指针的高 4 位（Marked0/Marked1/Remapped/Finalizable，利用 x64 空闲高位），不碰对象头，避免并发改对象头的锁竞争，每对象省 8 字节 mark word。指针位布局随实现与版本演进变化，不应把某个版本的布局当作永久规则；指针主要携带 GC 元数据，引用修复仍需读屏障与转发表配合（第三信源）。
2. **多视图映射（Multi-mapping）**：同一物理内存映射到 remapped/marked0/marked1 三个虚拟地址视图，读彩色指针无需先剥颜色位，按地址高位直接命中视图，零开销解引用。
3. **读屏障自愈**：每次读引用检查指针颜色，若指向已搬迁对象（Forwarded）则自动跳转新地址并把指针修正为 Remapped——应用线程自己完成指针修正，无需二次停顿。自愈四步：查转发表找到新地址 → 修正旧引用 → 适当情况下写回原引用位置 → 返回可用的新引用；读屏障主要针对堆中对象引用的加载、本身有运行时开销，且 ZGC 并非零 STW（第三信源）。
4. **完全并发整理**：并发标记 → 并发重定位（复制存活对象、建转发表）→ 并发重映射（读屏障自愈更新指针），整理不再 STW。
5. **仅两个极短 STW**：初始标记（扫 GC Roots，通常几毫秒）与最终标记（处理增量，通常 <1ms）。

## How It Works（运作方式）

标记存活 → 选择待清扫 Region → 并发复制 + 读屏障自愈转发 → 释放旧 Region。除头尾两个极短 STW 外全部与应用线程并发；「判断对象处于 marking 还是 relocating」由指针颜色位直接读出，是无分支代码。

## Relationships（关系）

### Related Concepts（相关概念）

- [[g1-gc|G1]]：ZGC 的前代默认收集器；G1 的整理发生在 STW 的 Mixed GC 中，ZGC 则并发整理。
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]：ZGC 是「延迟优先」目标下的选型终点；货拉拉实践补充了容器化细则（分代 ZGC 堆占比 65~70%，见该页 Evolution）。

### Distinctions（区分）

- 与 Shenandoah：目标相同（<10ms、停顿与堆无关），技术路线不同——ZGC 用染色指针（元数据在指针），Shenandoah 用 Brooks 转发指针（元数据在对象）；Shenandoah 为 OpenJDK 专属，Oracle JDK 不含。
- 与 [[g1-gc|G1]]：见 G1 页区分条目。

## Evolution（演进）

- JDK 11 实验引入 → JDK 15 正式转正 → JDK 17+ 被推荐用于低延迟生产场景（该信源观点）。
- **分代 ZGC 版本线**（第二信源印证并细化）：JDK 21 引入分代但需显式 `-XX:+ZGenerational`（此时 `-XX:+UseZGC` 给的是传统单代）→ JDK 23 分代成为默认（同时非分代模式废弃）→ JDK 24 移除非分代 ZGC → JDK 25 写 `-XX:-ZGenerational` 不再报错，只打一行 `Ignoring option ZGenerational; support was removed in 24.0` 然后照样用分代模式。含义：**同一行 `-XX:+UseZGC` 在 JDK 21 与 JDK 25 上跑的不是同一个 GC**；若曾在 21 上按单代 ZGC 调过堆和停顿，升 25 必须重新压测。
- **分代 ZGC 的原理与收益**（第三信源）：结合弱分代假说（多数对象生命周期短、少数长期存活），将堆划分为年轻代（高频回收）与老年代（低频处理）；通过写屏障记录跨代引用（老年代指向年轻代的引用），避免年轻代回收误收存活对象。收益：降低 GC CPU 开销、降低维持回收的堆内存开销、降低分配速率过快时的分配停顿风险、改善高分配速率场景整体效率；但并非所有业务吞吐量都会提升数倍，实际收益取决于分配速率、存活对象比例、堆大小、CPU 与负载特征。
- **分代 ZGC 可调参数（JDK 21+）**：`-XX:SoftMaxHeapSize`（在软上限附近保持，不急着扩到 `-Xmx`）、`-XX:ZUncommit`/`-XX:ZUncommitDelay`（控制空闲内存多久还给操作系统）。选型代价：堆几十 G、P99 硬指标时选分代 ZGC，代价是多烧 10%–15% CPU。
- **版本对照**（第三信源）：JDK 8 默认 Parallel GC（G1 已可用，`-XX:+UseG1GC`，7u4 起实验性）；JDK 17 默认 G1、ZGC 生产可用但非分代；JDK 21 默认 G1、ZGC 生产可用、分代 ZGC 可选实验性模式（`-XX:+UseZGC -XX:+ZGenerational` 显式开启）。
- 另见 [[jvm-parameter-versioning]]：JDK 25 起紧凑对象头 `-XX:+UseCompactObjectHeaders` 与低延迟叠加时受限——x64 上 ZGC 对紧凑头的支持尚在完善，目前低延迟+紧凑头只能用 G1。

## Selection（选型建议）

优先 ZGC 的场景（第三信源）：

1. **接口延迟极其敏感**：实时风控、高频交易、实时数据处理、对 P99/P999 有严格要求的微服务——一次几十毫秒停顿也可能影响请求处理。
2. **大内存、高分配速率**：大型缓存、高并发数据处理、大规模对象处理、大量长期存活对象的应用——ZGC 支持多 TB 级堆（Oracle JDK 21 文档称支持数百 MB 至 16TB 堆）。

不适合盲目切换：堆仅几百 MB、G1 已满足延迟要求的小服务不必为新技术强切——ZGC 的低停顿有成本（额外屏障处理、并发 GC 占用 CPU）；以极限吞吐量为目标的业务，Parallel GC 或 G1 可能更合适。

运行监控要点：对象分配速率、Live Set、并发回收期间堆余量、GC CPU、分配停顿、P99/P999；JDK 21+ 可用 `-Xlog:gc*` 观察。最终以真实业务压测对比 G1 与 ZGC（吞吐量、GC CPU、停顿时间、尾延迟）再定。信源总纲：**监控数据与业务诉求，永远是垃圾回收器选型的第一准则**（与 [[evidence-first-jvm-tuning]] 一致）。

## Open Questions（开放问题）

- 信源称「实测 16TB 堆、万亿引用，最大停顿 <1ms」，未给出处，引用时需标注为二次信源说法。
- 吞吐量略低于 G1、CPU 与内存占用更高；堆 <8GB 时收益有限（该信源经验判断）。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-jvm-gc-interview-guide.md`（定义与三件套，JDK 11/15 节点）
- Source: `raw/sources/architecture/2026-11-06-jvm-parameters-by-version.md`（分代版本线、可调参数、选型代价）
- Source: `raw/sources/architecture/2026-11-23-jvm-zgc-evolution.md`（传统 GC 瓶颈、染色指针/读屏障细节、分代 ZGC 原理与收益、版本对照、选型与监控建议）

## Related Knowledge（相关知识）

- [[jvm-gc|JVM 垃圾回收（主题）]]
- [[jvm-gc-interview-guide|JVM 垃圾回收面试全讲透（信源页）]]
