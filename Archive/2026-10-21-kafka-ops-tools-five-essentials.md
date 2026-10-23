---
id: 2026-10-21-kafka-ops-tools-five-essentials
title: Kafka 运维必备工具清单：这 5 个工具让排障快 10 倍
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/g2xStkIY7ap8EVAnJPlA1A
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [Kafka, 工具, 工程实践]
asset_ref: Assets/2026/10/kafka-ops-tools-five-essentials.md
wiki_status: ingested
---

# Kafka 运维必备工具清单：这 5 个工具让排障快 10 倍

> Kafka 排障痛点是"找不到该看什么"而非"看不到问题"。2026 年推荐组合：Kafka UI（日常看，可视化全覆盖、KRaft 友好）+ kafka-topics.sh（动手改，脚本化资产）+ Burrow（Lag 智能告警，基线判定抓"假活" STOP 状态）；Kafka Manager/CMAK 是 ZK 时代遗产（KRaft 支持不完整，新集群不再引入）。附 --describe 三个风险分区过滤参数、Burrow 五种状态语义、安全部署三件套与高频命令速查表。

## 核心要点

- **Kafka UI**（Provectus 开源，社区最活跃）：消费组分区级 Lag 明细、消息按 key/时间戳审查、Topic 配置巡检；生产部署三件套=认证 + READ_ONLY_MODE 只读实例 + 内网隔离
- **kafka-topics.sh**：建删改查四件套；`--describe --at-min-isr-partitions / --unavailable-partitions / --under-replicated-partitions` 三个过滤参数应做成每日巡检脚本，非空即告警
- **--describe 解读**：Isr 比 Replicas 短 = 副本掉队；Leader 与 Replicas[0] 不一致 = 首选 Leader 漂移
- **Burrow**（LinkedIn，Go 单二进制，无需 ZK）：不设全局阈值，按每消费组历史基线做统计判定；**STOP 状态（Offset 停推但组在线）是静态阈值永远发现不了的"假活"**；webhook 直发企微/钉钉/飞书
- **选型定论**：Kafka Manager 已停维 → 移交 LinkedIn 更名 CMAK，维护停滞、依赖 ZK 发现，KRaft 新集群不推荐；集群级指标告警走 Prometheus kafka_exporter + Grafana
- **分工原则**：CLI 定义事实（自动化/应急/通用语言），UI 降低门槛；Kafka Exporter 出面板（人看），Burrow 出决策（机器判），双通道并用

## 正文

全文（含部署配置、命令清单与选型决策树，已重排代码块/表格）见 [[Assets/2026/10/kafka-ops-tools-five-essentials]]。

## 来源

[Kafka 运维必备工具清单：这 5 个工具让排障快 10 倍](https://mp.weixin.qq.com/s/g2xStkIY7ap8EVAnJPlA1A)

## 附件

- [[Assets/2026/10/kafka-ops-tools-five-essentials]]
