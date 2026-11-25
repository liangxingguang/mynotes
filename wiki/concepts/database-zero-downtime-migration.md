---
id: wiki-concept-database-zero-downtime-migration
type: concept
title: 数据库零停机迁移（Zero-Downtime Database Migration）
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: medium
tags:
  - concept
  - database
  - migration
sources:
  - raw/sources/architecture/2026-11-25-db-zero-downtime-migration.md
related:
  - wiki/concepts/table-sharding-migration.md
  - wiki/concepts/cap-theorem.md
  - wiki/concepts/blue-green-deployment.md
  - wiki/concepts/local-message-table.md
  - wiki/sources/2026-11-25-db-zero-downtime-migration.md
---
# 数据库零停机迁移（Zero-Downtime Database Migration）

## Definition（定义）

在用户无感知的前提下，将业务数据库从源库迁移到目标库的系统性工程。本质是**在数据复制的同时保证业务的正常读写**，并在适当时机平滑切换；核心原理可概括为"**双写 + 同步 + 校验 + 切换**"四个步骤（信源）。一致性目标为最终一致性——迁移期间源与目标允许短暂不一致，最终收敛。

## Why It Matters（为什么重要）

停机成本高昂（信源引 Gartner：每小时停机平均约 30 万美元、金融业每分钟 5000 美元），且迁移场景广泛：存储升级、架构调整（分库分表）、数据库升级、云迁移、数据库替换、容量扩展六类均可能需要。零停机迁移把"复制粘贴"式的高危操作拆成可监控、可校验、可回滚的阶段，是支付、电商、医疗等连续性敏感系统的标配能力（信源观点）。

## Core Characteristics（核心特征）

1. **三组件架构模型**：源数据库 + 目标数据库 + 数据同步工具；迁移期应用同时面向两套存储读写。
2. **最终一致性取向**：按 CAP 定理在迁移场景优先保证可用性与分区容错，牺牲短暂强一致（信源，详见 [[cap-theorem]]）。
3. **五阶段迁移法**：准备 → 初始化同步 → 双写 → 校验 → 切换与收尾，每阶段有明确目标与交付物（信源框架）。
4. **工具选型按场景**：同构迁移用数据库原生 replication；异构用 Debezium/AWS DMS 等 CDC 工具；大数据量全量用 MyDumper/MyLoader 并行导出导入（信源）。
5. **应用层改造三件套**：配置中心动态开关（信源用 Nacos）、数据源路由（Spring AbstractRoutingDataSource）、双写逻辑（@Aspect+@DualWrite 注解切面）（信源实现）。
6. **切换先读后写**：低峰期先切读流量观察 30 分钟~1 小时，确认无误再切写流量；切换后做功能/数据/性能三项验证（信源做法）。

## Structure（结构）

五阶段迁移法（信源框架）：

1. **准备**：目标库环境搭建（MySQL 建议 8.0.34+）；工具选型；监控源/目标库与同步延迟（应控制在秒级）；方案文档五要素（迁移范围、时间计划、回滚方案、责任分工、风险评估）；应用改造（配置中心、数据源路由、双写逻辑）。
2. **初始化同步**：MyDumper 并行导出历史数据 → MyLoader 导入；导入后必须逐表核对记录数。
3. **双写**：Debezium 基于 binlog 做 CDC 增量同步（捕获 INSERT/UPDATE/DELETE）；应用层双写；一致性保障——源成功目标失败用本地消息表定时重试（见 [[local-message-table]]），性能影响用异步双写（线程池）缓解。
4. **校验**：数据量校验（逐表计数比对）、核心表抽样内容校验、生成校验报告。
5. **切换与收尾**：低峰期切换 + checklist；先读后写；切换后三项验证；备份源库、更新文档、观察 1-2 周后下线源库。

## How It Works（运作方式）

阶段推进逻辑（信源立场，解读）：初始化同步把目标库"追平"到源库的历史快照 → 双写让增量变更持续同步到目标库 → 校验确认两边一致 → 切换把流量从源迁到目标。任一阶段不达标则停在该阶段（回滚方案在准备阶段已定义），切换前的读流量观察是最后一次低风险验证窗口。

## Relationships（关系）

### Related Concepts（相关概念）

- [[table-sharding-migration|分表平滑迁移策略]]：本概念是横切各类迁移场景的通用框架；分表迁移是其"架构调整（分库分表）"场景下的特例，其双写/双读策略矩阵（双写读旧→双写读新→单写读新）与本概念"双写→校验→切换"的阶段推进互为印证，且补充了读路径的灰度细节。
- [[cap-theorem|CAP 定理与最终一致性取舍]]：本概念的一致性模型是 CAP 取舍在迁移场景的直接应用（优先可用性与分区容错）。
- [[blue-green-deployment|蓝绿发布]]：同为"两套环境 + 流量切换 + 可回退"的灰度思想；蓝绿面向应用发布，本概念面向数据存储迁移。
- [[local-message-table|本地消息表]]：双写阶段"源成功目标失败"的重试机制即本地消息表模式的应用。

### Distinctions（区分）

- **与停服迁移**：停服迁移以停机窗口换取简单（公告+复制+切流）；零停机迁移以双写/同步/校验的工程复杂度换取业务连续性，适用于停机成本不可接受的场景（信源）。
- **与分表迁移**：见 [[table-sharding-migration]]——分表迁移聚焦"单表→分表"的读写策略矩阵，本概念覆盖同构/异构、升级/换库等更广场景。

## Evolution（演进）

- 2026-11-25 — 新建。由单一信源（《数据库迁移零停机：从理论到实战的完美演进方案》，微信公众号）建立。confidence: medium——单一二次信源、作者身份未标注；五阶段迁移法为作者框架；采集稿代码块退化为空壳，实现细节需对照原文。
- 云原生趋势（信源展望）：迁移朝 AI 自动生成方案、更高性能实时同步、跨云便捷迁移、自监控自修复演进；核心目标不变——保证业务连续性前提下安全高效完成迁移。

## Open Questions（开放问题）

- 双写阶段"先写源后写目标"的部分失败如何与 CDC 增量同步的乱序/重复叠加处理，信源仅给出本地消息表重试，未讨论与 binlog 同步的时序关系。
- 异构迁移（MySQL→PostgreSQL）类型映射的完整矩阵与验证深度，信源只给原则（映射分析+自动转换+抽样验证）。
- 回滚方案的触发条件与具体步骤，信源仅列"方案文档应包含回滚方案"，未给标准。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-25-db-zero-downtime-migration.md`（五阶段迁移法、双写+同步+校验+切换原理、工具选型、三类常见问题、Gartner 停机成本数据、作者 5000 万条交易记录 72 小时迁移经历）

## Related Knowledge（相关知识）

- [[2026-11-25-db-zero-downtime-migration|信源页：数据库迁移零停机：从理论到实战的完美演进方案]]
- [[table-sharding-migration]]
