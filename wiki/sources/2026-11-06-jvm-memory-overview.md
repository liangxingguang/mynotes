---
id: wiki-source-2026-11-06-jvm-memory-overview
type: source
title: JVM 内存模型全景（从一个 OOM 说起）
status: active
created: 2026-11-06
updated: 2026-11-06
confidence: medium
tags:
  - source
  - java
  - jvm
sources:
  - raw/sources/architecture/2026-11-06-jvm-memory-overview.md
related:
  - wiki/concepts/jvm-runtime-memory-areas.md
  - wiki/concepts/oom-troubleshooting.md
  - wiki/topics/jvm-gc.md
  - wiki/sources/2026-11-04-jvm-memory-model.md
---
# JVM 内存模型全景（从一个 OOM 说起）

## Overview（概览）

微信公众号文章（「JVM 与性能调优系列」第 1 篇，2026-11-06 采集）。以凌晨 `Java heap space` 告警切入，按「六区域全景 → 分区根因 → 各区域细节 → OOM 对号入座 → 默认配置自查」展开：给出「生命周期与访问方式不同」的分区逻辑，六区域（堆/虚拟机栈/本地方法栈/方法区·元空间/程序计数器/直接内存）各司其职，并附 OOM 错误对号入座表、`java -XshowSettings:vm -version` 默认配置自查与容器环境内存感知版本差异。本信源与 [[2026-11-04-jvm-memory-model]] 同为「JVM 内存分区」主题，但采用**六区域视界（含直接内存）**，与后者的五区域视界互补不冲突。

## Key Facts（关键事实）

- 六区域全景：堆、虚拟机栈、本地方法栈、方法区/元空间、程序计数器、**直接内存**（后五者外的 NIO 堆外内存）。
- 分区根因（原文表述）：线程私有的区域（栈、PC、本地栈）随线程生灭、天然无并发竞争；共享的堆与元空间承载大量对象，需要 GC 与锁来保证一致；「快变、私有、简单」与「慢变、共享、复杂」分开管理是分代、Region、并发回收等优化的底层逻辑。
- 堆的 `-Xms`/`-Xmx` 不一致会触发扩容 Full GC；生产建议两者设相等以省掉抖动（原文建议，非硬性规范）。
- 虚拟机栈两错：`StackOverflowError`（递归无出口、栈帧层层压入撑爆，栈固定深度由 `-Xss` 控制）；`OutOfMemoryError: unable to create new native thread`（线程数过多，OS 连线程栈都分配不出来）；曾引真实故障：每请求 `new Thread` 、几千并发后全站雪崩。
- 方法区/元空间：JDK 8 起 Metaspace 取代 PermGen、挪到本地内存；Metaspace OOM 多因动态生成类过多（CGLIB 代理、Groovy 脚本、JSP 预编译）；微服务常显式设 `-XX:MaxMetaspaceSize`。
- 程序计数器：正在执行 native 方法时值为 undefined；**唯一不会 OOM 的区域**（原文口径）。
- 直接内存：`ByteBuffer.allocateDirect` 分配在堆外本地内存；不像堆一样受 GC 管理（靠 Cleaner 机制，可能不及时），但算在进程总内存内；可导致「堆还空，进程被 OS 以 OOM 杀掉」；上限 `-XX:MaxDirectMemorySize`（默认等于 `-Xmx`）。
- OOM 对号入座表（五类）：`Java heap space`→堆/对象堆积与内存泄漏；`Metaspace`→元空间/类加载过多（CGLIB/Groovy）；`unable to create new native thread`→栈线程超限；`Direct buffer memory`→直接内存/NIO 未限流；`GC overhead limit exceeded`→堆 98% 时间 GC 只回收不到 2%。
- 默认配置快查：`java -XshowSettings:vm -version` 显示堆总量、各代默认比例（老年代:新生代=2:1，Eden:S0:S1=8:1:1，原文标注为「默认」）与元空间预留。
- 容器环境：早期 JVM 误读宿主机内存致 `-Xmx` 过大；JDK 8u191+/11+ 默认 `-XX:+UseContainerSupport`（原文提示，与 [[jvm-parameter-versioning]] 载的 8u191/11/191 世界线相近，版本号细节以对账为准）；老版本在 Docker 需手动 `-Xmx`。
- 系列脉络：本文题为「JVM 与性能调优系列」第 1 篇，后续分代、GC 算法、收集器、调优逐篇展开。

## Important Claims（重要论断）

### Claim 1：分区的真正原因是生命周期与访问方式（解读）

原文表述「快变、私有、简单」vs「慢变、共享、复杂」：线程私有区随线程生灭无并发竞争，共享区需要 GC 与锁，因此分开管理是所有后续优化的底层逻辑（原文推断，非 JVM 规范原文，标记为解读）。

### Claim 2：直接内存不受 GC 管理是它最危险的地方

NIO 大量分配堆外内存可绕过堆 GC 的上界保护，堆还很空进程就被 OS 杀掉（原文口径：直接内存上限默认 `-Xmx`，OOM Killer 的场景示例与 [[oom-troubleshooting]] 已载 OOM Killer 区分法互补）。

### Claim 3：生产把 `-Xms` 与 `-Xmx` 设相等省钱去抖

原文建议：两者不一致会触发按需扩容并伴随一次 Full GC；生产通常设相等。此为经验建议，不是 JVM 规范要求。

### Claim 4：版本节点值得单独记（JDK 8 起元空间 + 8u191+/11+ 容器感知）

方法区从永久代改元空间（JDK 8）、容器感知从 JDK 8u191（及 11+）默认启用——这些版本节点是排查与面试的双重加分项（与既有 [[jvm-parameter-versioning]] 对账后采信）。

## Concepts Introduced（引入的概念）

- [[jvm-runtime-memory-areas|JVM 运行时内存区域]]（更新：**六区域视界补充直接内存** + 分区根因 + `-Xms=-Xmx` 生产实践 + 默认代比例口径 + 容器感知，本信源提出）
- 直接内存（Direct Memory）→ 归 [[jvm-runtime-memory-areas]] 承载（OOM 对号入座表与直接内存特性的信源）
- OOM 对号入座（五类）→ [[oom-troubleshooting|OOM 排查方法论]] 承载（独立印证 + 真实故障案例新增）
- 分区根因（生命周期与访问方式）→ [[jvm-runtime-memory-areas]]（更新既有条目「为什么分区」的解释）

## Entities Mentioned（提及的实体）

- NIO / Netty：直接内存分配（`ByteBuffer.allocateDirect`）与堆外内存消耗的主要背景
- Spring AOP：CGLIB 代理大量生成类 → 元空间增长 → 微服务需显式 `MaxMetaspaceSize`
- JDK 8u191+ / 11+：容器感知默认启用的版本节点
- WeChat 官方账号：本信源（JVM 与性能调优系列，第 1 篇）

## Implications（影响／启示）

- OOM 排障的第一顺位判断：先看「爆在哪块区域」再看「为什么爆」，区域维度的 OOM 模型跨越文章与既有 [[oom-troubleshooting]] 口径一致。
- 直接内存类问题（Netty/NIO 密集型服务）需单独设 `-XX:MaxDirectMemorySize` 并纳入容器内存配额监控——只盯堆大小会被 OOM Killer 突袭。
- 默认参数要「先看再用」：`java -XshowSettings:vm -version` 一命令拉齐默认代比例与元空间预留，团队起步就该心里有数（原文建议）。
- 分区讲「为什么分开」比罗列六块更有记忆点：生命周期/访问方式的二分法贯穿分代、Region 与并发回收。
- 六区域视界（含直接内存）与五区域视界（HotSpot 规范运行时数据区口径）需要显式区分（本信源与 [[2026-11-04-jvm-memory-model]] 即两种视界），避免"JVM 有五块还是六块"的答错。

## Limitations（局限）

- 单一二手信源（微信公众号科普文），无 JVM 规范/官方文档对照；作者未署名公众号名（正文称「关注公众号，追更不迷路」）。
- 「容器感知 JDK 版本 = 8u191+/11+」表述模糊（8u191、11+ 并列，未区分 8 与 11 各自起点），与 [[jvm-parameter-versioning]] 载的对账表需交叉核对。
- 代码块在采集中为单行压缩（`java -XshowSettings:vm -version# 或看 GC 详情…`），非原文真实换行；表格被采集拆散为逐行文字，已据内容还原为表语义。
- 各区取值（2:1、8:1:1 代比例等）仅引用原文，未与实测/官方默认交叉验证。
- PC「唯一不会 OOM」是规范口径但原文以科普语气陈述，未引规范条目号。

## Related Knowledge（相关知识）

- [[jvm-runtime-memory-areas|JVM 运行时内存区域（概念页）]]（更新）
- [[oom-troubleshooting|OOM 排查方法论（概念页）]]（更新）
- [[2026-11-04-jvm-memory-model|JVM 内存模型深度解析（同主题五区域视界信源）]]
- [[jvm-gc|JVM 垃圾回收（主题）]]（本信源后续分代/收集器脉络待展开）
- [[jvm-parameter-versioning|JVM 参数体系与版本对账]]（容器感知版本入口可核对）
- [[oom-troubleshooting]] 已载：6 类 OOM 速查表、OOM Killer 区分、生产纪律

## Source（信源）

- `raw/sources/architecture/2026-11-06-jvm-memory-overview.md`
- asset_ref: `Assets/2026-11/jvm-memory-overview.md`
