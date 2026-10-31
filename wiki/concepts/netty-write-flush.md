---
id: wiki-concept-netty-write-flush
type: concept
title: Netty 写缓冲与背压（ChannelOutboundBuffer / writeAndFlush / 高低水位）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - concept
  - java
  - netty
  - network
sources:
  - raw/sources/architecture/2026-10-27-netty-15-write-flush.md
  - raw/sources/architecture/2026-10-22-netty-iot-gateway-resilient-design.md
  - raw/sources/architecture/2026-10-22-netty-redis-kafka-iot-gateway.md
  - raw/sources/architecture/2026-10-28-netty-source-series-album.md
related:
  - wiki/entities/netty.md
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/concepts/netty-eventloop.md
---
# Netty 写缓冲与背压（ChannelOutboundBuffer / writeAndFlush / 高低水位）

## Definition（定义）

Netty 的出站写路径机制：`write()` 只把消息包装成 Entry 追加到每 Channel 独享的 `ChannelOutboundBuffer` 链表（O(1) 返回，解耦业务线程与 I/O 线程），`flush()` 的 `addFlush()` 把 unflushedEntry 段整体转给 flushedEntry 标记"待发出"，真正的系统调用发生在 I/O 线程的 `NioSocketChannel.doWrite()` 里调 JDK `SocketChannel.write()`；`writeAndFlush` 只是两个标记位（MASK_WRITE_AND_FLUSH）的合并封装。

## Why It Matters（为什么重要）

这是"业务线程塞数据、I/O 线程发数据"异步模型的落地结构：不理解它，"write 后忘 flush 数据发不出去""攒批 flush 省系统调用""isWritable 背压防 OOM"就只是口诀。高低水位是网关/代理/推送服务在下游消费变慢时避免写缓冲膨胀 OOM 的唯一内建开关。

## Core Characteristics（核心特征）

1. 两段式提交-刷新：write 入队（unflushedEntry→tailEntry 段）→ flush 移指针（转 flushedEntry，数据仍在用户态）→ doWrite 真正写内核。
2. Entry 链表 + Recycler 复用：每个 Entry 持有 msg/promise/pendingSize/count，Entry 对象经 Recycler 回收减少 GC；doWrite 按 `Entry.count` 尝试合并相邻 ByteBuf 减少写次数。
3. 写自旋公平性：`writeSpinCount` 默认 16，单 Channel 单次 flush 最多连续写 16 轮，防独占 I/O 线程；用完自动重新调度。
4. 半包与 OP_WRITE：TCP 发送缓冲区满写不进时 `setOpWrite()` 注册 OP_WRITE，等 selector 通知可写再续写，剩余数据留链表。
5. 高低水位背压：`totalPendingSize` 超高水位（默认 64KB）→ `isWritable()=false`，降至低水位（默认 32KB）以下恢复；穿越触发 `channelWritabilityChanged` 回调供上层限流。
6. 发送完成自动 release：写出侧的 ByteBuf 在发送完成后由 Netty 释放（retain 过的须手动配对 release）。

## Structure（结构）

```text
channel.writeAndFlush(msg)
  → AbstractChannelHandlerContext.write(msg, flush=true)   # 反向找 outbound handler
  → TailContext → AbstractChannel.write()                  # outboundBuffer.addMessage()
  → ChannelOutboundBuffer（Entry 链表：unflushed/flushed/tail）
  → AbstractUnsafe.flush() → addFlush()                    # 移动指针段
  → NioSocketChannel.doWrite()                             # I/O 线程
      → doWriteBytes → JDK SocketChannel.write()           # 写自旋 ≤16 / OP_WRITE / 半包续写
  → promise.setSuccess() 回调
```

## How It Works（运作方式）

高吞吐推荐姿势：多次 `ctx.write()` 攒批后一次 `ctx.flush()`，把 N 次系统调用压成少量几次；写前检查 `channel.isWritable()`，false 时把数据转存业务侧队列，等 `channelWritabilityChanged` 回调恢复后再发。大文件用 `FileRegion` 走零拷贝，绕开用户态写缓冲。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-channel-pipeline]]：本概念是其"channel.write 从 tail 出发"出站路径的末端展开（part-of 关系）；pipeline 负责传播，outboundBuffer 负责暂存与真正写出。
- [[netty-eventloop]]：flush/doWrite 由 EventLoop 的 I/O 线程执行；写自旋与 OP_WRITE 都是为保住 EventLoop 的公平性与响应性。

### Dependencies（依赖项）

- JDK NIO SocketChannel 的非阻塞写语义；TCP 发送缓冲区满 = 写返回 0 的触发条件。

### Distinctions（区分）

- write vs writeAndFlush：前者只入队（须自行 flush），后者入队+刷新；RPC 请求-响应用 writeAndFlush 方便，高吞吐推送用 write+批量 flush 更省系统调用（信源场景表）。

## Evolution（演进）

教程第 15 篇（netty-15）给出源码级全貌（Entry 链表/addFlush/doWrite/写自旋/水位默认值）；此前两个 IoT 工程信源已把"写缓冲水位线（32/64KB）是反压开关"列为长连接工程纪律，本篇为其补上了默认值出处（DefaultChannelConfig）与回调机制，机制与工程互证。
- 2026-10-31：程序员行一第 21 篇增量——写积压≠泄漏（前者仍被需要但发送跟不上）；bytesBeforeUnwritable/bytesBeforeWritable 写前估算细粒度控制；入站背压把写侧不可写传回 read（关闭 AUTO_READ）；推送队列五策略（暂停上游/丢低优先级/合并保留最新/断慢连接/落盘补偿）；水位线乘积估算（10 万连接 × 1MB = 100GB 理论积压，先建背压策略再微调水位）；fireChannelWritabilityChanged(invokeLater) 异步传播防重入；慢连接排查指标（pending bytes/不可写数/OP_WRITE/write Future 延迟/flush 耗时）。

## Open Questions（开放问题）

- OP_WRITE 注册后 selector 唤醒续写的具体入口（processSelectedKeys 侧的 forceFlush 路径）信源未展开。
- 4.2 传输解耦后写路径是否有变化，本库暂无信源。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-15-write-flush.md`（源码级主信源：write/flush 分离、doWrite、水位机制）
- Source: `raw/sources/architecture/2026-10-22-netty-iot-gateway-resilient-design.md`（工程侧：水位线反压纪律）
- Source: `raw/sources/architecture/2026-10-22-netty-redis-kafka-iot-gateway.md`（工程侧：水位线反压纪律）
- Source: `raw/sources/architecture/2026-10-28-netty-source-series-album.md`（第 21 篇，写积压≠泄漏/bytesBeforeUnwritable/入站背压/水位乘积估算增量）

## Related Knowledge（相关知识）

- [[netty-15-write-flush]]（信源页）
- [[netty]]（实体页）
