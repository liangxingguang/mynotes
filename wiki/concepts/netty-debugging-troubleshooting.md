---
id: wiki-concept-netty-debugging-troubleshooting
type: concept
title: Netty 调试与生产排障方法论
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - concept
  - netty
  - troubleshooting
sources:
  - raw/sources/architecture/2026-10-27-netty-debugging-guide.md
related:
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/netty-pooled-allocator.md
  - wiki/concepts/netty-bytebuf.md
  - wiki/entities/netty.md
---
# Netty 调试与生产排障方法论

## Definition（定义）

围绕 Netty 应用的两段式问题定位体系：开发期用嵌入式测试与透视工具把 Handler 行为钉死，线上用框架内置指标与自愈机制做健康监控与归因；配合"GC 日志 → Netty 指标 → 业务代码"的逐层收敛顺序。

## Why It Matters（为什么重要）

Netty 的典型故障（内存爆、粘包、空轮询 CPU 100%、压测超时）靠猜无法定位；框架自带了成套观测手段，善用可分钟级定位到代码行（信源论点）。

## Core Characteristics（核心特征）

1. **本地调试三件套**：EmbeddedChannel 脱离网络毫秒级测 Handler 链；五个黄金断点（invokeChannelRead / NioEventLoop.run / directBuffer / doRegister / fireChannelRead）直击关键路径；LoggingHandler 置 Pipeline 首位零侵入打印每帧十六进制。
2. **线上监控内置指标**：PoolArenaMetric 的 numAllocations vs numDeallocations 差值即泄漏信号；NioEventLoop.pendingTasks() 持续上涨即 IO 线程被业务阻塞。
3. **内存泄漏检测四级**：DISABLED/SIMPLE(默认,抽样1%)/ADVANCED/PARANOID(逐个检测报泄漏调用栈，损耗 5% 以内，开发期建议常开)。
4. **epoll 空轮询自愈**：空轮询超阈值（默认 512 次，`-Dio.netty.selectorAutoRebuildThreshold` 可调）自动 rebuildSelector——开新 Selector、迁移全部 key、关闭旧的。
5. **两条铁律**：IO 线程不做阻塞操作；ByteBuf 用完必须释放（finally 里 ReferenceCountUtil.release 或 fireChannelRead 透传）。

## How It Works（运作方式）

排障顺序（信源案例）：先看 GC 日志发现频繁 FGC → 开泄漏检测确认 ByteBuf 未 release → 修复后 RT 仍高 → pendingTasks/线程分析发现 IO 线程里阻塞 DB 查询 → 移入 businessExecutor 或 `addLast(new DefaultEventExecutorGroup(16), handler)`。案例结果：压测 5000 连接超时问题消除，RT 800ms→20ms，连接撑到 2 万（作者个案）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-eventloop]]：pendingTasks 积压与 rebuildSelector 自愈的机制出处
- [[netty-pooled-allocator]]：PoolArenaMetric 与 ResourceLeakDetector 的分配侧背景
- [[netty-bytebuf]]：release 铁律的引用计数机制

### Dependencies（依赖项）

- Netty 内置度量（PoolArenaMetric/pendingTasks）与 ResourceLeakDetector；JVM 侧 GC 日志、jcmd VM.native_memory、线程 dump

### Distinctions（区分）

- 与通用 Java 排障（[[arthas]] 等）的区别：优先用 Netty 框架自带的指标与检测器，而非先上外部诊断工具（解读）。

## Evolution（演进）

- 2026-10-29：随系列收官番外建立（单信源）。

## Open Questions（开放问题）

- ChannelMetrics/Micrometer 接 Prometheus 的长期监控方案信源仅点名未展开。
- 案例无量化环境参数（机器规格/JDK/Netty 版本），可复现性未知。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-debugging-guide.md`（单一自媒体教程信源；案例为作者自述个案）

## Related Knowledge（相关知识）

- [[netty-debugging-guide]]（信源页）
- [[netty]]（实体页：两条铁律与"IO 线程禁阻塞"多信源互证）
