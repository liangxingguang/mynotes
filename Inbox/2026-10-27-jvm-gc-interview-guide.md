---
id: 2026-10-27-jvm-gc-interview-guide
title: JVM 垃圾回收面试全讲透：从引用计数到 ZGC 调优
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/n2J8M9N14e2oTOldtt-EHQ
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 工程实践]
asset_ref: Assets/2026/10/jvm-gc-interview-guide.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-27T13:20:26.338Z"
ingest_claim_id: 21892-1793107226338-0
---

# JVM 垃圾回收面试全讲透

> 一篇覆盖 JVM GC 面试高频考点的长文：对象可回收判定（引用计数 vs 可达性分析）、四大回收算法与分代收集、Serial/Parallel/CMS/G1/ZGC/Shenandoah 六大收集器对比选型，深入拆解 G1 的 Region/RSet/SATB/Mixed GC 与 ZGC 的染色指针/并发整理，最后给出 GC 调优黄金 6 步、常用参数速查表和 Graal JIT 优化解析。

## 核心要点

- **可回收判定**：Java 用可达性分析（GC Roots 出发），解决引用计数法无法处理的循环引用；GC Roots 包括虚拟机栈局部变量、JNI 引用、static 变量、final static 常量、synchronized 持有的对象；回收前经历两次标记，finalize() 已被弃用
- **四大算法**：标记-清除（有碎片）、标记-复制（新生代，Eden+Survivor 8:1:1）、标记-整理（老年代，无碎片但 STW 长）、分代收集（现代 JVM 主流组合）
- **收集器选型**：JDK8 默认 Parallel，JDK9+ 默认 G1（Region 分区、可预测停顿、4~64GB 堆）；ZGC/Shenandoah 亚毫秒停顿、停顿与堆大小无关，适合大堆低延迟场景；CMS 已废弃
- **G1 原理**：Region 分区（1~32MB）+ RSet 解决跨代引用扫描（写屏障标脏 Card）+ SATB 快照保证并发标记正确性（宁可多标不漏标）+ Mixed GC 分批回收性价比最高的老年代 Region
- **ZGC 原理**：染色指针（64 位指针高 4 位存元数据，多视图映射零开销解引用）+ 读屏障自愈 + 完全并发整理，仅初始/最终标记两个极短 STW
- **调优方法论**：黄金 6 步（定位→定目标→选收集器→调内存→调参数→压测验证）；90% 问题靠选对收集器+合理内存解决；代码优化 > GC 调优
- **Graal JIT**：用 Java 编写的图 IR 编译器，王牌是部分逃逸分析（PEA），Stream/Lambda 密集代码收益最大；libgraal 让编译器本身零预热

## 正文

正文较长（约 3.5 万字符），完整抓取稿见附件 [[Assets/2026/10/jvm-gc-interview-guide.md]]。

章节结构：

1. 如何判断对象可回收？引用计数法 vs 可达性分析（含两次标记、GC Roots 清单、对比表）
2. 垃圾回收算法：标记-清除 / 标记-复制 / 标记-整理 / 分代收集（含对比表与堆内存划分图）
3. 常见垃圾收集器对比与选型：Serial / Parallel / CMS / G1 / ZGC / Shenandoah（含发展时间线、指标对比表、选型决策树）
4. G1 GC 原理：Region 分区、RSet、SATB、Mixed GC
5. ZGC 原理：染色指针、并发整理、亚毫秒级停顿
6. GC 调优思路与常用参数（黄金 6 步、监控指标阈值、G1/ZGC 参数速查表）
7. JDK 17 GraalVM JIT 编译器优化（部分逃逸分析、libgraal、Graal vs C2）

## 来源

[面试官连环追问JVM垃圾回收？从引用计数到ZGC调优，一篇全讲透（建议收藏）](https://mp.weixin.qq.com/s/n2J8M9N14e2oTOldtt-EHQ)（微信公众号）

## 附件

- [[Assets/2026/10/jvm-gc-interview-guide.md]]（抓取正文，约 3.5 万字符，browser 级抓取）
