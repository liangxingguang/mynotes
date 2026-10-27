---
id: 2026-10-27-netty-debugging-guide
title: Netty源码分析(番外篇) — Netty调试技巧与生产问题排查方法论
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484689&idx=2&sn=2f7f268bc6d34db87c7db4e42c4cea8c&chksm=fe6ca44bc91b2d5df71f819f870aa75490324010ad5eae1999a5bb68e405ee234a43522c1d33#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java, 工程实践]
asset_ref: Assets/2026/10/netty-debugging-guide.md
wiki_status: pending
---

# Netty源码分析(番外篇) — Netty调试技巧与生产问题排查方法论

> Netty 系列收官番外，系统性整理源码调试与线上问题排查方法论：本地用 EmbeddedChannel 与黄金断点调 Handler，线上靠内置指标、内存泄漏检测与 epoll 空轮询防护三板斧，并以一个真实压测排障案例串起完整思路。

## 核心要点

- 本地调试三件套：EmbeddedChannel 脱离网络测 Handler、关键路径（invokeChannelRead / NioEventLoop.run 等）下断点、LoggingHandler 零侵入打印每帧数据
- 线上监控直接用 Netty 内置指标：PoolArenaMetric 看堆外内存分配/释放差值，pendingTasks() 看 EventLoop 队列积压
- 内存泄漏检测开 PARANOID 级别（损耗 5% 以内），ResourceLeakDetector 能精确报出泄漏代码行
- epoll 空轮询 bug：Netty 检测到空轮询超阈值（默认 512 次）自动 rebuildSelector，可用 selectorAutoRebuildThreshold 调整
- 真实案例：压测 5000 连接超时，根因是 ByteBuf 未 release + IO 线程里做阻塞 DB 查询，修完 RT 从 800ms 降到 20ms
- 两条铁律：IO 线程不做阻塞操作，ByteBuf 用完必须释放

## 正文

正文约 11500 字符，完整整理稿见附件 [[Assets/2026/10/netty-debugging-guide.md]]，含调试工具用法示例、监控指标采集代码、排障案例与工具速查表。

## 来源

[Netty源码分析(番外篇) — Netty调试技巧与生产问题排查方法论](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484689&idx=2&sn=2f7f268bc6d34db87c7db4e42c4cea8c&chksm=fe6ca44bc91b2d5df71f819f870aa75490324010ad5eae1999a5bb68e405ee234a43522c1d33#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-debugging-guide.md]]（抓取正文整理稿，browser 级抓取）
