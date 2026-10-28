---
id: wiki-source-netty-04-channel-pipeline-handler
type: source
title: Netty源码分析(4) — Channel、ChannelPipeline与ChannelHandler三剑客
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - netty
  - network
  - tutorial
sources:
  - raw/sources/architecture/2026-10-27-netty-04-channel-pipeline-handler.md
related:
  - wiki/sources/netty-02-bio-nio.md
  - wiki/entities/netty.md
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/concepts/reactor-thread-model.md
---
# Netty源码分析(4) — Channel、ChannelPipeline与ChannelHandler三剑客

## Overview（概览）

公众号「Java解忧杂货铺」Netty 源码分析系列第 4 篇（第 3 篇未在本库采集）。源码级剖析 Netty 三大核心组件：Channel（连接抽象）、ChannelPipeline（Handler 容器/事件分发，底层为双向链表）、ChannelHandler（业务逻辑载体）；讲透入站事件 Head→Tail 正向、出站事件 Tail→Head 反向的传播机制，Handler 接口体系与生命周期，ctx.write 与 channel.write 的路径差异，并附完整可运行服务端示例。文中源码基于 Netty 4.1.x。

## Key Facts（关键事实）

- 组件关系：一个 Channel 对应一个 ChannelPipeline；Pipeline 内含一条 ChannelHandlerContext 双向链表，每个节点包装一个 ChannelHandler；每个新连接创建 1 个 NioSocketChannel + 1 个 Pipeline（默认只有 head/tail 两节点）。
- `DefaultChannelPipeline` 底层是双向链表：`head = new HeadContext(this)`、`tail = new TailContext(this)`，构造时头尾相连。HeadContext 处理底层 IO（读写 Socket），TailContext 是入站事件终点（默认打印警告）。
- `addLast` 即尾插法（`addLast0`：把新节点插到 tail 前面），add 顺序即 pipeline 中顺序；添加后触发 `handlerAdded` 回调。
- 每个 `AbstractChannelHandlerContext` 带 `inbound`/`outbound` 标志；事件传播沿 next/prev 指针用 `findContextInbound/Outbound`（按 executionMask）跳过不匹配的节点。
- 入站事件（fireChannelRead 等）从 head 正向传播到 tail；出站事件（write 等）从 tail 反向传播到 head，最终由 HeadContext 写入 Socket。
- Handler 接口体系：`ChannelHandler`（handlerAdded/handlerRemoved）→ `ChannelInboundHandler`（channelRegistered/Active/Read/ReadComplete/Inactive/exceptionCaught 等 9 个回调）/ `ChannelOutboundHandler`（bind/connect/disconnect/close/deregister/read/write/flush）。
- 适配器：`SimpleChannelInboundHandler<I>` 自动释放 ByteBuf；用 `ChannelInboundHandlerAdapter` 必须手动 `release()` 否则内存泄漏；`ChannelDuplexHandler` 同时处理入站+出站。
- 传播中断坑：Handler 回调里不调 `ctx.fireXxx()`，事件传播就此中断，后续 Handler 收不到——作者称为新手最常犯的错。
- `channel.write(msg)` 从 tail 出发经过所有出站 Handler；`ctx.write(msg)` 从当前节点的下一个出站 Handler 出发，跳过当前节点之前的出站 Handler；`ctx.writeAndFlush` 同 ctx.write 但立即 flush。
- 示例演示：log（duplex）→ codec（duplex）→ business（inbound-only）三 Handler 服务端，telnet 测试验证入站正向、出站反向传播顺序。

## Important Claims（重要论断）

### Claim 1：入站/出站双向传播是 Netty 最精妙的设计之一
作者论断：Handler 不需要同时关心进出两个方向，只关心自己需要的方向，Netty 按 inbound/outbound 标志自动找到正确的前进路径。

### Claim 2：绕过 pipeline 直接操作底层 ByteBuf，日志等出站 Handler 就抓不到写操作
作者论断（示例推论）：可观测性依赖事件沿 pipeline 传播，旁路绕过即失去拦截能力。

## Concepts Introduced（引入的概念）

- [[netty-channel-pipeline]]

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

事件传播源码解读直接服务于两个工程纪律：① 回调末尾必须 fireXxx 否则静默断链；② 内存管理上选对适配器类（SimpleChannelInboundHandler 免手动 release）。ctx.write vs channel.write 的路径差异解释了"为什么在某个 Handler 里 write 日志 Handler 有时抓不到"。

## Limitations（局限）

- 单一自媒体教程信源，源码解读基于 Netty 4.1.x，作者注明不同版本可能有细微差异。
- 系列第 3 篇未采集，系列连续性有缺口。
- HeadContext 构造参数 inbound=false/outbound=true 与其"既处理入站又处理出站"的表述，作者以"通过重写方法来处理"带过，未展开源码佐证。

## Related Knowledge（相关知识）

- [[netty-02-bio-nio]]（同系列第 2 篇）
- [[netty-01-intro]]（同系列开篇：分层架构中 ChannelPipeline 属核心层）
- [[reactor-thread-model]]（线程模型篇：boss/worker 分工，本篇回答"数据在 handler 间如何流转"）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-04-channel-pipeline-handler.md`
