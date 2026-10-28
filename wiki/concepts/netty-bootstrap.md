---
id: wiki-concept-netty-bootstrap
type: concept
title: Netty Bootstrap 启动引导（initAndRegister 三件套与 ServerBootstrapAcceptor）
status: active
created: 2026-10-28
updated: 2026-10-29
confidence: high
tags:
  - concept
  - java
  - netty
  - network
sources:
  - raw/sources/architecture/2026-10-27-netty-08-bootstrap.md
  - raw/sources/architecture/2026-10-27-netty-01-intro.md
  - raw/sources/architecture/2026-10-27-netty-03-reactor.md
related:
  - wiki/entities/netty.md
  - wiki/concepts/reactor-thread-model.md
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/concepts/netty-connection-lifecycle.md
---
# Netty Bootstrap 启动引导（initAndRegister 三件套与 ServerBootstrapAcceptor）

## Definition（定义）

Netty 的启动入口机制：客户端 `Bootstrap.connect()` 与服务端 `ServerBootstrap.bind()` 共用同一条 `AbstractBootstrap.initAndRegister()` 主链路——**反射创建 Channel → init() 组装 Pipeline → 注册到 EventLoop 的 Selector**，随后异步完成 connect/bind；服务端另有灵魂组件 `ServerBootstrapAcceptor`，在 boss 侧接受新连接后挂 childHandler 并 `childGroup.register(child)` 移交 worker 线程池。

## Why It Matters（为什么重要）

启动链路是"用户写下的 `bind(8080)` 那行代码"与 [[reactor-thread-model]] 运行时之间的全部桥梁：Channel 何时创建、handler 何时进 Pipeline、Channel 何时绑上 EventLoop、新连接如何流到 worker——全在这段路径上。不理解它，"不要在 bind 完成前操作 Channel""handler 和 childHandler 的区别"等生产纪律就只是口诀。

## Core Characteristics（核心特征）

1. 三件套主链路：`channelFactory.newChannel()`（ReflectiveChannelFactory 反射调无参构造）→ `init(channel)`（options/attrs + Pipeline 组装）→ `group().register(channel)`；注册未完成时挂 PendingRegistrationPromise 监听器，完成后回调 doConnect/doBind0。
2. interestOps 不对称设计：客户端注册时 `register(selector, 0, this)` 不关注任何事件，connect 未立即成功才改 OP_CONNECT；服务端 NioServerSocketChannel 构造即记录 OP_ACCEPT，bind 成功后 doBeginRead() 生效。
3. 全程跨线程异步化：register/doBind0 均经 `eventLoop.inEventLoop()` 判断，非 EventLoop 线程一律封装任务投递到 EventLoop 队列执行——保证 Channel 所有操作同线程串行（与 [[netty-eventloop]] 的无锁串行化一脉相承）。
4. 服务端双流水线：ServerBootstrap.init() 给 ServerSocketChannel 尾插 ChannelInitializer，其中**异步** addLast ServerBootstrapAcceptor（持有 childGroup/childHandler/childOptions/childAttrs 快照）。
5. ServerBootstrapAcceptor.channelRead 三步：msg 即新 NioSocketChannel → 挂 childHandler + 设 child options/attrs → `childGroup.register(child)` 移交 worker，失败 forceClose。

## Structure（结构）

```text
AbstractBootstrap
  ├─ Bootstrap（客户端/无连接协议）
  │    ├─ init(): options/attrs + pipeline.addLast(用户 handler)
  │    └─ connect() → doResolveAndConnect → initAndRegister + doConnect(OP_CONNECT)
  └─ ServerBootstrap（服务端）
       ├─ init(): options/attrs + ChannelInitializer
       │    └─ 异步 addLast(ServerBootstrapAcceptor)
       ├─ bind() → doBind → initAndRegister + doBind0(JDK bind + backlog)
       └─ ServerBootstrapAcceptor.channelRead: childHandler + childGroup.register(child)
```

## How It Works（运作方式）

客户端：`connect()` 校验参数后 `initAndRegister()`；NioSocketChannel 无参构造经 `SelectorProvider.openSocketChannel()` 拿到 JDK 非阻塞 SocketChannel；init() 把用户 handler 加入 Pipeline 末尾；register 经 `MultithreadEventLoopGroup.next()` chooser 选一个 EventLoop，异步 register0 内以 interestOps=0 绑上 Selector；随后 doConnect 调 JDK `SocketChannel.connect()`，未立即成功则关注 OP_CONNECT 等 Selector 通知。

服务端：`bind()` 同样先 `initAndRegister()`（NioServerSocketChannel 构造记录 OP_ACCEPT），doBind0 整体作为 EventLoop 任务执行 `javaChannel().bind(addr, backlog)`，绑定成功触发 channelActive 并由 doBeginRead() 把 OP_ACCEPT 写入 interestOps，此后 boss 的 Selector 开始接收新连接，经 NioMessageUnsafe.read() 触发 Pipeline 入站事件到达 ServerBootstrapAcceptor。

## Relationships（关系）

### Related Concepts（相关概念）

- [[reactor-thread-model]]：本概念是该模型的**装配层**（part-of）——模型页讲 Boss/Worker 分工结论，本页讲分工如何通过 Acceptor 在启动时被装配出来。
- [[netty-eventloop]]：register 的 chooser 分配与跨线程异步化在该页有 run()/wakeup 级剖析；启动链路是 EventLoop 任务队列的第一批客户。
- [[netty-channel-pipeline]]：init() 与 Acceptor 都是 Pipeline 的 handler 装配者；Acceptor 本身是一个 ChannelInboundHandlerAdapter。

### Dependencies（依赖项）

- JDK NIO：SelectorProvider / SocketChannel / ServerSocketChannel 非阻塞 API。
- ReflectiveChannelFactory 要求 Channel 类有无参构造（`b.channel(NioSocketChannel.class)` 的隐含约束）。

### Distinctions（区分）

- `handler()` vs `childHandler()`：前者加到 boss 的 ServerSocketChannel Pipeline（很少用），后者由 Acceptor 加到每个新连接——绝大多数场景只需 childHandler。
- Bootstrap 实例可重用（多次 connect），ServerBootstrap 的 child 配置在 init() 时被快照进 Acceptor。

## Evolution（演进）

教程开篇（netty-01）先给出 `bind() → initAndRegister() → doBind0()` 的路径轮廓；线程模型篇（netty-03）从架构侧补全 ServerBootstrapAcceptor 的 boss→worker 移交链路；本篇（netty-08）把整条链路落到类与方法级源码（三件套、interestOps 不对称、Acceptor 字段快照与异步 addLast），三者一致互证。

## Open Questions（开放问题）

- doResolveAndConnect0 的异步 DNS 解析路径（AddressResolver）信源仅点名未展开。
- Epoll 传输下启动链路的差异（EpollEventLoopGroup/EpollSocketChannel）本库暂无信源。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-08-bootstrap.md`（源码级主信源：三件套/interestOps/Acceptor/doBind0 逐方法剖析）
- Source: `raw/sources/architecture/2026-10-27-netty-01-intro.md`（路径轮廓：bind() → initAndRegister → doBind0）
- Source: `raw/sources/architecture/2026-10-27-netty-03-reactor.md`（Acceptor 移交链路的架构侧表述）

## Related Knowledge（相关知识）

- [[netty-08-bootstrap]]（信源页）
- [[netty]]（实体页）
