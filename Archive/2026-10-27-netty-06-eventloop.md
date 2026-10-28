---
id: 2026-10-27-netty-06-eventloop
title: Netty源码分析(6) — EventLoopGroup 与 EventLoop 源码解析
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483959&idx=1&sn=fad11177db7eac2d06d924bcfccec4c9&chksm=fe6ca36dc91b2a7bf7750cf11a7672da1054f9a0d6711c2cce72c7c93ecd790107dbc74a5b2e#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-06-eventloop.md
wiki_status: ingested
---

# Netty源码分析(6) — EventLoopGroup 与 EventLoop 源码解析

> 源码级解析 Netty 线程模型骨架：NioEventLoopGroup 默认线程数（CPU×2）的来源、MultithreadEventExecutorGroup 的 children 数组与 chooser 位运算优化、NioEventLoop.run() 事件循环全流程（select 策略、ioRatio 时间配比、空轮询自愈）、processSelectedKeys 事件分发、wakeup 机制与 Channel 注册绑定，附窥视 EventLoop 内部的完整示例。

## 核心要点

- NioEventLoop = 线程 + Selector + 任务队列；EventLoopGroup 管理一组 EventLoop；Channel 一生只绑定一个 EventLoop，Handler 调用同线程完成、无需加锁
- 默认线程数 = availableProcessors × 2，可用 -Dio.netty.eventLoopThreads 覆盖
- chooser 分配：线程数为 2 的幂时用 idx++ & (len-1) 位运算，否则取模
- run() 循环：SelectStrategy 决定 select 方式 → processSelectedKeys 处理 IO → 按 ioRatio（默认 50）分配时间跑任务；selectCnt 超阈值即 rebuildSelector 自愈空轮询
- 外部线程提交任务经 MpscLinkedQueue 入队并用 wakeup 布尔短路唤醒 select；register 不在 EventLoop 线程时异步提交执行
- 注意：不要阻塞 EventLoop 线程；优雅停机先关 bossGroup 再关 workerGroup；selectedKeys 用数组替代 HashSet 提性能

## 正文

正文约 10800 字符，完整整理稿见附件 [[Assets/2026/10/netty-06-eventloop.md]]，含类层次、构造链、run()、processSelectedKeys、register 源码剖析及跨线程提交任务演示示例。

## 来源

[Netty源码分析(6) — EventLoopGroup 与 EventLoop 源码解析](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483959&idx=1&sn=fad11177db7eac2d06d924bcfccec4c9&chksm=fe6ca36dc91b2a7bf7750cf11a7672da1054f9a0d6711c2cce72c7c93ecd790107dbc74a5b2e#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-06-eventloop.md]]（抓取正文整理稿，browser 级抓取）
