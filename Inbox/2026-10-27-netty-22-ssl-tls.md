---
id: 2026-10-27-netty-22-ssl-tls
title: Netty源码分析(22) — Netty 的 SSL/TLS 支持
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484604&idx=1&sn=b5db4f8ded964cdc6fb8d34a62cf7cdc&chksm=fe6ca5e6c91b2cf0a7ac5a8d8de49946fbcfe692bd4cd7a9b87e62a62e66c8f1d2b7beb28d19#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-22-ssl-tls.md
wiki_status: pending
---

# Netty源码分析(22) — Netty 的 SSL/TLS 支持

> Netty 的 SSL/TLS 支持本质是对 JDK SSLEngine 的封装：SslHandler 通过 wrap()/unwrap() 在出站加密、入站解密，对 Pipeline 上下游完全透明；SslContext 作为工厂支持 JDK/OpenSSL 多提供者切换。

## 核心要点

- SslHandler 同时是入站解码器与出站拦截器：decode() 调 unwrap() 解密，write() 调 wrap() 加密，握手未完成时出站数据排队等待
- unwrap() 循环调用 SSLEngine.unwrap，处理 OK/BUFFER_UNDERFLOW/BUFFER_OVERFLOW/CLOSED 四种状态，NEED_TASK 握手任务异步执行不阻塞 IO 线程
- 握手全程异步：engine.beginHandshake() 后由 decode/wrap 自动响应 NEED_WRAP/NEED_UNWRAP 状态，通过 handshakeFuture() 监听完成事件
- SslContext 是配置中心与工厂，SslProvider 策略可切换 JDK/OpenSSL/BouncyCastle；OpenSSL（netty-tcnative）靠原生实现 + AES-NI 硬件加速，生产环境必选
- 常见坑：SslHandler 必须放 Pipeline 最前面；channelActive 时握手未必完成，发数据前要监听 handshakeFuture；启用 Session 复用 + TLS 1.3 显著降握手开销

## 正文

正文约 21000 字符，完整整理稿见附件 [[Assets/2026/10/netty-22-ssl-tls.md]]，含 unwrap/wrap 源码解析、TLS 握手时序图、OpenSSL 集成说明及服务端/客户端完整 SSL 通信示例与自签名证书生成命令。

## 来源

[Netty源码分析(22) — Netty 的 SSL/TLS 支持](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484604&idx=1&sn=b5db4f8ded964cdc6fb8d34a62cf7cdc&chksm=fe6ca5e6c91b2cf0a7ac5a8d8de49946fbcfe692bd4cd7a9b87e62a62e66c8f1d2b7beb28d19#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-22-ssl-tls.md]]（抓取正文整理稿，browser 级抓取）
