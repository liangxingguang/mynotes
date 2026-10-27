---
id: 2026-10-27-netty-02-bio-nio
title: Netty源码分析(2) — 从BIO到NIO再到Netty，为什么我们需要Netty？
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483884&idx=1&sn=2e1dead9301b6513f77c93258db7f80b&chksm=fe6ca0b6c91b29a04550c9c711510eea4dbd9b0e9959fed73de92ff95d6db9dde354624a9123#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-02-bio-nio.md
wiki_status: pending
---

# Netty源码分析(2) — 从BIO到NIO再到Netty，为什么我们需要Netty？

> 通过 BIO 多线程服务端、原生 NIO 服务端、Netty 服务端三段完整代码对比，论证为什么需要 Netty：BIO 受制于 C10K，原生 NIO 代码复杂且需自处理粘包/重连/多线程/epoll 空轮询，Netty 用 Reactor 线程模型、Pipeline 责任链、零拷贝和内存池把复杂留给自己。附 Netty 客户端完整示例与适用场景盘点。

## 核心要点

- BIO 本质问题是"一个连接一个线程"，连接数稍高即触发 C10K 崩溃
- 原生 NIO 五大痛点：代码复杂、粘包半包、断线重连/心跳需手写、多线程配合难、JDK epoll 空轮询 BUG
- Netty 多 Reactor 模型：Boss Group 管 accept、Worker Group 管读写，Channel 生命周期绑定单一 EventLoop 实现天然无锁
- Pipeline 责任链把数据处理拆成 Handler 积木，内置解码器直接解决粘包
- 零拷贝（CompositeByteBuf、slice、FileRegion/sendfile）+ PooledByteBufAllocator 内存池大幅降低拷贝与 GC 压力
- Dubbo/gRPC/RocketMQ/Kafka/Elasticsearch 等主流中间件底层都用 Netty

## 正文

正文约 8100 字符，完整整理稿见附件 [[Assets/2026/10/netty-02-bio-nio.md]]，含 BIO/NIO/Netty 三种服务端与 Netty 客户端完整代码、问题对照表及适用场景清单。

## 来源

[Netty源码分析(2) — 从BIO到NIO再到Netty，为什么我们需要Netty？](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483884&idx=1&sn=2e1dead9301b6513f77c93258db7f80b&chksm=fe6ca0b6c91b29a04550c9c711510eea4dbd9b0e9959fed73de92ff95d6db9dde354624a9123#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-02-bio-nio.md]]（抓取正文整理稿，browser 级抓取）
