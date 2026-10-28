---
id: wiki-concept-netty-pooled-allocator
type: concept
title: Netty 池化内存分配（PooledByteBufAllocator：Arena→Chunk→Page→Subpage）
status: active
created: 2026-10-28
updated: 2026-10-29
confidence: high
tags:
  - concept
  - java
  - netty
  - memory
sources:
  - raw/sources/architecture/2026-10-27-netty-10-pooled-allocator.md
  - raw/sources/architecture/2026-10-27-netty-11-poolchunk-subpage.md
  - raw/sources/architecture/2026-10-27-netty-05-bytebuf.md
  - raw/sources/architecture/2026-10-20-netty-three-skills-high-performance.md
  - raw/sources/architecture/2026-10-23-netty-million-connection-push-service.md
related:
  - wiki/entities/netty.md
  - wiki/concepts/netty-bytebuf.md
---
# Netty 池化内存分配（PooledByteBufAllocator：Arena→Chunk→Page→Subpage）

## Definition（定义）

Netty 的池化 ByteBuf 分配器：借鉴 jemalloc（Facebook 内存分配器）的分级设计，一次性向 OS 申请大块连续内存后在应用层自管分配回收——**PoolArena（默认 2×CPU 核数，各自独立锁）→ PoolChunk（16MB）→ Page（8KB，每 Chunk 2048 个）→ PoolSubpage（页内等大小小块）** 四级结构，外加 PoolThreadCache 线程本地缓存让常规分配全程无锁。

## Why It Matters（为什么重要）

高频网络 I/O 下每次 `new byte[]` 意味着内存碎片、Young GC 压力与堆分配开销三重税；池化把分配变成"指针偏移 + 位图标记"，是 [[netty]] 性能三支柱之一（内存池支柱）的实现本体。李林锋信源引 Twitter 案例：池化后垃圾生成降 5 倍——代价是泄漏不再被 GC 兜底，必须引用计数自管。

## Core Characteristics（核心特征）

1. 多 Arena 减锁：默认 `2 × CPU 核数` 个 PoolArena，各持独立锁，线程大概率落到不同 Arena。
2. Chunk 满二叉树：16MB Chunk 以 `byte[] memoryMap`（maxOrder=11）管理 2048 个 8KB Page；节点值=子树最浅空闲深度（=depth 全闲、=maxOrder+1 全占），根节点 O(1) 反映整块可分配状态；分配从根向左下搜索、优先左子树降外部碎片，按深度定位（4MB→depth=2，8KB→depth=11 叶子），找到后沿路径 `min(左,右)` 上刷祖先；释放时兄弟皆闲即反向合并，O(logN)。
3. Subpage 位图：小于 8KB 的分配把 Page 切成等大小块（tiny<512B / small 512B~8KB，如 32B→256 块、512B→16 块），`long[] bitmap`（8KB→至多 64 个 long）管理占用，`nextAvail` 缓存释放位 + `Long.numberOfTrailingZeros` 指令级查找；句柄编码 `(bitmapIdx<<32)|memoryMapIdx`；全空闲时整个 Page 归还 Chunk；同 elemSize 的 Subpage 串双向链表。
4. ChunkList 使用率六档流转：qInit(0-25%)、q000(1-50%)、q025(25-75%)、q050(50-100%)、q075(75-100%)、q100(100%)；新 Chunk 进 qInit，`free()` 后 `usage() < minUsage` 即降级前移，全空闲 Chunk 最终回收归还 OS。
5. ThreadLocal 缓存优先：PoolThreadCache 按 size 分桶（MemoryRegionCache 数组，heap/direct × small/normal 四类），命中即无锁分配；未命中才进 Arena 加锁路径；分配后剩余容量回填缓存。
6. 四级分配分派：tiny/small 走 Subpage，normal（8KB~16MB）走 Chunk 二叉树，huge（>16MB）直接走 Unpooled 不缓存（避免大块长期占 Arena）。
7. 释放靠引用计数：retain +1 / release -1，归零才真正归还池中；泄漏表现为 RSS 持续上涨，用 `ResourceLeakDetector`（生产建议先 PARANOID 测一轮再降 SIMPLE）排查。

## Structure（结构）

```text
PooledByteBufAllocator
  └─ PoolArena[]（默认 CPU×2，各持锁；heap/direct 两套）
       ├─ PoolThreadCache（每线程：small/normal × heap/direct 分桶缓存）
       └─ PoolChunkList（按使用率分档的 Chunk 链表）
            └─ PoolChunk（16MB，memoryMap 满二叉树）
                 ├─ Page（8KB × 2048）
                 └─ PoolSubpage（Page 内等大小块，bitmap 管理）
```

## How It Works（运作方式）

分配 `buffer(1024)`：① PoolThreadLocalCache 取当前线程 PoolThreadCache；② 缓存命中直接返回池化 ByteBuf（无锁）；③ 未命中按容量分派——small 走 Arena 的 Subpage 链表（无空位则先分一个 Page 初始化 Subpage），normal 走 Chunk 二叉树 `allocateRun`，huge 走 Unpooled；④ 分配成功后剩余容量回填线程缓存。释放 `release()`：引用计数归零后优先回收进线程缓存（供本线程下次无锁复用），缓存满才回 Arena。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-bytebuf]]：本概念是其"分配器双体系"中 Pooled 一侧的展开（part-of）；ByteBuf 的引用计数纪律是池化正确性的前提。

### Dependencies（依赖项）

- jemalloc 分级思想（Arena/Chunk/Page 分层 + 线程缓存，信源表述）。
- 堆外内存依赖 `PlatformDependent` 的直接内存分配；释放不可依赖 GC/Cleaner。

### Distinctions（区分）

- 与 UnpooledByteBufAllocator：预分配池 + 指针偏移 vs 每次 JVM 堆分配 + GC；池化内存占用固定、GC 压力低，适用高并发高频 I/O；非池化适用低并发一次性分配。
- 与 4.2 的 AdaptiveByteBufAllocator：后者为适配虚拟线程的新分配器（见 [[netty]] Timeline），本概念页描述的是 4.1 默认池化分配器。

## Evolution（演进）

机制信源（netty-three-skills）把"类 jemalloc 内存池"列为三支柱之一并给出 Arena CPU×2、page 8KB 轮廓；李林锋信源给出 Twitter 垃圾生成降 5 倍的工程背书；ByteBuf 篇（netty-05）给出分配器双体系与"4.1 默认池化"；netty-10 补齐四级结构、二叉树/位图算法与分配链路源码细节；netty-11（深入篇）再补齐 memoryMap 值语义（最浅空闲深度）、allocateNode 左优先搜索、ChunkList 六档流转与 PoolThreadCache 裁剪参数（`io.netty.allocator.cacheTrimInterval` 默认 8192、`maxCachedBufferCapacity` 默认 32KB），并给出 JMH 分档实测（100w 次分配+释放：32B ~6.8x、1KB ~7.3x、64KB ~4.2x、1MB ~2.9x，小块优势最大）——池化收益主要来自小块高频分配，与李林锋 Twitter 案例互证。

## Open Questions（开放问题）

- PoolThreadCache 的 MemoryRegionCache 队列容量与 free 触发回收的细节（信源仅给出裁剪参数与"剩余容量回填"）。
- AdaptiveByteBufAllocator（4.2）与本机制的差异，本库暂无展开信源。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-10-pooled-allocator.md`（源码级主信源：四级结构/二叉树/位图/分配链路）
- Source: `raw/sources/architecture/2026-10-27-netty-11-poolchunk-subpage.md`（深入篇：memoryMap 值语义/左优先搜索/ChunkList 六档/线程缓存裁剪参数/JMH 实测）
- Source: `raw/sources/architecture/2026-10-27-netty-05-bytebuf.md`（分配器双体系定位 + 引用计数纪律互证）
- Source: `raw/sources/architecture/2026-10-20-netty-three-skills-high-performance.md`（三支柱定位）
- Source: `raw/sources/architecture/2026-10-23-netty-million-connection-push-service.md`（Twitter 案例与"泄漏不被 GC 兜底"代价）

## Related Knowledge（相关知识）

- [[netty-10-pooled-allocator]]（信源页）
- [[netty-11-poolchunk-subpage]]（信源页，深入篇）
- [[netty]]（实体页）
