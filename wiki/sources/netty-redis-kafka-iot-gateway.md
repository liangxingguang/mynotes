---
id: wiki-source-netty-redis-kafka-iot-gateway
type: source
title: 扛住百万设备长连接：用 Netty + Redis + Kafka 搭建 IoT 接入平台
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - netty
  - redis
  - kafka
  - iot
  - architecture
sources:
  - raw/sources/architecture/2026-10-22-netty-redis-kafka-iot-gateway.md
related:
  - wiki/entities/netty.md
  - wiki/entities/kafka.md
  - wiki/sources/netty-iot-gateway-resilient-design.md
---
# 扛住百万设备长连接：用 Netty + Redis + Kafka 搭建 IoT 接入平台

## Overview（概览）

以智能充电桩平台（常态 60 万、峰值百万设备，上行 5~10 万条/秒）为主线的生产级 IoT 接入平台架构：Netty 扛连接、Redis 做会话路由中心、Kafka 解耦上下行，补齐连接风暴治理、背压、幂等、离线补偿、无损下线等工程细节与完整代码骨架。

## Key Facts（关键事实）

- 三组件各司其职：Netty（事件驱动 IO、编解码、写缓冲水位线）扛连接；**Redis 不是缓存而是路由中心**（`route:{deviceId}`、`node:devices`、dedup 标记、心跳状态）；Kafka 让接入层只做"校验+解析+投递"。
- 架构分层原则：接入层不承载重业务；连接只存本机内存，但"连接在哪"必须经 Redis 集群可见；下行经 Kafka 跨节点路由到目标网关节点。
- Redis 路由反写放大：只在建连时写路由、心跳本地更新时间戳、节点内续期任务**批量**刷新 TTL——把消息流量与路由续期流量解耦。
- Kafka 按设备分区：`key=deviceId` 同设备落同分区、消费端设备维度串行（充电桩"插枪→开始→停止→订单结束"状态机乱序即错乱）；边界——只保证分区内有序、超级热点设备拖慢同分区其他设备、强一致场景消费侧仍需版本号/序列号校验。
- Kafka 生产者配置：acks=all + 幂等 + `max.in.flight=1` 保顺序。
- TCP 不保证应用层送达：下行指令必须 requestId + 应用层 ACK + 超时重试 + 离线补偿（PendingAckManager：内存待确认+超时扫描+指数退避+死信）——这是 IoT 平台与普通 Web 服务最大的不同之一。
- 生产代码骨架：epoll/nio 自适应 ServerBootstrap、固定头二进制协议编解码（半包 resetReaderIndex、长度上限校验）、LocalSessionManager、异步 Kafka 投递。
- 治理与运维：连接风暴靠设备侧指数退避+抖动、四层 LB、内核参数、分批摘流；三层背压（Netty 水位线/有界队列/降级丢弃低优先级遥测）；灰度发布须先摘流、保老连接、转移未完成命令——**直接 rollout restart 会引发重连风暴**。
- 消息分级：关键控制（强可靠+ACK+重试+死信）、重要状态（异步可靠投递）、普通遥测（允许丢失/合并）——不是所有消息都配走最高成本链路。
- 自检四问：设备连在哪个节点？下行命令处于什么状态？节点故障如何恢复？下游变慢接入层如何不被拖垮？

## Important Claims（重要论断）

### Claim 1：接入层只做"校验+解析+投递"

长连接接入层承载重业务必死；把路由给 Redis、把解耦给 Kafka、把业务留给下游，接入层才能专注百万连接（信源分层原则）。

## Concepts Introduced（引入的概念）

（无——消息分级与 [[mq-message-backlog-solutions]] 的分场景策略同思想，未立新页）

## Entities Mentioned（提及的实体）

- [[netty|Netty]]、[[kafka|Apache Kafka]]（第 3 信源）、Redis（路由中心用法，单一信源不立页）

## Implications（影响／启示）

- "按业务 key 分区保序 + 消费侧版本校验"是 Kafka 分区语义在 IoT 的教科书式用法，与电商搜索信源的 Kafka→ES 链路互证"分区内有序"边界（解读）。
- 与 [[netty-iot-gateway-resilient-design]] 互补：那篇给不变量与验收，本篇给组件选型与代码骨架（解读）。

## Limitations（局限）

- "性能翻 3 倍"为个案口径无基准；充电桩场景特化，通用接入需重新校准容量。

## Related Knowledge（相关知识）

- [[netty|Netty（实体页）]]
- [[kafka|Apache Kafka（实体页）]]
- [[netty-iot-gateway-resilient-design|Netty 可恢复连接系统（信源页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-22-netty-redis-kafka-iot-gateway.md`
