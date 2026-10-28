---
id: wiki-concept-netty-bytebuf
type: concept
title: Netty ByteBuf（数据容器与内存管理）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - concept
  - java
  - netty
sources:
  - raw/sources/architecture/2026-10-27-netty-05-bytebuf.md
  - raw/sources/architecture/2026-10-20-netty-three-skills-high-performance.md
related:
  - wiki/entities/netty.md
  - wiki/concepts/netty-channel-pipeline.md
---
# Netty ByteBuf（数据容器与内存管理）

## Definition（定义）

Netty 自研的字节容器，用于替代 JDK `java.nio.ByteBuffer`：以读写双指针 + 自动扩容 + 引用计数 + 池化分配四个机制，解决 JDK ByteBuffer 单指针需 flip()、容量固定、无池化、堆外释放不可控四大痛点（ByteBuf 篇信源）。是 [[netty]] 分层架构缓冲层的核心（开篇信源）。

## Why It Matters（为什么重要）

- 是 Netty"性能三支柱"之一（机制信源把 ByteBuf 读写双指针+引用计数+jemalloc 式内存池列为支柱，与主从 Reactor、零拷贝并列）。
- 堆外内存不经 GC，引用计数是唯一可控的释放手段；ByteBuf 篇作者称泄漏是"线上事故的头号杀手"。
- 池化显著降 GC 压力：ByteBuf 篇作者称高频场景约降 70%（经验数字）；李林锋信源引 Twitter 案例垃圾生成降 5 倍，并指出代价是泄漏不再被 GC 兜底。

## Core Characteristics（核心特征）

1. 读写指针分离：`readerIndex`/`writerIndex` 并行推进，无需 flip()。
2. 自动扩容（4.1）：≤4MB 从 64B 翻倍，>4MB 每次步进 4MB，上限 maxCapacity（默认 Integer.MAX_VALUE）。
3. 三形态：Heap（byte[]，GC 托管）、Direct（堆外，IO 少一次拷贝）、Composite（addComponent 引用组合，零拷贝拼接）。
4. 引用计数：实现 ReferenceCounted（refCnt/retain/release），归零释放底层资源。
5. 分配器双体系：Unpooled（随用随扔）vs Pooled（类 jemalloc，Arena 数组默认 CPU×2、page 8KB、maxOrder 11）；4.1 默认池化。

## Structure（结构）

`ByteBuf` 接口（继承 ReferenceCounted）→ `AbstractByteBuf`（模板方法定骨架：边界检查+指针维护，`_getByte/_setByte` 抽象）→ 按存储（heap/direct）× 池化（pooled/unpooled）× Unsafe 组合出 Pooled/Unpooled(Unsafe)(Heap/Direct)ByteBuf；`CompositeByteBuf` 旁支实现零拷贝视图组合。

## How It Works（运作方式）

- 读写：readByte() 先查可读再 `_getByte(readerIndex)` 并推进指针；writeByte() 先 `ensureWritable`（不够则 `calculateNewCapacity` 扩容）再 `_setByte`。
- 释放纪律：try/finally 中 `ReferenceCountUtil.release(msg)`，或改用 `SimpleChannelInboundHandler` 自动释放（与 [[netty-channel-pipeline]] 篇的 Handler 语义互证）；铁律"谁最后消费谁 release"。
- 泄漏排查：`-Dio.netty.leakDetectionLevel=paranoid` 采样打印调用栈。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-channel-pipeline]]（ByteBuf 沿 Pipeline 在 Handler 间流转，释放语义由 Handler 类型决定）

### Distinctions（区分）

- 与 JDK ByteBuffer：双指针 vs 单指针+flip、自动扩容 vs 固定容量、池化+引用计数 vs 每次 new+Cleaner。
- 零拷贝（Composite/wrappedBuffer）≠ 零内存分配：分配对象本身但不复制底层数据。

## Evolution（演进）

- 4.1 起池化转正为默认（实体页时间线）；4.2 引入 AdaptiveByteBufAllocator（适配虚拟线程，见 [[netty]]）。
- ByteBuf 篇作者预告系列第 10、11 篇深入 PoolChunk/PoolSubpage 池化细节（未采集，当前未知）。

## Open Questions（开放问题）

- "约 70% GC 压力下降"缺测量方法与版本环境，仅作经验参考。
- Pooled 内部（PoolChunk/PoolSubpage/tiny-small-normal-huge 分级）源码细节待系列后续信源补齐。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-05-bytebuf.md`（源码级主信源）
- Source: `raw/sources/architecture/2026-10-20-netty-three-skills-high-performance.md`（三支柱定位）

## Related Knowledge（相关知识）

- [[netty]]（实体页）
- [[netty-05-bytebuf]]（信源页）
