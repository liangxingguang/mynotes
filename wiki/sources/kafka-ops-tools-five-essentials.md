---
id: wiki-source-kafka-ops-tools-five-essentials
type: source
title: Kafka 运维必备工具清单：这 5 个工具让排障快 10 倍
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - kafka
  - ops
sources:
  - raw/sources/architecture/2026-10-21-kafka-ops-tools-five-essentials.md
related:
  - wiki/entities/kafka.md
  - wiki/sources/kafka-fast-four-mechanisms.md
---
# Kafka 运维必备工具清单：这 5 个工具让排障快 10 倍

## Overview（概览）

运维工具综述：Kafka UI（可视化主力）、kafka-topics.sh（CLI 标准）、Kafka Manager/CMAK（ZK 时代遗产）、Burrow（Lag 智能告警）五件套逐一过堂，附多维评分表、角色适配、2026 推荐组合与高频命令速查。

## Key Facts（关键事实）

- Kafka UI（provectuslabs）：社区最活跃的 Web UI，消息按 key/分区/时间戳审查、消费组 Lag 分区级明细与 offset 重置、KRaft 支持好；生产三要点——认证（SSO/OAuth2 起步）、只读模式给开发（READ_ONLY=true）、管理界面只在内网/跳板机可达。
- kafka-topics.sh：发行版自带零安装，2.2+ 统一 --bootstrap-server；扩分区**只能加不能减**且会打乱 key 的分区归属（Kafka 只保证分区内有序，扩分区后同 key 可能换分区乱序，幂等设计此时救命）；三个巡检过滤参数应做成每日脚本：`--at-min-isr-partitions`（ISR 缩减）、`--unavailable-partitions`（无 Leader）、`--under-replicated-partitions`。
- Kafka Manager = CMAK：Yahoo 2015 开源，2019 移交 LinkedIn 更名 CMAK；依赖 ZK 做集群发现，**KRaft 新集群不推荐**，维护基本停滞——"了解它主要是为了看懂老架构和老文章"；业务集群不开 JMX_PORT 会界面空白。
- Burrow（LinkedIn，Go 单二进制）：Lag 监控不是面板而是"告警决策引擎"——不设全局阈值，按每个消费组历史基线做滑动窗口统计判定（解决：不同组 Lag 量级不同、瞬时尖峰噪音、**最该告警的消费停滞**静态阈值发现不了）；直连 Broker 读 __consumer_offsets 无需 ZK；STOP 状态常是"应用活着但消费死了"的唯一线索（查：线程卡死/rebalance 风暴/max.poll.interval.ms 超时/offset 提交被跳过）。
- 分工哲学：**CLI 定义事实，UI 降低门槛**；Kafka Exporter 出面板（人看）、Burrow 出决策（机器判），标准做法是 Grafana 面板+Burrow webhook 双通道。
- 2026 推荐组合：看→Kafka UI（只读实例给开发/全功能给运维）；改→kafka-topics.sh+kafka-configs.sh 全部脚本化进 Git；Lag 告警→Burrow→IM 机器人；集群级告警→Prometheus kafka_exporter+Grafana；存量 ZK→CMAK 继续用但别为它保持 ZK。

## Important Claims（重要论断）

（无承重论断；工具综述。）

## Concepts Introduced（引入的概念）

（无）

## Entities Mentioned（提及的实体）

- [[kafka|Apache Kafka]] / Kafka UI / CMAK / Burrow（工具均未立页）

## Implications（影响／启示）

- Burrow 的"按自身基线判定而非全局阈值"思路可推广到一切业务指标告警（解读）。

## Limitations（局限）

- 工具维护状态以 2026-10 信源时点为准（Burrow 更新放缓、CMAK 基本停滞）。

## Related Knowledge（相关知识）

- [[kafka-fast-four-mechanisms|Kafka 四板斧（信源页）]]（机制原理侧）

## Source（信源）

- `raw/sources/architecture/2026-10-21-kafka-ops-tools-five-essentials.md`
