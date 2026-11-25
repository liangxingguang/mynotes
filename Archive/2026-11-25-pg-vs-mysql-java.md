---
id: 2026-11-25-pg-vs-mysql-java
title: PostgreSQL vs MySQL：Java 选型指南与实战避坑
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzI2MDA5MDM0MA==&mid=2650602748&idx=1&sn=35b606b59c9e8b3bab8217ae6913fa67&chksm=f266ac77c51125614c8f535810e5917df2c0e220edc566e2b2d048f9a274dea23bf657d68b1f#rd
source_type: article
platform: wechat
created: 2026-11-25
category: 技术
tags: [MySQL, Java]
asset_ref: Assets/2026-11/wechat-pg-vs-mysql-java.md
wiki_status: ingested
---

# PostgreSQL vs MySQL：Java 选型指南与实战避坑

> 摘要：从底层架构、数据类型、事务并发、索引原理到 Java 开发实践与性能基准，全维度对比 PostgreSQL 与 MySQL，给出五大业务场景的选型决策、双向迁移与双写共存方案，以及双方最佳实践和间隙锁、表膨胀、深度分页、大事务四大避坑要点。

## 核心要点

- **底层架构**：MySQL 插件式存储引擎（InnoDB/MyISAM 可切换，行存）；PG 一体化架构，表存储与索引统一，表即堆结构（数据按插入顺序存放，靠 MVCC 维护版本）。InnoDB 聚簇索引（主键即数据顺序，二级索引叶子存主键需回表）；PG 堆表 + 所有索引存物理位置指针（TID），非主键索引不回表但依赖 VACUUM。
- **类型与 SQL**：PG 的 NUMERIC 任意精度、JSONB（二进制存储、可索引）优于 MySQL；MySQL 的 DATETIME 精度高且使用简单。PG 原生支持递归 CTE、窗口函数、高级索引（GIN/GiST/BRIN）；MySQL 8.0 后补齐窗口函数/CTE，但高级索引与扩展能力差距明显。
- **事务与隔离**：MySQL 默认 RR（InnoDB 用 间隙锁/临键锁 防幻读，代价是死锁概率高）；PG 默认 RC（无锁、并发好），串行化用乐观的 SSI（基于图检测，非两阶段锁）。MVCC 差异：InnoDB 隐藏列 trx_id/roll_pointer 实现回滚段回溯；PG 用 xmin/xmax 标记行版本，旧版本靠 VACUUM 清理，不及时会表膨胀。
- **索引**：两者均 B+ 树。InnoDB 有覆盖索引、函数索引；PG 的 INCLUDE 覆盖索引、GIN（JSONB/数组/全文）、GiST（空间/范围）、BRIN（大表范围查询，元数据极小）更丰富。PG 的 EXPLAIN ANALYZE 更详尽，利于调优。
- **Java 实践（Spring Boot 3.2.5 + MyBatis-Plus 3.5.7）**：转账用 `SELECT ... FOR UPDATE` 悲观锁；JSON 字段 MySQL 用 JSON 类型 + JSON_CONTAINS/JSON_EXTRACT，PG 适配用 `@>`/`->>` 运算符；分页插件按 DbType.POSTGRE_SQL 配置；PG 双引号标识符区分大小写，命名规范需注意。JMeter 基准：MySQL 在插入/更新/删除/主键点查更快；PG 在二级索引查询与范围查询更快。
- **选型决策**：互联网高并发 CRUD（用户/订单/支付/电商）→ MySQL；复杂查询与报表/BI/数仓 → PG；GIS 空间数据（PostGIS+GiST）→ PG；全文搜索可 PG 内置，核心搜索仍建议 ES；金融系统两者皆可，重交易吞吐选 MySQL，重复杂计算与完整性选 PG。
- **迁移与共存**：MySQL→PG 用 pgloader 自动迁移；PG→MySQL 因高级特性多需手动转换重写。过渡期用双写中间件 + 数据同步工具保证一致性，逐步切换。
- **避坑四要点**：MySQL 间隙锁增加死锁概率（高并发尽量用 RC）；PG 表膨胀需定期 VACUUM ANALYZE（VACUUM FULL 会锁表慎用）；深度分页用游标分页替代 OFFSET 并避免 SELECT COUNT(*)；大事务锁持有久、旧版本积压，应拆分小事务。

## 正文

见 `[[Assets/2026-11/wechat-pg-vs-mysql-java]]`（采集全文，约 3.4 万字符，已通读）。文章按六层展开：底层架构与核心差异（插件式 vs 一体化、聚簇索引 vs 堆表）、数据类型与 SQL 特性对比、事务与并发控制（默认隔离级别、MVCC 实现、锁机制）、索引原理与性能差异、Spring Boot + MyBatis-Plus 完整 Java 实战（含 JSON 字段双库适配代码）与 JMeter 基准测试，然后给出互联网应用/数据分析/GIS/全文搜索/金融五大场景的选型决策、双向迁移步骤与双写共存方案，最后以双方各 10 条最佳实践和四大避坑指南收束，总结"没有最好的数据库，只有最适合的数据库"。

## 来源

- [PostgreSQL vs MySQL：Java 选型指南与实战避坑](http://mp.weixin.qq.com/s?__biz=MzI2MDA5MDM0MA==&mid=2650602748&idx=1&sn=35b606b59c9e8b3bab8217ae6913fa67&chksm=f266ac77c51125614c8f535810e5917df2c0e220edc566e2b2d048f9a274dea23bf657d68b1f#rd)（专辑《数据库》第 8 篇）

## 附件

- [[Assets/2026-11/wechat-pg-vs-mysql-java]]
