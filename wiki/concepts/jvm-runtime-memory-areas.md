---
id: wiki-concept-jvm-runtime-memory-areas
type: concept
title: JVM 运行时内存区域
status: active
created: 2026-11-05
updated: 2026-11-06
confidence: medium
tags:
  - concept
  - java
  - jvm
sources:
  - raw/sources/architecture/2026-11-04-jvm-memory-model.md
  - raw/sources/architecture/2026-11-06-jvm-memory-overview.md
related:
  - wiki/sources/2026-11-04-jvm-memory-model.md
  - wiki/sources/2026-11-06-jvm-memory-overview.md
  - wiki/topics/jvm-gc.md
  - wiki/concepts/oom-troubleshooting.md
  - wiki/concepts/jmm-happens-before.md
  - wiki/concepts/class-loading-parent-delegation.md
---
# JVM 运行时内存区域

## Definition（定义）

HotSpot JVM 启动时划分的内存区域总称：线程私有（程序计数器、虚拟机栈、本地方法栈）+ 线程共享（堆、元空间）。各区域存放什么、何时创建销毁、会出什么问题各不相同，是理解 OOM/StackOverflow 与 GC 的第一层地图。**本页是内存分区（实现载体）**，与 [[jmm-happens-before|Java 内存模型]] 的并发语义规范互补不重叠。

> **视界说明（双信源对账）**：JVM 规范口径的「运行时数据区」为五区域（不含直接内存）；但第二信源（[[2026-11-06-jvm-memory-overview|JVM 内存模型全景]]）采用**六区域视界**，把 NIO 直接内存（堆外）也纳入"内存全景图"——理由是排障/面试场景需要按 OOM 错误关键词对号入座，而 `Direct buffer memory` 类故障恰恰发生在规范之外。两种视界不矛盾：本文按规范五区域组织，把直接内存作为"全景图外挂"单列。
- **分区根因（解读，综合两信源）**：分区不是随便切，而是各区域**生命周期与访问方式不同**——线程私有区随线程生灭、无并发竞争；共享区承载大量对象，靠 GC 与锁保证一致。这种「快变、私有、简单」vs「慢变、共享、复杂」的二分法是分代、Region、并发回收等所有优化的底层逻辑。

## Why It Matters（为什么重要）

内存问题的类型判定与排查动作都建立在区域划分之上：OOM 错误关键词直接指向区域（heap space→堆、Metaspace→元空间），区域决定工具与动作。面试与线上排障的第一层地图：先定"哪个区域爆了"，再定"为什么爆"。

## Core Characteristics（核心特征）

1. **线程私有 vs 线程共享**：私有区域每线程一份（程序计数器/虚拟机栈/本地方法栈），共享区域所有线程共用（堆/元空间）。
2. **程序计数器（PC）**：记录当前线程执行的字节码行号；**唯一不会 OOM 的区域**；线程私有，CPU 切换线程靠它恢复执行位置；执行 native 方法时值为 undefined。
3. **虚拟机栈**：基本单位是栈帧，四组件 = 局部变量表（参数+局部变量）+ 操作数栈（计算中间结果）+ 动态链接 + 返回地址；递归无终止/调用链过深 → `StackOverflowError`，解法：改循环或 `-Xss` 调大栈。
4. **堆**：所有通过 new 创建的对象和数组的唯一出生地，GC 主战场；分代模型：Eden 出生 → Minor GC 存活对象复制到 S0（年龄+1）→ S0/S1 轮流复制 → 年龄超阈值（默认 15）晋升老年代 → 大对象直接进老年代。
5. **元空间**：JDK8 起取代永久代（PermGen），从堆内移到本地内存（操作系统管理）；存放类元数据（类定义信息）；默认无上限、类卸载时回收；参数 `-XX:MetaspaceSize`/`-XX:MaxMetaspaceSize`；OOM 典型诱因：动态生成大量类（CGLIB 代理、JSP 编译、Lambda 表达式）。
6. **经典内存分析题**（变量放哪）：`int i = 10` → 虚拟机栈（基本类型局部变量不进堆）；字符串常量 `"hello"` → 堆中字符串常量池（JDK7 后从方法区移入堆），引用变量本身在栈；`new Person()` → 实例在堆、引用在栈、类元数据在元空间。
7. **参数速查**：`-Xms` 堆初始 / `-Xmx` 堆最大 / `-Xss` 线程栈 / `-XX:NewRatio` 老生比 / `-XX:SurvivorRatio` Eden:Survivor（示例 8:1）/ `-XX:MetaspaceSize` / `-XX:MaxMetaspaceSize`。
8. **生产实践**：`-Xms` 与 `-Xmx` 设不一致会触发按需扩容并伴随 Full GC 抖动——生产建议两者设相等（第六信源口径）。容器环境：早期 JVM 误读宿主机内存致 `-Xmx` 过大，JDK 8u191+/11+ 默认 `-XX:+UseContainerSupport`，老版本在 Docker 需手动设 `-Xmx`（版本节点与 [[jvm-parameter-versioning]] 对账后采信，细节以对账表为准）。
9. **直接内存（第六信源外挂）**：`ByteBuffer.allocateDirect` 分配在堆外本地内存，不做堆分代、不受 GC 直接管理（靠 `Cleaner` 回收，可能不及时），但计入进程总内存；上限 `-XX:MaxDirectMemorySize`（默认等于 `-Xmx`）。它不是 JVM 规范运行时数据区，但属于"全景图"视角的第六块——NIO/Netty 密集服务需单独限流，否则出现"堆还空、进程被 OS OOM Killer 杀掉"。

## Structure（结构）

区域总览（文字）：程序计数器（线程私有，字节码行号）｜虚拟机栈（线程私有，栈帧×N）｜本地方法栈（线程私有，native 调用）‖ 堆（线程共享，对象/数组+分代）｜元空间（线程共享，类元数据）。

## How It Works（运作方式）

对象生命周期：`new` 的对象先进 Eden → Minor GC 后存活者复制到 S0（年龄+1）→ 多次 GC 在 S0/S1 间轮流复制 → 年龄超阈值（默认 15）晋升老年代 → 特别大的对象直接进老年代（不走新生代）。线程创建时分配私有区域（栈），类加载时元数据进入元空间（类卸载时回收）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[jvm-gc|JVM 垃圾回收]]：堆是 GC 主战场；分代模型（Eden:Survivor=8:1:1、年龄晋升）是 GC 算法的落地前提。
- [[oom-troubleshooting|OOM 排查方法论]]：6 类 OOM 速查表的区域维度（heap space/Metaspace/Direct buffer/StackOverflow/native thread/GC overhead limit）。
- [[jmm-happens-before|Java 内存模型与 happens-before]]：JMM 是并发可见性契约（抽象规范），本页是其实现载体（具体分区）；讨论"线程私有/共享内存"用本页，讨论"可见性契约"用 JMM。
- [[class-loading-parent-delegation|类加载与双亲委派]]：类元数据进入元空间的路径由类加载机制决定。

### Dependencies（依赖项）

- 无（基础概念页）

### Distinctions（区分）

- **运行时内存区域 vs JMM**：前者回答"内存分几块、对象放哪"，后者回答"线程间如何看到彼此的修改"；[[jmm-happens-before]] 页明确二者不等同。
- **元空间 vs 永久代**：版本演进而非并存（JDK8 起元空间取代永久代），对比见 Core Characteristics 第 5 条。

## Evolution（演进）

- 2026-11-05 — 随《JVM 内存模型深度解析》信源提出：五区域划分、栈帧四组件、堆分代模型、元空间 vs 永久代对比、经典面试题与参数速查。
- 2026-11-06 — 随《JVM 内存模型全景》信源扩展：补充**分区根因**（生命周期/访问方式的"快变私有/慢变共享"二分法）、生产实践（`-Xms=-Xmx` 省抖动、容器感知 `UseContainerSupport`）、**直接内存作为全景图第六块**（非规范数据区，见定义视界说明），并对默认代比例给出 2:1 / 8:1:1 口径（印证 Open Question 3）。

## Open Questions（开放问题）

- 本地方法栈的栈帧结构与溢出场景本文仅提及未展开，待补充信源。
- 分代模型按 JDK8 经典叙述；G1/ZGC 下堆的 Region 分区与动态年龄阈值与经典模型的差异未在本页处理（见 [[jvm-gc]]）。
- `-XX:NewRatio`/`-XX:SurvivorRatio` 等参数的默认值：第二信源《JVM 内存模型全景》给出老年代:新生代=2:1、Eden:S0:S1=8:1:1 作为默认口径（与本页示例值一致），但仍未引 HotSpot 官方规范条目，置信度兑现仍需一手文档。
- 直接内存的默认上限"等于 `-Xmx`"为第六信源口径，HotSpot 实际行为（JDK 各版本可能取消该默认）尚未对账，待 [[jvm-parameter-versioning]] 口径核实。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-04-jvm-memory-model.md`（五区域划分与职责、栈帧四组件、分代对象生命周期、元空间 vs 永久代、经典内存分析题、参数速查表）
- Source: `raw/sources/architecture/2026-11-06-jvm-memory-overview.md`（分区根因、`-Xms=-Xmx` 生产实践、直接内存外挂块、OOM 对号入座表、默认代比例 2:1 / 8:1:1、容器感知 UseContainerSupport）

## Related Knowledge（相关知识）

- [[2026-11-04-jvm-memory-model|JVM 内存模型深度解析（信源页）]]
- [[2026-11-06-jvm-memory-overview|JVM 内存模型全景（信源页）]]
- [[jvm-gc|JVM 垃圾回收（主题）]]
- [[oom-troubleshooting|OOM 排查方法论]]
- [[jmm-happens-before|Java 内存模型与 happens-before]]
- [[jvm-parameter-versioning|JVM 参数体系与版本对账]]（直接内存/容器感知默认值兑现核对入口）
