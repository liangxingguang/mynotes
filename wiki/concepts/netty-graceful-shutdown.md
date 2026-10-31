---
id: wiki-concept-netty-graceful-shutdown
type: concept
title: Netty 优雅停机（shutdownGracefully / quiet period）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - netty
  - shutdown
  - lifecycle
sources:
  - raw/sources/architecture/2026-10-28-netty-source-series-album.md
related:
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/netty-channelfuture.md
  - wiki/concepts/netty-connection-lifecycle.md
  - wiki/concepts/netty-write-flush.md
  - wiki/entities/netty.md
---
# Netty 优雅停机（shutdownGracefully / quiet period）

## Definition（定义）

`EventLoopGroup.shutdownGracefully(quietPeriod, timeout)` 的语义不是"最多等待 quietPeriod"，而是：停止接收新常规任务后持续执行已有任务，只有连续 `quietPeriod` 没有新任务（quiet period 被每次任务执行刷新）才终止，同时受 `timeout` 硬上限约束。它只覆盖 EventLoop 层秩序；完整服务优雅下线还必须先摘除流量、关闭监听端口、收敛在途请求与连接，最后才结束 EventLoop。

## Why It Matters（为什么重要）

在 `finally` 里调用两个 `shutdownGracefully()` 就宣称支持优雅停机是常见误区——负载均衡仍在送流量、ServerChannel 仍在 accept、新请求仍进 Pipeline 时，再合理的 quiet period 也无法替业务排水。停机问题还会暴露平时的线程模型缺陷：正常运行时的偶发阻塞只表现为尾延迟，发布时关闭与回调叠加就变成进程迟迟退不出去。

## Core Characteristics（核心特征）

1. **三个对象缺一不可**：ServerChannel（监听端口收新连接）、Child Channels（存量连接与请求）、EventLoopGroup（accept/I/O/任务/定时任务）；只关其一都留尾巴。
2. **状态机推进**：`shutdownGracefully` 校验参数（timeout 不能小于 quietPeriod）后 CAS 推进到 `ST_SHUTTING_DOWN`，保存两个时间，返回 `terminationFuture()`——不代表方法返回时线程已退出。
3. **quiet period 是"连续安静窗口"且会被刷新**：`confirmShutdown` 中只要 shutdown 期间执行了任务，`lastExecutionTime` 即更新，quiet period 重新计算；业务定时任务不断自我续期会让执行器永远达不到安静窗口，最终只能依赖 timeout 硬终止。
4. **timeout 是硬上限，不保证任务完成**：quietPeriod=0 时清理完成尽快退出；总时间超过 timeout 强制进入终止阶段；业务需要自己的 drain deadline，超时后明确取消/失败/持久化未完成工作。
5. **阻塞 Handler 无法被魔法中断**：EventLoop 上阻塞 60 秒的 Handler 使超时判断只能等线程回到事件循环才发生——不阻塞 EventLoop 仍是优雅停机的前提。
6. **ServerChannel 先关**：`serverChannel.close().sync()` 阻断 accept 入口；`ChannelGroup` 批量管理存量连接（可 `close().awaitUninterruptibly(drainTimeoutMillis)`）；HTTP/1.1 可回 `Connection: close`，WebSocket 发 Close frame，自定义协议发 server draining 控制消息。
7. **摘流量需要传播窗口**：健康检查有周期、代理有缓存、客户端连接池复用既有连接——设为不可用后须等待至少一个传播窗口，对新请求返回可重试错误，在途请求继续处理。
8. **Boss/Worker 顺序与参数差异**：先关 ServerChannel 停接入、再收敛存量连接；Boss 任务少可更快结束，Worker 承载在途 I/O、Promise Listener、关闭事件与定时任务需更长窗口；共享同一 EventLoopGroup 时无法两阶段控制，靠先关 ServerChannel 实现逻辑分层。
9. **停机不安静的常见原因**：心跳、指标上报、配置轮询、重试、延迟写、连接保活等定时任务持续自我续期；需要上层 draining 停止标志（如 `if (!draining.get()) scheduleReconnect(loop)`），任务取消后还要释放捕获的 Channel/ByteBuf/大对象引用。
10. **终止 Future 是完成证据**：生产代码应 `bossStop.syncUninterruptibly()` 纳入关闭协调而非固定 sleep；外层编排应有进程级 deadline，超时后记录未完成连接、任务和线程栈再强制退出。

## Structure（结构）

```text
推荐顺序：
标记实例 not-ready
  -> 从负载均衡/注册中心摘流量
  -> 等待传播窗口
  -> 关闭 ServerChannel（停止 accept）
  -> 拒绝新业务请求 + 等待在途请求
  -> 协议级通知/关闭 Child Channels
  -> shutdownGracefully EventLoopGroups
  -> 等待 terminationFuture
  -> 进程退出

源码主链（SingleThreadEventExecutor）：
shutdownGracefully -> state = SHUTTING_DOWN -> wakeup EventLoop
  -> run remaining tasks / shutdown hooks
  -> confirmShutdown -> quiet period satisfied OR timeout exceeded
  -> cleanup -> state = TERMINATED -> terminationFuture complete
```

## How It Works（运作方式）

参数矩阵（quietPeriod vs timeout）：quietPeriod=0 → 当前清理完成后尽快退出；连续 quietPeriod 无任务 → 正常终止；不断有任务但未到 timeout → 继续执行等待；总时间超 timeout → 强制终止。典型参数：`bossGroup.shutdownGracefully(0, 10, SECONDS)`、`workerGroup.shutdownGracefully(2, 15, SECONDS)`——不要机械套用，按业务发布窗口调整（在线请求服务可能只允许几十秒，长文件传输需分钟级）。

停机验收六指标：新连接数（摘流量后快速归零）、在途请求数（drain 窗口内下降）、Child Channel 数（按协议关闭策略收敛）、pending tasks（最终归零或只剩可取消任务）、pending outbound bytes（发送完成或按超时失败）、termination Future（进程 deadline 内完成）、客户端错误率（不出现集中 reset/timeout）。应在压测环境执行真实滚动发布验证。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-eventloop]]：shutdownGracefully 是 EventLoop/EventLoopGroup 的有序退出协议；不阻塞 EventLoop 是前提。
- [[netty-channelfuture]]：terminationFuture 是 Future/Promise 模型在关闭流程的落地（`syncUninterruptibly` 等待、失败记录）。
- [[netty-connection-lifecycle]]：Child Channel 收敛是连接生命周期关闭阶段的发布场景。
- [[netty-write-flush]]：pending outbound bytes 是停机验收指标之一，写缓冲排空依赖背压信号。

### Dependencies（依赖项）

- `SingleThreadEventExecutor` 的状态机与 confirmShutdown；`ChannelGroup` 连接集合管理。

### Distinctions（区分）

- 与硬 kill（SIGKILL/直接杀进程）的不同：优雅停机让在途请求与连接有秩序收敛窗口；与仅 `close()` EventLoopGroup 的不同：后者不保证任务与回调执行完，terminationFuture 才是完成证据。

## Evolution（演进）

- 2026-10-31：随程序员行一第 27 篇（源码系列）建立——三对象模型、CAS 状态机、quiet period 刷新语义、timeout 硬上限、发布顺序与验收指标。

## Open Questions（开放问题）

- 默认参数与各业务场景（交易、长文件、IM）的映射关系，信源仅给"不要机械套参数"的定性结论。
- K8s SIGTERM 场景下 terminationFuture 等待与 K8s grace period 的对齐策略，信源未展开。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-netty-source-series-album.md`（第 27 篇，自媒体教程信源；源码为简化注解版，标注 Netty 4.1.135.Final）

## Related Knowledge（相关知识）

- [[netty-source-series-album]]（信源页）
- [[netty]]（实体页）
