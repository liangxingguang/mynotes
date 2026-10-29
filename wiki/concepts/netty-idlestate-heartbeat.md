---
id: wiki-concept-netty-idlestate-heartbeat
type: concept
title: Netty 空闲检测与心跳（IdleStateHandler）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - concept
  - netty
  - heartbeat
  - network
sources:
  - raw/sources/architecture/2026-10-27-netty-17-idlestate-heartbeat.md
  - raw/sources/architecture/2026-10-23-netty-million-connection-push-service.md
  - raw/sources/architecture/2026-10-27-netty-18-reconnect.md
  - raw/sources/architecture/2026-10-27-netty-in-mainstream-middleware.md
related:
  - wiki/sources/netty-17-idlestate-heartbeat.md
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/netty-connection-lifecycle.md
  - wiki/concepts/websocket-heartbeat-reconnect.md
  - wiki/concepts/netty-reconnect.md
  - wiki/entities/netty.md
---
# Netty 空闲检测与心跳（IdleStateHandler）

## Definition（定义）

Netty 内置的空闲检测 Handler（`io.netty.handler.timeout.IdleStateHandler`，`ChannelDuplexHandler`）：配置读/写/读写全部三个维度的空闲超时，由 EventLoop 上的定时任务跟踪各维度最近一次 I/O 时间，超时即触发 `IdleStateEvent` 沿 Pipeline 传播，配合下游 Handler 实现心跳发送与死连接清理。是 Netty 应用层心跳（相对 TCP SO_KEEPALIVE）的标准机制。

## Why It Matters（为什么重要）

TCP 无法感知半开/假死连接（物理链路中断、防火墙静默丢弃、网络分区），长连接系统必须自己做应用层判活与清理。IdleStateHandler 把"定时器+时间戳跟踪+事件分发"封装成一行配置，是 IM、IoT、游戏服务器、RPC 网关心跳能力的低成本基座；但其定时任务粒度在超大连接量下会放大成事故（见证据二）。

## Core Characteristics（核心特征）

1. **三维独立检测**：reader/writer/all 三个超时秒数，传 0 关闭该维度；内部统一转纳秒（`Math.max(toNanos, 1)`），`System.nanoTime()` 计时。
2. **精确再调度而非固定轮询**：任务触发时计算 `idleTime - (now - lastIoTime)`，未超时按剩余延迟重排，超时则触发事件并按整周期重排——调度次数与 CPU 占用最小化。
3. **异步感知的读写跟踪**：`channelRead` 即时更新 `lastReadTime`（读中 `reading` 标记防误报）；`write` 经 `ChannelPromise` Listener 在真正写完成后才更新 `lastWriteTime`。
4. **事件化解耦**：只负责检测与触发 `IdleStateEvent`（含 READER/WRITER/ALL_IDLE 与 `isFirst` 标记），心跳动作（发 Ping、关连接、记日志）完全由下游 `userEventTriggered` 决定——责任链模式。
5. **EventLoop 承载**：定时任务提交到 `ctx.executor()`（EventLoop 的 ScheduledExecutorService），同线程无线程安全问题，Channel 关闭自动 cancel 不泄漏；代价是事件回调不得阻塞。

## Structure（结构）

`IdleStateHandler`（handlerAdded/initialize 启动调度）→ 三个 `IdleStateTask` 子类（ReaderIdleTask / WriterIdleTask / AllIdleTask，模板方法）→ `IdleStateEvent`（state + first）→ `fireUserEventTriggered` → 下游业务 Handler。

## How It Works（运作方式）

连接建立（handlerAdded/channelActive）后以 `nanoTime()` 为基准启动定时任务；每次读写更新时间戳；任务到期检查"当前时间 − 上次 I/O 时间 > 阈值"，超时触发事件（首次带 first=true）并进入下一周期，否则精确睡到剩余时间。典型用法：服务端读空闲判定客户端假死（超限 close），写空闲主动发 PING；客户端收到 PING 回 PONG，连续 N 次读空闲无响应则主动断开重连。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-eventloop]]：定时任务的承载者与调度精度来源；"EventLoop 不阻塞"纪律同样约束心跳回调。
- [[netty-connection-lifecycle]]：心跳守护的是 connect 之后、close 之前的存活期；心跳超时是触发 close 的典型来源。
- [[websocket-heartbeat-reconnect]]：同一问题的端侧三段式模式（检测/恢复/状态重建）；本概念是服务端连接层机制，二者互补。
- [[netty-reconnect]]：下游闭环——IdleStateEvent 超时 → 主动 close → channelInactive → 退避重连，检测与恢复合成完整链路（教程第 18 篇）。

### Dependencies（依赖项）

- EventLoop 的 ScheduledExecutorService（`ctx.executor().schedule`）。

### Distinctions（区分）

- 与 TCP SO_KEEPALIVE 的不同：TCP 层保活间隔长、无法感知应用层假死；本库既有工程信源一致主张长连接保活靠应用层心跳而非 SO_KEEPALIVE（见 [[netty]]）。
- 与 [[websocket-heartbeat-reconnect]] 的不同：后者是浏览器/前端 WebSocket 客户端的重连封装模式；本概念是 Netty 服务端/通用连接层的空闲检测原语。

## Evolution（演进）

- 2026-10-23：作为机制名出现在李林锋海量接入信源——长连接保活靠应用层心跳（IdleStateHandler）；同信源给出规模化反例：10 万长连接 MQTT 服务超时设 15 分钟 → 约 110 万 ScheduledFutureTask 老化进持久代被误判内存泄露，改 45 秒即愈。
- 2026-10-29：补齐源码级机制（教程第 17 篇）——三维检测/精确再调度/Promise 回调更新时间戳/isFirst 标记/EventLoop 承载；作者压测断言 10 万连接 30s 间隔 CPU 开销 <0.5%，>10 万连接建议 HashedWheelTimer 或时间段位图。
- 2026-10-29：第三信源（教程第 18 篇）——给出心跳+重连完整链路（IdleStateEvent → 主动 close → channelInactive → eventLoop.schedule 退避重连），本概念由"检测"扩展为"检测+恢复"闭环的上半环；注意该篇将 IdleStateHandler 描述为"本质上也是 ChannelInboundHandler"，与第 17 篇的 ChannelDuplexHandler 口径不一（该篇为简化示意，以 17 篇为准）。
- 2026-10-29：第四信源（番外篇 4）——生态用法印证：RocketMQ 服务端 `IdleStateHandler(0,0,60)`、通用服务端模板 `IdleStateHandler(60,0,0)`（60s 读空闲断连）；Dubbo 走另一条路——客户端用 `HashedWheelTimer` 自管定时心跳（默认 60s、最短 1s，大量连接定时任务比 ScheduledExecutorService 高效），服务端用 IdleStateHandler 容忍 3 倍客户端心跳间隔。Dubbo 案例为">10 万连接用时间轮替代"开放问题提供了工程先例。

## Open Questions（开放问题）

- 作者压测（10 万连接 <0.5% CPU）未给环境与方法细节；与李林锋"心跳周期 180s（微信 300s）由运营商 NAT 释放时间决定"的工程取值如何结合具体场景调优，信源未展开。
- >10 万连接时"HashedWheelTimer 或连接级时间段位图"的替代方案细节，信源仅点名未展开。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-17-idlestate-heartbeat.md`（机制源码级详解，单一自媒体教程信源；性能数字为作者自述）
- Source: `raw/sources/architecture/2026-10-23-netty-million-connection-push-service.md`（应用层心跳立场与 10 万连接 ScheduledFutureTask 事故案例，李林锋）
- Source: `raw/sources/architecture/2026-10-27-netty-18-reconnect.md`（心跳+重连完整链路：空闲检测 → close → channelInactive → 退避重连）
- Source: `raw/sources/architecture/2026-10-27-netty-in-mainstream-middleware.md`（生态印证：RocketMQ/模板 60s 配置；Dubbo HashedWheelTimer 心跳 + 服务端 3 倍容忍）

## Related Knowledge（相关知识）

- [[netty-17-idlestate-heartbeat]]（信源页）
- [[netty-million-connection-push-service]]（信源页：事故案例与心跳取值）
- [[netty-18-reconnect]]（信源页：心跳+重连完整链路）
- [[netty]]（实体页）
