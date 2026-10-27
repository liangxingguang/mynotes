---
id: 2026-10-27-netty-15-write-flush
title: Netty源码分析(15) — 写缓冲 buffer 与 writeAndFlush 流程
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484556&idx=1&sn=bf7a3c022ed30eb28ff793fe4b727631&chksm=fe6ca5d6c91b2cc0a1ea07f676c1c2868198327926ec7c6d3edca01c29723ab388f6aacde5a6#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-15-write-flush.md
wiki_status: pending
---

# Netty源码分析(15) — 写缓冲 buffer 与 writeAndFlush 流程

> 讲清 write 与 flush 为何是两个动作：write 只是把消息挂进 ChannelOutboundBuffer 链表，flush 才由 I/O 线程真正调用 SocketChannel.write 写入内核，并详解写自旋、OP_WRITE 与高低水位背压机制。

## 核心要点

- write() 只做入队：消息包装成 Entry 追加到 ChannelOutboundBuffer 链表尾部（unflushedEntry 段），O(1) 返回，解耦业务线程与 I/O 线程。
- flush() 的 addFlush() 只是把 unflushedEntry 段整体转给 flushedEntry；真正的写发生在 NioSocketChannel.doWrite() 里调用 JDK SocketChannel.write()。
- doWrite 关键细节：写自旋默认 16 次防止独占 I/O 线程；写不进（TCP 发送缓冲区满）时注册 OP_WRITE 等 selector 通知；半包数据留在链表继续发。
- 高低水位（默认 64KB/32KB）控制 isWritable()，配合 channelWritabilityChanged 回调实现背压，防止下游消费慢导致写缓冲膨胀 OOM。
- 实践建议：高吞吐场景攒一批 write 再统一 flush 减少系统调用；大文件用 FileRegion；勿在 write 后忘 flush。

## 正文

正文约 13500 字符，完整整理稿见附件 [[Assets/2026/10/netty-15-write-flush.md]]，含 ChannelOutboundBuffer 源码注解、完整调用链路图、背压演示 Demo 及常见坑清单。

## 来源

[Netty源码分析(15) — 写缓冲 buffer 与 writeAndFlush 流程](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484556&idx=1&sn=bf7a3c022ed30eb28ff793fe4b727631&chksm=fe6ca5d6c91b2cc0a1ea07f676c1c2868198327926ec7c6d3edca01c29723ab388f6aacde5a6#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-15-write-flush.md]]（抓取正文整理稿，browser 级抓取）
