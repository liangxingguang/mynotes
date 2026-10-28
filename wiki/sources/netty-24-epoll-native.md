---
id: wiki-source-netty-24-epoll-native
type: source
title: Netty源码分析(24) — EpollEventLoop 与 Native Transport
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - source
  - java
  - netty
  - epoll
  - linux
  - tutorial
sources:
  - raw/sources/architecture/2026-10-27-netty-24-epoll-native.md
related:
  - wiki/sources/netty-23-zero-copy.md
  - wiki/sources/netty-25-flow-control.md
  - wiki/entities/netty.md
  - wiki/concepts/netty-epoll-native-transport.md
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/netty-bootstrap.md
---
# Netty源码分析(24) — EpollEventLoop 与 Native Transport

## Overview（概览）

公众号「Java解忧杂货铺」Netty 源码分析系列第 24 篇，承接第 23 篇（[[netty-23-zero-copy]]）。核心论点：Netty 性能的"杀手锏"是 native 传输层——EpollEventLoop 绕过 JDK Selector 封装，经 JNI 直调 Linux epoll 系统调用，配合 eventfd/timerfd 实现高效唤醒与纳秒级定时。附类层次/run()/epollWait(C 代码)/processReady 源码解析、ET/LT 触发模式详解、Epoll Echo Server/Client 完整示例、与 NIO 的简易压测对比及生产回退策略；篇尾预告第 25 篇（流量控制）。

## Key Facts（关键事实）

- JDK Selector 四大痛点（信源列举）：① 每次 select 从内部 Set 拷贝 selected keys → GC 压力；② 不支持边缘触发；③ JNI 封装层开销；④ 不暴露 SO_REUSEPORT/TCP_FASTOPEN（Linux 3.9+）等高级选项。
- `EpollEventLoop extends SingleThreadEventLoop`，持三个 native fd：`epollFd`（epoll 实例）、`eventFd`（唤醒）、`timerFd`（定时），均由 eventfd()/timerfd_create() 系统调用创建。
- run() 结构与 NioEventLoop 相似（计算超时→epollWait→processReady→runAllTasks），但 epollWait 直接调 `epoll_wait` 系统调用；native 层 `epoll_event` 数组栈上分配零 GC，事件编码进 Java `long[]`（高 32 位 events、低 32 位 data/fd）复用。
- `processReady` 无 selectedKeys 遍历/Iterator：按 fd 直接映射 `AbstractEpollChannel`，分发 `epollInReady()`/`epollOutReady()`。
- ET vs LT：边缘触发事件只通知一次，必须循环 read 到 EAGAIN（epollInReady 的 do-while 配合 `allocHandle.continueReading()`）；水平触发读不完下次还会通知。EpollEventLoop 默认 LT，可 `setEdgeTriggered(true)` 切换。
- eventfd 优于 NIO 的 Pipe wakeup：只占一个 fd（Pipe 需两个）、内核层面就是个计数器、读写原子；唤醒写 8 字节整数，processReady 中读走即重置。
- timerfd 价值：`epoll_wait` 的 timeout 参数精度只有毫秒级，timerfd 用 timespec 达纳秒级；epoll_wait 可纯阻塞、超时由内核 timerfd 触发。
- 简易压测（信源自述"不负责任"，4C8G、50 并发×10000 小包）：平均延迟 1.2→0.8ms（-33%）、P99 5.6→3.1ms（-45%）、吞吐 45000→62000 req/s（+38%）、GC 暂停 2.1→1.3ms（-38%）。
- 使用前提：仅 Linux；依赖 `netty-transport-native-epoll` 且必须带 classifier（如 linux-x86_64）；macOS 对应 netty-transport-native-kqueue；生产必须保留 Epoll→KQueue→NIO 三级回退（Epoll.isAvailable() 检查）。
- native transport 涉及 C 层资源，shutdown 不优雅会泄露 epoll_fd；Netty 以引用计数+finalize() 兜底，仍应显式 shutdownGracefully()。
- io_uring（Linux 5.1+）经共享 ring buffer 提交/获取结果、无需每轮系统调用，理论上限更高；信源称"Netty 5 正在推 io_uring"（与本库既有口径矛盾，见 Limitations）；epoll+Netty 在多数场景已够用，io_uring 优势在磁盘 I/O 与高并发小包。

## Important Claims（重要论断）

### Claim 1：Native Transport 是 Netty 性能"杀手锏"
作者论断：绕过 JDK Selector 的历史包袱（拷贝/GC/无 ET/高级选项缺失），直接 C 级 epoll——「服务器跑在 Linux 上，上 Epoll 就完事了」。

### Claim 2：eventfd/timerfd 是更优雅的 wakeup 与定时机制
作者论断：相比 Pipe 双 fd 与毫秒级 timeout 传参，eventfd 单 fd 计数器 + timerfd 纳秒级内核定时更轻量、更精确。

### Claim 3：生产必须保留回退链
作者论断（经验）：Epoll 仅 Linux 可用，非 Linux 环境直接报错，Epoll→KQueue→NIO 回退是生产纪律——与既有 IoT 信源"epoll/nio 自适应 ServerBootstrap"互证。

## Concepts Introduced（引入的概念）

- [[netty-epoll-native-transport]]

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

补齐 [[netty-eventloop]] 的传输层维度：NioEventLoop 的 Selector/wakeup(Pipe)/selectedKeys 三件套在 EpollEventLoop 中对应 epoll_wait/eventfd/fd 直映射，run() 骨架一致而 I/O 原语全换——同一抽象、两套实现。回退链经 [[netty-bootstrap]] 的 channel class 切换落地（EpollServerSocketChannel vs NioServerSocketChannel）。与 [[netty-23-zero-copy]] 互链：EpollEventLoop 对 sendfile 支持更好；GC 压力降低与 [[netty-pooled-allocator]] 的池化目标同源（减少分配）。

## Limitations（局限）

- 单一自媒体教程信源；C 代码为作者简化版（自述"核心逻辑对"）；未标明具体 Netty 版本（同系列前文为 4.1.x）。
- 压测数据为作者单环境简易测试（自述"不负责任"），非受控基准，仅作方向参考。
- **矛盾点（未解决）**：信源称"Netty 5 正在推 io_uring"；本库既有口径（[[netty]] 实体页时间线）为"4.2 于 2025-04-03 GA 且 io_uring 为一级传输、5.x 已停止推进"。信源优先级上既有口径来自成稿更近的综述信源，本篇为教程随口提及，当前倾向既有口径，留待人工复核。
- "Epoll 对 sendfile 支持更好"（第 23 篇口径）本篇未展开机制。

## Related Knowledge（相关知识）

- [[netty-23-zero-copy]]（同系列第 23 篇：零拷贝，预告本篇）
- [[netty-25-flow-control]]（同系列第 25 篇：本篇预告的流量控制续篇）
- [[netty-epoll-native-transport]]（概念页）
- [[netty-eventloop]]（NioEventLoop 对照）
- [[netty-bootstrap]]（channel class 回退切换）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-24-epoll-native.md`
