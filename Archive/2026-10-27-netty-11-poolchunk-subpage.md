---
id: 2026-10-27-netty-11-poolchunk-subpage
title: Netty源码分析(11) — 池化内存分配：PoolChunk 与 PoolSubpage
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484111&idx=1&sn=21f5fda71a216271344503641607e27e&chksm=fe6ca395c91b2a83e35eeb02b6b1ca0681f8896167f014acc263e0ba4735740fe34b84f9f6a7#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-11-poolchunk-subpage.md
wiki_status: ingested
---

# Netty源码分析(11) — 池化内存分配：PoolChunk 与 PoolSubpage

> 深入 Netty 内存池的心脏：PoolChunk 用满二叉树实现伙伴分配管理 16MB 大块，PoolSubpage 用位图管理 8KB 页内小块，配合 PoolChunkList 使用率分区和 PoolThreadCache 无锁缓存。

## 核心要点

- PoolChunk 管理 16MB 连续内存，memoryMap 数组即满二叉树（11 层，叶子=8KB Page），节点值记录子树最浅空闲深度，根节点 O(1) 反映整块可分配状态。
- 分配从根向左下搜索（优先左子树降低碎片），释放时兄弟空闲即向上合并，分裂与合并均为 O(logN)。
- PoolSubpage 把 8KB Page 按 elemSize 等分，用 long[] 位图管理子块占用，配合 Long.numberOfTrailingZeros 指令级查找空闲位。
- PoolArena 统筹分配：tiny/small 走 Subpage、normal 走 Chunk 二叉树、huge（>16MB）不走池；6 个 ChunkList 按使用率（qInit/q000~q100）分级流转。
- JMH 实测小块池化提速约 7 倍；使用上必须显式 release()，可用 -Dio.netty.leakDetectionLevel=paranoid 排查泄漏。

## 正文

正文约 16500 字符，完整整理稿见附件 [[Assets/2026/10/netty-11-poolchunk-subpage.md]]，含 PoolChunk/PoolSubpage/PoolArena 源码注解、二叉树与 ChunkList 流转图、验证 Demo 及性能数据表。

## 来源

[Netty源码分析(11) — 池化内存分配：PoolChunk 与 PoolSubpage](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484111&idx=1&sn=21f5fda71a216271344503641607e27e&chksm=fe6ca395c91b2a83e35eeb02b6b1ca0681f8896167f014acc263e0ba4735740fe34b84f9f6a7#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-11-poolchunk-subpage.md]]（抓取正文整理稿，browser 级抓取）
