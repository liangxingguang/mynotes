---
id: 2026-10-27-netty-perf-tuning
title: Netty源码分析(番外篇) — Netty性能调优实战：从参数配置到JVM层优化
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484674&idx=3&sn=c704c16f6646dd1646485bc918094498&chksm=fe6ca458c91b2d4e520b3328a91595a4e153b222f1453b493e67ce27bc863d599be8e21db181#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java, 工程实践]
asset_ref: Assets/2026/10/netty-perf-tuning.md
wiki_status: ingested
---

# Netty源码分析(番外篇) — Netty性能调优实战：从参数配置到JVM层优化

> 系列番外篇，系统梳理 Netty 生产调优的四大维度：线程模型、Channel 参数、内存分配、系统/JVM 层，附完整优化配置示例与常见问题速查表。

## 核心要点

- 线程模型：Boss 通常 1 线程、Worker 为 2×CPU 核数；容器环境 availableProcessors() 可能不准，应显式设置 io.netty.eventLoopThreads；阻塞业务必须剥离到独立 EventExecutorGroup
- Channel 参数：TCP_NODELAY 禁用 Nagle（只管内核层，应用层攒包管不了）、SO_BACKLOG、写水位线是背压机制（超高水位标记不可写防 OOM）
- 内存：默认池化分配器；纯代理/网关用 Direct Buffer，频繁改数据用 Heap Buffer；必须管理引用计数，测试开 paranoid 级泄漏检测
- 系统层：Linux sysctl 参数清单（文件句柄、缓冲区、连接队列等）；Linux 下优先 EpollEventLoopGroup
- JVM：G1+固定堆、MaxDirectMemorySize、leakDetectionLevel 等 Netty 专用 -D 参数
- 理念：不为调优而调优，先用 JMX/Prometheus/Arthas 定位瓶颈再有针对性调整

## 正文

正文约 13000 字符，完整整理稿见附件 [[Assets/2026/10/netty-perf-tuning.md]]，含各维度参数源码解读、生产级完整 Server 配置示例、JVM 参数清单与问题速查表。

## 来源

[Netty源码分析(番外篇) — Netty性能调优实战：从参数配置到JVM层优化](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484674&idx=3&sn=c704c16f6646dd1646485bc918094498&chksm=fe6ca458c91b2d4e520b3328a91595a4e153b222f1453b493e67ce27bc863d599be8e21db181#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-perf-tuning.md]]（抓取正文整理稿，browser 级抓取）
