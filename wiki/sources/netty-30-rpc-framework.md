---
id: wiki-source-netty-30-rpc-framework
type: source
title: Netty源码分析(30) — 实战：基于Netty实现一个简单的RPC框架
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - source
  - netty
  - java
  - rpc
sources:
  - raw/sources/architecture/2026-10-27-netty-30-rpc-framework.md
---
# Netty源码分析(30) — 实战：基于Netty实现一个简单的RPC框架

## Overview（概览）

微信公众号 Netty 源码分析系列第 30 篇（最终篇）。约 300 行代码手写一个轻量级 RPC 框架：协议信封（RpcRequest/RpcResponse）、可插拔序列化（策略模式）、长度域编解码（mark/reset 拆粘包）、JDK 动态代理透明化调用、pendingRequests+RpcFuture 异步转同步、Map 模拟注册中心+反射调用的服务端，附完整可运行示例与生产化注意事项，并与 Dubbo 做八维差距对比。

## Key Facts（关键事实）

- 协议设计：RpcRequest 携带 requestId/接口名/方法名/参数类型数组/参数值；RpcResponse 携带 requestId + `Throwable error`——异常必须随响应回传由客户端重抛（作者称 Dubbo 同样处理）。
- 编解码：长度域编码（前 4 字节 int 存长度），解码继承 ByteToMessageDecoder，数据不全时 `markReaderIndex()`/`resetReaderIndex()` 回滚读指针等待下次 read——拆包标准手法。
- 客户端：JDK 动态代理 InvocationHandler 构建 RpcRequest → `ConcurrentHashMap<requestId, RpcFuture>` pendingRequests 登记 → writeAndFlush 异步发送 → `RpcFuture.get(5s)`（内部 CountDownLatch）阻塞等响应；RpcClientHandler 按 requestId 找回 Future 并 setResponse 唤醒。
- 服务端：ServiceRegistry 用 ConcurrentHashMap 模拟注册中心（生产应换 ZK/Nacos）；RpcServerHandler 反射 `method.invoke` 调用实现类，异常包装进 RpcResponse 返回；Boss 1 线程 + Worker 4 线程启动。
- 与 Dubbo 的八维差距（作者清单）：服务发现、负载均衡、连接池、超时重试/集群容错、序列化性能（JSON vs Hessian2/Kryo 差 5-10 倍）、优雅降级、SPI 扩展、限流熔断；核心通信原理一致。
- 性能优化表（作者经验）：序列化换 Hessian/Kryo 吞吐 +3-10 倍；业务逻辑移 BizExecutor 线程池；批量 write 后一次 flush；PooledByteBufAllocator 减 GC。

## Important Claims（重要论断）

### RPC 的核心通信原理与 300 行实现一致

Dubbo/gRPC 几十万行与教学版 300 行差在边界情况、性能、可用性的工程化打磨，底层通信原理（协议+序列化+编解码+代理+异步转同步）如出一辙——消化这 300 行再看 Dubbo 源码"轻松一大半"（作者经验论断）。

### 生产化的四个已知短板

JSON 丢泛型/循环引用栈溢出；反射比直调慢 1-2 个数量级（可用 MethodHandle/ASM/javassist 优化）；同步阻塞等待高并发占满线程池（应改 CompletableFuture 全异步）；单连接懒加载需补连接池与断线重连。

## Concepts Introduced（引入的概念）

- [[netty-rpc-framework]]（基于 Netty 的轻量级 RPC 框架实现模式）

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

- 串起全系列机制的实战落地：长度域拆包呼应 [[netty-channel-pipeline]] 与 HTTP 解码篇；RpcFuture 是 [[netty-channelfuture]] Promise 模式的应用层简化版（CountDownLatch 替代 CAS 状态机）；断线重连改进直接引用 [[netty-reconnect]] 方案。
- "requestId 关联异步请求响应"是单连接多路复用的最小实现，与 [[netty-http-decoder]] 的 HTTP/2 多路复用思想同源（解读）。

## Limitations（局限）

- 教学级实现：无真实注册中心/负载均衡/连接池；"性能差 5-10 倍""反射慢 1-2 个数量级"等为作者经验数值，无基准数据。
- 代码示例未给出完整 import 与依赖版本，需自行补全运行。

## Related Knowledge（相关知识）

- [[netty-rpc-framework]]
- [[netty-28-promise]]（Promise 写侧，RpcFuture 的正式版参照）
- [[netty-18-reconnect]]（连接管理改进方向）
- [[netty]]

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-30-rpc-framework.md`
