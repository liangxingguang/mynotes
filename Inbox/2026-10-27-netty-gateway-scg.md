---
id: 2026-10-27-netty-gateway-scg
title: Netty源码分析(番外篇) — Spring Cloud Gateway 中的 Netty 应用解析
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484705&idx=1&sn=8e3ff2de8fd218f81921cbe72d23f75b&chksm=fe6ca47bc91b2d6dfd4dc5bad272f69b2312a73594f14f9ff0d71c1b745bf61c0bee3b8e9941#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, spring gateway]
asset_ref: Assets/2026/10/netty-gateway-scg.md
wiki_status: pending
---

# Netty源码分析(番外篇) — Spring Cloud Gateway 中的 Netty 应用解析

> 拆解 Spring Cloud Gateway 底层对 Netty 的使用：Reactor Netty 的 HttpClient 初始化、双 EventLoopGroup、GlobalFilter 链与 ChannelPipeline 的对应关系，并手写一个迷你网关串起路由匹配、转发、响应写回的完整流程。

## 核心要点

- Gateway 底层是 Reactor Netty，httpclient 配置（超时、连接池）本质是对 Netty Bootstrap 与 ChannelPool 的调参
- Gateway 有两套 EventLoopGroup：Server 侧接请求、Client 侧转发后端，本质是代理模式的 Reactor
- 路由 = Predicate + Filter + URI，Filter 链与 Netty 的 ChannelHandler 责任链异曲同工
- NettyRoutingFilter 发起请求、NettyWriteResponseFilter 写回响应，最终都落到 Channel.writeAndFlush()
- 连接池默认 elastic 无上限，生产建议 fixed + 限制 max-connections，避免 Too many open files
- 超时有三层：connect-timeout、response-timeout、单路由级覆盖；附手写 MiniGateway 完整代码示例

## 正文

正文约 13500 字符，完整整理稿见附件 [[Assets/2026/10/netty-gateway-scg.md]]，含 Reactor Netty 源码剖析、GlobalFilter 机制解读、迷你网关完整实现与踩坑指南。

## 来源

[Netty源码分析(番外篇) — Spring Cloud Gateway 中的 Netty 应用解析](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484705&idx=1&sn=8e3ff2de8fd218f81921cbe72d23f75b&chksm=fe6ca47bc91b2d6dfd4dc5bad272f69b2312a73594f14f9ff0d71c1b745bf61c0bee3b8e9941#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-gateway-scg.md]]（抓取正文整理稿，browser 级抓取）
