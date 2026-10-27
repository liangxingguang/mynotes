---
id: 2026-10-27-netty-25-flow-control
title: Netty源码分析(25) — Netty 的流量控制：高低水位与可写性
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484622&idx=1&sn=9d1f84eb30d923022f03631b2e07e8db&chksm=fe6ca594c91b2c827b5d86ee5e031485b8259e07a19edba268eebc113dd31de7397702cb27d7#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-25-flow-control.md
wiki_status: pending
---

# Netty源码分析(25) — Netty 的流量控制：高低水位与可写性

> 源码级解析 Netty 的写侧背压机制：ChannelOutboundBuffer 的高低水位设计、isWritable 状态切换与 channelWritabilityChanged 事件传播，解决"写得比对方读得快"导致的 OOM 问题。

## 核心要点

- 高低水位（默认 32K/64K）是软限制：write 时累加待写字节，超高水位把 Channel 置为不可写；写出后降到低水位以下恢复可写
- ChannelOutboundBuffer 用 Entry 链表分 flushed/unflushed 两段，write 只入队、flush 只动指针，真正网络 I/O 由 EventLoop 完成；Entry 用 Recycler 对象池复用
- 状态切换用 CAS（AtomicIntegerFieldUpdater）保证并发安全；变不可写时 invokeLater 延迟传播事件，防止 write 调用链递归重入
- 高低水位 ≠ TCP 滑动窗口：内核硬阻塞 vs 用户态软信号，是对 TCP 流控的积极补偿
- 实战三原则：按消息大小调大水位、监听 channelWritabilityChanged 调节生产节奏、写前必查 isWritable()（事件通知有延迟）

## 正文

正文约 15000 字符，完整整理稿见附件 [[Assets/2026/10/netty-25-flow-control.md]]，含 WriteBufferWaterMark/ChannelOutboundBuffer 核心源码、完整闭环流程图、可运行背压 Demo 与水位设置经验表。

## 来源

[Netty源码分析(25) — Netty 的流量控制：高低水位与可写性](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484622&idx=1&sn=9d1f84eb30d923022f03631b2e07e8db&chksm=fe6ca594c91b2c827b5d86ee5e031485b8259e07a19edba268eebc113dd31de7397702cb27d7#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-25-flow-control.md]]（抓取正文整理稿，browser 级抓取）
