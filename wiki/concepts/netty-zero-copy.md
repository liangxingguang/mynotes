---
id: wiki-concept-netty-zero-copy
type: concept
title: Netty 零拷贝机制（FileRegion/CompositeByteBuf/wrappedBuffer/堆外内存）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - concept
  - netty
  - zero-copy
  - performance
sources:
  - raw/sources/architecture/2026-10-27-netty-23-zero-copy.md
related:
  - wiki/concepts/netty-bytebuf.md
  - wiki/concepts/netty-write-flush.md
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/concepts/netty-epoll-native-transport.md
  - wiki/entities/netty.md
---
# Netty 零拷贝机制（FileRegion/CompositeByteBuf/wrappedBuffer/堆外内存）

## Definition（定义）

Netty 的零拷贝（Zero-Copy）不是"没有数据拷贝"，而是"没有 CPU 参与的数据拷贝"——让数据沿最短路径流动（DMA 承担搬运），CPU 只做协议解析与业务逻辑。Netty 提供四大零拷贝机制：**FileRegion**（封装 sendfile，文件传输）、**CompositeByteBuf**（Component 数组逻辑拼接）、**Unpooled.wrappedBuffer**（直接包装 byte[]/MappedByteBuffer）、**DirectBuffer + 内存映射**（堆外内存规避 JVM 堆与 native 堆间拷贝）。

## Why It Matters（为什么重要）

传统 Java IO 传文件经历 4 次拷贝 + 4 次上下文切换，其中 2 次拷贝由 CPU 执行；大文件高吞吐场景下这部分纯浪费。零拷贝是 Netty 性能三支柱之一（与 Reactor、内存池并列），直接决定文件传输、协议组装、高频读写场景的 CPU 效率。

## Core Characteristics（核心特征）

1. **FileRegion → sendfile**：`DefaultFileRegion.transferTo()` 委托 `FileChannel.transferTo()`，底层即 Linux `sendfile()`，数据磁盘→内核→网卡不经过用户空间（4 次拷贝压成 2 次 DMA）；`NioSocketChannel` doWrite 对 FileRegion 走专门零拷贝分支（策略模式）；**单次使用不可复用**、编解码器须跳过、Windows 会 fallback。
2. **CompositeByteBuf 逻辑拼接**：`Component[]` 持有各 ByteBuf 引用不拷数据，`addComponent(increaseWriterIndex, buffer)` 控制 writerIndex；按 index 二分查找定位组件（O(log n)）；`nioBuffers()` 返回底层 NIO Buffer 视图仍无拷贝；`release()` 递归释放所有 Component。典型场景：协议头+体组装、HTTP chunked、WebSocket 帧。
3. **wrappedBuffer 包装**：`Unpooled.wrappedBuffer(byte[])` 返回 UnpooledHeapByteBuf 直接持有数组引用，零开销把 Java 数组接入 Netty 体系。
4. **堆外内存 + 内存映射**：DirectByteBuf 本身即 native 内存，省 JVM 堆↔native 堆拷贝；`FileChannel.map()` 的 MappedByteBuffer 再省内核→用户态拷贝。

## Structure（结构）

场景分派：大文件（>1MB）→ FileRegion+sendfile；多段数据组装 → CompositeByteBuf；数组接入 → wrappedBuffer；小包高频读写 → DirectByteBuf+池化（见 [[netty-pooled-allocator]]）。在写路径上，ChannelOutboundBuffer flush 时按消息类型分派：普通 ByteBuf 走 `SocketChannel.write`，FileRegion 走 `FileRegion.transferTo`（见 [[netty-write-flush]]）。

## How It Works（运作方式）

以 FileRegion 为例：应用 `ctx.writeAndFlush(new DefaultFileRegion(fileChannel, 0, len))` → 入 ChannelOutboundBuffer → doWrite 识别 FileRegion 类型 → `region.transferTo(socketChannel, transferred)` → JDK FileChannel.transferTo → Linux sendfile(file_fd, socket_fd) → 磁盘数据经内核缓冲区 DMA 直达网卡。完成后经 ChannelFutureListener 关闭文件资源。CompositeByteBuf 则是读路径零拷贝：findComponent 二分定位后委托组件内 ByteBuf 读写，逻辑连续、物理分散。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-bytebuf]]：Composite/Direct 是 ByteBuf 三形态之二；引用计数与"谁最后消费谁 release"铁律在 CompositeByteBuf 上体现为递归释放。
- [[netty-write-flush]]：FileRegion 是 doWrite 写路径的零拷贝分支；该篇已点名"大文件用 FileRegion"，本篇展开机制。
- [[netty-channel-pipeline]]：编解码器遇 FileRegion 必须透传（fireChannelRead），否则零拷贝失效——责任链上的类型约束。
- [[netty-epoll-native-transport]]：信源口径 EpollEventLoop 对 sendfile 支持更好（机制细节未展开）。

### Dependencies（依赖项）

- OS 系统调用：Linux `sendfile()`/`splice()`（2.6.33+）、`FileChannel.map()` mmap；JDK `FileChannel.transferTo()`。

### Distinctions（区分）

- 与 [[netty-pooled-allocator]] 的不同：池化解决"分配/回收成本"，零拷贝解决"搬运成本"；小包高频场景信源推荐 DirectByteBuf+池化而非 FileRegion。

## Evolution（演进）

- 2026-10-29：随教程第 23 篇建立（单信源）；与机制信源"零拷贝三层"口径（OS sendfile/JVM 堆外/应用层 Composite）互证。

## Open Questions（开放问题）

- FileRegion 相对传统拷贝的量化收益（吞吐/CPU 基线），信源只有定性断言。
- EpollEventLoop 对 sendfile "支持更好"的具体机制，信源未展开。
- Netty 4.2 Adaptive 体系下零拷贝 API 是否有变化，信源未覆盖（基于 4.1.x）。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-23-zero-copy.md`（单一自媒体教程信源；源码为简化注解片段，同系列前文标注 Netty 4.1.x）

## Related Knowledge（相关知识）

- [[netty-23-zero-copy]]（信源页）
- [[netty]]（实体页）
