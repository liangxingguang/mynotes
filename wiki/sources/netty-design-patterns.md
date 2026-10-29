---
id: wiki-source-netty-design-patterns
type: source
title: Netty源码分析(番外篇7) — Netty中的设计模式：23种经典模式的工程实践
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - source
  - netty
  - java
  - design-patterns
sources:
  - raw/sources/architecture/2026-10-27-netty-design-patterns.md
---
# Netty源码分析(番外篇7) — Netty中的设计模式：23种经典模式的工程实践

## Overview（概览）

微信公众号 Netty 源码分析系列番外篇 7。视角从"组件"切换到"骨架"：逐一剖析模板方法、责任链、工厂方法、观察者、命令、装饰器、单例、适配器、策略、建造者十大模式在 Netty 源码中的具体落点（含代码注解），并给出 16 种模式的全景对照表。定位是"源码视角的模式识别"，而非设计模式教科书。

## Key Facts（关键事实）

- 模板方法：`SimpleChannelInboundHandler.channelRead` 封装类型匹配 → `channelRead0` 业务回调 → 不匹配透传 → finally 自动 `ReferenceCountUtil.release` 四步骨架，用户只写 `channelRead0` 无须管内存释放；`ChannelHandlerAdapter.isSharable()` 经反射查 `@Sharable` 注解决定实例共享策略。
- 责任链：`DefaultChannelPipeline` 为 `AbstractChannelHandlerContext` 双向链表 + Head/Tail 哨兵，入站从头到尾、出站从尾到头，运行时可动态增删 Handler（如 `SslHandler` 握手完成后自删）。
- 工厂方法：`ReflectiveChannelFactory` 缓存构造器反射建 Channel，`Bootstrap.channel(NioServerSocketChannel.class)` 借此与具体 Transport 解耦，可平滑切 Epoll。
- 观察者：全异步 IO 只返回 `ChannelFuture`，靠 `addListener` 注册回调拿结果；`DefaultPromise` 监听器懒加载、addListener 时已完成立即通知防丢失、非 EventLoop 线程提交回 Loop 通知。
- 命令：`writeAndFlush` 封装 `WriteTask`、定时任务封装 `ScheduledFutureTask`，统一入 `SingleThreadEventExecutor` 的 `taskQueue`——NioEventLoop 借此既是 IO 线程又是任务执行器。
- 装饰器：`WrappedByteBuf` 基类全方法委托被包装对象，子类 `SimpleLeakAwareByteBuf`/`AdvancedLeakAwareByteBuf`（泄漏检测）、`DuplicatedByteBuf`（内存视图）、`SwappedByteBuf`（字节序）做正交增强，避免继承爆炸。
- 单例：只有完全无状态的 Handler 才标 `@Sharable` 做 `INSTANCE` 单例（如 `MqttEncoder`）；有状态 Handler 共享会出并发问题。
- 策略：`EventExecutorChooser` 按线程数是否 2 的幂分派位运算（`idx & (len-1)`）或取模实现，一次 `isPowerOfTwo` 判断换全链路每次分发少一次取模。
- 建造者：`ServerBootstrap` 链式 Fluent API；服务端/客户端 Bootstrap 分离避免"万能配置类"。
- 全景表 16 模式另含：代理（HeadContext 隐藏底层 IO）、组合/迭代器（CompositeByteBuf）、状态（SslHandler 握手状态机）、享元（PooledByteBuf 池化复用）、中介者（Pipeline 协调各 Handler）。

## Important Claims（重要论断）

### Netty 的设计哲学是"该抽象的地方大胆抽象，该优化的地方极致优化"

模式不是炫技而是问题导向：解耦请求处理 → 责任链；管理异步结果 → 观察者；支持多 Transport → 工厂方法；复用无状态 Handler → 单例；统一任务调度 → 命令（信源论点）。

### 策略模式的 chooser 优化是"一次判断换全链路提速"的典型

NioEventLoopGroup 默认 CPU×2（16/32 等 2 的幂常见），位运算替代取模在高并发分发路径上累积收益可观（信源论点，与本库 [[netty-eventloop]] 的 chooser 机制互证）。

## Concepts Introduced（引入的概念）

- [[design-patterns-in-netty]]（新建概念页：模式全景与本库既有机制概念页的映射）

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

- 本篇是本库既有 Netty 概念页的"模式视角索引"：责任链→[[netty-channel-pipeline]]、观察者→[[netty-channelfuture]]、命令→[[netty-write-flush]]/[[netty-eventloop]]、装饰器/享元→[[netty-bytebuf]]/[[netty-pooled-allocator]]、策略→[[netty-eventloop]]、建造者+工厂方法→[[netty-bootstrap]]、状态→[[netty-ssl-tls]]——既有源码级结论全部获得同系列番外的模式化复述印证。
- "谁最后消费谁 release"铁律在模板方法视角下获得新解释：SimpleChannelInboundHandler 把释放责任收编进骨架，是该纪律的 API 化（解读）。

## Limitations（局限）

- 单一自媒体教程信源；文中代码为教学化简化注解（如 DefaultPromise 片段省略了大量细节），精确实现以本库 27/28 篇源码级信源页为准。
- "23 种经典模式"为标题口径，正文实讲 10 种 + 全景表列 16 种，其余模式未展开。

## Related Knowledge（相关知识）

- [[design-patterns-in-netty]]（概念页）
- [[netty]]（实体页）
- [[netty-30-rpc-framework]]（同系列收官实战篇）
- [[netty-4-to-5]]（同系列番外篇6）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-design-patterns.md`
