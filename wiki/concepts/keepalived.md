---
id: wiki-concept-keepalived
type: concept
title: Keepalived（VRRP 主备与健康检查）
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
  - wiki/concepts/lvs.md
  - wiki/concepts/nginx-gateway-production-design.md
  - wiki/topics/system-design-core-components.md
  - wiki/sources/lvs-keepalived-nginx.md
---
# Keepalived（VRRP 主备与健康检查）

## Definition（定义）

Keepalived 是为解决 LVS 节点单点故障而引入的高可用组件，通过 VRRP（Virtual Router Redundancy Protocol，虚拟路由冗余协议）心跳机制实现主备切换，并承担后端服务器健康检查职责。常与 LVS 组合，构成「四层负载均衡 + 高可用」方案。

## Why It Matters（为什么重要）

LVS 提供高性能的流量转发，但 LVS 服务器本身宕机会导致整个系统崩溃。Keepalived 使负载均衡层具备节点级高可用：主节点故障后备用节点自动接管虚拟 IP（VIP），切换自动完成、秒级生效，客户端访问 VIP 不感知后端变化。

## Core Characteristics（核心特征）

1. **两大核心职责**：主备切换（HA）——主节点故障后备用节点自动接管虚拟 IP；健康检查（Health Check）——实时检测后端服务器健康状态，自动移除故障节点。
2. **基于 VRRP 心跳**：通过周期性 VRRP 心跳检测主节点存活，主节点宕机时触发切换。
3. **VIP 漂移**：虚拟 IP（VIP）随主备角色在节点间漂移，客户端始终访问同一 VIP，不感知后端变化。
4. **秒级切换**：切换过程自动完成、秒级生效（单信源主张，未量化验证）。

## Structure（结构）

按信源描述的典型架构：

```
        ┌──────────────────────────┐
        │     VIP:10.0.0.10       │
        │(Keepalived漂移IP)       │
        └──────────────┬────────────┘
           │
   ┌──────────────┴──────────────┐
   │ │
 Master\-LVS              Backup\-LVS
 (优先级100)(优先级90)
   │ │
   └────────→RealServer集群←───┘
```

- VIP：对外服务的虚拟 IP，由主节点绑定，故障时漂移至备节点。
- Master/Backup：主备角色按优先级确定（信源示例中 Master 优先级 100、Backup 优先级 90）。
- RealServer 集群：后端真实服务器，由 Keepalived 做健康检查，故障节点被自动摘除。

## How It Works（运作方式）

1. Master 节点绑定虚拟 IP（VIP），对外提供服务；
2. Keepalived 周期性通过 VRRP 心跳检测 Master；
3. 若 Master 宕机，Backup 自动接管 VIP；
4. 整个切换过程自动完成、秒级生效；
5. 客户端仍访问 VIP，不感知后端变化。

## Relationships（关系）

### Related Concepts（相关概念）

- [[lvs]]：Keepalived 为 LVS 提供节点高可用，二者是「高性能转发 + 高可用」的组合关系；Keepalived 的 VIP 漂移对象即 LVS 对外暴露的虚拟 IP。
- [[nginx-gateway-production-design]]：Keepalived 常用于双机部署（如 Nginx 网关的双机 VIP 高可用），在应用网关之前提供四层节点级故障切换。

### Dependencies（依赖项）

- 多节点部署（至少 Master + Backup 两台，才能实现主备切换）。
- VRRP 协议支持（依赖操作系统网络栈的 VRRP 能力）。
- 后端 Real Server 的健康状态信息（健康检查的数据来源）。

### Distinctions（区分）

- **Keepalived vs LVS**：LVS 负责流量分发（高性能转发），Keepalived 负责节点高可用（主备切换 + 健康检查）；前者解决吞吐，后者解决单点故障，职责不可互相替代。
- **Keepalived vs 应用层健康检查**：当前信源未展开对比；Keepalived 的健康检查作用于后端 Real Server 存活探测，与应用层（如 Nginx 被动健康检查）的粒度差异待后续信源补充。

## Evolution（演进）

- 当前信源为科普性介绍，未给出 Keepalived 的版本演进、配置细节与切换时延实测；细节待后续信源补充。

## Open Questions（开放问题）

- VRRP 切换的实际时延与脑裂场景处理：当前信源未确立。
- 健康检查的具体配置（探测方式、间隔、阈值）：当前信源未确立。
- Keepalived 在更大规模（多节点、跨机房）下的高可用设计：当前信源未确立。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-26-lvs-keepalived-nginx.md`（两大职责、VRRP 心跳、VIP 漂移、工作流程、主备优先级示例）

## Related Knowledge（相关知识）

- [[lvs|LVS（Linux Virtual Server）]]
- [[nginx-gateway-production-design|生产级 Nginx 网关设计]]
- [[system-design-core-components|系统设计核心组件]]
- [[lvs-keepalived-nginx|百万并发架构设计：LVS + Keepalived + Nginx 架构详解（信源页）]]
