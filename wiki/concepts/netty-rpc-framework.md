---
id: wiki-concept-netty-rpc-framework
type: concept
title: 基于 Netty 的轻量级 RPC 框架实现模式
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - concept
  - netty
  - rpc
sources:
  - raw/sources/architecture/2026-10-27-netty-30-rpc-framework.md
related:
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/concepts/netty-channelfuture.md
  - wiki/concepts/netty-reconnect.md
  - wiki/entities/netty.md
---
# 基于 Netty 的轻量级 RPC 框架实现模式

## Definition（定义）

用 Netty 作传输底座实现 RPC（远程过程调用）的最小完整模式：客户端 JDK 动态代理把接口调用透明转为网络请求，服务端反射调用本地实现，中间靠自定义协议 + 序列化 + 长度域编解码跑在 Netty Pipeline 上。Dubbo、gRPC 的底层通信原理与其一致，差距在工程化能力。

## Why It Matters（为什么重要）

RPC 是 Netty 最典型的落地场景（Dubbo/gRPC/Thrift/Feign 底层多为 Netty）；理解这 ~300 行的最小实现，等于拿到阅读主流 RPC 框架源码的骨架地图（信源论点）。

## Core Characteristics（核心特征）

1. **协议信封**：RpcRequest（requestId/接口名/方法名/参数类型/参数值）+ RpcResponse（requestId/Throwable error/result）——requestId 关联异步请求与响应，异常必须随响应回传客户端重抛。
2. **长度域编解码拆粘包**：前 4 字节 int 存长度；解码继承 ByteToMessageDecoder，数据不全时 markReaderIndex/resetReaderIndex 回滚读指针等下次 read。
3. **JDK 动态代理透明化**：InvocationHandler 内构建请求、发网络调用、返回结果，调用方无感知。
4. **异步转同步桥**：`ConcurrentHashMap<requestId, RpcFuture>` 登记等待中的请求，RpcFuture 内部 CountDownLatch 阻塞等待（带超时），响应到达由 Handler 按 requestId 找回并唤醒。
5. **服务端注册+反射**：ServiceRegistry（Map 模拟注册中心）按接口名找实现，反射 method.invoke 执行，异常包装进响应。

## How It Works（运作方式）

调用链：proxy.invoke → 构建 RpcRequest（UUID requestId）→ pendingRequests 登记 RpcFuture → writeAndFlush（Encoder 序列化+长度前缀）→ TCP → 服务端 Decoder 拆包 → RpcServerHandler 反射调用 → RpcResponse 回传 → 客户端 RpcClientHandler 按 requestId 唤醒 Future → 返回结果/重抛异常。全程复用 Netty 的 Reactor 线程模型与 Pipeline 责任链。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-channel-pipeline]]：编解码器链即责任链模式的落地
- [[netty-channelfuture]]：RpcFuture 是 Promise 模式的应用层简化版（CountDownLatch 替代 DefaultPromise 的 CAS 状态机）
- [[netty-reconnect]]：生产化时客户端断线重连的直接参照

### Dependencies（依赖项）

- Netty 传输（EventLoop + Pipeline + ByteBuf）；序列化器（JSON/Hessian/Protobuf，策略模式可插拔）

### Distinctions（区分）

- 与 Dubbo 的区别：教学实现缺服务发现、负载均衡、连接池、集群容错、高性能序列化（JSON vs Hessian2 差 5-10 倍，信源口径）、优雅降级、SPI、限流熔断八项工程化能力；核心通信原理一致。
- 与 HTTP 调用的区别：私有二进制协议 + 长连接 + 多路复用（requestId 关联），而非短连接文本协议（解读）。

## Evolution（演进）

- 2026-10-29：随系列第 30 篇（收官实战篇）建立（单信源）。

## Open Questions（开放问题）

- 信源未覆盖真实注册中心（ZK/Nacos）接入与多连接池的具体实现，仅指方向。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-30-rpc-framework.md`（单一自媒体教程信源；性能数值为作者经验口径）

## Related Knowledge（相关知识）

- [[netty-30-rpc-framework]]（信源页）
- [[netty]]（实体页）
