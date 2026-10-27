---
id: 2026-10-27-netty-08-bootstrap
title: Netty源码分析(8) — Bootstrap 与 ServerBootstrap 启动流程源码
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484034&idx=1&sn=ebceba0b6e18e5922fcb5d368e17f189&chksm=fe6ca3d8c91b2ace786da5c8cb08bb537c07d6d3282702448623a91791349432a60d692ecd23#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-08-bootstrap.md
wiki_status: pending
---

# Netty源码分析(8) — Bootstrap 与 ServerBootstrap 启动流程源码

> 从源码层面拆解 Netty 客户端 Bootstrap.connect() 与服务端 ServerBootstrap.bind() 的完整启动链路：创建 Channel、初始化 Pipeline、注册到 Selector 三件套，以及 ServerBootstrapAcceptor 如何把新连接分发给 worker 线程池。

## 核心要点

- 启动核心是 `initAndRegister()` 三步走：反射创建 Channel（ReflectiveChannelFactory）→ init() 组装 Pipeline → 注册到 EventLoop 的 Selector。
- 客户端注册时 interestOps=0（暂不关注事件），connect 失败立即返回时改关注 OP_CONNECT；服务端 NioServerSocketChannel 构造即关注 OP_ACCEPT。
- 注册、bind 等操作通过 `eventLoop.inEventLoop()` 判断，非 EventLoop 线程一律封装成任务异步提交，保证线程安全。
- ServerBootstrap.init() 会向 ServerSocketChannel 的 Pipeline 异步加入 ServerBootstrapAcceptor，由它在新连接到达时挂 childHandler 并注册到 workerGroup。
- 常见坑：bind/connect 完成前不要操作 Channel；handler 作用于 boss 的 ServerSocketChannel，childHandler 才作用于每个新连接；bossGroup 一个线程即可。

## 正文

正文约 19000 字符，完整整理稿见附件 [[Assets/2026/10/netty-08-bootstrap.md]]，含逐段源码注解、启动流程 ASCII 图、可运行的 Echo 服务端/客户端示例及避坑清单。

## 来源

[Netty源码分析(8) — Bootstrap 与 ServerBootstrap 启动流程源码](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484034&idx=1&sn=ebceba0b6e18e5922fcb5d368e17f189&chksm=fe6ca3d8c91b2ace786da5c8cb08bb537c07d6d3282702448623a91791349432a60d692ecd23#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-08-bootstrap.md]]（抓取正文整理稿，browser 级抓取）
