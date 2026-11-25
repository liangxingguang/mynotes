---
id: wiki-source-2026-11-25-pg-vs-mysql-java
type: source
title: PostgreSQL vs MySQL：Java 选型指南与实战避坑
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: medium
tags:
  - database
  - mysql
  - postgresql
sources:
  - raw/sources/architecture/2026-11-25-pg-vs-mysql-java.md
related:
  - wiki/comparisons/postgresql-vs-mysql.md
  - wiki/concepts/mysql-sql-execution-pipeline.md
  - wiki/concepts/mysql-locking.md
  - wiki/sources/mysql-6-locks.md
---
# PostgreSQL vs MySQL：Java 选型指南与实战避坑

## Overview（概览）

微信公众号技术长文，从底层架构、数据类型、事务并发、索引原理到 Java 开发实践与性能基准，全维度对比 PostgreSQL 与 MySQL，给出互联网应用/数据分析/GIS/全文搜索/金融五大业务场景的选型决策、双向迁移与双写共存方案，以及双方各 10 条最佳实践和间隙锁、表膨胀、深度分页、大事务四大避坑要点。正文自 `Assets/2026-11/wechat-pg-vs-mysql-java.md` 采集稿逐字收录（采集稿中 4 处 1px 占位图已按惯例剥离，代码块因采集折叠为单行、原文保留）。本信源编译出对比页 [[postgresql-vs-mysql]]。

## Key Facts（关键事实）

- **底层架构**：MySQL 插件式存储引擎（InnoDB 默认，聚簇索引，二级索引存主键需回表）；PG 一体化架构，堆表 + 所有索引存物理位置指针（TID），非主键索引不回表但依赖 VACUUM。
- **类型**：PG 的 NUMERIC 任意精度、JSONB（二进制、可索引）优于 MySQL；MySQL 的 DATETIME 精度高且使用简单。PG 仅 CHAR/VARCHAR/TEXT 且 VARCHAR 与 TEXT 无性能差异。
- **高级 SQL**：PG 原生支持递归 CTE、窗口函数、GIN/GiST/BRIN；MySQL 8.0 补齐窗口函数/CTE，但高级索引与扩展能力差距明显。
- **事务隔离**：MySQL 默认 RR（InnoDB 用间隙锁/临键锁防幻读，死锁概率高）；PG 默认 RC（无锁、并发好），串行化用乐观 SSI（图检测，非两阶段锁）。
- **MVCC**：InnoDB 隐藏列 trx_id/roll_pointer 实现回滚段回溯；PG 用 xmin/xmax 标记行版本，旧版本靠 VACUUM 清理，不及时会表膨胀。
- **索引**：两者均 B+ 树。InnoDB 有覆盖索引、函数索引；PG 的 INCLUDE 覆盖索引、GIN（JSONB/数组/全文）、GiST（空间/范围）、BRIN（大表范围、元数据极小）更丰富；PG 的 EXPLAIN ANALYZE 更详尽。
- **Java 实践（Spring Boot 3.2.5 + MyBatis-Plus 3.5.7）**：转账用 `SELECT ... FOR UPDATE` 悲观锁；JSON 字段 MySQL 用 JSON 类型 + JSON_CONTAINS/JSON_EXTRACT，PG 适配用 `@>`/`->>`；分页插件按 `DbType.POSTGRE_SQL` 配置；PG 双引号标识符区分大小写。
- **JMeter 基准**（i7-13700K / 32GB / MySQL 8.0.36 / PG 16.2 / JDK 17，100 并发×1000 循环）：MySQL 在单条插入(1.2 vs 1.8ms)、批量插入(15 vs 22ms)、主键点查(0.3 vs 0.5ms)、更新(1.5 vs 2.0ms)、删除(1.3 vs 1.7ms)更快；PG 在二级索引查询(0.4 vs 0.5ms)、范围查询(1.8 vs 2.1ms)更快。
- **选型决策**：互联网高并发 CRUD → MySQL；复杂查询/报表/BI/数仓 → PG；GIS（PostGIS+GiST）→ PG；全文搜索 PG 内置或 ES 做核心；金融两者皆可，重交易吞吐选 MySQL、重复杂计算与完整性选 PG。
- **迁移**：MySQL→PG 用 pgloader 自动迁移；PG→MySQL 因高级特性多需手动重写；过渡期双写中间件 + 同步工具保一致性。
- **避坑四要点**：MySQL 间隙锁增死锁概率（高并发尽量 RC）；PG 表膨胀需定期 VACUUM ANALYZE（VACUUM FULL 锁表慎用）；深度分页用游标分页、避免 SELECT COUNT(*)；大事务锁持有久、旧版本积压，应拆小事务。

## Important Claims（重要论断）

### Claim 1：架构差异决定回表行为

信源主张：InnoDB 聚簇索引使主键查询高效但二级索引需回表；PG 堆表 + 物理位置指针使二级索引一次查找但不回表，主键查询相对低效——架构选择直接决定查询模式的优劣。

### Claim 2：默认隔离级别的取舍是明确设计选择

MySQL 默认 RR 用间隙锁防幻读但增加死锁概率；PG 默认 RC 无锁并发好、串行化用乐观 SSI。两者默认值反映不同的并发 vs 一致性取舍，高并发 OLTP 下 MySQL 选 RC 是明确取舍而非"RC 更先进"。

### Claim 3：基准结果与场景强相关，非绝对优劣

MySQL 在 CRUD（插入/更新/删除/主键点查）更快，PG 在二级索引查询与范围查询更快——性能优势随操作类型切换，没有"谁全面更快"。

### Claim 4：没有最好的数据库，只有最适合的

信源结论：选型应综合业务需求、团队技术栈、未来规划；业务简单重 CRUD 选 MySQL，业务复杂需复杂查询与特殊数据类型选 PG。

## Concepts Introduced（引入的概念）

- **PostgreSQL vs MySQL 对比** → 编译为对比页 [[postgresql-vs-mysql]]（含对比矩阵、基准、选型、迁移、避坑）。
- **MySQL SQL 执行管线**：本信源在索引/执行层面触及 MySQL 内部，完整管线见 [[mysql-sql-execution-pipeline]]。
- **MySQL 锁体系**：间隙锁、MVCC、隔离级别等机制详见 [[mysql-locking]] 及其信源 [[mysql-6-locks]]，本信源只作对比性引用。

## Entities Mentioned（涉及实体）

- **MySQL**：插件式存储引擎架构的关系型数据库，InnoDB 为默认引擎。
- **PostgreSQL（PG）**：一体化架构的关系型数据库，支持丰富扩展与高级索引。
- **InnoDB**：MySQL 默认存储引擎，聚簇索引，支持事务/行级锁/外键。
- **MyISAM**：MySQL 旧存储引擎，无事务、查询性能高。
- **PostGIS**：PG 空间数据扩展，配合 GiST 索引支持 GIS。
- **pgloader**：MySQL→PG 自动迁移工具。
- **Spring Boot 3.2.5 / MyBatis-Plus 3.5.7**：Java 实践技术栈。

## Implications（启示）

- **选型前先厘清操作画像**：CRUD 密集选 MySQL，复杂查询/空间/全文选 PG，以基准数据为依据而非团队惯性。
- **MVCC 各有代价**：InnoDB 的回滚段与 PG 的 VACUUM 是两种旧版本管理路径，PG 需主动运维 VACUUM 否则表膨胀，MySQL 需关注间隙锁死锁。
- **迁移成本不对称**：MySQL→PG 有 pgloader 自动化，PG→MySQL 多需手动重写，迁移方向影响工作量预估。
- **Java 层适配点集中**：分页 DbType、JSON 运算符、标识符大小写、悲观锁语法是 PG 适配 MySQL 代码的主要改动点。

## Limitations（局限）

- **基准为单一环境**：JMeter 基准基于 i7-13700K/32GB/默认配置的特定环境，100 并发×1000 循环，结论不可直接外推到其他负载与配置；信源自身也提示"默认配置下得到，优化后两者均可显著提升"。
- **采集稿代码块折叠**：采集稿中代码块因抓取折叠为单行、空格丢失，raw 中按原文保留，阅读时需注意换行与缩进为采集失真，非原文如此。
- **配图缺失**：原文 4 处 1px 占位图已剥离，1 处 mdnice 图链接残留在代码块内（采集失真），原文架构图未文字化。
- **版本时效**：基准版本（MySQL 8.0.36 / PG 16.2）与功能对比基于信源时点，后续版本特性可能有变化。
- **信源为单篇科普**：选型论断为经验性总结，未引用第三方权威测评，复杂场景决策需结合实测。

## Related Knowledge（相关知识）

- [[postgresql-vs-mysql]]：本信源编译的对比页，含矩阵、基准、选型、迁移、避坑的完整对照。
- [[mysql-sql-execution-pipeline]]：MySQL 内部执行机制，与本信源的索引/MVCC 对比互补。
- [[mysql-locking]]：间隙锁、隔离级别、MVCC 的锁体系细节。
- [[mysql-6-locks]]：MySQL 锁信源，配合理解 RR/间隙锁机制。

## Source（信源）

- 原始信源页：`raw/sources/architecture/2026-11-25-pg-vs-mysql-java.md`
- 采集稿：`Assets/2026-11/wechat-pg-vs-mysql-java.md`
- 原文链接：http://mp.weixin.qq.com/s?__biz=MzI2MDA5MDM0MA==&mid=2650602748&idx=1&sn=35b606b59c9e8b3bab8217ae6913fa67&chksm=f266ac77c51125614c8f535810e5917df2c0e220edc566e2b2d048f9a274dea23bf657d68b1f
