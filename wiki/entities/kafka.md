---
id: wiki-entity-kafka
type: entity
title: Apache Kafka
status: active
created: 2026-10-23
updated: 2026-10-29
confidence: high
tags:
  - entity
  - message-queue
  - distributed
  - streaming
sources:
  - raw/sources/architecture/2026-10-21-kafka-fast-four-mechanisms.md
  - raw/sources/architecture/2026-10-21-kafka-ops-tools-five-essentials.md
  - raw/sources/architecture/2026-10-22-netty-redis-kafka-iot-gateway.md
  - raw/sources/architecture/2026-10-27-netty-kafka.md
  - raw/sources/architecture/2026-10-28-kafka-consumer-lag-backlog-guide.md
related:
  - wiki/sources/kafka-fast-four-mechanisms.md
  - wiki/sources/kafka-ops-tools-five-essentials.md
  - wiki/sources/ecommerce-search-realtime-personalization.md
  - wiki/sources/netty-redis-kafka-iot-gateway.md
  - wiki/sources/netty-kafka-network-layer.md
  - wiki/sources/kafka-consumer-lag-backlog-guide.md
  - wiki/concepts/consumer-lag-governance.md
  - wiki/decisions/kafka-adopts-netty.md
  - wiki/entities/netty.md
---
# Apache Kafka

## Overview（概览）

分布式消息/流平台：partition 即顺序追加日志文件，靠顺序写+PageCache+零拷贝+批量压缩四板斧实现高吞吐；在本库两个信源中分别作为性能机制拆解对象与运维工具栈主体出现。

## Identity（身份信息）

- Type（类型）: 开源分布式消息队列/流处理平台
- Organization（所属组织）: Apache 软件基金会（起源于 LinkedIn）
- Role（角色）: 高吞吐事件管道——事实库变更传播（Outbox/CDC）、行为事件流、系统间解耦
- Status（状态）: 主流活跃（信源覆盖 Kafka 2.x-3.x，KRaft 取代 ZooKeeper 进行中）

## Important Facts（重要事实）

- 性能四板斧（机制信源）：顺序写（partition 追加日志，磁盘顺序写≈内存 1/10，"磁盘不慢、随机访问才慢"）；PageCache（write 返回即"落盘"，不自建 JVM 堆缓存——零 GC、重启缓存仍在，32GB 机器堆只给 6GB、swappiness=1）；零拷贝 sendfile（FileChannel.transferTo，4 拷贝 4 切换→2 切换 1 拷贝，SG-DMA 时真零拷贝；**SSL/TLS 使其失效，开加密吞吐降 20-40%**）；批量+压缩（batch.size/linger.ms 延迟换吞吐，batch 级压缩，zstd 推荐，一笔 CPU 换网络/磁盘/缓存命中/跨机房带宽四份收益）。
- 顺序保证边界：**只保证分区内有序**；扩分区只能加不能减，且同 key 可能换分区导致乱序——消费端幂等是兜底。
- 写入可靠性语义：至少一次投递是正常路径（响应丢失会重发），正确姿势是 manual ack + 下游幂等/版本约束，不存在开箱 exactly-once（与 [[ecommerce-search-realtime-personalization]] 的 Kafka→ES 链路互证）。
- 运维工具栈（2026 口径）：看→Kafka UI（最活跃、KRaft 友好、生产须认证+只读+内网）；改→kafka-topics.sh/kafka-configs.sh 脚本化进 Git（三个 --describe 过滤参数做每日巡检）；Lag 告警→Burrow（按消费组自身基线滑窗判定，抓"应用活着但消费死了"的 STOP 状态）；集群指标→Prometheus kafka_exporter+Grafana；CMAK（原 Yahoo Kafka Manager）依赖 ZK，KRaft 新集群不推荐。
- 分工哲学：CLI 定义事实，UI 降低门槛；Exporter 出面板（人看），Burrow 出决策（机器判）。
- IoT 接入层用法（第 3 信源）：`key=deviceId` 按设备分区保单设备状态机顺序（插枪→充电→停止→结算乱序即错乱），消费端设备维度串行；生产者 acks=all+幂等+`max.in.flight=1` 保顺序；边界互证"只保证分区内有序"——超级热点设备会拖慢同分区其他设备，强一致场景消费侧仍需版本号/序列号校验。
- 网络层架构（第 4 信源，基于 3.9.0 源码拆解）：2.0 起从自研 NIO 迁到 Netty（约 3800 行→约 950 行，决策详见 [[kafka-adopts-netty]]）；boss/worker 复用同一 EventLoopGroup（num.network.threads 默认 3），业务交 RequestHandler 线程池故网络线程很轻；七层 Pipeline（SSL→流量统计→帧解码 LengthFieldBasedFrameDecoder maxFrame 默认 100MB→帧编码→correlationId 绑定→业务入口→异常兜底）；帧解码用 readRetainedSlice 零拷贝传引用、finally 手动 release 防泄漏；背压为 RequestChannel 有界队列满则阻塞网络线程、TCP 接收窗口收缩把压力传导到客户端；响应在 channelReadComplete 批量 flush 降系统调用。协议帧=[4B 长度][数据]，变长字段用 ZigZag+Varint 编码。
- 消费积压治理（第 5 信源，实战复盘）：Lag = 分区 LogEndOffset − CommittedOffset 求和，看 Lag 要到分区粒度（总量掩盖单分区倾斜）；根治铁律"消费速度 ≥ 生产峰值 × 1.5"；扩容止血（消费者数 ≤ 分区数、分区只加不减、顺序敏感扩分区注意 hash 漂移）；批量拉取 2-5 倍（`max.poll.interval.ms ≥ max.poll.records × 单条最坏耗时 × 1.5`，否则 rebalance 死循环）；处理异步化 16 worker 达 15 倍（有界队列 + CallerRunsPolicy 反压、整批完成才提交位点、超时不提交靠幂等）；慢消息木桶（3% 的 2s 消息拖垮 87% 吞吐，隔离/降级/修复）；消化期三坑（重复洪峰、下游被打爆、retention 过期静默丢消息）。方法论详见 [[consumer-lag-governance]]。

## Products / Projects（产品／项目）

- 生态组件（信源提及）：Kafka UI（provectuslabs）、Burrow（LinkedIn）、CMAK、MirrorMaker 2（跨集群同步）、Debezium/Kafka Connect（CDC 管道）。

## Relationships（关系）

- 上游硬件直觉：机械盘寻道/旋转延迟与 SSD 写放大决定"顺序优于随机"——Kafka 全部设计在此地基上（与 [[linked-list-vs-array-cache|缓存局部性]] 同为"体系结构压倒大 O"的例证）。
- 常见搭档：Elasticsearch（Kafka→ES 投影管道，[[elasticsearch]]）；Redis（行为事件→画像，[[ecommerce-search-realtime-personalization]]）。
- 机制对照：零拷贝与批量写同 [[netty-three-skills-high-performance|Netty]] 的网络层优化同源。

## Timeline（时间线）

- 2011 — LinkedIn 开源（背景知识，信源未详述）
- 2.0 — 网络层从自研 NIO 迁移到 Netty（约 3800 行→约 950 行，信源口径，见 [[kafka-adopts-netty]]）
- 2.2+ — 管理 CLI 统一 --bootstrap-server，弃用 --zookeeper
- 2.8+/3.x — KRaft 逐步取代 ZooKeeper（信源时点 ZK→KRaft 迁移进行中，CMAK 等 ZK 时代工具随之边缘化）

## Current Understanding（当前认知）

五个信源构成"机制+运维+场景+网络层+消费治理"互补：理解四板斧才能解释集群参数（小堆、关 swap、batch 调优），理解工具栈才能落地日常运维，IoT 场景把"分区内有序+幂等生产者"落到设备状态机保序，网络层信源补全了"连接怎么进来"——Netty 化的七层 Pipeline 与 RequestChannel 应用层背压（与 [[netty-flow-control]] 三层背压互证），消费治理信源则补齐了"消息进来后怎么不积压"的运维闭环（见 [[consumer-lag-governance]]）。一致立场：Kafka 的快来自"不浪费"——磁盘顺序、内存靠 OS、CPU 不当搬运工、网络省次数（信源互证，置信度高）。

## Evidence（证据）

- `raw/sources/architecture/2026-10-21-kafka-fast-four-mechanisms.md`（性能机制）
- `raw/sources/architecture/2026-10-21-kafka-ops-tools-five-essentials.md`（运维工具栈）
- `raw/sources/architecture/2026-10-22-netty-redis-kafka-iot-gateway.md`（IoT 接入层：deviceId 分区保序、幂等生产者配置）
- `raw/sources/architecture/2026-10-27-netty-kafka.md`（网络层源码拆解：自研 NIO→Netty 迁移、七层 Pipeline、RequestChannel 背压、批量 flush）
