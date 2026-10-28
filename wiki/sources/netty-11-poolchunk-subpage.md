---
id: wiki-source-netty-11-poolchunk-subpage
type: source
title: Netty源码分析(11) — 池化内存分配：PoolChunk 与 PoolSubpage
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - source
  - java
  - netty
  - memory
  - tutorial
sources:
  - raw/sources/architecture/2026-10-27-netty-11-poolchunk-subpage.md
related:
  - wiki/sources/netty-10-pooled-allocator.md
  - wiki/sources/netty-05-bytebuf.md
  - wiki/entities/netty.md
  - wiki/concepts/netty-pooled-allocator.md
  - wiki/concepts/netty-bytebuf.md
---
# Netty源码分析(11) — 池化内存分配：PoolChunk 与 PoolSubpage

## Overview（概览）

公众号「Java解忧杂货铺」Netty 源码分析系列第 11 篇，第 10 篇（[[netty-10-pooled-allocator]]）的深入篇：源码级拆解 PoolChunk 的满二叉树伙伴分配（memoryMap 值=子树最浅空闲深度、allocateNode 左优先搜索、updateParentsAlloc/Free 向上合并）与 PoolSubpage 的位图小块管理（long[] bitmap、nextAvail 缓存、numberOfTrailingZeros 指令级查找），并补齐 PoolChunkList 六档使用率流转（qInit/q000/q025/q050/q075/q100）与 PoolThreadCache 裁剪配置。附 JMH 池化 vs 非池化压测表与可运行验证 Demo。文中源码基于 Netty 4.1.x。

## Key Facts（关键事实）

- PoolChunk 管理 16MB（`chunkSize = 1 << 24`）连续内存，按 2 的幂次分割，`byte[] memoryMap` 满二叉树共 11 层（maxOrder=11，pageSize 8KB=2^13，24-13=11），叶子对应 8KB Page、每 Chunk 2048 个。
- memoryMap 节点值语义：`= depth(id)` 完全空闲、`= maxOrder+1` 完全分配、中间值为部分分配；值记录"该节点子树中最浅的空闲深度"，根节点 `memoryMap[1]` O(1) 反映整块可分配状态。
- 分配 allocateNode 从根（id=1）向左下搜索、优先左子树以降低外部碎片；找到后标记 unusable 并沿路径向上 `min(左,右)` 更新祖先；释放时恢复深度值并向上合并（兄弟皆闲则父节点恢复空闲），分裂与合并均 O(logN)。
- PoolSubpage 把 8KB Page 按 elemSize 等分（如 32B→256 个子块、512B→16 个），`long[] bitmap`（8KB→最多 64 个 long/4096 bit）管理占用；`nextAvail` 缓存上次释放位置，`findNextAvail` 用 `~bits != 0` + `Long.numberOfTrailingZeros` 定位空闲位。
- Subpage 句柄编码 `(bitmapIdx << 32) | memoryMapIdx`；全空闲时 free 返回 true，Arena 将整个 Page 归还 Chunk；从满变 1 个可用时重新 addToPool。
- PoolArena 分配次序：tiny/small（<8KB）先查 PoolThreadCache 再走 Subpage；normal（8KB~16MB）走 Chunk 二叉树；huge（>16MB）直接 `PlatformDependent.allocateDirect` 不池化。
- PoolChunkList 六档：qInit(0-25%)、q000(1-50%)、q025(25-75%)、q050(50-100%)、q075(75-100%)、q100(100%)；`free()` 中 `chunk.usage() < minUsage` 即降级前移，全空闲 Chunk 最终回收归还 OS。
- JMH 实测（作者自跑，100w 次分配+释放）：32B 池化 45ns vs 非池化 310ns（~6.8x）；1KB ~7.3x；64KB ~4.2x；1MB ~2.9x——小块优势最大，大块因二叉树 O(logN) 开销优势收窄。
- PoolThreadCache 裁剪配置：`io.netty.allocator.cacheTrimInterval` 默认 8192、`io.netty.allocator.maxCachedBufferCapacity` 默认 32KB。

## Important Claims（重要论断）

### Claim 1：小归位图、大归树、超大直接走 malloc
作者论断：Netty 内存池的精髓是按大小分级选择完全不同的数据结构——Subpage 位图管小块、Chunk 二叉树管大块、>16MB 绕过池化，这是"工业界内存池的标准答案"（与 Redis zmalloc、jemalloc 思路相似）。

### Claim 2：优先左子树降低外部碎片
作者论断：allocateNode 每次优先选左子树，保证内存从低到高连续分配，一定程度上降低外部碎片。

## Concepts Introduced（引入的概念）

- [[netty-pooled-allocator]]

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

本篇把 [[netty-pooled-allocator]] 概念页两条开放问题落地为源码级答案：PoolChunkList 的六档使用率区间与迁移策略（`usage() < minUsage` 降级）、PoolThreadCache 的裁剪参数（cacheTrimInterval=8192 / maxCachedBufferCapacity=32KB）；JMH 数据为"池化提速"提供了分大小区间的量化证据（小块 ~7x、大块 ~3x），与李林锋信源"Twitter 垃圾生成降 5 倍"互证池化收益主要来自小块高频分配。

## Limitations（局限）

- 单一自媒体教程信源；JMH 数字为作者单机自跑（未给 JDK/机器配置），只能作量级参考。
- "二叉树节点深度：一颗 12 层的满二叉树"与 maxOrder=11 的注释并存（11 层子树深度+根，表述口径问题），以 maxOrder=11、2048 页为准。
- 正文代码块注释称 memoryMap 值"0=空闲"，与后文"=depth(id) 完全空闲"口径不一（解读：前者为简化表述，后者与 Netty 实际实现一致）。

## Related Knowledge（相关知识）

- [[netty-10-pooled-allocator]]（同系列第 10 篇：分配器总览，本篇为其内部结构深入篇）
- [[netty-05-bytebuf]]（同系列第 5 篇：引用计数纪律）
- [[netty-pooled-allocator]]（概念页）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-11-poolchunk-subpage.md`
