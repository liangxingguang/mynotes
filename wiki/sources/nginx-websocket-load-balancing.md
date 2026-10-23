---
id: wiki-source-nginx-websocket-load-balancing
type: source
title: Nginx生产级WebSocket实时长连接负载均衡，一文搞定（银河技术）
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - nginx
  - websocket
  - load-balancing
  - k8s
  - architecture
sources:
  - raw/sources/architecture/2026-10-23-nginx-websocket-load-balancing.md
related:
  - wiki/concepts/websocket-heartbeat-reconnect.md
  - wiki/sources/nginx-websocket-million-connections.md
  - wiki/sources/im-websocket-reconnect-heartbeat.md
---
# Nginx生产级WebSocket实时长连接负载均衡，一文搞定（银河技术）

## Overview（概览）

WebSocket 长连接 + 状态敏感，在 Nginx 反代下的系统性配置指南：从基础反代四件套、生产级 Upgrade 头处理、HTTP/2 共存认知，到 K8s/云环境断连点、应用层心跳、负载均衡策略与高并发内核调优，附排障命令。

## Key Facts（关键事实）

- WebSocket 基于 HTTP/1.1 Upgrade 握手，升级后成为长期保持的双向 TCP 通道，因此对 Nginx 超时/FD/内核参数/LB 极度敏感。
- 基础四件套：`proxy_http_version 1.1` + `Upgrade`/`Connection` 头 + `proxy_buffering off`（防消息延迟）+ 拉长 `proxy_read_timeout`/`proxy_send_timeout`（3600s~86400s，K8s 场景至 7d）防 Nginx 主动断连；同时透传 Host/X-Real-IP/X-Forwarded-*。
- 最易踩坑点：生产必用 `map $http_upgrade $connection_upgrade { default upgrade; '' close; }`——非 WS 请求回 close，避免普通 HTTP 被错误升级。
- HTTP/2 认知：浏览器 WebSocket 仍走 HTTP/1.1；HTTP/2 WebSocket（RFC 8441）浏览器支持有限、Nginx 支持不完整；`listen 443 ssl http2` 与 WS location 显式 `proxy_http_version 1.1` 共存是正常现象。
- 云/K8s 隐藏断连点：云 LB 空闲超时、NAT 会话老化、防火墙空闲断连——Nginx 配置无解，必须应用层心跳（推荐 20~30 秒一次 ping）。
- 负载均衡：upstream `ip_hash` 做基础亲和（可配 weight/backup，健康检查依赖非官方 nginx_upstream_check_module）；WS 本质不适合强依赖 LB 粘性会话，状态应放 Redis 等共享存储。
- K8s 优雅下线：`terminationGracePeriodSeconds: 60`；后端收到 SIGTERM 后停新 WS、通知客户端重连、平滑下线。
- 高并发调优：`worker_rlimit_nofile 200000` + `worker_connections 65535` + epoll；内核 `somaxconn=65535`、`tcp_tw_reuse=1`、`tcp_fin_timeout=15`；连接限制 `limit_conn`。
- 排障：`wscat -c ws://domain/ws` 验证链路；`ss -an | grep ESTAB | wc -l` 看连接数。

## Important Claims（重要论断）

### Claim 1：云环境的空闲断连不在 Nginx 控制面内

云 LB 空闲超时、NAT 会话老化、防火墙断连发生在 Nginx 之外的链路设备上，"Nginx 再怎么配都没用，必须应用层心跳"——20~30s ping 是生产必做项。

### Claim 2：WebSocket 不适合强依赖 LB 粘性会话

ip_hash 只作基础亲和，会话状态必须放共享存储；否则扩缩容与后端漂移即断业务。

## Concepts Introduced（引入的概念）

（未新开概念页；心跳保活部分归入 [[websocket-heartbeat-reconnect|WebSocket 心跳保活与断线重连]]，作为其第二信源）

## Entities Mentioned（提及的实体）

- Nginx（未立实体页；配置对象）
- nginx_upstream_check_module（非官方健康检查模块；未立实体页）

## Implications（影响／启示）

- `map $http_upgrade $connection_upgrade` 是 WebSocket 反代配置从"能跑"到"生产可用"的分水岭——不写它，普通 HTTP 请求会被误升级。
- 长连接系统的断连面要按「本进程（Nginx 超时）→ 中间设备（LB/NAT/防火墙）→ 对端」分层排查，每层各有对策，应用层心跳是唯一跨层通解。
- 心跳取值的对照：本信源面向云环境推荐 20~30s；李林锋面向移动网络按 NAT 释放（约 5 分钟）推荐 180s（见 [[netty-million-connection-push-service|李林锋信源]]）——场景不同，量纲差一个数量级。

## Limitations（局限）

- 教程类信源，无生产事故复盘与实测数据支撑。
- 健康检查依赖非官方模块，官方 Nginx 开源版无主动健康检查，文中未展开此约束。
- `proxy_read_timeout 7d` 等极端取值的副作用（句柄占用、慢关闭堆积）未讨论。

## Related Knowledge（相关知识）

- [[websocket-heartbeat-reconnect|WebSocket 心跳保活与断线重连]]（端侧三段式；本信源补服务端/链路侧视角）
- [[nginx-websocket-million-connections|百万 WebSocket 长连接背后的 Nginx 架构设计与踩坑实录]]（Nginx WS 容量侧）
- [[im-websocket-reconnect-heartbeat|IM聊天不掉线？生产级WebSocket断线重连、心跳保活实战]]
- [[netty-million-connection-push-service|绝对干货：基于Netty实现海量接入的推送服务技术要点（李林锋）]]（心跳周期取值的移动网络视角）

## Source（信源）

- `raw/sources/architecture/2026-10-23-nginx-websocket-load-balancing.md`
