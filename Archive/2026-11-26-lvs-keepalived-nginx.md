---
id: 2026-11-26-lvs-keepalived-nginx
title: 百万并发架构设计：LVS + Keepalived + Nginx 架构详解
source: 微信公众号「mikechen的互联网架构」
source_url: https://mp.weixin.qq.com/s/fTZestADHg4FLPxjtZyG4w
source_type: link
platform: 微信
created: 2026-11-26
category: 技术
tags: [nginx, 系统设计, Java]
asset_ref: Assets/2026-11/mp-weixin-fTZestADHg4FLPxjtZyG4w.md
wiki_status: ingested
---

# 百万并发架构设计：LVS + Keepalived + Nginx 架构详解

> 百万并发需分层架构：用户请求 → 负载均衡层（LVS）→ 应用集群（Nginx/Tomcat）→ 数据层。LVS 负责四层流量分发（高性能高并发），Keepalived 通过 VRRP 心跳实现主备切换与健康检查（高可用），二者是电商、支付、直播、游戏后端前端网关的常见组合。

## 核心要点

- **分层解瓶颈**：单台服务器在 CPU/内存/网络 IO/连接数上均有瓶颈，百万级并发必须分层，LVS+Keepalived 是最稳定的四层负载均衡+高可用组合
- **LVS 四层转发**：运行于 Linux 内核层（章文嵩博士主导），仅按目标 IP+端口在 TCP/UDP 层转发，不解析应用层报文，几乎不耗 CPU，抗负载能力极强
- **Keepalived 两大职责**：主备切换（主节点故障后备节点自动接管 VIP）+ 健康检查（实时探测后端 Real Server，自动摘除故障节点）
- **工作流**：Master 绑定 VIP 对外服务 → Keepalived 周期 VRRP 心跳检测 → Master 宕机则 Backup 秒级接管 VIP → 客户端访问 VIP 不感知后端变化
- **适用场景**：大型网站前端网关层，低成本、可扩展、高可用的负载均衡底座

## 正文

见 [[Assets/2026-11/mp-weixin-fTZestADHg4FLPxjtZyG4w]] 采集正文（架构图以文本形式保留，配图采集为占位符）。

## 来源

- 原文：https://mp.weixin.qq.com/s/fTZestADHg4FLPxjtZyG4w

## 附件

- [[Assets/2026-11/mp-weixin-fTZestADHg4FLPxjtZyG4w.md]]
