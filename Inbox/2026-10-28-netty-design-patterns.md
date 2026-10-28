---
id: 2026-10-28-netty-design-patterns
title: Netty中的设计模式：23种经典模式的工程实践
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/NppUlQruRzWXcpvtd1_c_w
source_type: link
platform: wechat
created: 2026-10-28
category: 技术
tags: [netty, Java, 工程实践]
asset_ref: Assets/2026/10/netty-design-patterns.md
wiki_status: pending
---

# Netty中的设计模式：23种经典模式的工程实践

> Netty 源码分析番外篇：从源码视角识别 Netty 中散落的设计模式——模板方法（ChannelHandler 骨架）、责任链（Pipeline 双向链表）、观察者（ChannelFuture 异步回调）、装饰器（ByteBuf 功能增强）、策略（EventExecutorChooser 位运算优化）等 16 种模式的工程化运用，附全景对照表。

## 核心要点

- **模板方法**（Netty 骨架）：`SimpleChannelInboundHandler.channelRead` 定义"类型匹配→业务处理→自动释放 ByteBuf"骨架，子类只需实现 `channelRead0`，不用操心内存管理。
- **责任链**（Pipeline 本质）：双向链表 + 头尾哨兵；入站从头到尾、出站从尾到头；handler 有"选择权"（如 SslHandler 握手前拦截），运行时动态增删。
- **观察者**：所有 IO 异步返回 ChannelFuture，靠 addListener 等结果；DefaultPromise 注册时若已完成立即通知防错过。
- **命令模式**：Runnable 统一封装 IO 事件与普通任务，NioEventLoop 因此既是 IO 线程又是任务执行器。
- **装饰器**：WrappedByteBuf 委派全部方法，子类正交增强（泄漏检测/字节序/内存视图），避免继承类树爆炸。
- **策略模式亮点**：EventExecutorChooser 按 2 的幂次选位运算 `idx & (len-1)` 否则取模——一次 `isPowerOfTwo` 判断换每次分发省一次取模。
- **使用纪律**：只有完全无状态的 Handler 才能加 `@Sharable` 做单例；服务端/客户端 Bootstrap 分开避免"万能配置类"。
- **全景**：模板方法/责任链/工厂方法/观察者/命令/装饰器/单例/适配器/策略/建造者/代理/组合/状态/享元/迭代器/中介者共 16 种在 Netty 中的落点对照表。
- **设计哲学**："该抽象的地方大胆抽象，该优化的地方极致优化"——模式是解决问题的自然结果，不是炫技。

## 正文

见 [[Assets/2026/10/netty-design-patterns.md]]（全文约 1.3 万字，含源码片段与模式全景表）。

## 来源

- [Netty中的设计模式：23种经典模式的工程实践](https://mp.weixin.qq.com/s/NppUlQruRzWXcpvtd1_c_w)

## 附件

- [[Assets/2026/10/netty-design-patterns.md]]
