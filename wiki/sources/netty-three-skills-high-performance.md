---
id: wiki-source-netty-three-skills-high-performance
type: source
title: 为什么几个线程就能扛住上万连接？Netty 三大技能主力高性能场景
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - java
  - netty
  - network
sources:
  - raw/sources/architecture/2026-10-20-netty-three-skills-high-performance.md
related:
  - wiki/sources/tcp-retransmission-visualized.md
---
# 为什么几个线程就能扛住上万连接？Netty 三大技能主力高性能场景

## Overview（概览）

微信公众号长文：Netty 高性能=三件事叠加——少线程+多路复用摊薄"等 IO"成本（主从 Reactor）、堆外内存+零拷贝砍掉"搬数据"成本（ByteBuf+FileRegion）、无锁串行化消掉"抢锁"成本（Channel 终身绑定单 EventLoop）。覆盖 Selector 空轮询自愈、粘包拆包、原生 epoll ET/LT、调优清单与 4.0/4.1/4.2 版本分水岭。

## Key Facts（关键事实）

- BIO 万连接成本账：一万线程栈内存 ≈10 GB（-Xss 默认约 1 MB），瓶颈在"线程数×每线程资源"乘积而非 CPU——即 C10K 问题；出路是 IO 多路复用（select/poll/epoll；epoll 注册一次长期有效、只返回就绪集合 O(就绪数)）。
- 定位澄清：Netty 是"基于 IO 多路复用 + Reactor 的**异步事件驱动**框架"，不是 AIO（Linux AIO 不成熟；4.2 起 io_uring 才是一级传输模块的方向）。
- 主从 Reactor：boss 只 accept（1 线程足够）；worker 默认 CPU×2；绑定关系"多对一"——一个 EventLoop 管成千上万 Channel，一个 Channel 终身只绑一个 EventLoop，换来无锁串行化；真正上限是 fd 数与内存。
- EventLoop 三段循环：select（超时由最早到期定时任务反推）→ processSelectedKeys → runAllTasks（ioRatio 默认 50）；普通任务队列为 MPSC。
- 生产事故第一根因：EventLoop 里做阻塞调用——一个线程被拖住，其管的所有连接一起拖住；解法按侵入性：异步化回调 > handler 挂 DefaultEventExecutorGroup（注意切出即失无锁串行化收益，per-channel 状态放 Channel.attr()）。
- Selector 空轮询自愈：针对 JDK epoll bug（JDK-6403933 等），连续空轮询 512 次（可调）且 select 超时≥1 秒则 rebuildSelector（新建→重注册→关旧），对业务无感。
- ByteBuf：读写双指针（[0,readerIndex) 已读/[readerIndex,writerIndex) 可读/[writerIndex,capacity) 可写）；引用计数是泄漏头号来源——SimpleChannelInboundHandler 自动 release，ChannelInboundHandlerAdapter 必须手动 finally release；内存池抄 jemalloc（Arena→Chunk 16MB→Page→SubPage + PoolThreadCache）。
- 零拷贝三层：OS 层 sendfile（DefaultFileRegion/transferTo，走 TLS 即失效）；JVM 层堆外 DirectByteBuf（省堆内→堆外拷贝）；应用层 CompositeByteBuf/slice/wrappedBuffer；另有 gathering write（writev）独立路径。
- 粘包拆包：TCP 是字节流不保消息边界；LengthFieldBasedFrameDecoder 五参数为协议设计默认选择（RPC/Dubbo/RocketMQ）；maxFrameLength 防长度字段被改大致 OOM。
- 原生 epoll 纠偏：Netty 默认走 JDK Selector（LT）而非原生 epoll；EpollEventLoopGroup 默认 ET（注册前可切 LT），独有半关闭检测/SO_REUSEPORT/TCP_CORK/TCP_FASTOPEN；ET 必须一次读到 EAGAIN，两个坑——MAX_MESSAGES_PER_READ 截断致延迟抖动、依赖精确流控须切回 LT。
- 版本分水岭：4.0 非池化已 EOL；4.1 池化转正（Android 除外）只收 bugfix（成稿时 4.1.135）；4.2（2025-04-03 GA，成稿时 4.2.16）默认 AdaptiveByteBufAllocator（适配虚拟线程）、EventLoopGroup 与传输解耦（MultiThreadIoEventLoopGroup + EpollIoHandler.newFactory()）、io_uring 一级传输、HTTP/3 毕业；5.x 已停止推进。
- 调优要点：TCP_NODELAY 默认开；长连接靠应用层心跳（IdleStateHandler）而非 SO_KEEPALIVE；WRITE_BUFFER_WATER_MARK 32/64KB 是反压开关；容器里线程数小心 JDK 不感知 cgroup 按宿主机核数算。
- 堆外泄漏排查：RSS 涨、容器 OOMKilled（137）但 jmap 堆正常 → 泄漏检测调 PARANOID 看分配栈 + NMT + MaxDirectMemorySize。

## Important Claims（重要论断）

### Claim 1：Netty 只保证 IO 层不阻塞

"用了 Netty 就自动高性能"是误区；handler 里任何同步 RPC/JDBC 都会把该 EventLoop 的上千连接一起拖死。

### Claim 2：原生 NIO 写着写着就写了个小 Netty

空轮询自愈、粘包处理、内存池这些坑框架都已趟过，自研 ROI 极低（信源立场）。

## Concepts Introduced（引入的概念）

- 无锁串行化（Channel 终身绑定单 EventLoop）
- 零拷贝三层含义（OS/JVM/应用层）

## Entities Mentioned（提及的实体）

- Netty（框架，未单独立页）

## Implications（影响／启示）

"EventLoop 不可阻塞"与本库 CF 三红线（自定义池/接异常/带超时）是同一纪律的两种表述：异步链条上任一环节阻塞/失控都会放大到全链路（解读）。

## Limitations（局限）

- 教程向长文，数字为默认配置口径；4.2 新写法（传输解耦）示例少。

## Related Knowledge（相关知识）

- [[tcp-retransmission-visualized|可视化 TCP 重传（信源页）]]（下层协议行为）
- [[completablefuture-async-orchestration|CompletableFuture 异步编排（信源页）]]（异步纪律互参）

## Source（信源）

- `raw/sources/architecture/2026-10-20-netty-three-skills-high-performance.md`
