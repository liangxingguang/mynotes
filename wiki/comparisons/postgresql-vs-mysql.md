---
id: wiki-comparison-postgresql-vs-mysql
type: comparison
title: PostgreSQL vs MySQL
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: medium
tags:
  - comparison
  - database
  - mysql
  - postgresql
sources:
  - raw/sources/architecture/2026-11-25-pg-vs-mysql-java.md
related:
  - wiki/sources/2026-11-25-pg-vs-mysql-java.md
  - wiki/concepts/mysql-sql-execution-pipeline.md
  - wiki/concepts/mysql-locking.md
  - wiki/sources/mysql-6-locks.md
---
# PostgreSQL vs MySQL

## Scope（范围）

对比两款主流开源关系型数据库 **PostgreSQL（PG）** 与 **MySQL**，覆盖底层架构、数据类型、事务并发、索引原理、Java 开发实践、性能基准、业务选型、迁移与避坑。结论面向 Java（Spring Boot + MyBatis-Plus）技术栈的数据库选型决策。证据来自单篇科普长文，基准为特定环境单次测试，详见 [[postgresql-vs-mysql-java]] 信源页与下方"重要提醒"。

## Comparison Matrix（对比矩阵）

| Dimension（维度） | MySQL | PostgreSQL |
|---|---|---|
| Purpose（定位） | 简单高效、高并发读写 | 严谨丰富、复杂查询与完整性 |
| 架构 | 插件式存储引擎（服务器层 + 可插拔引擎） | 一体化架构 + 扩展机制 |
| 数据组织 | InnoDB 聚簇索引（数据与主键同存，二级索引存主键需回表） | 堆表 + 索引存物理位置指针（TID），非主键索引不回表 |
| SQL 标准 | 部分支持 | 高度兼容 |
| 数值类型 | 多整数变体（TINYINT…BIGINT）、FLOAT/DOUBLE、DECIMAL | SMALLINT/INTEGER/BIGINT、REAL/DOUBLE PRECISION、NUMERIC 任意精度 |
| 字符串类型 | CHAR/VARCHAR/TEXT/BLOB，VARCHAR 上限 65535 | 仅 CHAR/VARCHAR/TEXT，VARCHAR 与 TEXT 无性能差异 |
| 时间类型 | DATE/TIME/DATETIME/TIMESTAMP/YEAR | DATE/TIME/TIMESTAMP/TIMESTAMPTZ/INTERVAL，范围更广 |
| JSON | 5.7 起 JSON 类型，二进制可索引，不支持路径查询 | 9.4 起 JSONB，二进制可索引，支持路径查询/聚合/操作符 |
| 高级 SQL | 8.0 补齐窗口函数/CTE，高级索引滞后 | 原生递归 CTE、窗口函数、数组、范围类型 |
| 事务隔离 | 默认 RR（间隙锁/临键锁防幻读，死锁概率高） | 默认 RC（无锁并发好），串行化用乐观 SSI |
| MVCC | 隐藏列 trx_id/roll_pointer，回滚段回溯 | xmin/xmax 标记版本，旧版本靠 VACUUM 清理（不及时表膨胀） |
| 索引类型 | B+ 树、哈希、全文 | B+ 树、哈希、GIN、GiST、SP-GiST、BRIN、全文 |
| 覆盖索引 | 需将所有查询列纳入索引 | INCLUDE 子句纳入非键列，不参与排序比较 |
| 扩展能力 | 有限 | 极强（PostGIS 等） |
| 学习曲线 | 平缓 | 陡峭 |
| CRUD 性能（基准） | 插入/更新/删除/主键点查更快 | 二级索引查询/范围查询更快 |
| 迁移难度 | PG→MySQL 需手动重写（高级特性多） | MySQL→PG 可用 pgloader 自动迁移 |

## Analysis（分析）

**架构差异是所有差异的根源**：MySQL 插件式架构带来灵活性与简单高效，InnoDB 聚簇索引使主键查询高效但二级索引需回表；PG 一体化架构更严谨，堆表 + 物理位置指针使二级索引一次查找但不回表，主键查询相对低效。两者在"回表"这一关键行为上形成镜像对称。

**默认隔离级别反映不同取舍**：MySQL 默认 RR 用间隙锁防幻读，代价是死锁概率高；PG 默认 RC 无锁、并发好，串行化用乐观 SSI（图检测而非两阶段锁）。高并发 OLTP 下 MySQL 选 RC 是明确的并发取舍，而非"RC 更先进"。MVCC 实现也分化：InnoDB 用隐藏列 + 回滚段，PG 用行版本标记 + VACUUM 主动清理，后者引入表膨胀的运维成本。

**基准结果随操作类型切换**：在 i7-13700K/32GB/MySQL 8.0.36/PG 16.2/JDK 17、100 并发×1000 循环的 JMeter 测试中，MySQL 在单条插入、批量插入、主键点查、更新、删除更快（聚簇索引主键优势）；PG 在二级索引查询、范围查询更快（非聚簇索引不回表优势）。**不存在"谁全面更快"**，性能优势随操作画像切换。

**Java 适配点集中且可枚举**：从 MySQL 代码迁到 PG，主要改动是分页插件 DbType（`MYSQL`→`POSTGRE_SQL`）、JSON 运算符（`JSON_CONTAINS`/`JSON_EXTRACT`→`@>`/`->>`）、悲观锁语法（表名大写需双引号）、标识符大小写敏感。这些是低门槛、可批量处理的适配项。

**信源核心立论**：没有最好的数据库，只有最适合的——选型应综合业务需求、团队技术栈、未来规划。

## Best Fit（适用场景）

### MySQL is preferable when（以下情况 MySQL 更合适）

- 互联网高并发 CRUD 应用：用户管理、订单、支付、社交、电商等读写频繁、数据量大的场景；
- 业务以简单 CRUD 为主，追求简单易用、平缓学习曲线与成熟运维生态；
- 金融等重交易吞吐场景（InnoDB ACID 成熟、性能适合高并发交易）；
- 需要读写分离、分库分表等成熟横向扩展方案。

### PostgreSQL is preferable when（以下情况 PostgreSQL 更合适）

- 复杂查询与数据分析：BI、数据仓库、报表、日志分析、数据挖掘；
- GIS 地理信息系统：依赖 PostGIS + GiST 的空间数据与空间查询；
- 全文搜索（PG 内置即可，核心搜索仍建议 ES）；
- 需要复杂计算与数据完整性的金融系统；
- 需要 JSONB、数组、递归 CTE、窗口函数等高级特性与强扩展能力。

### 迁移方向建议

- **MySQL → PG**：pgloader 自动迁移表结构与数据，再手动调整类型/约束/存储过程，适配 SQL 语法，最后优化配置与压测。
- **PG → MySQL**：高级特性多，需手动转换类型/约束、重写存储过程、用应用代码实现 PG 特有功能，工作量更大。
- **过渡期**：双写中间件 + 数据同步工具保一致性，逐步切换。

## Important Caveats（重要提醒）

1. **基准为单一环境、单次测试**：JMeter 基准基于特定硬件与默认配置（MySQL 8.0.36/PG 16.2），结论不可直接外推到其他负载与配置；信源自身提示"默认配置下得到，优化后两者均可显著提升"。
2. **采集稿代码块失真**：raw 中信源代码块因采集折叠为单行、空格丢失，属采集失真而非原文，引用代码需回溯原文。
3. **配图未文字化**：原文架构图等为 1px 占位图已剥离，1 处 mdnice 图链接残留在代码块内，关键架构图未以文字呈现。
4. **版本时效**：功能对比与基准基于信源时点版本，后续版本特性可能变化，选型前应核对目标版本。
5. **信源为单篇科普**：选型论断为经验性总结，未引用第三方权威测评；复杂场景决策应结合自身实测，不宜仅凭本文定论。
6. **并发细节需回溯锁体系**：间隙锁、MVCC、隔离级别等机制的细节，本对比页仅作对照，深度机制见 [[mysql-locking]] 与 [[mysql-6-locks]]。

## Evidence（证据）

- 信源原文（架构/类型/事务/索引/Java 实践/基准/选型/迁移/避坑全维度）：`raw/sources/architecture/2026-11-25-pg-vs-mysql-java.md`。
- 采集稿：`Assets/2026-11/wechat-pg-vs-mysql-java.md`。
- 相关信源：[[mysql-6-locks]]（MySQL 锁体系，支撑事务/并发对比项）。

## Related Knowledge（相关知识）

- [[postgresql-vs-mysql-java]]：本对比页的信源页，含完整原文摘要与论断。
- [[mysql-sql-execution-pipeline]]：MySQL 内部执行机制，与本对比的索引/MVCC 维度互补。
- [[mysql-locking]]：间隙锁、隔离级别、MVCC 的锁体系细节，支撑事务并发对比。
- [[mysql-6-locks]]：MySQL 锁信源。
