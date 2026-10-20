---
id: 2026-10-20-netty-three-skills-high-performance
title: 为什么几个线程就能扛住上万连接？Netty【三大技能】主力高性能场景
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/wZ5L22_CHLj9mEFe5Rz5kw
source_type: link
platform: 微信
created: 2026-10-20
category: 技术
tags: [Java, 工程实践]
asset_ref: Assets/2026/10/netty-three-skills-high-performance.md
wiki_status: pending
---

# Netty 三大技能：少量线程 + 零拷贝 + 无锁串行化

> Netty 高性能 = 主从 Reactor 摊薄"等 IO"成本 + 堆外内存/零拷贝砍掉"搬数据"成本 + Channel 终身绑定 EventLoop 消掉"抢锁"成本。文章算清 BIO 万连接成本账（线程栈 10GB），拆 EventLoop 三段循环、ByteBuf 引用计数与内存池、零拷贝三层含义（OS sendfile / JVM 堆外 / 应用层组合切片），覆盖 Selector 空轮询自愈（阈值 512）、粘包拆包、原生 epoll ET/LT，附参数调优清单与 4.0/4.1/4.2 版本分水岭（4.2 默认自适应分配器、EventLoopGroup 与传输解耦、io_uring 毕业）。

## 核心要点

- **主从 Reactor**：boss 只 accept（1 线程够），worker 默认 CPU×2；Channel 终身绑定一个 EventLoop → 同连接回调全串行 → 无锁；代价是一个 EventLoop 被堵则其上千连接全堵
- **红线**：EventLoop 里禁止阻塞调用（同步 RPC/JDBC），生产事故第一根因；解法优先级：异步化 > 挂业务线程池（注意 per-channel 状态进 `Channel.attr()`）
- **ByteBuf**：读写双指针免 flip、自动扩容、CompositeByteBuf 逻辑组合；引用计数手动 release 是泄漏头号来源；分配器版本线 4.0 非池化 → 4.1 pooled → 4.2 adaptive
- **零拷贝三层**：OS 层 sendfile（TLS 下失效）、JVM 层堆外内存（省堆内→堆外拷贝）、应用层 CompositeByteBuf/slice（省合并）
- **高频战场**：JDK epoll 空轮询 bug 由 Netty 检测重建 Selector 兜底；粘包拆包首选 LengthFieldBasedFrameDecoder（5 参数）；原生 epoll 默认 ET，需一次读到 EAGAIN
- **版本线**：4.1 只收 bugfix，4.2 是新特性所在（2025-04 GA），5.x 已停；升级先查上层框架 BOM 绑定的 Netty 版本

## 正文

全文（含代码示例与参数清单，已重排代码块/表格）见 [[Assets/2026/10/netty-three-skills-high-performance]]。

## 来源

[为什么几个线程就能扛住上万连接？Netty【三大技能】主力高性能场景](https://mp.weixin.qq.com/s/wZ5L22_CHLj9mEFe5Rz5kw)

## 附件

- [[Assets/2026/10/netty-three-skills-high-performance]]
