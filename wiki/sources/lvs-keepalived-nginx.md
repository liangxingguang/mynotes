---
id: wiki-source-lvs-keepalived-nginx
type: source
title: 百万并发架构设计：LVS + Keepalived + Nginx 架构详解
status: active
created: 2026-11-26
updated: 2026-11-26
confidence: medium
tags:
  - 系统设计
sources:
  - raw/sources/architecture/2026-11-26-lvs-keepalived-nginx.md
related:
  - wiki/concepts/lvs.md
  - wiki/concepts/keepalived.md
  - wiki/concepts/nginx-gateway-production-design.md
  - wiki/topics/system-design-core-components.md
---
# 百万并发架构设计：LVS + Keepalived + Nginx 架构详解

## Overview（概览）

微信公众号「mikechen的互联网架构」的架构科普文，讲解百万并发的分层架构：用户请求 → 负载均衡层（LVS）→ 应用服务器集群（Nginx/Tomcat）→ 数据层，重点展开 LVS 四层负载均衡与 Keepalived 高可用的组合设计、工作流程与适用场景。

## Key Facts（关键事实）

- 单台应用服务器在 CPU、内存、网络 IO、连接数四方面均存在瓶颈，百万级并发必须采用分层架构（信源主张）
- LVS（Linux Virtual Server）是运行在 Linux 内核层的负载均衡框架，由章文嵩博士主导开发，通过修改内核 IP 层将请求转发至后端真实服务器（Real Server, RS）
- LVS 仅工作在 TCP/UDP 传输层（OSI 第四层），按目标 IP + 端口转发，不解析应用层报文（HTTP、Cookie），几乎不占 CPU，抗负载能力极强
- Keepalived 解决 LVS 单点故障，两大核心职责：主备切换（HA）+ 健康检查（Health Check，实时探测后端 Real Server 并自动摘除故障节点）
- 工作流程：Master 绑定 VIP 对外服务 → Keepalived 周期 VRRP 心跳检测 → Master 宕机 Backup 秒级接管 VIP → 客户端访问 VIP 不感知后端变化
- 适用场景：电商、支付、直播、游戏后端等大型网站前端网关层；LVS 负责流量分发（高性能高并发），Keepalived 负责主备切换（高可用）

## Important Claims（重要论断）

### Claim 1：百万并发必须分层

高并发场景下单台服务器存在 CPU/内存/网络 IO/连接数四类瓶颈，必须以分层架构（负载均衡层 → 应用集群 → 数据层）拆解，LVS + Keepalived 是其中「四层负载均衡 + 高可用」的最常见、最稳定组合。

### Claim 2：LVS 的性能来自「只转发不解析」

LVS 只根据数据包的目标 IP 和端口在传输层转发，不涉及应用层内容解析，处理流程简化，本身几乎不占用 CPU 计算资源，因此抗负载能力极强，可支撑百万级并发连接。

### Claim 3：Keepalived 以 VRRP 实现节点高可用

LVS 本身高并发但不解决自身宕机问题；Keepalived 通过 VRRP 心跳实现主备切换与后端健康检查，使整个负载均衡层具备高可用，切换自动完成、秒级生效。

## Concepts Introduced（引入的概念）

- [[lvs]]
- [[keepalived]]

## Entities Mentioned（提及的实体）

- 章文嵩博士（LVS 主导开发者，单信源提及，未立实体页）

## Implications（影响／启示）

- 前端流量入口的常见选型是「LVS（四层 LB，内核级转发性能）+ Keepalived（HA）」承担流量分发与节点高可用，其上再挂 Nginx/Tomcat 应用集群——与 [[nginx-gateway-production-design]] 的七层网关职责形成前后分层互补
- 「高性能转发」与「高可用」应分开选型：LVS 解决吞吐，Keepalived 解决单点故障，二者职责不可互相替代

## Limitations（局限）

- 单信源微信公众号科普文，无实测数据与基准；VRRP 切换「秒级」等说法未经量化验证
- 未覆盖 LVS 的调度算法（轮询/加权/最少连接等）、工作模式（NAT/DR/TUN）与 Keepalived 配置细节，这些内容当前信源未确立
- 架构配图为 1px 占位符（采集时未能抓取），结构以文中 ASCII 图与文字为准

## Related Knowledge（相关知识）

- [[lvs|LVS（Linux Virtual Server）]]
- [[keepalived|Keepalived（VRRP 主备与健康检查）]]
- [[nginx-gateway-production-design|生产级 Nginx 网关设计]]
- [[system-design-core-components|系统设计核心组件]]

## Source（信源）

- `raw/sources/architecture/2026-11-26-lvs-keepalived-nginx.md`
