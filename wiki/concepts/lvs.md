---
id: wiki-concept-lvs
type: concept
title: LVS（Linux Virtual Server）
status: active
created: 2026-11-26
updated: 2026-11-26
confidence: medium
tags:
  - concept
  - 系统设计
sources:
  - raw/sources/architecture/2026-11-26-lvs-keepalived-nginx.md
related:
  - wiki/concepts/keepalived.md
  - wiki/concepts/nginx-gateway-production-design.md
  - wiki/topics/system-design-core-components.md
  - wiki/sources/lvs-keepalived-nginx.md
---
# LVS（Linux Virtual Server）

## Definition（定义）

LVS（Linux Virtual Server）是一个运行在 Linux 内核层的负载均衡框架，由国人章文嵩博士主导开发。它通过修改内核的 IP 层，将请求转发到后端真实服务器（Real Server, RS），属于四层（传输层）负载均衡。

## Why It Matters（为什么重要）

百万并发场景下，单台服务器在 CPU、内存、网络 IO、连接数上均存在瓶颈，流量入口必须先做负载均衡。LVS 工作在内核 IP 层、只按目标 IP + 端口转发、不解析应用层报文，转发路径极短，本身几乎不占 CPU，抗负载能力极强，是大规模前端流量分发的常见底座。

## Core Characteristics（核心特征）

1. **内核级实现**：运行于 Linux 内核层，直接修改内核 IP 层完成转发，用户态开销极小。
2. **四层转发**：仅工作在 TCP/UDP 传输层（OSI 第四层），依据数据包的目标 IP 和端口转发。
3. **不解析应用层**：不涉及 HTTP 报文、Cookie 等应用层内容解析，处理流程简化、转发速度快。
4. **低 CPU 开销**：只是简单转发数据包，几乎不占用 CPU 做复杂计算，抗负载能力极强，信源称可轻松支撑百万级并发连接（单信源主张，未量化验证）。
5. **面向 Real Server 集群**：转发目标是后端真实服务器（RS），通常后端再挂应用集群（如 Nginx/Tomcat）。

## Structure（结构）

按信源描述的典型分层：

```
用户请求 → 负载均衡层（LVS） → 应用服务器集群（Nginx/Tomcat 等） → 数据层
```

LVS 处于负载均衡层，对外呈现虚拟 IP（VIP），对内将流量分发至 Real Server 集群。

## How It Works（运作方式）

- 客户端请求到达 LVS 对外暴露的 VIP；
- LVS 在传输层依据目标 IP + 端口将数据包转发到后端 Real Server，不触碰应用层内容；
- 因只做数据包转发、无应用层解析，CPU 占用低，转发吞吐高。

（解读）从「只转发不解析」的机制推断：LVS 适合对转发吞吐要求极高、无需按应用层内容做路由的场景；需要按 URL/Header 等应用层信息路由时，应由其上层的七层负载均衡（如 Nginx）承担。

## Relationships（关系）

### Related Concepts（相关概念）

- [[keepalived]]：LVS 提供高性能转发但不解决自身单点故障，Keepalived 以 VRRP 心跳提供主备切换与健康检查，二者组合构成「四层负载均衡 + 高可用」方案。
- [[nginx-gateway-production-design]]：Nginx 是七层（应用层）网关，LVS 是四层转发器；典型部署中 LVS 在 Nginx 之前做流量分发，Nginx 在其上承担路由、TLS、限流等应用层职责。

### Dependencies（依赖项）

- Linux 内核（LVS 直接工作在内核 IP 层）。
- 后端 Real Server 集群与健康检查机制（当前信源未展开健康检查由谁执行——LVS 自身不负责，实际由 Keepalived 承担，见 [[keepalived]]）。

### Distinctions（区分）

- **LVS vs Nginx 负载均衡**：LVS 是四层（传输层）内核级转发，按 IP+端口分发、不解析应用层；Nginx 是七层（应用层）反向代理，可按 URL/Header 路由并承担 TLS/限流等职责。两者分层协作而非替代。
- **LVS vs 硬件负载均衡器**：当前信源未涉及硬件 LB（如 F5）对比，该维度当前信源未确立。

## Evolution（演进）

- 当前信源为科普性介绍，未给出 LVS 的历史演进与版本脉络；调度算法（轮询/加权等）与工作模式（NAT/DR/TUN）等常见实现细节在本信源中未覆盖，待后续信源补充。

## Open Questions（开放问题）

- LVS 各调度算法与工作模式（NAT/DR/TUN）的适用场景对比：当前信源未确立。
- LVS 与硬件负载均衡器、云负载均衡服务的选型对比：当前信源未确立。
- 「百万级并发连接」的量化依据（连接数、吞吐实测）：当前信源未确立。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-26-lvs-keepalived-nginx.md`（定义、内核层实现、四层转发、章文嵩、Real Server、性能特征）

## Related Knowledge（相关知识）

- [[keepalived|Keepalived（VRRP 主备与健康检查）]]
- [[nginx-gateway-production-design|生产级 Nginx 网关设计]]
- [[system-design-core-components|系统设计核心组件]]
- [[lvs-keepalived-nginx|百万并发架构设计：LVS + Keepalived + Nginx 架构详解（信源页）]]
