---
id: wiki-source-db-zero-downtime-migration
type: source
title: 数据库迁移零停机：从理论到实战的完美演进方案
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: medium
tags:
  - source
  - database
  - migration
sources:
  - raw/sources/architecture/2026-11-25-db-zero-downtime-migration.md
related:
  - wiki/concepts/database-zero-downtime-migration.md
  - wiki/concepts/table-sharding-migration.md
  - wiki/concepts/cap-theorem.md
---
# 数据库迁移零停机：从理论到实战的完美演进方案

## Overview（概览）

微信公众号实战长文。以作者为某支付系统迁移 5000 万条交易记录、72 小时零停机（业务峰值前 30 分钟完成切换）的经历开篇，系统讲解数据库零停机迁移：业务连续性价值、六类迁移场景、"双写+同步+校验+切换"核心原理与三组件架构、五阶段迁移法（准备→初始化同步→双写→校验→切换→收尾）的每阶段目标与交付物，以及同步延迟、大表迁移、类型不兼容三类常见问题的解法。配套 Spring Boot 双写切面、Debezium 增量同步、数据校验与动态切换的代码框架。

## Key Facts（关键事实）

- 停机成本（信源引 Gartner）：每小时停机平均约 30 万美元，金融行业每分钟 5000 美元；零停机迁移的核心价值是在用户无感知的情况下完成数据迁移。
- 六类迁移场景：存储升级（HDD→SSD）、架构调整（分库分表）、数据库升级（MySQL 5.7→8.0）、云迁移（自建机房→云数据库）、数据库替换（MySQL→PostgreSQL/NoSQL）、容量扩展。
- 核心原理："双写 + 同步 + 校验 + 切换"；架构三组件：源数据库、目标数据库、数据同步工具；一致性目标为最终一致性——按 CAP 定理优先保证可用性与分区容错，牺牲短暂强一致。
- 五阶段迁移法：准备（目标库建议 MySQL 8.0.34+；同构用原生 replication、异构用 Debezium/AWS DMS、大数据量用 MyDumper/MyLoader；监控同步延迟应控制在秒级；方案文档含范围/时间/回滚/分工/风险；应用改造引入 Nacos、AbstractRoutingDataSource、双写逻辑）→ 初始化同步（MyDumper 并行导出、MyLoader 导入，导入后逐表核对记录数）→ 双写（Debezium 基于 binlog 做 CDC 捕获 INSERT/UPDATE/DELETE；@Aspect+@DualWrite 注解双写；源成功目标失败用本地消息表定时重试；异步双写缓解性能）→ 校验（逐表计数比对、核心表抽样内容校验、生成校验报告）→ 切换与收尾（凌晨 2-4 点低峰切换；先切读流量观察 30 分钟~1 小时再切写流量；切换后功能/数据/性能三项验证；备份源库、更新文档、观察 1-2 周后下线源库）。
- 常见问题：同步延迟（增加同步线程、源库调优、延迟监控报警、强一致读前检查延迟）；大表迁移（>1000 万行用并行工具、按主键分批、低峰迁移、历史数据离线迁移）；异构类型不兼容（迁移前类型映射分析、自动转换工具、抽样验证，如 MySQL 与 PostgreSQL 的 VARCHAR 长度计算方式差异）。

## Important Claims（重要论断）

### 零停机迁移的本质是在数据复制的同时保证业务正常读写

迁移期间源与目标允许短暂不一致、最终收敛，以业务连续性为第一目标（信源论断，与 CAP 取舍一致）。

### 先切读、后切写

切换时先将读流量切到目标库观察 30 分钟~1 小时，确认无误再切写流量——以读侧验证降低写侧切换风险（信源做法，可视为策略主张）。

## Concepts Introduced（引入的概念）

- [[database-zero-downtime-migration]]

## Entities Mentioned（提及的实体）

（工具为通用组件未立页：Debezium、MyDumper/MyLoader、Nacos、Spring Boot；MySQL 见 [[mysql-locking]] 等既有库内概念，本信源未新增实体页。）

## Implications（影响／启示）

- 迁移方案文档的五要素（范围、时间计划、回滚方案、责任分工、风险评估）是把"系统性工程"落成可审计计划的最小集（解读）。
- 双写阶段"源成功目标失败"用本地消息表重试，与既有 [[local-message-table|本地消息表]] 模式互证（解读）。

## Limitations（局限）

- 单一二次信源（公众号），作者身份未标注；引 Gartner 数据未给报告出处与年份。
- 采集稿中代码块退化为空壳（仅存注释/签名行），代码细节缺失，落地需对照原文；配图在采集中退化为 1px 占位符。

## Related Knowledge（相关知识）

- [[database-zero-downtime-migration|数据库零停机迁移（概念页）]]
- [[table-sharding-migration|分表平滑迁移策略（概念页）]]
- [[cap-theorem|CAP 定理与最终一致性取舍（概念页）]]

## Source（信源）

- `raw/sources/architecture/2026-11-25-db-zero-downtime-migration.md`
