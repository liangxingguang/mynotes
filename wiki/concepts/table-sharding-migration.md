---
id: wiki-concept-table-sharding-migration
type: concept
title: 分表平滑迁移策略
status: active
created: 2026-10-23
updated: 2026-10-30
confidence: high
tags:
  - concept
  - database
  - sharding
sources:
  - raw/sources/architecture/2026-10-16-db-table-sharding-practice.md
  - raw/sources/architecture/2026-11-25-db-zero-downtime-migration.md
related:
  - wiki/sources/db-table-sharding-practice.md
  - wiki/concepts/hot-cold-data-separation.md
  - wiki/concepts/mysql-bulk-import.md
  - wiki/concepts/database-zero-downtime-migration.md
---
# 分表平滑迁移策略

## Definition（定义）

单表向分表（或新旧两套存储）迁移时，用"写路径 × 读路径"的策略矩阵控制流量切换，使迁移不停机、数据一致、可随时回滚的一组读写策略及其 SQL 重写机制。

## Why It Matters（为什么重要）

大表（单表 >1000 万行或 10GB、DDL 超 1 小时）治理绕不开水平拆分；直接停服切表代价高，双写/双读策略把迁移拆成可灰度、可回退的阶段，是京东库存流水表（日增 3400 万行）等场景的已验证路径。

## Core Characteristics（核心特征）

五种读写策略（京东零售技术信源）：

1. **doubleWriteAndReadOld** 双写读旧：写新旧两表、只读旧表——迁移初期，新表攒数据。
2. **doubleWriteAndReadNew** 双写读新：写两表、只读新表——校验期，可比对。
3. **singleWriteAndReadOld** 单写读旧：只写新表、只读旧表——回滚兜底态。
4. **singleWriteAndReadNew** 单写读新：只写新表、只读新表——迁移完成态。
5. **singleWriteAndDoubleRead** 单写双读：只写新表、新旧都读合并结果——读全量过渡期。

## Structure（结构）

- **双写**：单条 INSERT 重写为分号拼接的两条 SQL（`" ; "` 连接），参数映射复制一份；MyBatis 实现靠反射改 `BoundSql.sql`。
- **双读**：新旧表 UNION ALL 合并；COUNT/SUM 必须先子查询合并、外层再聚合；ORDER BY 表别名在 UNION ALL 后失效（MySQL ERROR 1250），排序字段须纳入子查询 SELECT 列。
- **路由**：配置优先 → 最少分配负载均衡 → 分布式锁保证唯一 + 重试；后缀用 ThreadLocal 缓存。

## How It Works（运作方式）

迁移阶段推进：双写读旧（新表回填追平）→ 双写读新（校验）→ 单写读新（完成）；任何阶段异常可退回单写读旧/双写读旧。策略以枚举配置动态切换（信源实现为 MyBatis 拦截器 + Policy 枚举）。

## Relationships（关系）

### Related Concepts（相关概念）

- 大表治理组合拳：分库分表、表分区、冷热分离、索引优化、读写分离（信源口径，本概念覆盖其中"分库分表"的迁移环节）。
- [[hot-cold-data-separation|冷热分离]]：组合拳的姊妹手段，解决时间维度的数据温度，与本概念（横向拆分）互补。
- [[mysql-bulk-import|MySQL 大批量导入优化]]：本概念讲"已有大表→分表"的双写双读迁移，该概念讲"海量新数据→分表"的批量灌入；分库分表是两者的共同前提。
- [[database-zero-downtime-migration|数据库零停机迁移]]：本概念是零停机迁移框架在"分库分表"场景下的特例，其双写双读策略矩阵补充了通用框架的读路径灰度细节。

### Distinctions（区分）

- 与 Sharding-JDBC/Mycat 等中间件的区别：中间件提供通用分片能力但 SQL 语法限制多（UNION/子查询/CASE WHEN 等不支持）；本概念是应用层自研轻量策略，KISS 够用即可（信源观点）。

## Evolution（演进）

- 2026-10-23：本页由单一信源（京东零售技术《大表治理之分表实践》）建立。
- 2026-11-25：新信源《数据库迁移零停机：从理论到实战的完美演进方案》（[[2026-11-25-db-zero-downtime-migration]]）印证本页的双写/双读阶段推进逻辑——其"双写→校验→切换"五阶段框架与本页"双写读旧（新表回填追平）→双写读新（校验）→单写读新（完成）"一致，并补充了通用迁移语境：双写阶段用 CDC（Debezium 基于 binlog）做增量同步、源成功目标失败用本地消息表重试、切换先切读流量观察再切写流量。该信源把本页的分表场景置于更广的零停机迁移框架中，编译为 [[database-zero-downtime-migration]]。

## Open Questions（开放问题）

- 双写分号拼接在部分失败（一表成功一表失败）时的一致性补偿机制？信源未展开。
- 与业界通用方案（如 gh-ost、在线改表 + binlog 双写）的取舍对比？

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-16-db-table-sharding-practice.md`（五种读写策略、双写/双读 SQL 机制、京东库存流水表案例）
- Source: `raw/sources/architecture/2026-11-25-db-zero-downtime-migration.md`（2026-11-25 补充：双写阶段增量同步、校验与切换次序的印证）

## Related Knowledge（相关知识）

- [[db-table-sharding-practice|大表治理之分表实践：手搓一个简单的数据库分表组件]]
- [[database-zero-downtime-migration|数据库零停机迁移（概念页）]]
