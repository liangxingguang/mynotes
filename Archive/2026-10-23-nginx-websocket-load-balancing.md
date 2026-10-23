---
id: 2026-10-23-nginx-websocket-load-balancing
title: Nginx生产级WebSocket实时长连接负载均衡实战
source: SegmentFault（银河技术）
source_url: https://segmentfault.com/a/1190000048281968
source_type: 文章
platform: SegmentFault
created: 2026-10-23
category: 技术
tags:
  - 工程实践
  - 分布式系统
asset_ref: Assets/2026/10/nginx-websocket-load-balancing.md
wiki_status: ingested
---

# Nginx生产级WebSocket实时长连接负载均衡实战

> WebSocket 长连接 + 状态敏感，Nginx 反代有五个关键点：协议升级、连接保持、超时控制、负载策略、云环境断连。核心配置三件套 `proxy_http_version 1.1` + `Upgrade/Connection` 头 + `proxy_buffering off`；生产必改用 `map $http_upgrade $connection_upgrade`（空则 close，避免普通 HTTP 被误升级）；`proxy_read_timeout` 拉到 3600s~7d 防 Nginx 主动断连。云 LB/NAT/防火墙空闲断连 Nginx 配什么都没用，必须应用层 20~30s 心跳。

## 核心要点

- **升级头正确姿势**：`map $http_upgrade $connection_upgrade { default upgrade; '' close; }`——非 WS 请求回 close、WS 请求回 upgrade，是最易踩坑点
- **基础四件套**：http/1.1 + Upgrade 头 + `proxy_buffering off`（防消息延迟）+ 长 read/send timeout（防主动断连）；同时透传 Host/X-Real-IP/X-Forwarded-*
- **HTTP/2 认知**：浏览器 WS 仍走 HTTP/1.1，RFC 8441 支持有限，listen 443 http2 与 WS location 显式 1.1 共存是正常的
- **K8s/云隐藏断连点**：云 LB 空闲超时、NAT 会话老化、防火墙——只能靠应用层心跳（20~30s ping）；K8s 优雅下线配 `terminationGracePeriodSeconds: 60` + SIGTERM 停新连接/通知客户端重连
- **负载均衡**：ip_hash 做基础亲和，但 WS 不适合强依赖 LB 粘性会话，状态放 Redis 等共享存储
- **高并发调优**：`worker_rlimit_nofile 200000` + `worker_connections 65535` + epoll；内核 somaxconn=65535、tcp_tw_reuse=1、tcp_fin_timeout=15
- **排障命令**：`wscat -c ws://domain/ws` 验证、`ss -an | grep ESTAB | wc -l` 看连接数

## 正文

详见附件抓取正文（全文已收录，含基础/生产/K8s 三套完整配置）。

## 来源

- [Nginx生产级WebSocket实时长连接负载均衡，一文搞定 - SegmentFault](https://segmentfault.com/a/1190000048281968)

## 附件

- [[Assets/2026/10/nginx-websocket-load-balancing.md]]
