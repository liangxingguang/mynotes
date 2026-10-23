---
id: 2026-10-22-netty-iot-gateway-resilient-design
title: 百万 IoT 设备并发接入：把 Netty 网关做成可恢复、可验证的连接系统
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/Ymasw1q6aL5JGcIvv4y04w
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - Netty
  - IoT
  - 分布式系统
asset_ref: Assets/2026/10/netty-iot-gateway-resilient-design.md
wiki_status: ingested
---

# 百万 IoT 设备并发接入：把 Netty 网关做成可恢复、可验证的连接系统

> 百万设备长连接接入层的硬核工程指南：不堆组件而是从不变量出发——EventLoop 不阻塞、会话只被所有者删除、内存队列有界、commandId 幂等。覆盖协议设计、会话路由原子性、命令状态机、Drain 发布、压测验收全流程。

## 核心要点

- **Gateway 边界**：只做 TLS/解帧/认证/会话/背压/投递，绝不查库调 RPC；V1 单节点本地 ConcurrentHashMap 即可，跨节点下发才需路由索引，遥测异步化才需消息流
- **EventLoop 纪律**：阻塞一次=同 Loop 所有设备断连级联；认证等慢操作切有界执行器+超时+拒绝策略；ByteBuf 跨线程必须 copyForAsync 防堆外泄漏
- **会话不变量**：本地表与分布式索引都只能被连接所有者删除——`deleteIfMatches(deviceId, connectionId)` Lua 条件删除，防旧连接 channelInactive 误删新连接路由
- **命令可靠性**：持久状态机 PENDING→DISPATCHING→WAITING_ACK→ACKED，乐观锁 version 抢占投递权；网关只报 WRITTEN_TO_SOCKET，只有设备 ACK 才算执行；重试复用同一 commandId，设备端持久去重
- **背压分层**：入站 setAutoRead(false) 减速、出站 isWritable 拒绝入内存队列；遥测可降采样、告警持久入口、控制命令独立预算，绝不用一条无限队列
- **发布 Drain**：READY→DRAINING 拒绝新登录→有限等待→按速率关连接→条件删路由；preStop 触发、terminationGracePeriodSeconds 必须大于 Drain 上限
- **反"参数包"**：无万能"单机 10 万连接"数字；容量由 FD/RSS/带宽/EventLoop p99/下游积压联合压测确定；监控禁 deviceId 作 Prometheus label；验收测试直接攻击四个不变量

## 正文

完整协议字节布局、解码器/认证/发送器代码、Lua 脚本、K8s 配置、压测矩阵与运行手册见 [[Assets/2026/10/netty-iot-gateway-resilient-design.md]]。

## 来源

- [百万 IoT 设备并发接入：把 Netty 网关做成可恢复、可验证的连接系统](https://mp.weixin.qq.com/s/Ymasw1q6aL5JGcIvv4y04w)

## 附件

- [[Assets/2026/10/netty-iot-gateway-resilient-design.md]]
