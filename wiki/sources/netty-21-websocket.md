---
id: wiki-source-netty-21-websocket
type: source
title: Netty源码分析(21) — WebSocket 支持与协议升级源码
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - source
  - java
  - netty
  - websocket
  - tutorial
sources:
  - raw/sources/architecture/2026-10-27-netty-21-websocket.md
related:
  - wiki/sources/netty-20-http-decoder.md
  - wiki/sources/netty-22-ssl-tls.md
  - wiki/entities/netty.md
  - wiki/concepts/netty-websocket-upgrade.md
  - wiki/concepts/netty-http-decoder.md
  - wiki/concepts/netty-idlestate-heartbeat.md
  - wiki/concepts/websocket-heartbeat-reconnect.md
---
# Netty源码分析(21) — WebSocket 支持与协议升级源码

## Overview（概览）

公众号「Java解忧杂货铺」Netty 源码分析系列第 21 篇，接续第 20 篇（[[netty-20-http-decoder]] 的 UPGRADED 状态在本篇落地）。源码级拆解 Netty WebSocket 支持：同一 TCP 连接上先走 HTTP 握手再无缝切换协议——`WebSocketServerProtocolHandler` 识别 Upgrade 头，`WebSocketServerHandshaker13` 计算 Sec-WebSocket-Accept 返回 101，握手成功的 Listener 里动态替换 Pipeline（移除 HTTP 编解码器、热插拔 WebSocket 帧编解码器）；附帧解码（FIN/RSV/Opcode/Mask/扩展长度/分片重组）源码分析、可运行 Echo Server 与 JS 客户端示例及五条踩坑记录。

## Key Facts（关键事实）

- 服务端 Pipeline 标配：`HttpServerCodec → HttpObjectAggregator(65536) → WebSocketServerProtocolHandler("/ws") → 业务 Handler`；HttpObjectAggregator 不能省——握手判断需要完整 FullHttpRequest，缺了握手永远走不通（作者称"90% 握手没反应"的原因）。
- 升级请求判定：HTTP GET + `Upgrade: websocket` 头（忽略大小写）。
- 握手核心：`Sec-WebSocket-Accept = Base64(SHA1(Sec-WebSocket-Key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))`（RFC 6455 固定魔数），返回 `101 SWITCHING_PROTOCOLS` + Upgrade/Connection 头。
- Pipeline 热插拔：握手成功 Listener 里 `p.remove(HttpRequestDecoder/HttpResponseEncoder/HttpObjectAggregator)`，`addBefore/addAfter` 插入 `WebSocket13FrameDecoder/Encoder`；握手前 `HttpServerCodec → Aggregator → ProtocolHandler → FrameHandler`，握手后 `WebSocket13FrameDecoder → WebSocket13FrameEncoder → ProtocolHandler → FrameHandler`；对上层业务完全透明。
- 帧解码：第一字节 FIN(0x80)+RSV+Opcode(0x0F)，第二字节 Mask(0x80)+PayloadLength(0x7F)，126 后跟 2 字节扩展长度、127 后跟 8 字节；有掩码读 4 字节 Mask Key 做 XOR 还原；FIN=0 分片帧需重组；opcode 映射 0x1=Text/0x2=Binary/0x8=Close/0x9=Ping/0xA=Pong。
- 掩码铁律：客户端→服务端必须带 Mask（防缓存污染攻击），服务端→客户端不能带，违反即断连。
- 子协议协商：构造器第二参数指定 subprotocol（如 "mqtt"），握手响应带 `Sec-WebSocket-Protocol`，可在 WebSocket 上跑 MQTT（物联网场景）。
- 踩坑：① 聚合器不能省；② 路径默认精确匹配，`checkStartsWith=true` 放开前缀；③ 帧长度理论上限 2^63 字节，必须设最大帧大小（如 65536）防内存炸；④ 用 IdleStateHandler + PingWebSocketFrame 做心跳（30s 无读写触发）；⑤ 文明关闭：先发 CloseWebSocketFrame(1000) 等客户端回 Close 再 ctx.close()，直接关会"连接被重置"。
- 作者动机案例（自述）：物联网项目 HTTP 轮询（每秒一次）设备一多 CPU 80%，切 WebSocket 后服务端主动推送、实时性从秒级变实时。

## Important Claims（重要论断）

### Claim 1：协议升级 = Handler 热插拔
作者论断（解读）：WebSocket 握手是 HTTP 协议的"特化"——标准 GET + Upgrade 头，101 之后两端彻底忘记 HTTP；Netty 把"协议升级"翻译成"Pipeline Handler 热插拔"，同一连接零额外握手开销换全双工。

### Claim 2：Pipeline 动态切换对上层透明
作者论断：握手前后 Pipeline 内容完全不同，但业务 Handler 永远只见 WebSocketFrame，无需关心底层是 HTTP 还是 WebSocket（状态模式）。

## Concepts Introduced（引入的概念）

- [[netty-websocket-upgrade]]

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

落地 [[netty-20-http-decoder]] 的 UPGRADED 状态消费方，两篇合观构成"HTTP 解码 → 协议升级 → 帧编解码"完整链路；Pipeline 热插拔是 [[netty-channel-pipeline]] 动态性的最典型应用。心跳建议（IdleStateHandler + PingWebSocketFrame）与 [[netty-idlestate-heartbeat]] 机制、[[websocket-heartbeat-reconnect]] 端侧三段式互证；本库另有 Nginx 侧 WebSocket 长连接工程信源（[[nginx-websocket-million-connections]]），本篇提供框架层对照。

## Limitations（局限）

- 单一自媒体教程信源；源码为"简化版/极度简化"注解片段（作者自述核心逻辑一致），未标明具体 Netty 版本（同系列前文为 4.1.x）。
- "90% 的情况是忘了加聚合器"为作者经验断言，无统计依据。
- 预告的续篇（SSL/TLS）未包含在本篇；该续篇已单独摄入，见 [[netty-22-ssl-tls]]。

## Related Knowledge（相关知识）

- [[netty-20-http-decoder]]（同系列第 20 篇：HTTP 解码状态机，本篇为其续篇）
- [[netty-22-ssl-tls]]（同系列第 22 篇：SSL/TLS 支持，本篇预告的续篇）
- [[netty-websocket-upgrade]]（概念页）
- [[netty-http-decoder]]（UPGRADED 状态提供方）
- [[netty-idlestate-heartbeat]]（Ping 帧心跳的机制底座）
- [[websocket-heartbeat-reconnect]]（端侧心跳重连三段式对照）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-21-websocket.md`
