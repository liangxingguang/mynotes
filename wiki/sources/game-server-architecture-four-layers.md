---
id: wiki-source-game-server-architecture-four-layers
type: source
title: 游戏服务器架构应该如何分层？——连接层/实体层/RPC 约束层/协调层四层骨架
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - game-server
  - architecture
sources:
  - raw/sources/architecture/2026-10-21-game-server-architecture-four-layers.md
related:
  - wiki/sources/game-server-elastic-scaling.md
---
# 游戏服务器架构应该如何分层？——连接层/实体层/RPC 约束层/协调层四层骨架

## Overview（概览）

公众号短文：把游戏服务器拆成四层骨架，每层回答一个核心问题——连接层（客户端怎么连进来）、实体层（游戏对象怎么存在）、RPC 约束层（服务间怎么可靠调用）、协调层（分布式下对象放在哪里）；附 Go 接口抽象与落地路线。

## Key Facts（关键事实）

- 连接层纯粹管理连接本身：长连接接入、会话绑定、心跳超时、拆包粘包、鉴权限流防重放、消息分发、断线重连；**最忌讳直接写业务逻辑**（"购买道具""进副本"绝不能出现在这里）。
- 实体层是有状态对象的生命周期管理层（不是 Web 的无状态业务层）：玩家/NPC/房间/副本/公会皆实体，共性是**有状态、有生命周期、消息必须严格按序到达**；职责含生命周期、消息按序投递、状态隔离、AOI 视野、持久化恢复、迁移准备；设计目标是让业务只关注"实体收到消息后状态如何演进"。
- RPC 约束层不是远程调用语法糖，而是服务间契约：服务发现、按 entityId/shardId 寻址、调用语义（请求响应/单向/可靠投递/多播）、超时控制防雪崩、界定可重试范围、幂等防重复扣费发奖、统一可观测；**跨服调用不能盲目**（匹配失败严禁无限重试）。
- 协调层是分布式控制面（单机可不存在）：节点注册发现、健康心跳、分片分配、再平衡、故障转移、迁移期消息缓冲防双写、分布式锁与租约防脑裂；基于 etcd/Redis/ZK 实现，**不参与任何玩法逻辑**，只维护集群拓扑与分片映射。
- 协同流程：连接层解包识实体 → 查路由 → 本地投实体层 / 远端走 RPC → 结果原路推回；协调层不进实时吞吐路径，只在后台维护路由。
- 落地五建议：边界清晰、状态有界、重视 RPC 约束、层间纯接口隔离（换网络库/RPC 框架成本低）、**先单机闭环再分布式**（连接+实体+RPC 单节点跑通后再引协调层）。

## Important Claims（重要论断）

### Claim 1：游戏服务器的四层各自回答一个问题，层间只过接口契约

连接层=怎么进来、实体层=怎么存在、RPC 层=怎么通信、协调层=放在哪里；游戏服"有状态、长连接、时序敏感、高频迁移"的天然特性决定了这种剥离（信源总结）。

## Concepts Introduced（引入的概念）

- 游戏服四层骨架（连接/实体/RPC 约束/协调；单信源框架，未立概念页）

## Entities Mentioned（提及的实体）

- etcd / ZooKeeper（协调层实现选项，未立页）

## Implications（影响／启示）

- 实体层"消息按序到达+状态隔离"与 Actor 模型同构；协调层租约防脑裂与 [[agent-long-task-reliable-execution]] 的 fencing 思路相通（解读）。
- 与 [[game-server-elastic-scaling]] 互补：那篇讲弹性伸缩时的数据迁移实操，本篇给出迁移依托的分层骨架（解读）。

## Limitations（局限）

- 框架性短文，各层只有职责清单与接口示意，无实现细节与踩坑数据。

## Related Knowledge（相关知识）

- [[game-server-elastic-scaling|游戏服务器弹性伸缩（信源页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-21-game-server-architecture-four-layers.md`
