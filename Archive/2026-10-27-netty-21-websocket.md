---
id: 2026-10-27-netty-21-websocket
title: Netty源码分析(21) — WebSocket 支持与协议升级源码
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484598&idx=1&sn=ec52f9b41a17b557887fd68c8b7ef42c&chksm=fe6ca5ecc91b2cfa27f5b2dcb77ce4f4766838ae70d7e64b005eacb62b9c074c740f0c6bc321#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, WebSocket]
asset_ref: Assets/2026/10/netty-21-websocket.md
wiki_status: ingested
---

# Netty源码分析(21) — WebSocket 支持与协议升级源码

> WebSocket 在同一 TCP 连接上先走 HTTP 握手再无缝切换协议。Netty 通过 WebSocketServerProtocolHandler + WebSocketServerHandshaker 完成 101 握手，握手成功后动态替换 Pipeline——HTTP 编解码器全部移除、WebSocket 帧编解码器热插拔进来。

## 核心要点

- 服务端 Pipeline 标配：HttpServerCodec → HttpObjectAggregator（不能省，否则握手判断拿不到 FullHttpRequest）→ WebSocketServerProtocolHandler → 业务 Handler
- 握手核心：取 Sec-WebSocket-Key + RFC 魔数做 SHA1/Base64 得 Sec-WebSocket-Accept，返回 101 SWITCHING_PROTOCOLS
- 握手成功的 Listener 里执行 Pipeline 动态替换：移除 HTTP Handler，加入 WebSocket13FrameDecoder/Encoder，对上层完全透明
- 帧解码处理 FIN/RSV/Opcode/Mask/扩展长度与分片重组；客户端→服务端的帧必须带掩码，服务端下发不能带
- 踩坑：路径默认精确匹配（checkStartsWith 可放开）、务必限制最大帧大小、用 IdleStateHandler + PingWebSocketFrame 做心跳、关闭要先发 CloseWebSocketFrame

## 正文

正文约 14000 字符，完整整理稿见附件 [[Assets/2026/10/netty-21-websocket.md]]，含握手器与帧编解码源码解析、Pipeline 切换图示及可直接运行的 WebSocket Echo Server 与 JS 客户端示例。

## 来源

[Netty源码分析(21) — WebSocket 支持与协议升级源码](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484598&idx=1&sn=ec52f9b41a17b557887fd68c8b7ef42c&chksm=fe6ca5ecc91b2cfa27f5b2dcb77ce4f4766838ae70d7e64b005eacb62b9c074c740f0c6bc321#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-21-websocket.md]]（抓取正文整理稿，browser 级抓取）
