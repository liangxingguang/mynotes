---
id: wiki-source-netty-million-connection-push-service
type: source
title: 绝对干货：基于Netty实现海量接入的推送服务技术要点（李林锋）
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - java
  - netty
  - push
  - performance
  - architecture
sources:
  - raw/sources/architecture/2026-10-23-netty-million-connection-push-service.md
related:
  - wiki/entities/netty.md
  - wiki/concepts/websocket-heartbeat-reconnect.md
  - wiki/sources/netty-three-skills-high-performance.md
  - wiki/sources/netty-iot-gateway-resilient-design.md
---
# 绝对干货：基于Netty实现海量接入的推送服务技术要点（李林锋）

## Overview（概览）

李林锋（《Netty 权威指南》作者，原载 InfoQ）的百万级长连接推送服务调优清单。以一个真实"内存泄露"案例切入（实为 IdleStateHandler 超时设置过大导致定时任务对象堆积），随后给出八大技术要点：句柄数、CLOSE_WAIT 防线、心跳周期、缓冲区容量、内存池、日志隐形杀手、TCP 参数与 JVM 参数。

## Key Facts（关键事实）

- 案例：智能家居 MQTT 服务 10 万在线长连接 + 2 万并发，16G/8 核，Netty 4.0.8.Final；dump 显示 ScheduledFutureTask 增加 9076% 达约 110 万个实例——IdleStateHandler 空闲超时设 15 分钟，每连接创建定时任务对象且老化进持久代不被回收，被误判为内存泄露；改为 45 秒即愈。
- 句柄数：默认 ulimit 1024，limits.conf 调至 100 万（soft/hard nofile 1000000）。
- CLOSE_WAIT：服务端收到 FIN 不 close() 则状态滞留至少 2 小时（系统默认 7200s），堆积耗尽句柄致 "Too many open files"。
- CLOSE_WAIT 三防线：① 不在 I/O 线程跑业务（心跳除外），Reactor 线程数经验值 [核数+1, 核数×2]；② 自定义 Task（execute/schedule）抢占 I/O 时间，ioRatio 默认 50，海量长连接建议不在 NioEventLoop 执行自定义 Task；③ IdleStateHandler 回调时延必须可控（反例：回调里发邮件告警，级联阻塞整个多路复用器）。
- 容量账：100 万连接、32 核 → 单 I/O 线程约 15625 连接；每 5s 一次消息交互则单线程均 3125 条/秒，对 Netty 压力不大。
- 心跳周期：移动网络经 GGSN 做 NAT，运营商为减负会释放空闲链路（中移动 2.5G 约 5 分钟）；周期太长频繁重连、太短信令风暴（微信曾遇），建议 180s，微信为 300s。
- 缓冲区账：固定 10K 缓冲、均值 5K、100 万连接 → 额外损耗约 4882M；AdaptiveRecvByteBufAllocator（默认）按历史报文大小动态扩缩容，以 CPU 换内存；缓冲区应设为消息均值而非上限。
- 内存池：PooledByteBufAllocator 是纯 Java 版 jemalloc，显式开启（默认不用）；Twitter 案例垃圾生成降为 1/5、清理快 5 倍；代价是不再被 GC 兜底，retain()/release() 必须成对。
- 日志杀手：log4j AsyncAppender 队列满后 buffer.wait() 同步阻塞业务线程；磁盘 WIO 毛刺短且偶现，测试环境难复现。
- TCP/JVM：SO_SNDBUF/SO_RCVBUF 海量长连接建议 32K；Linux ≥2.6.35 开 RPS 按四元组 hash 均衡软中断，性能提升 20%+；-Xmx 按内存模型计算，压低 Full GC 频率。

## Important Claims（重要论断）

### Claim 1：海量长连接下没有"小问题"

100 个连接时长周期定时任务可被 minor GC 消化；10 万连接时同样的代码就是"内存泄露"。量级放大一切。

### Claim 2：Netty 生产稳定的第一纪律是 I/O 线程零阻塞

业务逻辑、时延不可控的自定义 Task、同步日志写入，任何一类都会级联成 CLOSE_WAIT 堆积与链路读写停滞。

## Concepts Introduced（引入的概念）

（未新开概念页；心跳周期权衡与 [[websocket-heartbeat-reconnect|WebSocket 心跳保活与断线重连]] 互补——本信源给出运营商 NAT 约束与 180s/300s 的实践取值）

## Entities Mentioned（提及的实体）

- [[netty|Netty]]（调优对象）
- 李林锋（作者；未立实体页）

## Implications（影响／启示）

- "内存泄露"怀疑 Netty Bug 之前先 dump 看对象构成：9076% 增长的类名直接指向 IdleStateHandler 配置。
- 内存池是把 GC 问题换成引用计数纪律问题，收益（Twitter 1/5 垃圾）与代价（泄漏不再兜底）要一起签。
- 心跳周期不是拍脑袋：下限由运营商 NAT 释放时间定，上限由信令风暴与耗电定。

## Limitations（局限）

- 成文于 Netty 4.0 时代（案例版本 4.0.8.Final），部分默认值在新版本已变（如 4.2 的 AdaptiveByteBufAllocator）。
- 微信 300s、中移动 NAT 5 分钟等数字为作者经验陈述，非可复核测量。
- "百万连接"为目标场景，文中未给出实测单机百万连接数据。

## Related Knowledge（相关知识）

- [[netty|Netty]]（实体页汇总四个信源的机制与工程证据）
- [[netty-three-skills-high-performance|为什么几个线程就能扛住上万连接？Netty 三大技能]]（机制层互证）
- [[netty-iot-gateway-resilient-design|百万 IoT 设备并发接入：把 Netty 网关做成可恢复、可验证的连接系统]]（"EventLoop 不阻塞"纪律互证）
- [[websocket-heartbeat-reconnect|WebSocket 心跳保活与断线重连]]（心跳周期的另一侧实践）

## Source（信源）

- `raw/sources/architecture/2026-10-23-netty-million-connection-push-service.md`
