---
id: 2026-10-27-netty-05-bytebuf
title: Netty源码分析(5) — ByteBuf：Netty的数据容器深度解析
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483944&idx=1&sn=261d8489acffb8afe5088e5f4f4612a7&chksm=fe6ca372c91b2a64ebff3b813276cc57c94dde2529d5086333cb871f670f5c8b41ff7e787261#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-05-bytebuf.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-28T10:46:06.075Z"
ingest_claim_id: 49328-1793184366075-0
---

# Netty源码分析(5) — ByteBuf：Netty的数据容器深度解析

> 针对 JDK ByteBuffer 单指针、容量固定、无池化、无引用计数四大痛点，解析 Netty ByteBuf 的设计：读写双指针、ensureWritable 自动扩容（4MB 以下翻倍、以上步进 4MB）、Heap/Direct/Composite 三种形态、引用计数管理堆外内存，以及 Pooled/Unpooled 分配器体系，附完整示例与泄漏排查建议。

## 核心要点

- ByteBuf 用 readerIndex/writerIndex 双指针分离读写，彻底告别 flip()
- 自动扩容策略：4MB 以下从 64B 翻倍增长，超过 4MB 每次步进 4MB，兼顾扩容次数与内存浪费
- AbstractByteBuf 用模板方法定骨架（边界检查+指针维护），_getByte/_setByte 由子类按 heap/direct 实现
- CompositeByteBuf.addComponent 引用组合多个 ByteBuf 实现零拷贝拼接；slice/wrappedBuffer 同理
- 引用计数（refCnt/retain/release）管理 GC 管不到的堆外内存，铁律是"谁最后消费谁 release"
- PooledByteBufAllocator 按 Arena 分级池化（类 jemalloc），高频场景约减 70% GC 压力；泄漏排查用 -Dio.netty.leakDetectionLevel=paranoid

## 正文

正文约 10600 字符，完整整理稿见附件 [[Assets/2026/10/netty-05-bytebuf.md]]，含继承体系、ensureWritable 扩容源码、Unpooled/Pooled 分配器剖析及拆包组包完整示例。

## 来源

[Netty源码分析(5) — ByteBuf：Netty的数据容器深度解析](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483944&idx=1&sn=261d8489acffb8afe5088e5f4f4612a7&chksm=fe6ca372c91b2a64ebff3b813276cc57c94dde2529d5086333cb871f670f5c8b41ff7e787261#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-05-bytebuf.md]]（抓取正文整理稿，browser 级抓取）
