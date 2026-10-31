---
id: wiki-comparison-sse-vs-websocket
type: comparison
title: SSE vs WebSocket
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - comparison
  - network
  - realtime
sources:
  - raw/sources/architecture/2026-10-31-architecture-science-and-art-42-rules.md
related:
  - wiki/concepts/websocket-heartbeat-reconnect.md
  - wiki/concepts/netty-websocket-upgrade.md
  - wiki/sources/im-websocket-reconnect-heartbeat.md
  - wiki/sources/collaborative-doc-editor-design.md
---
# SSE vs WebSocket

## Scope（范围）

实时推送的两种主流方案对比：服务器发送事件（Server-Sent Events，SSE）与 WebSocket。比较维度取自法则 31（通信方向、数据形式、浏览器支持、常见场景）及部署注意事项；不覆盖非浏览器环境（如纯服务端 MQ 推送）与其他长尾方案（WebRTC、long-polling）。

## Comparison Matrix（对比矩阵）

| Dimension（维度） | SSE | WebSocket |
|---|---|---|
| Purpose（用途） | 服务器持续向浏览器单向推送事件流（AI 流式输出、任务进度、通知） | 客户端与服务器双向实时通信（聊天、协作编辑、在线游戏） |
| Architecture（架构） | 基于 HTTP 长连接，服务器通过 HTTP 持续发送 UTF-8 文本事件 | 独立协议（HTTP 升级握手后进入全双工帧通道），文本或二进制消息 |
| Communication direction（通信方向） | 服务端到客户端（单向） | 客户端与服务端双向 |
| Browser support（浏览器支持方式） | `EventSource`，内置自动重连与事件编号机制 | `WebSocket`，重连通常由应用处理 |
| Data form（数据形式） | UTF-8 文本事件 | 文本或二进制消息 |
| Strengths（优势） | 走 HTTP 通道，对网关/代理友好；浏览器内置重连，省事 | 全双工；支持二进制；两端都能主动发消息 |
| Weaknesses（劣势） | 单向——客户端要提交操作仍需普通 HTTP 请求 | 重连、心跳、断线恢复需应用层处理；代理/网关对长连接的缓冲与空闲断开要专门配置 |
| Cost（成本） | 单向场景下更省事（事件编号+自动重连由浏览器承担） | 双向场景必要；单向场景属过度设计 |
| Complexity（复杂度） | 低（AI 流式输出等单向场景） | 中高（心跳、背压、断线恢复、连接数与消息频率估算） |

## Analysis（分析）

选择的第一判据是**通信方向**：页面主要接收服务器推送（AI 流式输出、任务进度、实时通知），偶尔通过普通 HTTP 提交操作 → SSE 往往更省事；客户端和服务端都要频繁发消息，或消息包含二进制数据 → 再考虑 WebSocket。

第二判据是**部署条件**：长连接建起来事情才刚开始——网关和反向代理会不会缓冲响应、多久关掉空闲连接、连接数量与消息频率估算、心跳/背压/断线恢复都要处理。Netty 可以构建 WebSocket 服务，但「单节点支持一百万连接」离开测试条件没有意义：操作系统配置、内存、消息频率、业务处理、加密和网络带宽都会改变结果；能建立连接不代表能稳定处理同样规模的活跃消息。

## Best Fit（适用场景）

### SSE is preferable when（以下情况 SSE 更合适）

- AI 流式输出（大模型逐 token 推送）
- 任务进度/长任务状态通知
- 服务端到客户端的实时通知（单向为主，操作提交走普通 HTTP）

### WebSocket is preferable when（以下情况 WebSocket 更合适）

- 聊天、协作编辑、在线游戏等双向频繁交互场景
- 消息包含二进制数据（如音频/视频帧、文件块）
- 客户端需要主动、高频地向服务端发送消息

## Important Caveats（重要提醒）

- 本文信源（法则 31）的对比表在采集稿中字段错位（每个单元格独立成行），本页按语义归并还原；原始错位见 raw 信源正文。
- 本文未给出两种方案在代理缓冲、空闲超时上的具体配置数值；生产部署细节需结合 [[websocket-heartbeat-reconnect]]（心跳保活与断线重连）与 [[netty-websocket-upgrade]]（协议升级与帧编解码）等信源。
- SSE 的自动重连与事件编号由浏览器 `EventSource` 承担，但服务端仍需处理重复推送的幂等（连接恢复后会从断点续推）。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-architecture-science-and-art-42-rules.md`（法则 31：SSE/WebSocket 定义、方向、数据形式、浏览器支持、常见场景、部署注意事项、百万连接说法）
- 互证/扩展：[[im-websocket-reconnect-heartbeat|IM WebSocket 断线重连心跳实战（信源页）]]、[[collaborative-doc-editor-design|协同编辑中的 WebSocket 用法（信源页）]]
