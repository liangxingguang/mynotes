---
id: wiki-source-netty-15-write-flush
type: source
title: Netty源码分析(15) — 写缓冲 buffer 与 writeAndFlush 流程
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - source
  - java
  - netty
  - network
  - tutorial
sources:
  - raw/sources/architecture/2026-10-27-netty-15-write-flush.md
related:
  - wiki/sources/netty-04-channel-pipeline-handler.md
  - wiki/sources/netty-09-nioeventloop-run.md
  - wiki/entities/netty.md
  - wiki/concepts/netty-write-flush.md
  - wiki/concepts/netty-channel-pipeline.md
---
# Netty源码分析(15) — 写缓冲 buffer 与 writeAndFlush 流程

## Overview（概览）

公众号「Java解忧杂货铺」Netty 源码分析系列第 15 篇。源码级拆解写路径：write() 只是把消息包装成 Entry 追加到 ChannelOutboundBuffer 链表（unflushedEntry 段），flush() 的 addFlush() 把该段整体转给 flushedEntry，真正的写入发生在 NioSocketChannel.doWrite() 调 JDK SocketChannel.write()；并详解写自旋（默认 16 次）、OP_WRITE 注册与高低水位（默认 64KB/32KB）背压机制。附完整调用链路图、背压演示 Demo 与常见坑清单。文中源码基于 Netty 4.1.x。

## Key Facts（关键事实）

- write 与 flush 在 `AbstractChannelHandlerContext.write(msg, flush, promise)` 就已分开：`writeAndFlush` 只是同时传两个标记位（`MASK_WRITE_AND_FLUSH`）。
- write() 只做入队：`AbstractChannel.write()` 核心一行 `outboundBuffer.addMessage(msg, promise)`，O(1) 返回；ChannelOutboundBuffer 为每 Channel 独享的 Entry 链表，Entry 对象经 Recycler 复用减少 GC。
- addFlush() 只移动指针：unflushedEntry→tailEntry 段整体转给 flushedEntry 并置空 unflushedEntry，此刻数据仍在用户态。
- NioSocketChannel.doWrite() 里才真正调 `doWriteBytes`→ JDK `SocketChannel.write()`；写自旋 `writeSpinCount` 默认 16 次防独占 I/O 线程；写不进（TCP 发送缓冲区满）时 `setOpWrite()` 注册 OP_WRITE 等 selector 通知，半包数据留链表续写；doWrite 内部会按 `Entry.count` 尝试合并相邻 ByteBuf。
- 高低水位（`DefaultChannelConfig` 默认 high=64KB / low=32KB）：`totalPendingSize` 超高水位 → `isWritable()=false`；降到低水位以下恢复 true；穿越时触发 `channelWritabilityChanged` 回调，是背压的实施点。
- 设计动机：解耦业务线程与 I/O 线程（生产者-消费者），批量 flush 把 N 次 write 合并成少量系统调用。
- 常见坑：write 后忘 flush 数据永留用户态；发送完成后 Netty 会自动 release 写出侧的 ByteBuf（但 retain 过须手动 release）；忽略 isWritable() 会写缓冲膨胀 OOM；大文件应用 FileRegion 走零拷贝而非 ByteBuf。

## Important Claims（重要论断）

### Claim 1：write 提交任务、flush 刷新到内核
作者论断：写缓冲名为"缓冲"，实质是"提交-刷新"机制——write 入队 O(1) 返回，flush 才由 I/O 线程做系统调用；高吞吐场景应攒批 write 后一次 flush。

### Claim 2：高低水位是背压开关
作者论断：下游消费跟不上时写缓冲持续膨胀最终 OOM，高低水位 + channelWritabilityChanged 就是用来通知上游减速的；水位不宜设太小（高频触发回调浪费性能），通常设几百 KB 级。

## Concepts Introduced（引入的概念）

- [[netty-write-flush]]

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

为 [[netty-channel-pipeline]] 概念页的"channel.write 从 tail 出发"路径补上了出站末端的完整图景（TailContext→AbstractUnsafe→ChannelOutboundBuffer→doWrite）；高低水位数值（64KB/32KB）与 [[netty]] 实体页"长连接工程（IoT 双信源）：写缓冲水位线（32/64KB）是反压开关"的工程说法互证——本篇给出其默认出处（DefaultChannelConfig）与触发回调机制。

## Limitations（局限）

- 单一自媒体教程信源；文中称 ChannelOutboundBuffer 为"环形链表"，从所列字段（unflushed/flushed/tailEntry 单向 next）看更接近单链表，口径存疑（解读：作者用语不严格）。
- OP_WRITE 注册后由 selector 唤醒续写的具体入口（processSelectedKeys→unsafe().forceFlush() 路径）未展开。
- 未涉及 4.2 传输解耦后的写路径变化。

## Related Knowledge（相关知识）

- [[netty-04-channel-pipeline-handler]]（同系列第 4 篇：出站事件传播，本篇为其写路径末端展开）
- [[netty-09-nioeventloop-run]]（同系列第 9 篇：I/O 线程主循环，flush/doWrite 的执行者）
- [[netty-write-flush]]（概念页）
- [[netty-channel-pipeline]]（概念页）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-15-write-flush.md`
