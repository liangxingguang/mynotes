---
id: 2026-10-27-netty-17-idlestate-heartbeat
title: Netty源码分析(17) — IdleStateHandler 心跳机制源码
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484577&idx=1&sn=c5ebc90b7b92c621c66c2b7105bd622e&chksm=fe6ca5fbc91b2ced7ebcd8fe2c188d958496e7960cb32ca8cb73944ed85aa752b34aa8ed8140#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-17-idlestate-heartbeat.md
wiki_status: ingested
---

# Netty源码分析(17) — IdleStateHandler 心跳机制源码

> 深度解析 Netty IdleStateHandler 的源码实现：它通过 EventLoop 定时任务跟踪读/写/读写三个维度的空闲时间，超时后触发 IdleStateEvent 事件，配合下游 Handler 即可低成本实现心跳检测与死连接清理。

## 核心要点

- IdleStateHandler 是 ChannelDuplexHandler，配置读/写/全部三个空闲超时秒数（0 表示不检测），内部统一转纳秒用 System.nanoTime() 计时
- handlerAdded 时在 EventLoop 的 ScheduledExecutorService 上启动三个定时任务；任务未超时会精确计算剩余时间再调度，避免固定周期轮询浪费 CPU
- 通过拦截 channelRead/write 更新时间戳；写操作用 ChannelPromise Listener 在真正写入完成后才更新 lastWriteTime
- 超时后触发 IdleStateEvent（含 READER_IDLE/WRITER_IDLE/ALL_IDLE 与 isFirst 标记），经 fireUserEventTriggered 传播给下游 Handler 处理
- 注意点：三个超时时间应错开、Handler 建议放在编解码器之后、事件在 EventLoop 线程执行不要阻塞；10 万连接级实测 CPU 开销 <0.5%

## 正文

正文约 23000 字符，完整整理稿见附件 [[Assets/2026/10/netty-17-idlestate-heartbeat.md]]，含源码逐段解析、工作机制图示与服务端/客户端完整心跳示例代码。

## 来源

[Netty源码分析(17) — IdleStateHandler 心跳机制源码](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484577&idx=1&sn=c5ebc90b7b92c621c66c2b7105bd622e&chksm=fe6ca5fbc91b2ced7ebcd8fe2c188d958496e7960cb32ca8cb73944ed85aa752b34aa8ed8140#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-17-idlestate-heartbeat.md]]（抓取正文整理稿，browser 级抓取）
