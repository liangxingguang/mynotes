---
id: wiki-source-stress-test-capacity-planning
type: source
title: 第二十课：高并发系统压测与容量规划（架构师之路）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - performance
  - capacity-planning
  - stress-test
  - architecture
sources:
  - raw/sources/architecture/2026-10-22-stress-test-capacity-planning.md
related:
  - wiki/sources/netty-iot-gateway-resilient-design.md
  - wiki/sources/spring-boot-startup-speedup.md
  - wiki/sources/architect-road-2025-digest.md
---
# 第二十课：高并发系统压测与容量规划（架构师之路）

## Overview（概览）

架构师之路系列第 20 课：从"拍脑袋估流量"到科学容量体系——峰值 QPS 估算公式、压测三板斧、影子库数据隔离、wrk2 恒定速率、性能曲线拐点解读、机器数公式与水位线管理，附 5 个压测失真坑与自检脚本。

## Key Facts（关键事实）

- **容量≠性能**：性能是"一个请求多快"（代码/SQL 优化），容量是"单位时间多少请求"（扩容/降级/规划）；压测量路宽，规划定道数。
- 峰值估算：峰值 QPS = 日活 × 人均请求 × 集中系数 ÷ 峰值秒数；集中系数取历史监控"峰值÷日均"倍数（大促 20~50 倍），宁高估 20%。
- 三板斧：单接口摸裸容量 → 链路验放大效应 → 全链路影子流量测协同，**顺序不能乱**；稳态压 30 分钟起（短压出性能、长压出容量）。
- 数据隔离：`X-Load-Test` 标记全链路透传 + 影子表（order→order_shadow 同实例）/影子库（独立低配，隔离彻底但易失真）/影子 Topic 路由；**标记丢失比不压测更危险**——写入侧反向校验+隔离验证通过才许开压。
- coordinated omission：wrk 闭环压测随服务变慢自动减速，漏掉最差样本、高估性能；容量评估必须用 wrk2/Gatling 恒定速率（open-loop）。
- 曲线三段：线性区→拐点区→陡增区；**容量取拐点左缘 70~80%，绝不按极限值**；M/M/1 排队论：利用率 95% 时 RT 放大 20 倍。
- 机器数公式：峰值 QPS ÷ 单机容量（压测拐点值）× 冗余系数 1.3~1.5，反验水位 ≤70%。
- 5 个失真坑：环境规格不一致、压测数据污染生产、连接池太小测的是池、参数全热缓存 TPS 虚高（CSV 参数化构造冷热分布：热点 5% 承担 60% 请求）、JVM 未预热。
- 估算第一步是让监控数据说话：PromQL 取去年峰值、日均、接口占比、链路 TPS 比例。

## Important Claims（重要论断）

### Claim 1：没有指标的压测都是"跑了寂寞"

先定目标（峰值 QPS/RT 水位/拐点位置）再开压；容量数字必须落到拐点左缘的安全水位而非极限值（信源方法论立场）。

## Concepts Introduced（引入的概念）

（无——coordinated omission 与拐点水位为业界既有概念的课程化讲解，未立新页）

## Entities Mentioned（提及的实体）

- JMeter / wrk2 / Gatling / Prometheus（工具，不立页）

## Implications（影响／启示）

- "压测计划要验证失败路径而非展示数字"与 [[netty-iot-gateway-resilient-design]] 的反"参数包"立场完全同构（解读）。
- "JVM 未预热"失真坑与 [[spring-boot-startup-speedup]] 的启动/预热工程互为背景（解读）。

## Limitations（局限）

- 课程文，公式系数（1.3~1.5、70~80%）为经验水位；M/M/1 简化模型与实际多服务链路有差距。

## Related Knowledge（相关知识）

- [[netty-iot-gateway-resilient-design|Netty 可恢复连接系统（信源页）]]（压测验收同哲学）
- [[spring-boot-startup-speedup|Spring Boot 启动加速（信源页）]]（预热与探针联动）
- [[architect-road-2025-digest|架构师之路 2025 精选（信源页）]]（同系列索引）

## Source（信源）

- `raw/sources/architecture/2026-10-22-stress-test-capacity-planning.md`
