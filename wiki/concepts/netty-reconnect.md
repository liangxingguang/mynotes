---
id: wiki-concept-netty-reconnect
type: concept
title: Netty 断线重连机制
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - concept
  - netty
  - network
  - reliability
sources:
  - raw/sources/architecture/2026-10-27-netty-18-reconnect.md
related:
  - wiki/concepts/netty-idlestate-heartbeat.md
  - wiki/concepts/netty-connection-lifecycle.md
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/websocket-heartbeat-reconnect.md
  - wiki/entities/netty.md
---
# Netty 断线重连机制

## Definition（定义）

基于 Netty 事件驱动模型实现的客户端长连接自动恢复模式：Netty 不提供内置自动重连开关，而是由 `ChannelFutureListener`（connect 失败回调）+ `channelInactive`（连接断开事件）+ `EventLoop.schedule()`（延迟调度）三件套组装，配合 `IdleStateHandler` 检测假死连接，形成「检测 → 断开 → 退避重连 → 状态重建」闭环。

## Why It Matters（为什么重要）

真实网络中连接断开是常态（抖动、服务端重启、NAT/防火墙空闲超时、客户端网络切换）；长连接应用（IM、IoT、推送、游戏）不做自动恢复即灾难级体验。同时重连实现不当会自我 DoS（重连风暴/惊群效应），因此退避策略与线程模型纪律是机制的承重部分而非点缀。

## Core Characteristics（核心特征）

1. **双时机触发**：connect 的 ChannelFuture 失败回调（建立失败）与 channelInactive（已建立后断开）两个入口都要挂重连。
2. **指数退避 + 随机抖动 + 封顶**：`delay = min(1s × 2^retry + random(0,1s), 30s)`；抖动防服务端恢复瞬间被并发重连打崩（惊群）。
3. **EventLoop 线程纪律**：重连必须 `eventLoop.schedule()` 延迟执行 connect，保持 Channel 操作串行化；禁止在 channelInactive 回调里直接 connect，禁止另起线程阻塞重试。
4. **与空闲检测联动**：IdleStateEvent → 主动 close → channelInactive → 触发重连，心跳与重连合成完整链路。
5. **状态重建与防误触**：重连成功后在 channelActive 重新认证/初始化（序列号、未确认消息、token）；用标志位区分主动 close（不重连）与被动断开。

## Structure（结构）

`ReconnectHandler/ReconnectManager`（退避计算 computeDelay + 计数重置 + stop 开关）→ `AutoReconnectHandler extends ChannelInboundHandlerAdapter`（channelInactive/exceptionCaught 触发）→ `eventLoop.schedule(connect)` → connect 成功 Listener 重置计数。

## How It Works（运作方式）

断线感知有两路：被动（对端关闭 → read 返回 -1 → closeOnRead → fireChannelInactive）与主动（IdleStateHandler 超时 → 业务 close → channelInactive）。两路汇入 channelInactive 后，Handler 调 `eventLoop.schedule()` 按退避延迟发起新 connect；成功则 reset 计数并在 channelActive 做状态重建，失败则递归进入下一次退避。全过程不离开 EventLoop 线程，无并发问题。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-idlestate-heartbeat]]：假死检测提供方，与本概念构成「检测+恢复」完整链路。
- [[netty-connection-lifecycle]]：channelInactive 触发链路（read -1 → closeOnRead → fireChannelInactive）与 close 优雅清理的源码基础。
- [[websocket-heartbeat-reconnect]]：端侧（浏览器 WebSocket）三段式模式，指数退避与状态重建结论两端互证。

### Dependencies（依赖项）

- [[netty-eventloop]]：schedule 调度与串行化语义的承载者。

### Distinctions（区分）

- 与 [[websocket-heartbeat-reconnect]] 的不同：后者是前端 WebSocket 客户端的封装模式（含离线队列补发）；本概念是 Netty 框架层的连接恢复机制，面向任意 TCP 长连接。

## Evolution（演进）

- 2026-10-29：随教程第 18 篇建立（单信源）。

## Open Questions（开放问题）

- 最大重试次数、退避参数的取值依据信源只给示例默认（无限重试、30s 封顶），不同业务 SLA 下的调优未展开。
- 与服务端连接速率限制的配合（信源仅点名"服务端做限流"）无机制细节。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-18-reconnect.md`（单一自媒体教程信源；示例代码为作者自研组件，非 Netty 官方）

## Related Knowledge（相关知识）

- [[netty-18-reconnect]]（信源页）
- [[netty-17-idlestate-heartbeat]]（信源页：心跳机制前篇）
- [[netty]]（实体页）
