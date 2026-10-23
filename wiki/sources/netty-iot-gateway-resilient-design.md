---
id: wiki-source-netty-iot-gateway-resilient-design
type: source
title: 百万 IoT 设备并发接入：把 Netty 网关做成可恢复、可验证的连接系统
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - netty
  - iot
  - distributed
  - reliability
sources:
  - raw/sources/architecture/2026-10-22-netty-iot-gateway-resilient-design.md
related:
  - wiki/entities/netty.md
  - wiki/sources/netty-redis-kafka-iot-gateway.md
  - wiki/concepts/durable-execution.md
---
# 百万 IoT 设备并发接入：把 Netty 网关做成可恢复、可验证的连接系统

## Overview（概览）

百万设备长连接接入层的硬核工程指南：不堆组件而是从四个不变量出发——EventLoop 不阻塞、会话只被所有者删除、内存队列有界、commandId 幂等。覆盖协议设计、会话路由原子性、命令状态机、Drain 发布、压测验收全流程。

## Key Facts（关键事实）

- Gateway 边界：只做 TLS/解帧/认证/会话/背压/投递，绝不查库调 RPC；V1 单节点本地 ConcurrentHashMap 即可，跨节点下发才需路由索引，遥测异步化才需消息流（"从最小可行版本开始，而不是从组件清单开始"）。
- EventLoop 纪律：阻塞一次=同 Loop 所有设备断连级联；认证等慢操作切有界执行器+超时+拒绝策略；ByteBuf 跨线程必须 copy 防堆外泄漏。
- 会话不变量：本地表与分布式索引都只能被连接所有者删除——`deleteIfMatches(deviceId, connectionId)` Lua 条件删除，防旧连接 channelInactive 误删新连接路由（新旧会话交错是三条最危险失败路径之首）。
- 命令可靠性：持久状态机 PENDING→DISPATCHING→WAITING_ACK→ACKED，乐观锁 version 抢占投递权；网关只报 WRITTEN_TO_SOCKET，**只有设备 ACK 才算执行**；重试复用同一 commandId，设备端持久去重。
- 背压分层：入站 setAutoRead(false) 减速、出站 isWritable 拒绝入内存队列；遥测可降采样、告警持久入口、控制命令独立预算，绝不用一条无限队列。
- 发布 Drain：READY→DRAINING 拒绝新登录→有限等待→按速率关连接→条件删路由；preStop 触发、`terminationGracePeriodSeconds` 必须大于 Drain 上限——长连接没有自动迁移。
- 反"参数包"立场：无万能"单机 10 万连接"数字；容量由 FD/RSS/带宽/EventLoop p99/下游积压联合压测确定；监控禁 deviceId 作 Prometheus label；验收测试直接攻击四个不变量（含"命令写入成功但设备执行结果未知"、"Broker 不可用"失败路径逐条验算）。
- Kafka 必要性判断：上行遥测异步化才需要 Kafka；消费端幂等最小实现随文给出。

## Important Claims（重要论断）

### Claim 1：从不变量出发，而不是从组件清单出发

四个不变量（EventLoop 不阻塞/会话只被所有者删/队列有界/commandId 幂等）推出全部设计决策；验收测试直接攻击不变量而非展示连接数字（信源纲领）。

### Claim 2：TCP 送达≠执行成功

网关只能确认 WRITTEN_TO_SOCKET；没有应用层 ACK 的"可靠性"是自欺（与另一 IoT 信源同口径互证）。

## Concepts Introduced（引入的概念）

- 命令状态机+乐观锁投递权与 [[durable-execution]] 的 fencing/租约同构（连接系统版的持久执行纪律，未立新页）。

## Entities Mentioned（提及的实体）

- [[netty|Netty]]（与三大技能信源、IoT 平台信源共同支撑实体页）

## Implications（影响／启示）

- "条件删除防陈旧写"与数据库 fencing token、K8s etcd 租约是同一思想在会话路由层的落地（解读）。
- Drain 发布与 [[database-high-availability]] 的 PRS 计划内切换同为"主动式优雅退出"（解读）。

## Limitations（局限）

- 深度方案文无开源实现；Lua/Lua 脚本与压测矩阵需按自身环境重验。

## Related Knowledge（相关知识）

- [[netty|Netty（实体页）]]
- [[netty-redis-kafka-iot-gateway|Netty+Redis+Kafka IoT 平台（信源页）]]
- [[durable-execution|持久执行（概念页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-22-netty-iot-gateway-resilient-design.md`
