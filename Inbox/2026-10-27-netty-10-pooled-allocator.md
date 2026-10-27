---
id: 2026-10-27-netty-10-pooled-allocator
title: Netty源码分析(10) — 内存分配之 PooledByteBufAllocator
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484061&idx=1&sn=8b1ff421f1a5bf65f3c3cd1d52bd785c&chksm=fe6ca3c7c91b2ad162cd50d051c99a57c2087ea4b4c9b9070972e3f8cdc240173db3ed3af21e#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-10-pooled-allocator.md
wiki_status: pending
---

# Netty源码分析(10) — 内存分配之 PooledByteBufAllocator

> 拆解 Netty 池化内存分配器 PooledByteBufAllocator：借鉴 jemalloc 的 Arena → Chunk → Page → Subpage 四级分级，配合 ThreadLocal 缓存实现低锁、低 GC 压力的高性能内存池。

## 核心要点

- 内存池价值：避免高频 I/O 反复 new byte[] 带来的内存碎片、Young GC 压力与堆分配开销。
- 四级分级结构：PoolArena（默认 2×CPU 核数，各自独立锁减少竞争）→ PoolChunk（16MB）→ Page（8KB，2048 个/Chunk）→ PoolSubpage（页内小块）。
- PoolChunk 用满二叉树管理 Page 分配，O(logN) 分配与合并；PoolSubpage 用 bitmap 位图管理 8KB 页内的 tiny/small 小块。
- 分配链路：先查 PoolThreadCache 线程本地缓存（无锁），未命中再走 Arena 加锁分配；huge（>16MB）直接走 Unpooled 不缓存。
- 使用注意：池化 ByteBuf 必须显式 release()（引用计数归零才归还池中）；可用 ResourceLeakDetector 的 PARANOID 级别排查泄漏。

## 正文

正文约 9500 字符，完整整理稿见附件 [[Assets/2026/10/netty-10-pooled-allocator.md]]，含核心类源码注解、二叉树结构图、完整分配链路、可运行 Demo 及池化 vs 非池化对比表。

## 来源

[Netty源码分析(10) — 内存分配之 PooledByteBufAllocator](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484061&idx=1&sn=8b1ff421f1a5bf65f3c3cd1d52bd785c&chksm=fe6ca3c7c91b2ad162cd50d051c99a57c2087ea4b4c9b9070972e3f8cdc240173db3ed3af21e#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-10-pooled-allocator.md]]（抓取正文整理稿，browser 级抓取）
