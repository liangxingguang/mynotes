---
id: wiki-concept-netty-channel-pipeline
type: concept
title: Netty ChannelPipeline（责任链与事件传播）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - concept
  - java
  - netty
  - network
sources:
  - raw/sources/architecture/2026-10-27-netty-04-channel-pipeline-handler.md
  - raw/sources/architecture/2026-10-27-netty-02-bio-nio.md
related:
  - wiki/entities/netty.md
  - wiki/concepts/reactor-thread-model.md
  - wiki/sources/netty-04-channel-pipeline-handler.md
---
# Netty ChannelPipeline（责任链与事件传播）

## Definition（定义）

ChannelPipeline 是 Netty 的 Handler 容器与事件分发机制：每个 Channel 绑定一个 Pipeline，其默认实现 `DefaultChannelPipeline` 底层是一条以 HeadContext/TailContext 为端点的 `ChannelHandlerContext` 双向链表，每个节点包装一个 ChannelHandler；事件沿链表按方向传播，构成责任链模式。

## Why It Matters（为什么重要）

它回答了"一个连接的数据如何在各 handler 之间流转"：日志、编解码、业务等 Handler 的调用顺序由链表位置保证，使用者只需声明顺序（addLast）与方向（inbound/outbound），无需手工编排。它是 Netty 分层架构核心层三组件（Channel/EventLoop/ChannelPipeline）之一，也是粘包解码、心跳、日志拦截等一切横切能力的挂载点。

## Core Characteristics（核心特征）

1. **双向链表结构**：head/tail 为特殊内置节点；HeadContext 处理底层 IO（读写 Socket），TailContext 是入站终点（默认打印警告）；`addLast` = 尾插法，添加顺序即链中顺序。
2. **方向标志位**：每个 Context 带 inbound/outbound 标志（实现为 executionMask），传播时沿 next/prev 跳过不匹配的节点。
3. **双向传播**：入站事件（fireChannelRead 等）Head→Tail 正向；出站事件（write 等）Tail→Head 反向，最终由 HeadContext 落 Socket。
4. **显式续传**：Handler 回调必须调 `ctx.fireXxx()` / `ctx.write()` 才把事件交给下一个匹配节点，否则传播中断。
5. **起点差异**：`channel.write` 从 tail 出发（经过全部出站 Handler）；`ctx.write` 从当前节点的下一个出站 Handler 出发（跳过之前的出站 Handler）。

## Structure（结构）

`Head(io) ↔ H1 ↔ H2 ↔ … ↔ Tail(in)`；入站：`Head → H1 → … → Tail`；出站：`Tail → … → H1 → Head`。每个新连接（NioSocketChannel）创建时自动建 Pipeline，初始仅 head/tail 两节点，用户 Handler 经 addLast/addFirst 插入中间。

## How It Works（运作方式）

入站由 `fireChannelRead` 从 head 起调 `findContextInbound` 沿 next 找下一个 inbound 节点逐级触发；出站由 `write` 从 tail 起调 `findContextOutbound` 沿 prev 反向找下一个 outbound 节点，终到 HeadContext 写底层 Socket。Handler 生命周期回调：handlerAdded → channelRegistered → channelActive → channelRead(/Complete) → channelInactive → handlerRemoved，异常走 exceptionCaught。适配器分工：`SimpleChannelInboundHandler` 自动释放 ByteBuf；`ChannelInboundHandlerAdapter` 需手动 release 否则内存泄漏；`ChannelDuplexHandler` 出入站一体。

## Relationships（关系）

### Related Concepts（相关概念）

- [[reactor-thread-model]]：EventLoop 驱动 Channel 产生 IO 事件，Pipeline 负责事件在 Handler 间的分发——前者管"哪个线程执行"，后者管"按什么顺序流经哪些处理器"。

### Dependencies（依赖项）

- 依附于 [[netty]] 实体；是 ByteBuf、编解码器等机制的传播载体（本库 ByteBuf 独立页面尚未建立）。

### Distinctions（区分）

- 与 Servlet Filter 链不同（解读）：Filter 多为单向嵌套调用，Pipeline 是入站/出站双向、按方向标志跳节点的显式续传模型。

## Evolution（演进）

信源基于 Netty 4.1.x 源码（`DefaultChannelPipeline`、`AbstractChannelHandlerContext`），作者注明不同版本可能有细微差异。

## Open Questions（开放问题）

- HeadContext 构造参数 inbound=false/outbound=true 与其双向职责的实现细节（信源以"重写方法处理"带过，未展开）。
- 4.2+ 版本（传输解耦后）Pipeline 机制是否有变化，本库未确立。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-04-channel-pipeline-handler.md`（源码级剖析主信源）
- Source: `raw/sources/architecture/2026-10-27-netty-02-bio-nio.md`（责任链结构佐证：Head→Decoder→Encoder→Business→Tail）

## Related Knowledge（相关知识）

- [[netty-04-channel-pipeline-handler]]（信源页）
- [[netty-01-intro]]（分层架构定位）
