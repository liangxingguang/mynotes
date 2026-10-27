---
id: wiki-concept-zgc
type: concept
title: ZGC（低延迟垃圾收集器）
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
  - wiki/concepts/g1-gc.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/topics/jvm-gc.md
---
# ZGC（低延迟垃圾收集器）

## Definition（定义）

ZGC 是 JDK 11 引入、JDK 15 转正的低延迟垃圾收集器，基于 Region、（该信源所述）不分代，目标是停顿时间 <10ms 且与堆大小无关，支持 8GB 至 TB 级堆。核心技术三件套：染色指针（Colored Pointers）、读屏障自愈、完全并发整理。

## Why It Matters（为什么重要）

传统收集器的停顿随堆增大而变长，ZGC 把 STW 收敛到「只扫 GC Roots」，使停顿与堆大小解耦——堆从 8GB 扩到 1TB 停顿基本不变。这把 Java 带进了金融交易、实时通信、微服务网关等此前不敢用大堆的低延迟场景。

## Core Characteristics（核心特征）

1. **染色指针**：把标记/重映射元数据存进 64 位指针的高 4 位（Marked0/Marked1/Remapped/Finalizable，利用 x64 空闲高位），不碰对象头，避免并发改对象头的锁竞争，每对象省 8 字节 mark word。
2. **多视图映射（Multi-mapping）**：同一物理内存映射到 remapped/marked0/marked1 三个虚拟地址视图，读彩色指针无需先剥颜色位，按地址高位直接命中视图，零开销解引用。
3. **读屏障自愈**：每次读引用检查指针颜色，若指向已搬迁对象（Forwarded）则自动跳转新地址并把指针修正为 Remapped——应用线程自己完成指针修正，无需二次停顿。
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

## Open Questions（开放问题）

- 信源称「实测 16TB 堆、万亿引用，最大停顿 <1ms」，未给出处，引用时需标注为二次信源说法。
- 吞吐量略低于 G1、CPU 与内存占用更高；堆 <8GB 时收益有限（该信源经验判断）。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-jvm-gc-interview-guide.md`

## Related Knowledge（相关知识）

- [[jvm-gc|JVM 垃圾回收（主题）]]
- [[jvm-gc-interview-guide|JVM 垃圾回收面试全讲透（信源页）]]
