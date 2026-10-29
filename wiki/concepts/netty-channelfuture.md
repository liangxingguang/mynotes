---
id: wiki-concept-netty-channelfuture
type: concept
title: Netty ChannelFuture 与 DefaultPromise（异步结果模型）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - concept
  - netty
  - async
  - future
sources:
  - raw/sources/architecture/2026-10-27-netty-27-channelfuture.md
  - raw/sources/architecture/2026-10-27-netty-28-promise.md
related:
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/netty-flow-control.md
  - wiki/concepts/netty-connection-lifecycle.md
  - wiki/concepts/futuretask-internals.md
  - wiki/concepts/atomic-variables-cas.md
  - wiki/entities/netty.md
---
# Netty ChannelFuture 与 DefaultPromise（异步结果模型）

## Definition（定义）

ChannelFuture 是 Netty 全部异步 I/O 操作（connect/bind/write/close）的结果载体：在 JDK Future（只有阻塞 get 与轮询 isDone）之上扩展出 `addListener` 被动回调、`sync/await` 阻塞等待、`isSuccess/cause` 结果判别；Channel 层级再加 `isWritable()` 写水位感知与 `channel()` 关联。写侧由 Promise 接口补齐——"可写的 Future"（对应 Guava SettableFuture / JDK CompletableFuture），提供 `setSuccess/setFailure/trySuccess/tryFailure` 让业务代码手动完成异步结果。其核心实现 DefaultPromise 用单个 `volatile Object result` 字段 + CAS 构成无锁状态机。

## Why It Matters（为什么重要）

Netty 的 I/O 操作全部异步、立即返回，结果获取方式直接决定线程模型纪律：EventLoop 线程内只能用 Listener 回调，调 sync/await 即自我等待死锁——这是 [[netty]] 生产事故第一根因"EventLoop 阻塞"在 Future 维度的具体变体。理解 DefaultPromise 的状态机与通知机制，是排查回调丢失、死锁、结果误判问题的前提。

## Core Characteristics（核心特征）

1. **单字段状态机**：`result` 取值 null（未完成）/SUCCESS 哨兵（成功无结果）/结果对象/CauseHolder（失败）/UNCANCELLABLE（不可取消）；`AtomicReferenceFieldUpdater` CAS 仅从 null/UNCANCELLABLE 转换，不可逆，重复 setSuccess 抛 IllegalStateException。
2. **观察者回调 + 懒加载存储**：`listeners` 单个 Object 字段先存单 listener，加第二个才升级为 `DefaultFutureListeners` 数组（大多数 Promise 只有 1 个监听器，省数组分配）；`addListener` 后若 `isDone()` 立即触发通知，防"结果先到、监听器后挂"丢失；`notifyListeners` 用 `notifyingListeners` 标志防递归、同步块外调回调防死锁、catch Throwable 保证单回调崩溃不殃及后续（仅 WARN 日志）。
3. **等待-通知阻塞**：`await()` = synchronized + while(!isDone) + `wait()`（waiters 计数），`setValue0` CAS 成功后先 `checkNotifyWaiters()`（waiters>0 时 `notifyAll()` 唤醒阻塞线程）再 `notifyListeners()`——先唤醒 wait 线程再通知回调；`sync()` = await + rethrowIfFailed（异常传播，日常开发建议用 sync）。
4. **可写端语义**：`setSuccess` 已完成时抛 IllegalStateException，`trySuccess` 返回 false 不抛——不确定是否已完成时优先 try 系；`cancel()` CAS 置 CANCELLABLE，`isDone()` 仅判 `result != null`，故取消后 isDone 即 true、后挂 listener 立即触发、`get()` 抛 CancellationException。
5. **EventLoop 亲和性通知**：`notifyListeners` 判断 `executor.inEventLoop()`，在 Loop 内直接 `notifyListenersNow()`，否则 `safeExecute` 提交回 EventLoop——listener 永远在正确线程执行。
6. **水位感知**：`isWritable()` 由 ChannelOutboundBuffer 的 `totalPendingSize` 与高水位（默认 64KB）比较得出，O(1)，是 [[netty-flow-control]] 背压的接口层入口。
7. **接口继承链**：JDK Future → netty Future（+Listener/sync/await/isSuccess/cause）→ Promise（+set/trySuccess/Failure 可写端）→ ChannelFuture（+channel/isWritable）→ ChannelPromise → DefaultChannelPromise；业务侧自建异步结果直接 new `DefaultPromise<>(executor)`。

## Structure（结构）

三类消费者共用一把 Future：I/O 线程（EventLoop）setSuccess/setFailure 完成状态 → 通知链分两路：notifyListeners 逐个回调用户 Listener；notifyWaiters `notifyAll()` 唤醒 await 阻塞线程。用户侧三用法：sync() 阻塞（main 线程/资源释放）、addListener 回调（EventLoop 内唯一正确姿势）、addListener 链式嵌套做编排。

## How It Works（运作方式）

五种场景选型（信源表格）：main 线程等启动完成用 `sync()`；EventLoop 中处理结果用 `addListener()`；异步链路编排用 addListener 链式；资源释放用 `syncUninterruptibly()`（不可打断）；需超时控制用 `await(timeout)` + `isSuccess()`。三大坑：EventLoop 内 sync 死锁；回调抛异常被吞只记 WARN；不查 isSuccess 直接 getNow 可能拿到 null。

写侧两范式（第 28 篇示例）：自建异步 API 时 `new DefaultPromise<>(executor)`，在完成点 setSuccess/setFailure（如模拟 RPC 的 schedule 延迟回填）；封装第三方回调式 SDK 时在回调里 setSuccess——回调可能在任意线程，Promise 保证 listener 回到 executor 执行。纪律：不确定是否已完成用 trySuccess；Promise 不跨消费者共享；取消后 isDone 即 true 注意时序。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-connection-lifecycle]]：connect/bind/close 全程 Promise-Future 异步（closeFuture 等完成），本概念是其底层实现机制。
- [[netty-flow-control]]：isWritable() 是高低水位背压暴露在 Future 接口上的查询面。
- [[netty-eventloop]]：死锁根因——Future 完成依赖 EventLoop 执行，EventLoop 自己 await 即自我等待。

### Dependencies（依赖项）

- [[atomic-variables-cas]]：AtomicReferenceFieldUpdater CAS + volatile 可见性，无锁状态机的并发原语基础。

### Distinctions（区分）

- 与 JDK CompletableFuture 的不同：ChannelFuture 手动链式编排、EventLoop 线程回调、`cause()` 手动判断、专为网络 I/O 轻量设计；CF 有 thenCompose/allOf/anyOf 强组合、默认 ForkJoinPool、exceptionally/handle 错误处理、面向通用异步。经验法则（信源，解读）：EventLoop 内用 ChannelFuture，跨线程编排用 CF。
- 与 [[futuretask-internals]] 的不同：FutureTask 靠 Thread.get 阻塞 + 状态 int CAS；DefaultPromise 额外提供 Listener 主动通知与多用途 result 字段编码。

## Evolution（演进）

- 2026-10-29：随教程第 27 篇建立（读侧：addListener/sync/await/isWritable）。
- 2026-10-29：第 28 篇摄入，补齐写侧（Promise 接口语义、监听器懒加载、checkNotifyWaiters 唤醒路径、取消语义、两个使用示例），并证实第 27 篇存疑的 DefaultFutureListeners 数组优化真实存在。

## Open Questions（开放问题）

- 第 27 篇信源码注解中的 SIGNAL_MASK/FAILURE_MASK 位掩码与真实 DefaultPromise 源码不一致，属作者简化演绎；其"listener 链表"表述已被第 28 篇修正为懒加载单对象→DefaultFutureListeners 数组，该疑问解除。
- 第 28 篇对 `await()` 中断行为的文字表述（"中断不抛异常"）与其自贴代码（`throws InterruptedException`）及真实 Netty 4.1 源码矛盾——真实行为：await() 抛中断、awaitUninterruptibly() 不抛；sync()=await+rethrowIfFailed 传播失败异常。以真实源码为准。
- "Listener 别加几十上百个"、"Promise 比 CompletableFuture 性能优势明显"均为定性建议，无性能拐点/基准数据。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-27-channelfuture.md`（自媒体教程信源；源码为简化注解片段，同系列前文标注 Netty 4.1.x）
- Source: `raw/sources/architecture/2026-10-27-netty-28-promise.md`（同系列写侧篇；await() 中断表述矛盾见 Open Questions）

## Related Knowledge（相关知识）

- [[netty-27-channelfuture]]（信源页）
- [[netty-28-promise]]（信源页）
- [[netty]]（实体页）
