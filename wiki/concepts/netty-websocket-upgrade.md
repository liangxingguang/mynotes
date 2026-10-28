---
id: wiki-concept-netty-websocket-upgrade
type: concept
title: Netty WebSocket 协议升级（握手与 Pipeline 热插拔）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - concept
  - netty
  - websocket
  - protocol
sources:
  - raw/sources/architecture/2026-10-27-netty-21-websocket.md
related:
  - wiki/concepts/netty-http-decoder.md
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/concepts/netty-idlestate-heartbeat.md
  - wiki/concepts/websocket-heartbeat-reconnect.md
  - wiki/entities/netty.md
---
# Netty WebSocket 协议升级（握手与 Pipeline 热插拔）

## Definition（定义）

Netty 在同一 TCP 连接上把 HTTP 升级为 WebSocket 的机制：`WebSocketServerProtocolHandler` 识别 `Upgrade: websocket` 的 GET 请求，`WebSocketServerHandshaker` 计算 `Sec-WebSocket-Accept` 并返回 `101 SWITCHING_PROTOCOLS`；握手成功的 ChannelFuture Listener 里动态改写 Pipeline——移除全部 HTTP 编解码器、热插拔 WebSocket 帧编解码器，对上层业务完全透明。

## Why It Matters（为什么重要）

WebSocket 复用 HTTP 握手换取零额外连接开销的全双工通道（相对轮询大幅降负载——作者自述 IoT 大屏场景 HTTP 轮询 CPU 80%，切 WebSocket 后服务端主动推送变实时）。Pipeline 热插拔是 Netty「协议升级 = Handler 替换」设计的最典型体现，同类机制也见于 HTTP/2 升级与 SSL/TLS 握手。

## Core Characteristics（核心特征）

1. **握手是 HTTP 的特化**：标准 GET + Upgrade 头；`Accept = Base64(SHA1(Key + RFC 6455 魔数 258EAFA5-...-C5AB0DC85B11))`；101 响应后两端彻底离开 HTTP。
2. **Pipeline 动态替换**：握手成功 Listener 里 remove HttpRequestDecoder/HttpResponseEncoder/HttpObjectAggregator，addBefore/addAfter 插入 WebSocket13FrameDecoder/Encoder；业务 Handler 永远只见 WebSocketFrame（状态模式）。
3. **聚合器前置依赖**：握手判断需要 FullHttpRequest，HttpObjectAggregator 不可省略。
4. **帧协议纪律**：客户端→服务端必须带 Mask（防缓存污染攻击），服务端下发不能带；FIN=0 分片帧重组；opcode 区分 Text/Binary/Close/Ping/Pong。
5. **生产护栏**：限制最大帧大小（帧长理论上限 2^63 字节）；IdleStateHandler + PingWebSocketFrame 心跳；文明关闭先发 CloseWebSocketFrame 再 ctx.close()；路径默认精确匹配，checkStartsWith 放开前缀。

## Structure（结构）

握手前 `HttpServerCodec → HttpObjectAggregator → WebSocketServerProtocolHandler → 业务Handler`；握手后 `WebSocket13FrameDecoder → WebSocket13FrameEncoder → WebSocketServerProtocolHandler → 业务Handler`（帧编解码对上层透明）。帧层次：ByteToMessageDecoder 拆帧 → 业务处理 → MessageToMessageEncoder 编码出站（责任链）。

## How It Works（运作方式）

HTTP 请求到达 → ProtocolHandler 判定 Upgrade 头 → 委托 Handshaker13：构建 101 响应（含 Sec-WebSocket-Accept）→ writeAndFlush → 成功 Listener 执行 Pipeline 替换；此后字节流经 WebSocket13FrameDecoder 按 FIN/RSV/Opcode/Mask/扩展长度解析、XOR 解掩码、分片重组，产出 WebSocketFrame 子类对象交业务 Handler。子协议（如 MQTT over WebSocket）经构造器参数在握手响应的 Sec-WebSocket-Protocol 头协商。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-http-decoder]]：握手请求的解码提供方；其 UPGRADED 状态即为本机制让位后的解码器终态。
- [[netty-channel-pipeline]]：热插拔依赖 Pipeline 的双向链表动态增删能力。
- [[netty-idlestate-heartbeat]]：Ping/Pong 心跳的检测底座。
- [[websocket-heartbeat-reconnect]]：端侧（浏览器）心跳重连三段式，与本概念构成服务端/客户端双侧视图。

### Dependencies（依赖项）

- HTTP 编解码栈（HttpServerCodec + HttpObjectAggregator）完成握手阶段解析。

### Distinctions（区分）

- 与 [[websocket-heartbeat-reconnect]] 的不同：后者讲客户端连接可靠性模式；本概念讲服务端协议升级的框架机制，不含重连职责。

## Evolution（演进）

- 2026-10-29：随教程第 21 篇建立（单信源）。

## Open Questions（开放问题）

- 百万级 WebSocket 连接下的握手吞吐与 Pipeline 替换开销，信源未涉及（本库 Nginx 侧信源从负载均衡角度覆盖长连接工程，见 [[nginx-websocket-million-connections]]）。
- 客户端侧（Netty 作 WebSocket Client）的握手实现差异，信源未展开。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-21-websocket.md`（单一自媒体教程信源；源码为简化注解片段，同系列前文标注 Netty 4.1.x）

## Related Knowledge（相关知识）

- [[netty-21-websocket]]（信源页）
- [[netty-20-http-decoder]]（信源页：HTTP 解码前篇）
- [[netty]]（实体页）
