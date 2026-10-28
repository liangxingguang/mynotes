---
id: 2026-10-27-netty-24-epoll-native
title: Netty源码分析(24) — EpollEventLoop 与 Native Transport
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484613&idx=1&sn=a220017004e50b20b8925ff0dd000a06&chksm=fe6ca59fc91b2c89846b22c2c447abdd98a192ef19deec3017ed9c4f205d3d4c6d7a741beb1c#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-24-epoll-native.md
wiki_status: ingested
---

# Netty源码分析(24) — EpollEventLoop 与 Native Transport

> 剖析 Netty 的 native 传输层：EpollEventLoop 绕过 JDK Selector 直接调用 Linux epoll 系统调用，结合 eventfd/timerfd 实现高效唤醒与定时，是 Netty 性能的"杀手锏"。

## 核心要点

- JDK Selector 的历史包袱：selected keys 拷贝带来 GC 压力、不支持边缘触发、JNI 封装开销、不暴露 SO_REUSEPORT/TCP_FASTOPEN 等高级选项
- EpollEventLoop 持三个 native fd：epollFd（epoll 实例）、eventFd（唤醒，优于 Pipe 方案）、timerFd（纳秒级精确定时）
- run() 结构与 NioEventLoop 相似，但 epollWait 直接调 epoll_wait 系统调用，事件在 native 层栈上分配零 GC；processReady 直接按 fd 映射 Channel，无 selectedKeys 遍历
- 边缘触发（ET）事件只通知一次，必须循环读到 EAGAIN；水平触发（LT）读不完下次还会通知
- 简易压测对比 NIO：延迟降 33-45%，吞吐升 38%，GC 暂停降 38%
- 使用前提：仅 Linux 可用，需 netty-transport-native-epoll 依赖（带 classifier），生产必须保留 NIO/KQueue 回退；Netty 5 正推 io_uring

## 正文

正文约 14000 字符，完整整理稿见附件 [[Assets/2026/10/netty-24-epoll-native.md]]，含 EpollEventLoop 源码解析（run/epollWait/processReady）、native C 代码、ET/LT 详解与完整 Epoll 回声 Server/Client 示例。

## 来源

[Netty源码分析(24) — EpollEventLoop 与 Native Transport](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484613&idx=1&sn=a220017004e50b20b8925ff0dd000a06&chksm=fe6ca59fc91b2c89846b22c2c447abdd98a192ef19deec3017ed9c4f205d3d4c6d7a741beb1c#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-24-epoll-native.md]]（抓取正文整理稿，browser 级抓取）
