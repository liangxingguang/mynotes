---
id: wiki-source-netty-vs-tomcat-undertow
type: source
title: Netty vs Tomcat vs Undertow：HTTP 服务器性能横评（Netty 源码分析番外篇8）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - source
  - netty
  - java
  - performance
  - benchmark
sources:
  - raw/sources/architecture/2026-10-27-netty-vs-tomcat-undertow.md
related:
  - wiki/entities/netty.md
  - wiki/comparisons/netty-vs-tomcat-vs-undertow.md
  - wiki/sources/netty-source-reading-album.md
  - wiki/concepts/reactor-thread-model.md
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/netty-pooled-allocator.md
  - wiki/concepts/netty-zero-copy.md
  - wiki/concepts/netty-performance-tuning.md
---
# Netty vs Tomcat vs Undertow：HTTP 服务器性能横评（Netty 源码分析番外篇8）

## Overview（概览）

「Java解忧杂货铺」Netty 源码系列番外篇8：同机同配置下用 wrk 对 Netty 4.1.100 / 内嵌 Tomcat 10.1 / Undertow 2.3 三个 HTTP 服务做性能横评，业务逻辑统一为返回固定 JSON，并从线程模型、内存管理、零拷贝、TCP 参数四个源码层面解释性能差距来源。系列收官篇，为整个源码系列提供"用数据说话"的实证闭环。

## Key Facts（关键事实）

- 测试环境：Intel Xeon 8 核 2.5GHz / 16GB DDR4 / OpenJDK 17.0.7 / CentOS Stream 9；wrk 4.2.0，`-c 200 -d 60s -t 8`，每服务跑三轮取中位数（预热 10 秒）。
- 基准数据（200 并发）：Netty QPS 158,234（平均 1.26ms / P99 3.8ms / CPU 78% / 内存 320MB）；Undertow 127,890（1.56ms / 4.9ms / 74% / 380MB）；Tomcat 89,567（2.23ms / 8.5ms / 85% / 480MB）。Netty 比 Tomcat 快约 77%、比 Undertow 快约 24%。
- 并发扩展性：1000 并发时 Tomcat 跌至 68,900 QPS（-23%），Netty 145,800（仅 -8%），Undertow 110,200。
- GC 对比（60 秒压测）：Tomcat 1287 次 YGC + 17 次 FGC 共 31.7 秒；Netty 158 次 YGC、0 次 FGC 共 2.3 秒，GC 时间差约 13 倍。
- 零拷贝实测：响应体换 `Unpooled.directBuffer()` 后 QPS 从 15.8 万升至 17.2 万（+9%）。
- TCP 参数影响：关闭 TCP_NODELAY 后 Netty QPS 从 15.8 万跌至 9.2 万（-42%）；SO_BACKLOG 调至 1024 后 P99 从 3.8ms 降到 2.9ms；Tomcat 对齐 Netty 的 TCP 参数可提升约 14%（8.9 万→10.2 万），剩余差距来自线程模型与内存管理。
- 线程模型差异（源码层）：Tomcat NioEndpoint 为"一连接一 Executor 线程"的一对一映射；Undertow XNIO Worker 线程同时处理 IO 与业务（折中方案，慢请求会拖累同线程其他请求）；Netty NioEventLoop 一对多复用 Channel，线程常驻不换出。
- 内存差异根源：Tomcat 响应走堆内 `byte[]`/`String`；Netty 走池化堆外 ByteBuf + 引用计数，压测后堆内存老年代仅 25%，320MB 占用大部分为堆外内存。

## Important Claims（重要论断）

### Claim 1：Netty 快是"Reactor 模型 + 池化内存 + 零拷贝 + 精细 TCP 调优"缺一不可

作者自述认知三层进化——"因为 NIO"（肤浅）→"因为 Reactor 避免线程开销"（对了一半）→"四要素缺一不可"（最终结论）。

### Claim 2：快不是 Netty 最大的价值，Pipeline 可扩展性才是

编解码器、流量控制、SSL 可在 Pipeline 随意插拔，这种粒度是 Tomcat 的 Filter 链做不到的。

### Claim 3：大部分 Spring Boot 项目不用纠结三者选型

默认 Tomcat/Undertow 对日均百万请求以下应用绰绰有余；需要认真选型时 QPS 至少上 5 万；从 0 写高性能网络服务（RPC/网关/代理）则 Netty 是唯一选择。

## Concepts Introduced（引入的概念）

- 无新概念——全部落在既有概念 [[reactor-thread-model]]、[[netty-eventloop]]、[[netty-pooled-allocator]]、[[netty-zero-copy]]、[[netty-performance-tuning]] 的实证印证上；横评结论编译为 [[netty-vs-tomcat-vs-undertow]] 对比页。

## Entities Mentioned（提及的实体）

- [[netty]]（4.1.100）
- Tomcat 10.1（内嵌式）、Undertow 2.3（提及，证据不足以立实体页）
- wrk 4.2.0（压测工具）

## Implications（影响／启示）

- 为 [[netty]] 实体页的"性能三支柱"（主从 Reactor / 池化内存 / 零拷贝）提供了同机横评的量化互证，并补充第四要素 TCP 参数调优。
- 选型分档与 [[netty-performance-tuning]] 的"监控驱动、先定位瓶颈再调整"立场一致：TCP_NODELAY 单项即可造成 42% 量级差异，印证"参数影响不亚于线程模型"。

## Limitations（局限）

- 单一自媒体信源、作者自测数据，无第三方复现；业务逻辑为返回固定 JSON 的极简场景，不代表真实业务负载。
- 数据表在抓取稿中为纯文本平铺，个别数字以作者正文叙述为准（如"差了近 10 倍"与正文"13 倍"口径并存，按 GC 时间 31.7s/2.3s 应为约 13 倍）。
- Tomcat 配置 `maxThreads=200` 为作者模拟的"常规配置"，非 Tomcat 上限调优后的结果。

## Related Knowledge（相关知识）

- [[netty-vs-tomcat-vs-undertow]]（本信源编译出的对比页）
- [[netty]]、[[netty-source-reading-album]]（系列合集页；本信源为全系列最后入库的一篇）
- [[netty-23-zero-copy]]、[[netty-perf-tuning]]（同系列机制与调优信源）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-vs-tomcat-undertow.md`
