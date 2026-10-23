---
id: wiki-source-nginx-websocket-million-connections
type: source
title: 百万 WebSocket 长连接背后的 Nginx 架构设计与踩坑实录
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - nginx
  - websocket
  - long-connection
  - architecture
sources:
  - raw/sources/architecture/2026-10-22-nginx-websocket-million-connections.md
related:
  - wiki/entities/netty.md
  - wiki/sources/netty-iot-gateway-resilient-design.md
  - wiki/sources/netty-redis-kafka-iot-gateway.md
---
# 百万 WebSocket 长连接背后的 Nginx 架构设计与踩坑实录

## Overview（概览）

Nginx 作为 WebSocket 反向代理的生产级实践：握手原理、最小可用配置、容量模型、负载均衡、优雅下线、内核调优与可观测性，附 Go 网关代码与 10 类踩坑实录。核心观点：WebSocket 不是 HTTP 网关的平移，而是"连接资产运营"。

## Key Facts（关键事实）

- 五件事缺一不可：握手透传（HTTP/1.1 + Upgrade/Connection）、长连接存活（心跳+超时匹配）、连接扩展（状态外部化）、平滑发布（draining 摘流）、故障可观测——**多数事故是只做了第一件**。
- Nginx 职责边界：只做 TLS 终结/转发/限流/日志；不管会话状态、订阅关系、广播总线、消息 ACK——后端 Gateway 层才是架构能否放大的关键。
- 关键配置：`proxy_read_timeout` 略大于心跳间隔（Ping 25s/超时 75s）；`proxy_buffering off`；`proxy_next_upstream off`（防 Upgrade 被不透明重试）；`worker_rlimit_nofile` 要配合 systemd LimitNOFILE 一起调。
- 容量模型：百万连接 ≈ 8~20GB 内存（单连接 8~20KB）+ 每秒 4 万次心跳事件；瓶颈四类——fd、内存、网卡带宽、事件循环阻塞（**CPU 高不高会误判**）。
- 状态外部化三件套：本地内存存热状态（connId→socket）、Redis 存全局路由（userId→nodeId）、Kafka/NATS 做跨节点广播总线；LB 优先 least_conn，ip_hash 有 NAT 热点问题，一致性哈希适合按业务 ID 路由。
- 优雅下线防重连风暴：draining 摘新流量（readiness 失败）→ 老连接缓冲期 → 通知客户端退避重连 → 超时关闭；配合 preStop + terminationGracePeriodSeconds。
- 踩坑精选：60 秒稳定断连=超时与心跳不匹配；CPU 不高但延迟升=慢连接堆积/事件循环被业务卡住；压测能扛线上扛不住=压测没模拟真实连接生命周期；**"百万空连接"（半开/机器人/无订阅驻留）比连接数更危险**。
- 总线演进路径：单机内存广播 → Redis Pub/Sub → Redis+状态外部化 → Kafka/NATS。

## Important Claims（重要论断）

### Claim 1：WebSocket 是"连接资产运营"，不是 HTTP 网关平移

连接是长期持有的资产：容量、发布、观测都要按"连接生命周期"重新设计——只配通握手的系统必然在后四件事上出事故（信源核心观点）。

## Concepts Introduced（引入的概念）

（无——长连接 draining/状态外部化与 IoT 双信源同构互证，未立新页）

## Entities Mentioned（提及的实体）

- Nginx（单一信源，不立实体页）；Redis/Kafka/NATS 作为状态外部化组件提及

## Implications（影响／启示）

- 与 IoT 双信源构成"Web 端长连接 vs 设备端长连接"同构：draining、重连风暴、容量模型、心跳/超时匹配、状态外部化三件套逐条对应——长连接运营是一套跨协议通用纪律（解读）。

## Limitations（局限）

- Go 网关示例为教学骨架；容量数字（8~20KB/连接）随实现栈波动。

## Related Knowledge（相关知识）

- [[netty|Netty（实体页）]]（设备端长连接的同一纪律）
- [[netty-iot-gateway-resilient-design|Netty 可恢复连接系统（信源页）]]
- [[netty-redis-kafka-iot-gateway|Netty+Redis+Kafka IoT 平台（信源页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-22-nginx-websocket-million-connections.md`
