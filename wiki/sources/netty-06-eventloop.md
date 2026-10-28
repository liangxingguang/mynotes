---
id: wiki-source-netty-06-eventloop
type: source
title: Netty源码分析(6) — EventLoopGroup 与 EventLoop 源码解析
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
  - raw/sources/architecture/2026-10-27-netty-06-eventloop.md
related:
  - wiki/sources/netty-05-bytebuf.md
  - wiki/sources/netty-03-reactor.md
  - wiki/sources/netty-08-bootstrap.md
  - wiki/sources/netty-09-nioeventloop-run.md
  - wiki/entities/netty.md
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/reactor-thread-model.md
---
# Netty源码分析(6) — EventLoopGroup 与 EventLoop 源码解析

## Overview（概览）

公众号「Java解忧杂货铺」Netty 源码分析系列第 6 篇。源码级剖析 Netty 线程模型骨架 EventLoopGroup/EventLoop：NioEventLoopGroup 默认线程数来源、MultithreadEventExecutorGroup 的 children 数组与 chooser 位运算优化、NioEventLoop.run() 事件循环全流程（SelectStrategy、ioRatio 时间配比、selectCnt 空轮询自愈）、processSelectedKeys 事件分发、wakeup 短路唤醒与 register 跨线程异步绑定，附跨线程提交任务的完整演示示例。文中源码基于 Netty 4.1.x。

## Key Facts（关键事实）

- 核心等式：**NioEventLoop = 一个线程 + 一个 Selector + 一个任务队列（MpscLinkedQueue）**；EventLoopGroup 管理一组 EventLoop；每个 Channel 一生只绑定一个 EventLoop，其所有 IO 事件与 Handler 回调同线程串行执行，无需加锁。
- 默认线程数：`Math.max(1, -Dio.netty.eventLoopThreads 或 availableProcessors() * 2)`，定义在 `MultithreadEventLoopGroup.DEFAULT_EVENT_LOOP_THREADS` 静态块。
- 类层次：EventExecutorGroup → EventLoopGroup（加 register(Channel)）→ MultithreadEventLoopGroup → NioEventLoopGroup / EpollEventLoopGroup；EventExecutor → EventLoop → SingleThreadEventLoop → NioEventLoop。
- children 数组 + chooser：MultithreadEventExecutorGroup 构造时经 `newChild()` 创建 nThreads 个 EventLoop 存入 `children[]`，`next()` 委托 chooser 分配——线程数为 2 的幂用 `PowerOfTwoEventExecutorChooser`（`idx++ & (len-1)` 位运算），否则 `GenericEventExecutorChooser`（取模）。
- run() 事件循环：SelectStrategy 三态（CONTINUE / BUSY_WAIT 仅 epoll / SELECT）；SELECT 时按定时任务 deadline 计算 select 阻塞超时，有到期任务走 `selectNow()`；`ioRatio`（默认 50）控制 IO 与任务时间配比——`runAllTasks(ioTime * (100 - ioRatio) / ioRatio)`；`selectCnt > SELECTOR_AUTO_REBUILD_THRESHOLD` 时 `rebuildSelector0()` 重建 Selector 自愈 JDK 空轮询 bug。
- processSelectedKeys：优先走 `SelectedSelectionKeySet`（数组替代 JDK HashSet，消除迭代器与哈希开销，置 null help GC）；按 attachment 类型分发——AbstractNioChannel 走 unsafe 的 finishConnect/forceFlush/read，NioTask 直接运行。
- execute() 跨线程提交：任务入 MpscLinkedQueue；外部线程提交时 `startThread()` + `wakeup` 布尔短路后 `selector.wakeup()` 打断 select 阻塞（wakeup 是系统调用，不能滥用）。
- register 绑定：AbstractUnsafe.register 记录 `AbstractChannel.this.eventLoop = eventLoop`；若当前不在 EventLoop 线程则把 `register0()` 异步投递到该 EventLoop 任务队列执行，保证 Channel 所有操作同线程；register0 内触发 handlerAdded → channelRegistered →（已 active 时）channelActive。
- 工程纪律：不要阻塞 EventLoop 线程（同线程其他 Channel 全部遭殃），耗时操作提交业务线程池；优雅停机先关 bossGroup 再关 workerGroup；大量长连接可调大线程数（8-16），纯计算型调小，Linux 超高吞吐网关考虑 EpollEventLoopGroup。

## Important Claims（重要论断）

### Claim 1：一个 EventLoop 可同时服务几百上千个 Channel
作者论断：线程数不必随连接数增长，单个 EventLoop 可管几百上千 Channel；这也是"不要阻塞 EventLoop"纪律的直接推论。

### Claim 2：ioRatio 是有意的均衡设计而非默认值巧合
作者论断：ioRatio=50 让普通任务（如 channel.write 提交）不被 IO 事件饿死；ioRatio=100 则 IO 优先、任务兜底。

## Concepts Introduced（引入的概念）

- [[netty-eventloop]]

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

本篇把 [[reactor-thread-model]] 的架构层结论（Boss/Worker 分工、Channel 终身绑单 EventLoop、无锁串行化）落到源码实现层：默认线程数、chooser 分配、ioRatio、空轮询自愈、register 异步化均给出类与方法级证据，与该概念页既有三信源结论一致互证。生产纪律（EventLoop 不阻塞、先关 boss 再关 worker）与 [[netty]] 实体页"生产事故第一根因"互证。

## Limitations（局限）

- 单一自媒体教程信源，源码解读基于 Netty 4.1.x；EpollEventLoopGroup / BUSY_WAIT 仅点名未展开。
- 文中自称"下一期深挖 ChannelPipeline 事件传播"，与本库已摄入的系列第 4 篇（Pipeline 篇）主题重叠——系列编号与发布顺序存在错位。
- "一个 EventLoop 服务几百上千个 Channel"为经验性表述，无压测数据。

## Related Knowledge（相关知识）

- [[netty-05-bytebuf]]（同系列第 5 篇：ByteBuf 源码）
- [[netty-03-reactor]]（同系列第 3 篇：Reactor 线程模型，与本篇 run()/chooser 剖析互证）
- [[netty-04-channel-pipeline-handler]]（同系列第 4 篇：Pipeline 事件传播源码）
- [[netty-08-bootstrap]]（同系列第 8 篇：启动流程，register/connect 链路源码）
- [[netty-09-nioeventloop-run]]（同系列第 9 篇：run() 主循环深挖，与本篇互证）
- [[netty-eventloop]]（概念页）
- [[reactor-thread-model]]（架构视角的线程模型概念页）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-06-eventloop.md`
