---
id: wiki-source-netty-10-pooled-allocator
type: source
title: Netty源码分析(10) — 内存分配之 PooledByteBufAllocator
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - netty
  - memory
  - tutorial
sources:
  - raw/sources/architecture/2026-10-27-netty-10-pooled-allocator.md
related:
  - wiki/sources/netty-05-bytebuf.md
  - wiki/sources/netty-09-nioeventloop-run.md
  - wiki/entities/netty.md
  - wiki/concepts/netty-bytebuf.md
  - wiki/concepts/netty-pooled-allocator.md
---
# Netty源码分析(10) — 内存分配之 PooledByteBufAllocator

## Overview（概览）

公众号「Java解忧杂货铺」Netty 源码分析系列第 10 篇。源码级拆解池化内存分配器 PooledByteBufAllocator：借鉴 jemalloc 的 Arena → Chunk → Page → Subpage 四级分级、PoolChunk 满二叉树（memoryMap）管理 2048 个 8KB Page、PoolSubpage 位图切分小块、PoolThreadCache 线程本地缓存实现无锁分配，以及 tiny/small/normal/huge 四级分配链路与池化使用纪律（release/泄漏检测）。附可运行 Demo 与池化 vs 非池化六维对比表。文中源码基于 Netty 4.1.x。

## Key Facts（关键事实）

- 内存池动机：高频 I/O 下每次 `new byte[]` 带来内存碎片、Young GC 压力与堆分配开销；PooledByteBufAllocator 一次性向 OS 申请大块连续内存，应用层自管分配回收。
- 四级分级：PoolArena（默认 2×CPU 核数个，各自独立锁减少竞争）→ PoolChunk（默认 16MB）→ Page（8KB，每 Chunk 2048 个，`SIZE_SHIFT=11`、`CHUNK_SIZE=16<<20`）→ PoolSubpage（页内等大小小块）。
- PoolChunk 用满二叉树（byte[] memoryMap，maxOrder=11）管理 Page 分配：分配 4MB 在 depth=2 找空闲节点，分配 8KB 在 depth=11 找叶子；分配标记"已用/部分已用"，释放时兄弟皆闲则反向合并回父节点，O(logN)。
- PoolSubpage：把 8KB Page 切成等大小块（16B/32B/512B/2KB 等），`long[] bitmap` 位图管理占用（1=已分配），同 elemSize 的 Subpage 双向链表串联。
- 分配链路：先查 PoolThreadCache 线程本地缓存（MemoryRegionCache 按 size 分桶，命中即无锁返回）→ 未命中走 Arena 加锁分配 → tiny(<512B)/small(512B~8KB) 走 PoolSubpage、normal(8KB~16MB) 走 Chunk 二叉树、huge(>16MB) 直接走 Unpooled 不缓存 → 分配后剩余容量回填线程缓存。
- 使用纪律：池化 ByteBuf 必须显式 `release()`（引用计数归零才真正归还池中，retain +1 / release -1）；泄漏表现为 RSS 持续上涨；`ResourceLeakDetector` 建议生产先开 PARANOID 级别测一轮再降回 SIMPLE。
- 池化 vs 非池化（作者对比表）：池化预分配+指针偏移分配快、GC 压力低、内存占用固定，适用高并发高频 I/O；非池化每次走 JVM 堆分配+GC，适用低并发一次性分配。Netty 默认即池化。

## Important Claims（重要论断）

### Claim 1：能上池化就上池化
作者论断：Netty 默认就是池化，别轻易改——Arena 多实例减锁 + Chunk 二叉树 + Subpage 位图 + ThreadLocal 缓存四机制叠加是其高性能基石。

### Claim 2：huge 分配刻意不走池
作者论断：超过 16MB（Chunk 大小）的分配直接走 Unpooled，避免大块长期占用 Arena 空间。

## Concepts Introduced（引入的概念）

- [[netty-pooled-allocator]]

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

本篇补齐 [[netty-bytebuf]] 概念页挂账的开放问题"Pooled 内部（PoolChunk/PoolSubpage/分级）源码细节"：Arena CPU×2、Page 8KB、maxOrder 11 等既有结论全部获得类与字段级证据；引用计数"谁最后消费谁 release"纪律与 leakDetectionLevel=paranoid 排查法与 ByteBuf 篇互证。也为 [[netty]] 实体页"性能三支柱"中的内存池支柱（李林锋信源"纯 Java 版 jemalloc"）提供了结构层注解。

## Limitations（局限）

- 单一自媒体教程信源；PoolThreadCache 的缓存队列容量、free 触发回收等细节仅点到"剩余容量回填"，未展开。
- 文中称分配速度"快（CAS + 指针偏移）"，与正文"Arena 加锁分配"存在简化口径（解读：指线程缓存命中路径无锁、Arena 路径有锁），非矛盾但需分层理解。
- 未涉及 4.2 的 AdaptiveByteBufAllocator（见 [[netty]] Timeline）。

## Related Knowledge（相关知识）

- [[netty-05-bytebuf]]（同系列第 5 篇：ByteBuf 容器与引用计数，本篇为其池化分配器的深入篇）
- [[netty-09-nioeventloop-run]]（同系列第 9 篇）
- [[netty-bytebuf]]（概念页）
- [[netty-pooled-allocator]]（概念页）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-10-pooled-allocator.md`
