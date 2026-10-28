---
id: wiki-concept-netty-epoll-native-transport
type: concept
title: Netty EpollEventLoop 与 Native Transport（绕过 JDK Selector 直调 epoll）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - concept
  - netty
  - epoll
  - linux
  - performance
sources:
  - raw/sources/architecture/2026-10-27-netty-24-epoll-native.md
related:
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/netty-bootstrap.md
  - wiki/concepts/netty-zero-copy.md
  - wiki/entities/netty.md
---
# Netty EpollEventLoop 与 Native Transport（绕过 JDK Selector 直调 epoll）

## Definition（定义）

Netty 的 Native Transport 是绕开 JDK NIO Selector 封装、经 JNI 直调操作系统 I/O 原语的传输层实现；Linux 上即 EpollEventLoop 体系——`EpollEventLoop extends SingleThreadEventLoop`，直接调 `epoll_wait`/`epoll_ctl`，并用 `eventfd`（唤醒）与 `timerfd`（定时）替代 NIO 的 Pipe wakeup 与毫秒级 timeout 传参。macOS 对应 KQueue 体系。

## Why It Matters（为什么重要）

JDK Selector 有历史包袱：selected keys 每次 select 后从内部 Set 拷贝（GC 压力）、不支持边缘触发、JNI 封装开销、不暴露 SO_REUSEPORT/TCP_FASTOPEN 等 Linux 高级选项。Native Transport 消除这些开销，是 Netty 在 Linux 生产环境的性能"杀手锏"，并解锁更多内核调优选项。

## Core Characteristics（核心特征）

1. **三 fd 结构**：epollFd（epoll 实例）+ eventFd（唤醒，单 fd 计数器，优于 Pipe 双 fd）+ timerFd（CLOCK_MONOTONIC，timespec 纳秒级精度，优于 epoll_wait 毫秒级 timeout 参数）。
2. **零 GC 事件获取**：native 层 `epoll_event` 数组栈上分配；事件编码进复用的 Java `long[]`（高 32 位 events、低 32 位 fd）。
3. **fd 直映射分发**：`processReady` 按 fd 查 `AbstractEpollChannel` 直接调 `epollInReady()`/`epollOutReady()`，无 selectedKeys 遍历与 Iterator。
4. **ET/LT 可选**：默认水平触发；`setEdgeTriggered(true)` 切边缘触发后事件只通知一次，`epollInReady` 以 do-while 循环读到 EAGAIN/`continueReading()` 为假。
5. **Linux 限定 + 回退纪律**：依赖 `netty-transport-native-epoll`（必须带 classifier，如 linux-x86_64）；生产须按 Epoll→KQueue→NIO 可用性回退（`Epoll.isAvailable()`），经 [[netty-bootstrap]] 的 channel class 切换落地。
6. **资源管理**：C 层资源 shutdown 不优雅会泄露 epoll_fd；引用计数+finalize() 兜底，仍须显式 shutdownGracefully()。

## Structure（结构）

`EpollEventLoopGroup`（默认线程数 CPU×2，与 NIO 口径一致）→ 每个 `EpollEventLoop` 持三 fd → Channel 注册经 `epoll_ctl(EPOLL_CTL_ADD)` 入监听集（native 层完成，不过 JDK）→ `epoll_wait` 阻塞等事件 → `processReady` 按 fd 分发。配套 Channel 体系：EpollServerSocketChannel/EpollSocketChannel + EpollChannelOption（TCP_FASTOPEN、SO_REUSEPORT 等）。

## How It Works（运作方式）

run() 骨架与 NioEventLoop 一致（算超时 → 等事件 → 处理 → 跑任务），但 I/O 原语全换：有任务时 timeout=0 非阻塞、有定时任务算 deadline、否则 -1 纯阻塞（超时交由 timerfd 触发）；唤醒由外部线程写 eventFd（8 字节计数 +1）使 epoll_wait 立即返回，processReady 读走即重置。边缘触发模式下读循环必须榨干内核缓冲，否则丢事件。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-eventloop]]：同一 EventLoop 抽象的两套实现——NioEventLoop 的 Selector/Pipe wakeup/selectedKeys 对应 EpollEventLoop 的 epoll_wait/eventfd/fd 直映射；run() 结构互证。
- [[netty-bootstrap]]：回退链经 bootstrap 的 channel class 与 group 类型切换实现；与既有 IoT 信源"epoll/nio 自适应 ServerBootstrap"互证。
- [[netty-zero-copy]]：信源口径 EpollEventLoop 对 sendfile（FileRegion）支持更好（机制未展开）。

### Dependencies（依赖项）

- Linux 内核 epoll/eventfd/timerfd 系统调用；netty-transport-native-epoll 原生库（JNI+C）。

### Distinctions（区分）

- 与 NioEventLoop（[[netty-eventloop]]）的不同：后者经 JDK Selector（LT 限定、selected keys 拷贝、无高级 socket 选项），本概念直调 epoll、ET 可选、暴露 Linux 专有选项，但牺牲跨平台性。
- 与 io_uring 的不同：io_uring（Linux 5.1+）用共享 ring buffer 免每轮系统调用，理论上限更高；信源称 epoll 组合多数场景已够用，io_uring 优势在磁盘 I/O 与高并发小包。

## Evolution（演进）

- 2026-10-29：随教程第 24 篇建立（单信源）。

## Open Questions（开放问题）

- **矛盾（未解决）**：信源称"Netty 5 正在推 io_uring"；本库既有口径（[[netty]] 实体页时间线）为 4.2（2025-04-03 GA）已将 io_uring 作为一级传输且 5.x 停止推进。当前倾向既有口径（成稿更近的综述信源），留待人工复核。
- 信源压测（延迟 -33~-45%、吞吐 +38%、GC -38%）为单环境简易测试，生产量化收益待受控基准验证。
- EpollEventLoop 对 sendfile "支持更好"的机制细节未展开。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-24-epoll-native.md`（单一自媒体教程信源；C 代码为作者简化版；压测为作者自述非受控数据）

## Related Knowledge（相关知识）

- [[netty-24-epoll-native]]（信源页）
- [[netty]]（实体页）
