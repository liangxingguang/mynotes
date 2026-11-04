---
id: wiki-source-2026-11-04-jvm-memory-model
type: source
title: JVM内存模型深度解析 —— 搞清楚堆和栈，告别OOM
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: medium
tags:
  - source
  - java
  - jvm
sources:
  - raw/sources/architecture/2026-11-04-jvm-memory-model.md
related:
  - wiki/concepts/jvm-runtime-memory-areas.md
  - wiki/topics/jvm-gc.md
  - wiki/concepts/oom-troubleshooting.md
  - wiki/concepts/jmm-happens-before.md
---
# JVM内存模型深度解析 —— 搞清楚堆和栈，告别OOM

## Overview（概览）

微信公众号「从CRUD到架构师」《架构师之路》专辑第 02 期（2026-11-04 采集）。JVM 运行时数据区科普：线程私有（程序计数器、虚拟机栈、本地方法栈）vs 线程共享（堆、元空间）五区域逐一拆解（存什么/何时创建销毁/出什么问题/怎么排查），含栈帧四组件、堆分代模型（Eden→S0/S1→老年代，年龄 15 晋升）、元空间 vs 永久代对比、经典内存分析题逐条解答与 JVM 参数速查表。

## Key Facts（关键事实）

- 区域划分：线程私有 = 程序计数器 + 虚拟机栈 + 本地方法栈；线程共享 = 堆 + 元空间。JDK8 把方法区从永久代改为元空间（高频追问点）。
- 程序计数器（PC）：记录当前线程执行的字节码行号；**唯一不会 OOM 的区域**；线程私有，CPU 切换线程靠它恢复位置；执行 native 方法时值为 undefined。
- 虚拟机栈：基本单位是栈帧，含局部变量表（参数+局部变量）、操作数栈（计算中间结果）、动态链接、返回地址；递归无终止或调用链过深 → `StackOverflowError`，解法是改循环或 `-Xss` 调大栈。
- 堆与分代：所有 new 出的对象和数组存堆。对象生命周期：Eden 出生 → Minor GC 后存活对象复制到 S0（年龄+1）→ S0/S1 间来回复制 → 年龄超阈值（默认 15）晋升老年代；大对象直接进老年代。
- 堆 OOM 场景：while 循环不断 new 且被引用持有、一次性加载大量数据、集合忘记清理；排查：`-XX:+HeapDumpOnOutOfMemoryError` 导出 dump 后用 MAT/JProfiler 分析。
- 元空间 vs 永久代：永久代（JDK7 及以前）在堆内、上限小易 OOM；元空间（JDK8+）在本地内存（操作系统管理）、默认无上限、类卸载时回收；参数为 `-XX:MetaspaceSize`/`-XX:MaxMetaspaceSize`。元空间 OOM 典型诱因：动态生成大量类（CGLIB 代理、JSP 编译、Lambda 表达式）。
- 经典面试题：`int i = 10` 存虚拟机栈（基本类型局部变量不进堆）；字符串常量 "hello" 存堆中字符串常量池（JDK7 后从方法区移入），引用 s 存栈；`new Person()` 实例存堆、引用存栈、类元数据存元空间。
- 参数速查：`-Xms` 堆初始 / `-Xmx` 堆最大 / `-Xss` 线程栈 / `-XX:NewRatio` 老生比 / `-XX:SurvivorRatio` Eden:Survivor（示例 8:1）/ `-XX:MetaspaceSize` / `-XX:MaxMetaspaceSize`。

## Important Claims（重要论断）

### Claim 1：内存区域职责一句话

"基本类型和引用在栈，对象在堆，类的元数据在元空间，代码执行位置在程序计数器。"（原文金句）

### Claim 2：元空间 OOM 的根因是动态类生成

遇到 `OutOfMemoryError: Metaspace`，说明动态生成了太多类（CGLIB 代理、JSP 编译、Lambda）——每个类都要在元空间占位置。

### Claim 3：版本演进节点是面试加分点

JDK7 之后字符串常量池从永久代移到堆中；JDK8 之后方法区从永久代变成元空间。知道"现在什么样"也要知道"演变过程"——这才是架构师思维。

## Concepts Introduced（引入的概念）

- [[jvm-runtime-memory-areas|JVM 运行时内存区域]]（新建概念页，本信源提出）
- 分代 GC 模型 → [[jvm-gc|JVM 垃圾回收]] 承载（Eden:Survivor、年龄晋升、大对象）
- OOM 类型判定 → [[oom-troubleshooting|OOM 排查方法论]] 承载（heap space / Metaspace 两行）

## Entities Mentioned（提及的实体）

- MAT / JProfiler（堆 dump 分析工具）
- JDK7 / JDK8（字符串常量池移堆、永久代改元空间两个版本节点）

## Implications（影响／启示）

- 排查内存问题的第一层地图是"哪个区域爆了"：OOM 错误关键词直接指向区域，区域决定工具与动作。
- 面试/分享讲内存模型要带版本演进（JDK7 常量池、JDK8 元空间），只讲现状经不起追问。

## Limitations（局限）

- 单一二手信源（公众号科普文），无官方规范对照；部分表述（如"默认 15 次晋升""SurvivorRatio 示例 8:1"）与主流教材一致但未引一手出处。
- 本地方法栈仅在划分中提及、未展开；G1/ZGC 等现代收集器下堆的组织方式（Region 分区、动态年龄阈值）未涉及，按 JDK8 经典分代模型叙述。
- 配图在采集中为占位符，文字内容完整。

## Related Knowledge（相关知识）

- [[jvm-runtime-memory-areas|JVM 运行时内存区域（概念页）]]
- [[jvm-gc|JVM 垃圾回收（主题）]]
- [[oom-troubleshooting|OOM 排查方法论]]
- [[jmm-happens-before|Java 内存模型与 happens-before]]（区分：JMM 是并发语义规范，本页是内存分区实现载体）

## Source（信源）

- `raw/sources/architecture/2026-11-04-jvm-memory-model.md`
