---
id: wiki-source-netty-28-promise
type: source
title: Netty源码分析(28) — Promise 与 自定义异步结果
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - source
  - netty
  - java
  - async
sources:
  - raw/sources/architecture/2026-10-27-netty-28-promise.md
---
# Netty源码分析(28) — Promise 与 自定义异步结果

## Overview（概览）

微信公众号 Netty 源码分析系列第 28 篇，承接第 27 篇（ChannelFuture 读侧）讲 Promise 写侧：Promise = "可写的 Future"（对应 Guava SettableFuture / JDK CompletableFuture）。剖析 DefaultPromise 的 CAS 状态机、监听器懒加载存储、checkNotifyWaiters 唤醒路径（含作者自己考证 notifyAll 位置的过程）、取消语义，并给出异步 RPC 与封装第三方回调库两个完整示例。

## Key Facts（关键事实）

- Promise 接口在 Future 上增加 `setSuccess/trySuccess/setFailure/tryFailure`：setSuccess 已完成时抛 `IllegalStateException`，trySuccess 返回 false 不抛——不确定是否已完成时优先 try 系。
- DefaultPromise 字段：`volatile Object result`（null/SUCCESS 哨兵/结果/CauseHolder/UNCANCELLABLE 编码）+ `AtomicReferenceFieldUpdater` CAS + `short waiters` + `boolean notifyingListeners`；注释解释用 FieldUpdater 而非 AtomicReference 是为省对象头。
- 监听器懒加载：单个 `Object listeners` 字段先存单 listener，加第二个才升级为 `DefaultFutureListeners` 数组；`addListener` 后若 `isDone()` 立即触发通知，防"结果先到、监听器后挂"的丢失。
- 唤醒路径（作者多轮自我纠正后定论）：`setValue0` CAS 成功后先 `checkNotifyWaiters()`（`waiters > 0` 时 `notifyAll()` 唤醒 await 阻塞线程），再 `notifyListeners()` 通知回调——先唤醒 wait 线程，再通知 listener。
- 通知的 EventLoop 亲和性：`notifyListeners` 判断 `executor.inEventLoop()`，在 Loop 内直接 `notifyListenersNow()`，否则 `safeExecute` 提交回 EventLoop 执行。
- 取消语义：`cancel()` CAS 置 CANCELLABLE；`isDone()` 仅判 `result != null`，故**取消后 isDone 即 true**，后挂的 listener 立即触发，`get()` 抛 CancellationException。
- 状态机：PENDING → SUCCESS / FAILURE / CANCELLED 三终态，不可逆。

## Important Claims（重要论断）

### Promise 补齐了"自定义异步结果"的写侧

业务代码要返回异步结果时 new `DefaultPromise<>(executor)`，在任意完成点 setSuccess/setFailure——两个示例：模拟异步 RPC 服务（schedule 延迟 setSuccess），以及把第三方回调式 SDK 包装成 Promise 风格 API（回调可能在任意线程，Promise 保证 listener 在 executor 里执行）。

### Netty 自造 Promise 而非用 CompletableFuture 的四点理由

EventLoop 亲和性、更轻量（无函数式编排 overhead）、可关联 Channel、历史原因（Netty 4 早于 JDK 8）。附 Promise / CompletableFuture / FutureTask 六维对比表（EventLoop 亲和性/手动完成/监听器通知/阻塞等待/异常传播/GC 压力）。

### 性能抠到字段级

读路径（isDone/isSuccess/getNow）全是 volatile 读；写路径一次 CAS；单监听器场景零数组分配。作者称相对 CompletableFuture 性能优势明显（定性，无基准数据）。

## Concepts Introduced（引入的概念）

- [[netty-channelfuture]]（扩展其 Promise 写侧与 DefaultPromise 内部细节）

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

- 印证并扩展 [[netty-channelfuture]]：第 27 篇讲读侧（addListener/sync/await），本篇讲写侧（set/trySuccess）与 DefaultPromise 完整内部——监听器懒加载证实第 27 篇信源页标注的"DefaultFutureListeners 数组优化"疑问。
- "EventLoop 内禁 sync/await 死锁"在写侧再次互证：EventLoop 单线程内不可能有线程等待自己 setSuccess。
- 取消后 isDone==true 导致 listener 立即触发，是容易被忽略的时序坑。

## Limitations（局限）

- 单一自媒体教程信源，源码为简化注解片段。
- **await() 中断行为表述与自身代码矛盾**：正文称"await() 中断不抛异常只设标志"，但所贴代码 `await() throws InterruptedException` 且 `Thread.interrupted()` 处显式抛出；真实 Netty 4.1 中 await() 会抛 InterruptedException、awaitUninterruptibly() 才不抛。以代码与真实源码为准，正文表述存疑。
- 作者对 notifyAll 位置的论述经历多轮自我纠正（先称"靠 listener 机制唤醒"，后定位到 checkNotifyWaiters），最终结论与真实源码一致，但中间过程噪声大。
- "Promise 比 CompletableFuture 性能优势明显"为定性论断，无基准数据。

## Related Knowledge（相关知识）

- [[netty-channelfuture]]（读侧与状态机主体）
- [[netty-eventloop]]（EventLoop 亲和性与死锁根因）
- [[futuretask-internals]]（JDK 侧对照）
- [[completablefuture-async-orchestration]]（CF 编排能力对照）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-28-promise.md`
