---
id: 2026-10-22-nginx-websocket-million-connections
title: 百万 WebSocket 长连接背后的 Nginx 架构设计与踩坑实录
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/b-WPvJdAEI6fsxyN9hQysA
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - 工程实践
  - 分布式系统
  - nginx
  - WebSocket
asset_ref: Assets/2026/10/nginx-websocket-million-connections.md
wiki_status: ingested
---

# 百万 WebSocket 长连接背后的 Nginx 架构设计与踩坑实录

> 系统讲解 Nginx 作为 WebSocket 反向代理的生产级实践：从握手原理、最小可用配置到容量模型、负载均衡、优雅下线、内核调优与可观测性，附 Go 网关代码示例与 10 类线上踩坑实录。核心观点：WebSocket 不是 HTTP 网关的平移，而是"连接资产运营"，需当完整实时通信基础设施来设计。

## 核心要点

- **五件事缺一不可**：握手透传（HTTP/1.1 + Upgrade/Connection）、长连接存活（心跳+超时匹配）、连接扩展（状态外部化）、平滑发布（draining 摘流）、故障可观测——多数事故是只做了第一件
- **Nginx 职责边界**：只做 TLS 终结/转发/限流/日志；不管会话状态、订阅关系、广播总线、消息 ACK——后端 Gateway 层才是架构能否放大的关键
- **关键配置**：`proxy_read_timeout` 略大于心跳间隔（Ping 25s/超时 75s）、`proxy_buffering off`、`proxy_next_upstream off`（防 Upgrade 不透明重试）、`worker_rlimit_nofile` 要配合 systemd LimitNOFILE 一起调
- **容量模型先行**：百万连接 ≈ 8~20GB 内存（单连接 8~20KB）+ 每秒 4 万次心跳事件；瓶颈四类——fd、内存、网卡带宽、事件循环阻塞（CPU 高不高会误判）
- **状态外部化三件套**：本地内存存热状态（connId→socket）、Redis 存全局路由（userId→nodeId）、Kafka/NATS 做跨节点广播总线；负载均衡优先 least_conn，ip_hash 有 NAT 热点问题
- **优雅下线防重连风暴**：先 draining 摘新流量（readiness 失败）→ 老连接缓冲期 → 通知客户端退避重连 → 超时关闭；配合 preStop + terminationGracePeriodSeconds
- **踩坑精选**：60 秒稳定断连=超时与心跳不匹配；CPU 不高但延迟升=慢连接堆积/事件循环被业务卡住；压测能扛线上扛不住=压测没模拟真实连接生命周期；"百万空连接"（半开/机器人/无订阅驻留）比连接数更危险
- **总线演进路径**：单机内存广播 → Redis Pub/Sub → Redis+状态外部化 → Kafka/NATS

## 正文

全文配置、Go 代码与案例见 [[Assets/2026/10/nginx-websocket-million-connections.md]]。

## 来源

- [百万 WebSocket 长连接背后的 Nginx 架构设计与踩坑实录](https://mp.weixin.qq.com/s/b-WPvJdAEI6fsxyN9hQysA)

## 附件

- [[Assets/2026/10/nginx-websocket-million-connections.md]]
