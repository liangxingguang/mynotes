---
id: wiki-entity-netty
type: entity
title: Netty
status: active
created: 2026-10-23
updated: 2026-10-28
confidence: high
tags:
  - entity
  - java
  - network
  - framework
sources:
  - raw/sources/architecture/2026-10-20-netty-three-skills-high-performance.md
  - raw/sources/architecture/2026-10-22-netty-iot-gateway-resilient-design.md
  - raw/sources/architecture/2026-10-22-netty-redis-kafka-iot-gateway.md
  - raw/sources/architecture/2026-10-23-netty-million-connection-push-service.md
  - raw/sources/architecture/2026-10-27-netty-01-intro.md
  - raw/sources/architecture/2026-10-27-netty-02-bio-nio.md
related:
  - wiki/sources/netty-three-skills-high-performance.md
  - wiki/sources/netty-iot-gateway-resilient-design.md
  - wiki/sources/netty-redis-kafka-iot-gateway.md
  - wiki/sources/netty-million-connection-push-service.md
  - wiki/sources/netty-01-intro.md
  - wiki/sources/netty-02-bio-nio.md
  - wiki/concepts/reactor-thread-model.md
  - wiki/entities/kafka.md
---
# Netty

## Overview（概览）

Java 异步事件驱动网络框架（基于 IO 多路复用 + Reactor，**不是 AIO**）。在本库三个信源中分别作为性能机制拆解对象（三大技能）与两个百万级 IoT 长连接接入层的核心组件出现，构成"机制+工程"互证。

## Identity（身份信息）

- Type（类型）: 开源异步事件驱动网络框架
- Organization（所属组织）: Netty Project（起源于 JBoss，背景知识信源未详述）
- Role（角色）: 高并发长连接/ RPC 的通信底座——主从 Reactor 摊薄等 IO 成本、零拷贝砍搬数据成本、无锁串行化消抢锁成本
- Status（状态）: 主流活跃（4.1 池化转正只收 bugfix；4.2 于 2025-04-03 GA：AdaptiveByteBufAllocator、传输解耦、io_uring 一级传输、HTTP/3 毕业；5.x 已停止推进）

## Important Facts（重要事实）

- 性能三支柱（机制信源）：主从 Reactor（boss 只 accept、worker 默认 CPU×2、Channel 终身绑单 EventLoop 换无锁串行化）；ByteBuf 读写双指针+引用计数（泄漏头号来源）+jemalloc 式内存池；零拷贝三层（OS sendfile 走 TLS 失效 / JVM 堆外 / 应用层 Composite）。
- 生产事故第一根因：EventLoop 里做阻塞调用——一个线程被拖住，其管的所有连接一起拖死；两个 IoT 信源均把"EventLoop 不阻塞"列为第一不变量/第一纪律，李林锋信源把它落成 CLOSE_WAIT 三防线（业务离 I/O 线程、慎用自定义 Task、心跳回调时延可控）并补充"日志隐形杀手"（log4j AsyncAppender 队列满即同步阻塞）这一变体（四信源互证）。
- 长连接工程（IoT 双信源）：固定头二进制协议+LengthField 系解码防粘包（maxFrameLength 防 OOM）；写缓冲水位线（32/64KB）是反压开关；长连接保活靠应用层心跳（IdleStateHandler）而非 SO_KEEPALIVE；epoll/nio 自适应 ServerBootstrap。
- 海量接入调优清单（李林锋信源）：ulimit 调至百万级；心跳周期由运营商 NAT 释放时间（中移动 2.5G 约 5 分钟）与信令风暴夹击，实践取 180s（微信 300s）；接收缓冲区设消息均值而非上限，AdaptiveRecvByteBufAllocator 动态伸缩（100 万连接省约 5G）；PooledByteBufAllocator（纯 Java 版 jemalloc）Twitter 案例垃圾生成降 5 倍，代价是泄漏不再被 GC 兜底；RPS 软中断均衡（内核 ≥2.6.35）性能 +20%。
- 反例案例（李林锋信源）：10 万长连接 MQTT 服务 IdleStateHandler 超时设 15 分钟 → 约 110 万个 ScheduledFutureTask 老化进持久代被误判内存泄露，改 45 秒即愈——量级放大一切小问题。
- 容量观：无万能"单机 10 万连接"数字——上限由 FD 数、内存（RSS）、带宽、EventLoop p99 联合压测确定（机制信源"真正上限是 fd 数与内存"+IoT 信源反"参数包"互证）。

## Products / Projects（产品／项目）

- 生态用法（信源提及）：Dubbo/RocketMQ 的 RPC 编解码默认 LengthFieldBasedFrameDecoder；K8s 环境注意 JDK 不感知 cgroup 按宿主机核数算线程。

## Relationships（关系）

- 下游搭档 [[kafka|Kafka]]：IoT 接入层"Netty 扛连接、Kafka 解耦"是长连接平台的定型组合（IoT 平台信源）。
- 机制对照：零拷贝/批量与 [[kafka-fast-four-mechanisms]] 同源；无锁串行化与 [[springboot-disruptor-event-bus|Disruptor]] 单生产者同理（解读）。

## Timeline（时间线）

- 4.0 — 非池化，已 EOL
- 4.1 — 池化转正（Android 除外），只收 bugfix（成稿时 4.1.135）
- 2025-04-03 — 4.2 GA：AdaptiveByteBufAllocator（适配虚拟线程）、EventLoopGroup 与传输解耦、io_uring 一级传输、HTTP/3 毕业
- 5.x — 已停止推进

## Current Understanding（当前认知）

四个信源分层互证：机制层（线程模型/内存/零拷贝）解释"为什么快"，两个 IoT 工程层展示"快之外还要什么"——会话路由原子性、命令状态机、背压分层、Drain 发布；李林锋调优层给出百万接入的系统侧配套（句柄/心跳周期/缓冲区/内存池/RPS/JVM）。一致立场：Netty 只保证 IO 层不阻塞，生产级靠使用者的纪律（四信源，置信度高）。

## Evidence（证据）

- `raw/sources/architecture/2026-10-20-netty-three-skills-high-performance.md`（性能机制）
- `raw/sources/architecture/2026-10-22-netty-iot-gateway-resilient-design.md`（不变量与可恢复设计）
- `raw/sources/architecture/2026-10-22-netty-redis-kafka-iot-gateway.md`（组件组合与代码骨架）
- `raw/sources/architecture/2026-10-23-netty-million-connection-push-service.md`（海量接入调优清单与 IdleStateHandler 事故案例）
