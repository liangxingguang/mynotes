---
id: 2026-10-23-im-websocket-reconnect-heartbeat
title: IM聊天不掉线？生产级WebSocket断线重连、心跳保活实战
source: SegmentFault（老前端的功夫）
source_url: https://segmentfault.com/a/1190000048352893
source_type: 文章
platform: SegmentFault
created: 2026-10-23
category: 技术
tags:
  - 工程实践
  - 分布式系统
asset_ref: Assets/2026/10/im-websocket-reconnect-heartbeat.md
wiki_status: ingested
---

# IM聊天不掉线？生产级WebSocket断线重连、心跳保活实战

> 一套可直接落地的 Web 端 IM 长连接方案：ReconnectingWebSocket 类封装四件事——双向心跳（前端 PING + 超时未收任何消息主动断开，解决"连接已断但 TCP 未感知"）、指数退避重连（1s×1.5^n 封顶 30s，防重连风暴）、离线消息队列（重连期间消息入队、onopen 后批量补发，需幂等去重）、manualClose 标志区分手动关闭与异常断线。生产补充：页面可见性降频心跳、navigator.onLine 网络恢复立即重连、重连后 401 重新鉴权；后端配套超时踢人（如 60s 未收 PING 主动断）。

## 核心要点

- **断线检测**：onclose 事件之外必须有应用层心跳——heartbeatTimeout 内未收到任何消息（含 PONG）就主动 close 触发重连；单向 PING 无法区分"正常"与"假死"
- **指数退避**：delay×decay^attempts 封顶 maxReconnectDelay（默认 1s→30s、decay 1.5），避免抖动期重连风暴压垮服务端；maxReconnectAttempts 到达后 emit reconnectFailed
- **离线队列**：send 在连接未 OPEN 时入 messageQueue，onopen 时 flushMessageQueue 批量补发；注意消息幂等/去重防重复
- **状态恢复**：重连成功后需重新鉴权（AUTH token）、重新加入房间；onerror 不处理重连（onclose 会随后触发）
- **生产优化**：visibilitychange 后台降频心跳（20s→60s）、前台立即查连接；监听 onLine 网络恢复即重连；处理 token 过期 401 引导重登；前后端约定 PING/PONG 格式 + 后端 60s 未收 PING 踢人
- 实测断线重连成功率 99%+，代码可直接复用微调参数

## 正文

详见附件抓取正文（全文已收录，含完整 ReconnectingWebSocket 类实现与使用示例）。

## 来源

- [IM聊天不掉线？生产级WebSocket断线重连、心跳保活实战 - SegmentFault](https://segmentfault.com/a/1190000048352893)

## 附件

- [[Assets/2026/10/im-websocket-reconnect-heartbeat.md]]
