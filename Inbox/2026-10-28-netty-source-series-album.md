---
id: 2026-10-28-netty-source-series-album
title: Netty 源码系列合集（28篇，公众号「程序员行一」）
source: 微信公众号·程序员行一（合集页）
source_url: https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzI3NzQ1MTI4OQ==&action=getalbum&album_id=1946733195882708993
source_type: 合集
platform: 微信公众号
created: 2026-10-28
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-source-series-album.md
wiki_status: pending
---

# Netty 源码系列合集（28篇）

> 公众号「程序员行一」的 Netty 源码合集，28 篇成体系：从启动、EventLoop、Pipeline 到 ByteBuf 内存池、定时轮、优雅停机、Epoll 原生传输，覆盖 Netty 核心链路源码。

## 核心要点

- **启动与线程模型**：服务端 bind、Boss→Worker 连接接入、NioEventLoop 单线程处理 I/O+任务、Selector 重建解 JDK 空轮询。
- **数据通路**：入站读（Socket→Handler）、writeAndFlush 非立即发包、ChannelPipeline 入站/出站方向、HTTP/1.1 编解码。
- **内存与背压**：ByteBuf 池化/读写索引/引用计数、写缓冲与慢连接背压、ByteToMessageDecoder 半包粘包。
- **高级机制**：Future/Promise/Listener 回调链、HashedWheelTimer 海量超时、IdleStateHandler 心跳、Epoll/KQueue 原生传输、优雅停机 quiet period。
- 合集页动态加载，单篇链接需进原页获取。

## 正文

见 [[Assets/2026/10/netty-source-series-album.md|合集目录]]（28 篇标题清单）。

## 来源

- [Netty 合集页](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzI3NzQ1MTI4OQ==&action=getalbum&album_id=1946733195882708993)（微信公众号·程序员行一）

## 附件

- [[Assets/2026/10/netty-source-series-album.md]]
