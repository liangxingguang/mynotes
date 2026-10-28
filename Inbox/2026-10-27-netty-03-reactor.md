---
id: 2026-10-27-netty-03-reactor
title: Netty源码分析(3) — Reactor线程模型：从单线程到主从多Reactor
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483912&idx=1&sn=5d9fc79cadf73e9107cdf88aada49f7b&chksm=fe6ca352c91b2a4453519a17764104363a6b4f46847dfa40829199be08e3a2a05e1daa515182#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-03-reactor.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-28T11:05:49.633Z"
ingest_claim_id: 11904-1793185549633-0
---

# Netty源码分析(3) — Reactor线程模型：从单线程到主从多Reactor

> 深入 Netty 的 Reactor 线程模型：从单线程、多线程到主从多 Reactor 三种形态，剖析 NioEventLoop 的 run() 死循环、EventLoopGroup 的 chooser 分配算法，以及 boss 与 worker 通过 ServerBootstrapAcceptor 衔接的完整链路，附可运行示例与常见坑。

## 核心要点

- Reactor 模式核心是事件分发：多路复用 + 非阻塞 IO，Netty 落地为单线程/多线程/主从多 Reactor 三层模型
- 一个 NioEventLoop = Selector + 任务队列 + 一个不死线程，run() 循环中依次做 select 等待、IO 事件处理、异步任务执行
- EventLoopGroup 是 EventLoop 池子，next() 用 Round-Robin 分配，2 的幂时用位运算代替取模提性能
- boss accept 新连接后由 ServerBootstrapAcceptor 将 Channel 注册到 worker 的 EventLoop，之后该 Channel 的 IO 全由该线程处理
- 同一 Channel 的所有操作都在同一 EventLoop 线程执行（线程绑定），跨线程调用统一封装为任务入队，实现串行化无锁
- 常见坑：Handler 里做耗时操作会卡住整个 EventLoop（应甩给 DefaultEventExecutorGroup）；Netty 用 selectCnt 计数 + 重建 Selector 自愈 JDK 空轮询 BUG

## 正文

正文约 9200 字符，完整整理稿见附件 [[Assets/2026/10/netty-03-reactor.md]]，含 NioEventLoop.run、EventLoopGroup 注册/chooser、ServerBootstrapAcceptor 源码剖析及完整可运行示例与选型建议。

## 来源

[Netty源码分析(3) — Reactor线程模型：从单线程到主从多Reactor](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483912&idx=1&sn=5d9fc79cadf73e9107cdf88aada49f7b&chksm=fe6ca352c91b2a4453519a17764104363a6b4f46847dfa40829199be08e3a2a05e1daa515182#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-03-reactor.md]]（抓取正文整理稿，browser 级抓取）
