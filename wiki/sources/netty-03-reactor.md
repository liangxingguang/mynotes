---
id: wiki-source-netty-03-reactor
type: source
title: Netty源码分析(3) — Reactor线程模型：从单线程到主从多Reactor
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - netty
  - network
  - tutorial
sources:
  - raw/sources/architecture/2026-10-27-netty-03-reactor.md
related:
  - wiki/sources/netty-02-bio-nio.md
  - wiki/sources/netty-04-channel-pipeline-handler.md
  - wiki/entities/netty.md
  - wiki/concepts/reactor-thread-model.md
  - wiki/concepts/netty-eventloop.md
---
# Netty源码分析(3) — Reactor线程模型：从单线程到主从多Reactor

## Overview（概览）

公众号「Java解忧杂货铺」Netty 源码分析系列第 3 篇。从 Doug Lea《Scalable IO in Java》的 Reactor 模式出发，讲透 Netty 三层线程模型（单线程/多线程/主从多 Reactor），源码级剖析 NioEventLoop 的 run() 死循环、EventLoopGroup 的 chooser 分配算法、boss 与 worker 之间 ServerBootstrapAcceptor 的衔接链路，附完整可运行示例、空轮询 bug 自愈细节与按连接数的选型建议表。文中源码基于 Netty 4.1.x。

## Key Facts（关键事实）

- Reactor 模式核心 = 事件分发（多路复用 + 非阻塞 IO），思想源自 Doug Lea《Scalable IO in Java》；Netty 落地为三层：单线程（一个线程干所有事，小规模）、多线程（一个 Reactor + Worker 池，默认形态，大多数场景）、主从多 Reactor（多 boss + 多 worker，高并发）。
- 三层模型代码形态：单线程 `new NioEventLoopGroup(1)` 同时作 boss/worker；多线程 boss(1)+worker（默认 CPU×2）；主从 boss(4)+worker(16) 示例。客户端 NioSocketChannel 自身也注册到 EventLoop，隐含 sub Reactor。
- NioEventLoop 三件套：`selector`/`unwrappedSelector` + 任务队列（继承自 SingleThreadEventExecutor）+ 一个"永远不死的线程"；run() 循环四阶段：SelectStrategy → processSelectedKeys → runAllTasks → afterRunningAllTasks（定时任务等尾部任务），catch Exception 保死循环不退出。
- EventLoopGroup = 工厂 + 分配器：`register(channel)` 内部即 `next().register(channel)`；chooser 演进——早期 `AtomicInteger % length` 取模，Netty 4.x 改为 2 的幂次位运算 `executors[idx.getAndIncrement() & executors.length - 1]`。
- boss→worker 传送带 ServerBootstrapAcceptor：ServerBootstrap.init() 给 ServerSocketChannel 的 Pipeline 尾插该 Handler；其 channelRead 收到新 accept 的 NioSocketChannel 后 `childGroup.register(child)` 注册进 workerGroup，注册失败 forceClose；此后该 Channel 的 OP_READ 挂在 worker EventLoop 的 Selector 上，所有 IO 由该线程处理。
- 空轮询自愈的具体阈值：`SELECTOR_AUTO_REBUILD_THRESHOLD` 默认 **512** 次，selectCnt 超阈值即 rebuildSelector()——新建 Selector 并把原注册的 Channel 迁移过去。
- 串行化无锁的实现手法：channel.write()/close()、connect 的 Future 回调等跨线程操作统一封装为任务提交到目标 EventLoop 的任务队列（MPSC），由 EventLoop 自己执行——"channel.write() 在业务线程调用≠立刻发走，可能在任务队列里排队"。
- 耗时 Handler 的标准解法：`DefaultEventExecutorGroup` 作为业务线程池挂载到 Pipeline（`addLast(businessGroup, "businessHandler", ...)`），把耗时操作从 EventLoop 卸载。
- 选型建议表（作者经验）：<100 连接单线程；100~1000 默认多线程；1000~10000 调 worker 数（如 CPU×4）；万级以上主从多 Reactor。

## Important Claims（重要论断）

### Claim 1：IO 与任务放在一个线程是 Reactor 模式的要求
作者论断：同一 Channel 的所有操作必须在同一线程执行才能避免加锁（"线程绑定"），这是把 IO 事件与普通任务放进同一 run() 循环的根本原因。

### Claim 2：Selector 重建是 Netty 源码中最优雅的容错之一
作者评价性论断：selectCnt 计数 + 超阈值重建 Selector 自愈 JDK epoll 空轮询 bug。

## Concepts Introduced（引入的概念）

- [[reactor-thread-model]]（补强：三形态对照、ServerBootstrapAcceptor 链路、512 阈值）
- [[netty-eventloop]]（补强：run() 四阶段、chooser 演进、跨线程任务封装）

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

本篇填补了系列第 3 篇的缺口，把 [[reactor-thread-model]] 的"Boss accept / Worker 读写"从结构图落为 ServerBootstrapAcceptor 的完整源码链路，并给出空轮询自愈阈值 512 这一具体数值（解答了 [[netty-eventloop]] 此前的开放问题）。选型建议表与 [[netty]] 实体页"容量观：无万能单机连接数"互补——本篇给经验分档，实体页强调压测定上限。

## Limitations（局限）

- 单一自媒体教程信源，源码基于 Netty 4.1.x，run() 伪代码为作者简化版（与同系列第 6 篇的 run() 剖析详略不同，无实质矛盾）。
- 选型建议表的连接数分档为经验值，无压测数据支撑。
- "chooser 早期用取模、4.x 改位运算"的版本演进说法未给出具体版本号。

## Related Knowledge（相关知识）

- [[netty-02-bio-nio]]（同系列第 2 篇：BIO/NIO 对比）
- [[netty-04-channel-pipeline-handler]]（同系列第 4 篇：Pipeline 三剑客——本篇结尾预告的下一期主题）
- [[netty-06-eventloop]]（同系列第 6 篇：EventLoop 源码的更详细剖析）
- [[reactor-thread-model]]（概念页）
- [[netty-eventloop]]（概念页）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-03-reactor.md`
