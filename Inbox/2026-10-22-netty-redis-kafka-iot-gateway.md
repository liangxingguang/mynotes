---
id: 2026-10-22-netty-redis-kafka-iot-gateway
title: 扛住百万设备长连接：用 Netty + Redis + Kafka 搭建 IoT 接入平台
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/ci_Fgd4x4Kh9oi7CP26pUg
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - 工程实践
  - Kafka
  - 分布式系统
asset_ref: Assets/2026/10/netty-redis-kafka-iot-gateway.md
wiki_status: pending
---

# 扛住百万设备长连接：用 Netty + Redis + Kafka 搭建 IoT 接入平台

> 以智能充电桩平台（常态 60 万、峰值百万设备，上行 5~10 万条/秒）为主线，讲清 IoT 长连接接入平台的生产级架构：Netty 负责连接收发、Redis 做会话路由中心、Kafka 解耦上下行，并补齐连接风暴治理、背压、幂等、离线补偿、无损下线等工程化细节与完整代码骨架。

## 核心要点

- **三组件各司其职**：Netty（事件驱动 IO、编解码、写缓冲水位线）扛连接；Redis 不是缓存而是路由中心（`route:{deviceId}`、`node:devices`、dedup 标记、心跳状态）；Kafka 让接入层只做"校验+解析+投递"，按 `deviceId` 分区保证单设备顺序
- **架构分层原则**：接入层不承载重业务（高性能收发+轻量校验+异步投递）；连接只存本机内存，但"连接在哪"必须经 Redis 集群可见；下行经 Kafka 跨节点路由到目标网关节点
- **关键机制**：Redis 路由只在建连时写、心跳本地更新、批量续期 TTL（避免写放大）；TCP 不保证应用层送达，下行指令必须 requestId + 应用层 ACK + 超时重试 + 离线补偿；Kafka 生产者 acks=all + 幂等 + max.in.flight=1 保顺序
- **生产代码骨架**：epoll/nio 自适应 ServerBootstrap、固定头二进制协议编解码（半包 resetReaderIndex、长度上限校验）、LocalSessionManager（本机 Channel 映射）、异步 Kafka 投递、PendingAckManager（内存待确认+超时扫描+指数退避+死信）
- **治理与运维**：连接风暴靠设备侧指数退避+抖动、四层 LB、内核参数、分批摘流；三层背压（Netty 水位线/有界队列/降级丢弃低优先级遥测）；灰度发布须先摘流、保老连接、转移未完成命令，直接 rollout restart 会引发重连风暴
- **消息分级**：关键控制（强可靠+ACK+重试+死信）、重要状态（异步可靠投递）、普通遥测（允许丢失/合并）——不是所有消息都配走最高成本链路
- **自检四问**：设备连在哪个节点？下行命令处于什么状态？节点故障如何恢复？下游变慢接入层如何不被拖垮？答清即达生产级

## 正文

全文架构图、Redis Key 设计与完整代码见 [[Assets/2026/10/netty-redis-kafka-iot-gateway.md]]。

## 来源

- [扛住百万设备长连接：我用 Netty + Redis + Kafka 搭建的 IoT 接入平台，性能翻了 3 倍](https://mp.weixin.qq.com/s/ci_Fgd4x4Kh9oi7CP26pUg)

## 附件

- [[Assets/2026/10/netty-redis-kafka-iot-gateway.md]]
