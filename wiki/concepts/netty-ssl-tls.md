---
id: wiki-concept-netty-ssl-tls
type: concept
title: Netty SSL/TLS 支持（SslHandler 对 SSLEngine 的透明封装）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - concept
  - netty
  - ssl
  - tls
  - security
sources:
  - raw/sources/architecture/2026-10-27-netty-22-ssl-tls.md
related:
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/concepts/netty-connection-lifecycle.md
  - wiki/concepts/netty-websocket-upgrade.md
  - wiki/concepts/netty-idlestate-heartbeat.md
  - wiki/entities/netty.md
---
# Netty SSL/TLS 支持（SslHandler 对 SSLEngine 的透明封装）

## Definition（定义）

Netty 的 SSL/TLS 支持是 `SslHandler` 对 JDK `SSLEngine` 的 Handler 级封装：入站 `decode()` 调 `unwrap()` 把密文解密成明文传给下游，出站 `write()` 调 `wrap()` 把明文加密成 SSL 数据包发出；`SslContext` 作为配置中心与工厂创建 SslHandler，经 `SslProvider` 策略在 JDK / OpenSSL（netty-tcnative）/ BouncyCastle 之间切换底层实现。对 Pipeline 上下游 Handler 而言 SSL 层完全透明——它们只见明文。

## Why It Matters（为什么重要）

HTTPS、WSS、MQTT over TLS 等加密通信是互联网应用的默认形态；SslHandler 让业务代码无需感知加解密细节即可在普通 TCP 代码骨架上获得传输层安全。握手异步化（不占 IO 线程）与 Session 复用/TLS 1.3 优化直接决定高并发长连接服务的加密开销。

## Core Characteristics（核心特征）

1. **双向职责单一 Handler**：同时继承 `ByteToMessageDecoder`（入站解密）与实现 `ChannelOutboundHandler`（出站加密）；非 ByteBuf 消息直接透传。
2. **握手全程异步**：`engine.beginHandshake()` 后由 decode/wrap 自动响应 NEED_WRAP/NEED_UNWRAP 状态机；NEED_TASK 委托任务（密钥协商等）经 `runDelegatedTasks` 异步执行不阻塞 IO 线程；握手未完成时出站数据入 `pendingUnencryptedWrites` 排队，握手成功 Listener 里 `flushPendingWrites` 冲刷；外部经 `handshakeFuture()` 监听完成事件。
3. **unwrap 四态循环**：OK（明文传下游）/ BUFFER_UNDERFLOW（数据不够等下次）/ BUFFER_OVERFLOW（按 `getApplicationBufferSize()` 扩缓冲重试）/ CLOSED（关闭出站与 Channel）。
4. **提供者策略可切换**：`SslProvider` 枚举 JDK / OPENSSL / BouncyCastle；OpenSSL 经 netty-tcnative 的 `OpenSslEngine`（持原生 ssl 指针 + BIO，JNI 直调）获得 C 层原生实现与 AES-NI 硬件加速（信源经验论断：生产高并发必选）。
5. **生产护栏**：SslHandler 必须放 Pipeline 最前；发数据前等 handshakeFuture（channelActive ≠ 握手完成）；握手超时默认 10000ms、close_notify 超时 3000ms；私钥须 PKCS#8 格式；Session 缓存（sessionCacheSize/sessionTimeout）+ TLS 1.3（1-RTT）降握手开销。

## Structure（结构）

`SslContextBuilder`（证书/私钥/提供者/密码套件/会话缓存）→ 构建 `SslContext`（配置中心：isClient、SslProvider、SSLSessionContext、TrustManagerFactory、ALPN 列表）→ `newHandler(allocator)` 工厂方法 → `SslHandler`（内持 `SslEngine`，JDK SSLEngine 或 OpenSslEngine）→ 置于 Pipeline 最前。底层引擎可替换而上层代码不变（策略模式）。

## How It Works（运作方式）

入站：网络密文到达 → `decode()` → `unwrap()` 把 ByteBuf 转 `nioBuffer()` 喂 `SSLEngine.unwrap()` 循环解密，明文包装 ByteBuf 传播下游；握手中根据 HandshakeStatus 驱动握手状态机（NEED_TASK 异步跑委托任务、NEED_WRAP 发空 wrap 产生握手报文）。出站：`write()` 拦截 ByteBuf → 握手已完成则 `wrap()` 加密后经 `ctx.write()` 写 socket，未完成则排队等 handshakePromise 回调冲刷。TLS 握手报文时序（1.2 RSA 形态）：ClientHello → ServerHello/Certificate/ServerHelloDone → ClientKeyExchange/ChangeCipherSpec/Finished → ChangeCipherSpec/Finished，此后全量加密。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-channel-pipeline]]：SslHandler 入站/出站双职责依赖 Pipeline 的双向事件传播；「必须放最前」是责任链顺序约束的典型。
- [[netty-connection-lifecycle]]：handshakePromise 与 connect/bind/close 的 Promise-Future 异步体系同源。
- [[netty-websocket-upgrade]]：另一协议栈扩展机制——WebSocket 升级是握手后热插拔替换 Handler，SSL 是握手不改变 Pipeline 结构的常驻 Handler；WSS 为两者叠加。
- [[netty-idlestate-heartbeat]]：同属长连接生产护栏（加密保活组合拳）。

### Dependencies（依赖项）

- JDK `SSLEngine`（状态机与加解密原语）；OpenSSL 提供者额外依赖 netty-tcnative 原生库。

### Distinctions（区分）

- 与 [[netty-websocket-upgrade]] 的不同：后者握手成功后改写 Pipeline（移除 HTTP 编解码器），本概念握手前后 Pipeline 结构不变、SslHandler 常驻只切换内部状态。

## Evolution（演进）

- 2026-10-29：随教程第 22 篇建立（单信源）。

## Open Questions（开放问题）

- TLS 1.3 握手（1-RTT/0-RTT）在 SslHandler 状态机上的具体差异，信源未展开。
- OpenSSL 引擎相对 JDK 的量化性能差距（吞吐/延迟基准），信源只有经验断言无数据。
- 信源未覆盖 Session Ticket、双向 TLS（mTLS 客户端证书校验）等进阶配置。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-22-ssl-tls.md`（单一自媒体教程信源；源码为简化注解片段，同系列前文标注 Netty 4.1.x）

## Related Knowledge（相关知识）

- [[netty-22-ssl-tls]]（信源页）
- [[netty-21-websocket]]（信源页：同系列前篇，WSS 的 WebSocket 半层）
- [[netty]]（实体页）
