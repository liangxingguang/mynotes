---
id: wiki-source-im-websocket-reconnect-heartbeat
type: source
title: IM聊天不掉线？生产级WebSocket断线重连、心跳保活实战
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - im
  - websocket
  - frontend
  - engineering
sources:
  - raw/sources/architecture/2026-10-23-im-websocket-reconnect-heartbeat.md
related:
  - wiki/concepts/websocket-heartbeat-reconnect.md
  - wiki/sources/nginx-websocket-million-connections.md
---
# IM聊天不掉线？生产级WebSocket断线重连、心跳保活实战

## Overview（概览）

SegmentFault 教程（同步发布于 52im.net）：给出一个可直接落地的 Web 端 `ReconnectingWebSocket` 类实现，封装心跳保活、指数退避重连、离线消息队列、手动关闭区分四件事，并附生产环境补充优化。

## Key Facts（关键事实）

- 双向心跳：前端定时发 PING，heartbeatTimeout（默认 10s）内未收到任何消息（含 PONG）就主动 close 触发重连——解决「连接已断但 TCP 未感知」的假死。
- 指数退避公式 `delay × decay^attempts`，默认 1s 起步、decay 1.5、封顶 30s；达到 maxReconnectAttempts 后 emit reconnectFailed。
- 离线队列：send 在连接未 OPEN 时入 messageQueue，onopen 时批量补发；需消息幂等/去重防重复。
- manualClose 标志区分手动关闭与异常断线，手动关闭不重连。
- 生产补充：visibilitychange 后台心跳降频（20s→60s）回前台立即查连接；navigator.onLine 网络恢复即重连；重连后重新鉴权（处理 401 引导重登）；后端配套 60s 未收 PING 踢人。
- 作者声称该方案在多个 IM 项目运行，断线重连成功率 99%+（未给出测量方法）。

## Important Claims（重要论断）

### Claim 1：onclose 事件不足以发现断线，必须有应用层心跳

单向 PING 无法区分「正常」与「假死」，必须以「超时未收到任何消息」为准绳主动断开。

### Claim 2：立即重连会放大故障，必须指数退避

网络抖动期立即重连大概率再次失败，退避既快速恢复又避免重连风暴压垮服务端。

## Concepts Introduced（引入的概念）

- [[websocket-heartbeat-reconnect|WebSocket 心跳保活与断线重连]]

## Entities Mentioned（提及的实体）

（无独立实体）

## Implications（影响／启示）

- 前端长连接的可靠性是「检测（心跳）→ 恢复（退避重连）→ 状态重建（鉴权/入房/补发）」三段式，缺一不可。
- 代码级实现可直接复用，参数按业务微调。

## Limitations（局限）

- 单一教程信源，成功率 99%+ 无测量口径；参数为经验默认值。
- 只覆盖 Web 端 WebSocket，不涉及移动端长连接与推送通道差异。

## Related Knowledge（相关知识）

- [[nginx-websocket-million-connections|百万 WebSocket 长连接背后的 Nginx 架构设计与踩坑实录]]（服务端侧的长连接承载）

## Source（信源）

- `raw/sources/architecture/2026-10-23-im-websocket-reconnect-heartbeat.md`
