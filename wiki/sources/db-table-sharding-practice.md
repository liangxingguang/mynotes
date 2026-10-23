---
id: wiki-source-db-table-sharding-practice
type: source
title: 大表治理之分表实践：手搓一个简单的数据库分表组件
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - database
  - sharding
  - java
sources:
  - raw/sources/architecture/2026-10-16-db-table-sharding-practice.md
related:
  - wiki/concepts/table-sharding-migration.md
---
# 大表治理之分表实践：手搓一个简单的数据库分表组件

## Overview（概览）

京东零售技术的大表治理实战：库存流水表日增 3400 万行/31GB，因 Sharding-JDBC/Mycat 等中间件 SQL 语法限制多，团队基于 MyBatis 插件机制自研轻量分表拦截器，按仓号分 128 表，靠五种读写策略完成单表→分表的不停机平滑迁移与回滚。是 [[table-sharding-migration|分表平滑迁移策略]] 概念的来源信源。

## Key Facts（关键事实）

- 大表判定（信源口径）：单表 >1000 万行或 10GB、读写明显变慢、DDL 超 1 小时；影响核心业务流程的表数据量不大也算。
- 背景量级：库存流水表日增 3400 万行/31GB；已按仓号分库，单分库 20 天存量四五千万行；本次在分库基础上分 128 表（`st_stock_stream:128`）。
- 中间件局限：Sharding-JDBC 不支持 UNION/UNION ALL、完整子查询、CASE WHEN、DISTINCT 聚合等；Mycat/Cobar/TDDL/Atlas 跨分片限制更多——分库时部门已因此自研分库插件，分表沿用 KISS 原则继续自研。
- 架构：MyBatis 拦截器 `TableShardingInterceptor`（策略模式 + 责任链），模块含拦截、Policy 策略枚举、SQL 解析重写、ShardingSuffixCalculator 路由、参数映射；插件链含 SQLMarkingPlugin、SQLBasedDatabaseProtectorPlugin、DataSourceRoutingInterceptor。
- 双写实现：`" ; "` 分号拼接新旧两条 INSERT + `parameterMappings.addAll(自身)` 复制参数 + 反射改 BoundSql.sql。
- 双读实现：UNION ALL 合并新旧表；COUNT/SUM 须子查询合并后外层再 SUM；ORDER BY 表别名在 UNION ALL 后失效（ERROR 1250），排序字段须纳入子查询 SELECT 列。
- 路由：配置优先 → 最少仓负载均衡 → 分布式锁保证分配唯一 + 重试容错；性能上 ThreadLocal 缓存后缀、分表键索引、每分表独立连接池。

## Important Claims（重要论断）

### Claim 1：中间件 SQL 限制下，自研"够用"组件优于硬套 Sharding-JDBC

造轮子目的只是适配自己场景，遵循 KISS 原则（信源观点）。

### Claim 2：五种读写策略组合即可支撑不停机迁移与随时回滚

双写保证迁移期一致、双读保证读全量，策略可动态切换（见 [[table-sharding-migration]]）。

## Concepts Introduced（引入的概念）

- [[table-sharding-migration|分表平滑迁移策略]]（五种读写策略矩阵 + 双写/双读 SQL 重写）

## Entities Mentioned（提及的实体）

- 京东零售技术（团队/公众号，未单独立页）

## Implications（影响／启示）

双写双读策略矩阵同样适用于分库、换存储引擎、ES 索引重建等"新旧存储并存迁移"场景（解读）。

## Limitations（局限）

- 只读/写路径基于 MyBatis 插件，强耦合 MyBatis BoundSql 内部 API（反射改 sql 字段），升级 MyBatis 有兼容性风险。
- 双写非事务性：分号拼接双 SQL 的一致性边界（部分失败处理）原文未展开。

## Related Knowledge（相关知识）

- [[table-sharding-migration|分表平滑迁移策略]]

## Source（信源）

- `raw/sources/architecture/2026-10-16-db-table-sharding-practice.md`
