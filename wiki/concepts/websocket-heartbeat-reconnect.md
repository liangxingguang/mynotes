---
id: wiki-concept-websocket-heartbeat-reconnect
type: concept
title: WebSocket 心跳保活与断线重连
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - concept
  - im
  - websocket
  - frontend
sources:
  - raw/sources/architecture/2026-10-23-im-websocket-reconnect-heartbeat.md
related:
  - wiki/sources/im-websocket-reconnect-heartbeat.md
  - wiki/sources/nginx-websocket-million-connections.md
---
# WebSocket 心跳保活与断线重连

## Definition（定义）

Web 端长连接可靠性的三段式工程模式：**检测**（应用层双向心跳，超时未收到任何消息即判定假死并主动断开）、**恢复**（指数退避重连，避免抖动期重连风暴）、**状态重建**（重连后重新鉴权、重新加入房间、补发离线队列消息）。

## Why It Matters（为什么重要）

网络抖动、切 WiFi、休眠都会断线；且 TCP 层对半开连接无感知，仅靠 onclose 事件发现不了「假死」。不做这套机制，用户只能手动刷新页面。作者声称该方案在多个 IM 项目断线重连成功率 99%+（未给测量口径 → confidence: medium）。

## Core Characteristics（核心特征）

1. **双向心跳判活**：前端定时发 PING（默认 30s 间隔），heartbeatTimeout（默认 10s）内未收到任何消息（含 PONG）就主动 close 触发重连；收到任何消息都重置超时计时器。
2. **指数退避重连**：`delay × decay^attempts` 封顶 maxReconnectDelay（默认 1s 起步、decay 1.5、封顶 30s）；达到 maxReconnectAttempts 后发 reconnectFailed 事件。
3. **离线消息队列**：连接未 OPEN 时 send 入队，onopen 后批量补发；需幂等/去重防重复。
4. **手动关闭区分**：manualClose 标志使用户主动退出不再触发重连；onerror 不处理重连（onclose 会随后触发）。
5. **生产配套**：visibilitychange 后台心跳降频（20s→60s）、前台立即查连接；navigator.onLine 网络恢复即重连；重连后处理 401 重新鉴权；前后端约定 PING/PONG 格式，后端 60s 未收 PING 主动踢人。

## Structure（结构）

`ReconnectingWebSocket` 类封装：connect（建连与事件绑定）→ startHeartbeat/resetHeartbeatTimeout（心跳与超时）→ scheduleReconnect（退避调度）→ messageQueue/flushMessageQueue（离线补发）→ on/off/emit（事件系统）→ close（手动关闭）。

## How It Works（运作方式）

断线检测不依赖单点信号：onclose 捕获正常关闭，心跳超时捕获假死，二者汇合到 scheduleReconnect；退避延迟随次数指数增长直至封顶；重连成功后 onopen 里完成鉴权（AUTH token）、入房、队列补发的状态重建。

## Relationships（关系）

### Related Concepts（相关概念）

（暂无同层概念页）

### Dependencies（依赖项）

- 浏览器 WebSocket API 与页面可见性 API、navigator.onLine。

### Distinctions（区分）

- 与 TCP KeepAlive 的区别：TCP 层保活无法感知应用层假死且默认间隔过长，应用层心跳是必需而非可选（信源援引 52im 两篇 TCP 保活文章佐证，未单独收录）。

## Evolution（演进）

（单一信源，无演进记录）

## Open Questions（开放问题）

- 心跳间隔/超时参数在不同网络（移动弱网 vs WiFi）下的调优依据，信源只给默认值。
- 与服务端连接层设计（如 [[nginx-websocket-million-connections|Nginx 百万长连接]] 的空闲超时）的参数对齐策略未展开。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-im-websocket-reconnect-heartbeat.md`（单篇教程信源，含完整代码与参数默认值；99%+ 成功率为作者断言）

## Related Knowledge（相关知识）

- [[im-websocket-reconnect-heartbeat|IM聊天不掉线？生产级WebSocket断线重连、心跳保活实战]]
- [[nginx-websocket-million-connections|百万 WebSocket 长连接背后的 Nginx 架构设计与踩坑实录]]
