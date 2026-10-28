---
id: wiki-source-netty-08-bootstrap
type: source
title: Netty源码分析(8) — Bootstrap 与 ServerBootstrap 启动流程源码
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - netty
  - network
  - tutorial
sources:
  - raw/sources/architecture/2026-10-27-netty-08-bootstrap.md
related:
  - wiki/sources/netty-06-eventloop.md
  - wiki/sources/netty-04-channel-pipeline-handler.md
  - wiki/entities/netty.md
  - wiki/concepts/netty-bootstrap.md
  - wiki/concepts/reactor-thread-model.md
---
# Netty源码分析(8) — Bootstrap 与 ServerBootstrap 启动流程源码

## Overview（概览）

公众号「Java解忧杂货铺」Netty 源码分析系列第 8 篇。源码级拆解 Netty 两端启动链路：客户端 `Bootstrap.connect()` 与服务端 `ServerBootstrap.bind()` 共用的 `initAndRegister()` 三件套（反射创建 Channel → init() 组装 Pipeline → 注册到 EventLoop 的 Selector）、注册时 interestOps=0 与 NioServerSocketChannel 构造即关注 OP_ACCEPT 的差异、`doConnect`/`doBind0` 的异步落地，以及服务端灵魂组件 ServerBootstrapAcceptor 如何把新连接挂 childHandler 并移交 workerGroup。附完整可运行 Echo 服务端/客户端示例与五条避坑清单。文中源码基于 Netty 4.1.x。

## Key Facts（关键事实）

- 启动核心是 `AbstractBootstrap.initAndRegister()` 三步走：`channelFactory.newChannel()`（ReflectiveChannelFactory 反射调无参构造）→ `init(channel)`（设 options/attrs、组装 Pipeline）→ `config().group().register(channel)`（注册到 EventLoop 的 Selector）。
- NioSocketChannel 创建链：`NioSocketChannel()` → `SelectorProvider.openSocketChannel()` → JDK SocketChannel（非阻塞）→ 存入 AbstractNioByteChannel 的 `ch` 字段。
- 注册时 `javaChannel().register(selector, 0, this)`——**interestOps=0 不关注任何事件**，只为绑定 Channel 与 Selector；客户端在 `doConnect` 非阻塞连接未立即成功时才改关注 OP_CONNECT；服务端 NioServerSocketChannel 构造时即传入 `SelectionKey.OP_ACCEPT`。
- 线程安全纪律贯穿启动链路：`AbstractUnsafe.register()` 用 `eventLoop.inEventLoop()` 判断，非 EventLoop 线程把 register0() 异步投递到 EventLoop 任务队列；`doBind0()` 同样整体封装为 `channel.eventLoop().execute(...)` 任务，因为 bind 必须在注册完成后执行。
- ServerBootstrap.init() 往 ServerSocketChannel 的 Pipeline 尾插一个 ChannelInitializer，其 initChannel 里先加用户 handler（若有），再**异步** `pipeline.addLast(new ServerBootstrapAcceptor(childGroup, childHandler, childOptions, childAttrs))`。
- ServerBootstrapAcceptor.channelRead 收到新连接（msg 即 NioSocketChannel）后：挂 childHandler → setChannelOptions/setAttributes → `childGroup.register(child)` 移交 worker 线程池，失败 forceClose。
- 常见坑清单：bind/connect 完成前不得操作 Channel（须在 Listener 回调里写）；`handler()` 作用于 boss 的 ServerSocketChannel、`childHandler()` 作用于每个新连接；bossGroup 推荐 1 线程（默认 CPU×2 是浪费）；Bootstrap 实例可重用多次 connect。

## Important Claims（重要论断）

### Claim 1：启动本质是三件事
作者论断：Netty 启动流程本质 = 创建 Channel（反射建 NIO 桥梁）+ 初始化 Pipeline（组装 handler 链）+ 注册到 Selector（交给 Reactor 线程驱动）；搞懂三件套启动就不再是黑盒。

### Claim 2：bossGroup 一个线程即可
作者论断：boss 只负责 accept，一个线程完全够；默认 `availableProcessors() * 2` 对 bossGroup 是浪费。

## Concepts Introduced（引入的概念）

- [[netty-bootstrap]]

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

本篇把 [[reactor-thread-model]] 的"boss→worker 传送带 ServerBootstrapAcceptor"从链路描述落到类与方法级源码（Acceptor 字段构成、channelRead 三步、异步 addLast 时机），与该概念页五信源结论一致互证；同时补全 [[netty]] 实体页既有"启动源码路径"条目（此前仅到 doBind0 粒度）为完整三件套细节。interestOps=0→OP_CONNECT 与构造即 OP_ACCEPT 的不对称设计，解释了 [[netty-eventloop]] 中 processSelectedKeys 对 OP_CONNECT 优先处理的前因。

## Limitations（局限）

- 单一自媒体教程信源，源码解读基于 Netty 4.1.x；DNS 解析分支（doResolveAndConnect0 的异步 resolver 路径）仅点名未展开。
- 文中"服务端 NioServerSocketChannel 构造即关注 OP_ACCEPT"准确说是构造时记录 readInterestOp，真正生效在 bind 后 doBeginRead()——文中第五节已自行补全该链路，但表格化总结易误读为"注册时就监听"。
- 篇末预告"下一篇深入 NioEventLoop.run()"，与系列第 9 篇对应。

## Related Knowledge（相关知识）

- [[netty-06-eventloop]]（同系列第 6 篇：EventLoop 结构与 register 异步化，本篇 register 链路的前置）
- [[netty-04-channel-pipeline-handler]]（同系列第 4 篇：Pipeline 事件传播，Acceptor 即一个入站 Handler）
- [[netty-bootstrap]]（概念页）
- [[reactor-thread-model]]（架构视角的 Boss/Worker 模型概念页）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-08-bootstrap.md`
