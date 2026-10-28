---
id: wiki-concept-reactor-thread-model
type: concept
title: 主从 Reactor 线程模型（Netty 版）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - concept
  - java
  - network
  - concurrency
sources:
  - raw/sources/architecture/2026-10-20-netty-three-skills-high-performance.md
  - raw/sources/architecture/2026-10-27-netty-01-intro.md
  - raw/sources/architecture/2026-10-27-netty-02-bio-nio.md
  - raw/sources/architecture/2026-10-27-netty-03-reactor.md
  - raw/sources/architecture/2026-10-27-netty-06-eventloop.md
  - raw/sources/architecture/2026-10-27-netty-08-bootstrap.md
related:
  - wiki/entities/netty.md
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/netty-bootstrap.md
---
# 主从 Reactor 线程模型（Netty 版）

## Definition（定义）

Netty 采用的线程模型：一个 Boss EventLoopGroup 专职 accept 新连接，一个 Worker EventLoopGroup 处理已连接 Channel 的读写；每个 EventLoop 是"单线程 + 一个 Selector"，管理多个 Channel；**一个 Channel 的整个生命周期绑定在同一个 EventLoop 上**，其所有 I/O 事件与回调因此串行执行，无需加锁。

## Why It Matters（为什么重要）

BIO"一连接一线程"在万级并发（C10K）下直接崩溃（线程栈溢出/OOM/上下文切换打满 CPU）；主从分工把"等连接"与"等数据"两类阻塞成本分别摊薄，是 Netty 几个线程扛住上万连接的根本原因，也是其所有上层机制（Pipeline、无锁串行化）的地基。

## Core Characteristics（核心特征）

1. Boss/Worker 分工：Boss（通常 1 线程）只 accept 并分发给 Worker；Worker（通常 CPU 核数×2）处理读写。
2. EventLoop = 单线程 + 私有 Selector，一对多管理 Channel。
3. Channel 终身绑单 EventLoop → 天然无锁串行化，业务 Handler 默认不用考虑并发。
4. accept 异步化：注册未完成时挂监听器，完成后回调 `doBind0()` 再绑定端口（`ServerBootstrap.bind()` 源码路径）。
5. 三形态可按规模选择（教程第 3 篇）：单线程 Reactor（一个 EventLoop 干所有事，小规模）；多线程 Reactor（boss accept + worker 池，Netty 默认形态）；主从多 Reactor（多 boss + 多 worker，万级以上连接）。boss 与 worker 的衔接靠 `ServerBootstrapAcceptor`——ServerBootstrap.init() 把它尾插进 ServerSocketChannel 的 Pipeline，其 channelRead 收到新 accept 的 Channel 后 `childGroup.register(child)` 移交 workerGroup。

## Structure（结构）

```text
Boss Group (Acceptor, 通常1线程)
    │ accept 新连接，分发
    ▼
Worker Group (通常 CPU×2)
    EventLoop1 ── channel1, channel4, ...
    EventLoop2 ── channel2, ...
    EventLoop3 ── channel3, ...
```

## How It Works（运作方式）

Boss 的 Selector 只监听 OP_ACCEPT；新连接到来后创建 Channel 并注册到某个 Worker EventLoop 的 Selector 上，此后该 Channel 的读写事件都由这个 EventLoop 串行处理。EventLoop 同时跑一个任务队列（MpscLinkedQueue），用户提交的普通/定时任务也在同一线程执行——这既是"无锁"的来源，也是"EventLoop 里禁止阻塞调用"这条生产第一纪律的来源（一个线程被拖住，其管的所有连接一起拖死）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-eventloop]]：本模型的实现层——单个 EventLoop 的 run() 循环、chooser 分配、ioRatio 配比、register 异步化源码机制。
- 无锁串行化思想与 Disruptor 单生产者/RingBuffer 同源（解读）：都是"把并发访问收敛到单线程"换无锁，见 [[springboot-disruptor-event-bus]]。
- Channel 绑单线程的纪律衍生出"EventLoop 不阻塞"生产不变量，见 [[netty]] 实体页事故与防线清单。

### Dependencies（依赖项）

- 底层依赖 IO 多路复用（Selector/epoll）；Netty 用自旋计数器 + 重建 Selector 自愈 JDK epoll 空轮询 BUG（JDK 6u17 才官方修好，信源说法）。

### Distinctions（区分）

- 与 BIO 一连接一线程：线程数不随连接数增长。
- 与单 Reactor 单线程：accept 与读写分离，避免单点瓶颈；Boss 也可多线程（多 EventLoop 的 EventLoopGroup）应对海量建连。
- 模式思想源头：Doug Lea《Scalable IO in Java》的 Reactor 模式（教程第 3 篇信源说法）。

## Evolution（演进）

机制信源（netty-three-skills）给出"boss 只 accept、worker CPU×2、Channel 终身绑单 EventLoop"的性能视角；教程双信源（netty-01/02）补全代码结构与 bind() 源码路径；教程第 3 篇（netty-03，2026-10-28 摄入）补齐三形态对照与 ServerBootstrapAcceptor 移交链路，并给出空轮询自愈阈值 512；教程第 6 篇（netty-06，2026-10-28 摄入）把模型落到源码实现——默认线程数静态块、chooser 位运算、ioRatio=50 时间配比、register 跨线程异步化、selectCnt 空轮询自愈，与本页结论一致互证（详见 [[netty-eventloop]]）；教程第 8 篇（netty-08，2026-10-28 摄入）把 Boss/Worker 分工的装配过程落到源码——ServerBootstrap.init() 异步尾插 ServerBootstrapAcceptor、Acceptor.channelRead 挂 childHandler 并 childGroup.register 移交 worker、NioServerSocketChannel 构造即记录 OP_ACCEPT（详见 [[netty-bootstrap]]）。六信源对核心结构表述一致。

## Open Questions（开放问题）

- Netty 4.2 的 EventLoopGroup 与传输解耦、io_uring 一级传输对该模型的影响（见 [[netty]] Timeline），本库暂无展开信源。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-20-netty-three-skills-high-performance.md`（机制层：三支柱之首）
- Source: `raw/sources/architecture/2026-10-27-netty-01-intro.md`（开篇：模型结构 + bind() 源码）
- Source: `raw/sources/architecture/2026-10-27-netty-02-bio-nio.md`（对比篇：结构图 + 天然无锁表述）
- Source: `raw/sources/architecture/2026-10-27-netty-03-reactor.md`（线程模型专篇：三形态对照/ServerBootstrapAcceptor 链路/chooser 演进/自愈阈值 512/选型分档）
- Source: `raw/sources/architecture/2026-10-27-netty-06-eventloop.md`（源码实现层：默认线程数/chooser/ioRatio/register 异步化/空轮询自愈）
- Source: `raw/sources/architecture/2026-10-27-netty-08-bootstrap.md`（装配层源码：initAndRegister 三件套/ServerBootstrapAcceptor 移交/OP_ACCEPT 登记时机）

## Related Knowledge（相关知识）

- [[netty]]
- [[netty-01-intro]]
- [[netty-02-bio-nio]]
- [[netty-03-reactor]]
- [[netty-eventloop]]
- [[netty-bootstrap]]
