---
id: wiki-concept-netty-eventloop
type: concept
title: Netty EventLoop / EventLoopGroup（事件循环机制）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - concept
  - java
  - netty
  - network
  - concurrency
sources:
  - raw/sources/architecture/2026-10-27-netty-06-eventloop.md
  - raw/sources/architecture/2026-10-27-netty-03-reactor.md
  - raw/sources/architecture/2026-10-27-netty-09-nioeventloop-run.md
related:
  - wiki/concepts/reactor-thread-model.md
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/concepts/netty-bootstrap.md
  - wiki/entities/netty.md
---
# Netty EventLoop / EventLoopGroup（事件循环机制）

## Definition（定义）

Netty 线程模型的执行单元：**一个 EventLoop = 一个线程 + 一个 Selector + 一个任务队列（MpscLinkedQueue）**，三合一，在一个永不退出的 `run()` 死循环里交替处理 IO 事件与普通/定时任务；EventLoopGroup 管理一组 EventLoop（children 数组），通过 chooser 把 Channel 均匀分配（register）给某个 EventLoop，之后该 Channel 一生绑定于此、所有操作同线程串行执行。

## Why It Matters（为什么重要）

EventLoop 是"Handler 的 channelRead 跑在哪个线程上"这个问题的答案，也是 Netty 无锁串行化的实现载体：Channel 终身绑单 EventLoop ⇒ 同一 Channel 的所有回调天然串行、无需加锁。它同时是生产第一纪律"EventLoop 里禁止阻塞调用"的物理基础——一个 EventLoop 线程被拖住，其管理的所有 Channel 一起拖死。

## Core Characteristics（核心特征）

1. 三合一结构：Thread + Selector + MpscLinkedQueue 任务队列，死循环串起 IO 事件与任务。
2. 默认线程数：`availableProcessors() * 2`（下限 1），可用 `-Dio.netty.eventLoopThreads` 覆盖（MultithreadEventLoopGroup 静态块）。
3. chooser 均匀分配：线程数为 2 的幂走 `idx++ & (len-1)` 位运算（PowerOfTwoEventExecutorChooser），否则取模（GenericEventExecutorChooser）；作者称 Netty 4.x 由早期 `AtomicInteger % length` 取模演进为位运算。
4. 时间配比：`ioRatio`（默认 50）按 `ioTime * (100 - ioRatio) / ioRatio` 给任务分配执行时长，防止 IO 事件饿死任务；ioRatio=100 时先清完所有 IO 再跑全部任务。
5. 跨线程安全提交：外部线程 execute() 只入队 + `wakeup` 布尔短路后 `selector.wakeup()` 打断 select；register 不在 EventLoop 线程时把 register0() 异步投递回本线程执行。
6. 性能微优化：SelectedSelectionKeySet 用数组替代 JDK HashSet（消除迭代器/哈希开销，处理后置 null help GC）；`selectCnt` 计数超阈值（`SELECTOR_AUTO_REBUILD_THRESHOLD`，默认 512 次）即 rebuildSelector——新建 Selector 并把原注册的 Channel 迁移过去，自愈 JDK epoll 空轮询 bug。

## Structure（结构）

```text
EventExecutorGroup
  └─ EventLoopGroup（+ register(Channel)）
       └─ MultithreadEventLoopGroup ── children: EventExecutor[] + chooser
            ├─ NioEventLoopGroup
            └─ EpollEventLoopGroup
EventExecutor
  └─ EventLoop（+ parent() / register()）
       └─ SingleThreadEventLoop ── MpscLinkedQueue + wakeup 短路
            └─ NioEventLoop ── Selector + run() 事件循环 + ioRatio
```

## How It Works（运作方式）

NioEventLoop.run() 每轮：① SelectStrategy 决策（CONTINUE / BUSY_WAIT 仅 epoll / SELECT）——反直觉点在于**有任务时走 `selectNow()` 非阻塞扫一遍立即返回去跑任务，没任务时才 `select(timeout)` 阻塞等待**（超时按最近定时任务 deadline 计算），因为 close/write 等用户任务对及时性敏感而 IO 事件可以等（netty-09 增补解释）；每轮先 `canceller.run()` 处理取消的 key；② processSelectedKeys() 按 attachment 分发——AbstractNioChannel 走 unsafe.finishConnect / forceFlush / read（OP_CONNECT 优先，读完检查 Channel 是否已关闭），NioTask 直接运行；③ 按 ioRatio 时间配比 runAllTasks()；④ 空轮询检测：有实际工作（ranTasks 或 strategy>0）时 selectCnt 重置为 1，只有连续空转超阈值才 rebuildSelector——rebuildSelector0() 新建 Selector、遍历旧 key 保留 interestOps/attachment 重新注册、替换引用并关闭旧 Selector，对上层透明（netty-09 给出迁移源码与 BUG 编号 JDK-2144974）。异常兜底：IOException 重建 Selector 续跑，CancelledKeyException 吞掉（JDK 已知 BUG），Error 直抛，未知 Throwable 记日志并 sleep 1s 防打满 CPU。ioRatio 选型（netty-09 建议表）：纯网络代理/网关 100，业务密集服务 50~70，不确定用默认 50。

## Relationships（关系）

### Related Concepts（相关概念）

- [[reactor-thread-model]]：本概念是该主从 Reactor 模型的**实现层**（part-of）——架构页讲 Boss/Worker 分工与无锁结论，本页讲单个 EventLoop 内部的 run() 循环与任务调度。
- [[netty-channel-pipeline]]：processSelectedKey 经 unsafe.read() 把字节读上来后交给 Pipeline 传播；register0() 触发的 handlerAdded/channelRegistered/channelActive 正是 Pipeline 生命周期事件。
- 无锁串行化思想与 [[springboot-disruptor-event-bus|Disruptor]] 单生产者同源（解读）：并发访问收敛到单线程换无锁。

### Dependencies（依赖项）

- JDK NIO Selector / IO 多路复用；Linux 下可换 EpollEventLoopGroup（信源仅点名）。
- 对 JDK epoll 空轮询 bug 的防御依赖 selectCnt 自旋计数 + rebuildSelector（与 [[reactor-thread-model]] 记载的机制一致互证）。

### Distinctions（区分）

- 与 [[threadpoolexecutor-internals|ThreadPoolExecutor]]：EventLoop 是**单线程**执行器 + IO 多路复用，一个线程服务成百上千 Channel；线程池是多线程抢任务队列，不感知 IO 就绪。EventLoopGroup 只是"像线程池工厂"，语义不同。
- 与 EventExecutorGroup 顶层接口：EventLoopGroup 的关键增量是 `register(Channel)`——只有 EventLoop 能绑定 Channel。

## Evolution（演进）

机制信源（netty-three-skills）与教程开篇（netty-01/02）给出"Boss accept / Worker CPU×2 / Channel 终身绑单 EventLoop"的架构结论；教程第 3 篇（netty-03）补 chooser 版本演进（取模→位运算）、runAllTasks 尾部任务（afterRunningAllTasks）与自愈阈值 512；教程第 6 篇（netty-06）给 run()/processSelectedKeys/register 逐方法剖析与 ioRatio 配比公式；教程第 9 篇（netty-09，2026-10-28 摄入）专篇深挖 run()——SelectStrategy "有任务非阻塞"的解释、ioRatio 选型建议表、epoll 空轮询 BUG 编号 JDK-2144974、rebuildSelector0 的 key 迁移源码与"有工作即重置 selectCnt"细节，与既有结论一致互证。各篇 run() 伪代码详略与策略命名略有差异（03 简化为 SELECT/SELECT_NOW，06/09 为 CONTINUE/BUSY_WAIT/SELECT），属作者简化口径不同，无实质矛盾。

## Open Questions（开放问题）

- EpollEventLoopGroup / BUSY_WAIT 细节（信源仅点名未展开）。
- SelectedSelectionKeySet 数组实现细节（netty-09 只给"替换 HashSet 降 GC 与遍历开销"的动机，未展开实现）。
- Netty 4.2 的 EventLoopGroup 与传输解耦、io_uring 一级传输对本机制的影响（见 [[netty]] Timeline），本库暂无展开信源。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-06-eventloop.md`（源码级主信源：类层次/构造链/run()/processSelectedKeys/wakeup/register 逐方法剖析）
- Source: `raw/sources/architecture/2026-10-27-netty-03-reactor.md`（补强：run() 四阶段简化版/chooser 演进/自愈阈值 512/runAllTasks 与 MPSC 队列；架构层结论与 [[reactor-thread-model]] 各信源互证）
- Source: `raw/sources/architecture/2026-10-27-netty-09-nioeventloop-run.md`（run() 专篇：SelectStrategy 反直觉解释/ioRatio 选型表/JDK-2144974/rebuildSelector0 迁移源码）

## Related Knowledge（相关知识）

- [[netty-06-eventloop]]（信源页）
- [[netty-03-reactor]]（信源页）
- [[netty-09-nioeventloop-run]]（信源页）
- [[netty]]（实体页：生产事故第一根因"EventLoop 阻塞"）
