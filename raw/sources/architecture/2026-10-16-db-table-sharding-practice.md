---
title: 大表治理之分表实践：手搓一个简单的数据库分表组件
source: 微信公众号（京东零售技术）
source_url: "https://mp.weixin.qq.com/s/q9EaCqqHxXtdZKjU_n6W1w"
source_type: article
platform: mp.weixin.qq.com
captured: 2026-10-16
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-16-db-table-sharding-practice.md
asset_ref: Assets/2026/10/db-table-sharding-practice.md
---

# 大表治理之分表实践：手搓一个简单的数据库分表组件

# 大表治理之分表实践：带你手搓一个简单的数据库分表组件

> 来源：微信公众号（京东零售技术系列，biz=MzU1MzE2NzIzMg）
> 抓取：web-fetch，fetch_level=browser，正文约 23,380 字符
> 原文：https://mp.weixin.qq.com/s/q9EaCqqHxXtdZKjU_n6W1w

## 一、背景

在大型系统中，流量大，数据量大，很容易出现大表，一般来说，大表有以下几方面特征：

1. 数据量维度：通常认为单表数据量超过 1000 万行或 10GB 以上可以视为大表。
2. 性能维度：当表的查询、插入、更新、删除操作开始出现明显性能下降。
3. 维护维度：当对表进行 DDL 操作（如添加索引、修改字段）需要很长时间（如超过 1 小时）。
4. 业务维度：根据具体业务场景，影响核心业务流程的表即使数据量不大也可能被视为大表。

以库存流水表为例，一天的流水量是 3400 万行，大小为 31GB。

大表会伴随着产生读写性能下降、服务耗时长、DDL、DML 时间长、备份恢复难度大、统计信息不准确等弊端，需要进行大表治理优化。

## 二、治理方案

### 2.1 大表的治理优化方案

一般有几个思路：

- 分库分表：按业务维度（仓号、SKU、主键 ID 等）水平拆分。
- 表分区：按时间、哈希或范围分区，提高查询效率。
- 冷热分离：冷数据归档结转，超过一定时间的热数据则转为冷数据存储。
- 索引优化：删除冗余和低效索引，减少索引维护成本，提升单表读写性能。
- 读写分离：主库写操作，从库读操作，减轻主库压力。

在本系统的治理中，除了表分区方式暂未使用，其他优化策略均有使用，尤其是在分库分表方面，通过水平拆分数据量降维最直接高效，也是本文阐述的重点。

### 2.2 分表组件选择

分库方面，之前已接入分库，按仓号分库，但流水表尚未分表，单表的流水量依然很大，其中一个分库下 20 天的单表存量数据行在四五千万行左右。

本次是在分库的基础上进行分表。业界常用组件有 Sharding-JDBC、Mycat、Cobar、TDDL、Atlas 等，它们在 SQL 语法支持上都存在局限性：

- **Sharding-JDBC**：不支持 OR、UNION/UNION ALL、HAVING、完整子查询、DISTINCT 聚合、SELECT LAST_INSERT_ID()、CASE WHEN、VALUES 多行 INSERT、dual 虚拟表等。
- **Mycat**：不支持跨库多表关联和子查询、CREATE TABLE LIKE/SELECT、SELECT FOR UPDATE、LOCK IN SHARE MODE、跨分片 UPDATE/DELETE、多表 UPDATE 或更新分片键、跨分片 ORDER BY LIMIT。
- **Cobar**：跨库不支持 JOIN/分页/排序/子查询、SAVEPOINT；SET 语句被忽略（事务和字符集除外）；分库下 INSERT 必须含拆分字段、UPDATE 不能改拆分字段。
- **TDDL**：不支持 JOIN、多表查询、跨库 JOIN、存储过程和函数。
- **Atlas**：社区维护较久，功能相对有限，不支持跨库 JOIN 等复杂操作。

局限性主要源于分库分表场景下 SQL 解析与路由的复杂性，以及各组件架构设计差异。

正因为这些 SQL 语法局限，之前分库时部门没有继续用 Sharding-JDBC，而是自研了适合自己的分库插件。造轮子目的只是适配自己的场景，遵循 KISS 原则，够用 +1。分表时依然选择自研。

## 三、组件设计

基于 MyBatis 插件机制实现的分表拦截器，采用策略模式 + 责任链模式的架构设计。

插件链：SQLMarkingPlugin、SQLBasedDatabaseProtectorPlugin、DataSourceRoutingInterceptor、TableShardingInterceptor（分表拦截器）。

模块划分：

- 拦截处理模块：intercept() 方法，负责拦截 SQL 执行。
- 策略模块：Policy 枚举，定义不同的读写策略。
- SQL 处理模块：负责 SQL 的解析、修改和重写。
- 路由计算模块：与 ShardingSuffixCalculator 交互，计算分表后缀。
- 参数处理模块：处理 SQL 参数映射。

## 四、组件研发

### 4.1 分表策略

分表规则：

- 基于仓库编号（warehouseNo）进行分表。
- 支持多种分表策略：单写单读、单写双读、双写单读、双写双读。
- 分表数量可配置，如 `st_stock_stream:128` 表示分为 128 张表。

### 4.2 读写策略

1. **doubleWriteAndReadOld**：双写读旧表——写操作同时写旧表和新表；读操作只读旧表。
2. **doubleWriteAndReadNew**：双写读新表——同时写旧表和新表；只读新表（分表）。
3. **singleWriteAndReadOld**：单写读旧表——只写新表（分表）；只读旧表。
4. **singleWriteAndReadNew**：单写读新表——只写新表；只读新表。
5. **singleWriteAndDoubleRead**：单写双读——只写新表；同时读旧表和新表，结果合并。

### 4.3 SQL 处理机制

SQL 解析与重写流程：

1. 识别 SQL 中的表名
2. 判断是否需要分表处理
3. 提取分表键（warehouseNo）
4. 计算分表后缀
5. 重写 SQL，替换表名
6. 处理参数映射

特殊 SQL 处理：

- **COUNT 查询**：`SELECT COUNT(*) FROM table` → `SELECT SUM(countNumForSharding) FROM (SELECT COUNT(*) AS countNumForSharding FROM table_0 UNION ALL ...)`
- **SUM 查询**：`SELECT SUM(column) FROM table` → `SELECT SUM(sumNumForSharding) FROM (SELECT SUM(column) AS sumNumForSharding FROM table_0 UNION ALL ...)`
- **ORDER BY/LIMIT**：在双读模式下需要特殊处理。

### 4.4 双写的处理

核心功能：将单条写入 SQL 转换为双写 SQL，即同时写入原始表和分表。

实现逻辑：

1. 前置检查：获取原始 SQL 并记录日志；检查涉及的表是否在忽略列表，忽略则直接返回。
2. 分表处理：检查是否配置了分表；调用 changeSql 获取分表后的 SQL；SQL 发生变化则用 `DOUBLE_WRITE_JOINER`（` ; `）连接分表 SQL 和原始 SQL；反射更新 BoundSql 中的 SQL；复制参数映射。

双写 SQL 构建示例：

```sql
-- 原始
INSERT INTO st_stock_stream (id, warehouse_no, sku, quantity) VALUES (?, ?, ?, ?)
-- 双写
INSERT INTO st_stock_stream_5 (id, warehouse_no, sku, quantity) VALUES (?, ?, ?, ?) ; INSERT INTO st_stock_stream (id, warehouse_no, sku, quantity) VALUES (?, ?, ?, ?)
```

关键点：

- SQL 连接符：`public static final String DOUBLE_WRITE_JOINER = " ; ";`，分号分隔的多语句执行。
- 参数映射：`boundSql.getParameterMappings().addAll(boundSql.getParameterMappings());` 复制一份保证双套参数正确绑定。
- 反射更新：`ReflectionUtils.setFieldValue(BoundSql.class, boundSql, "sql", sql);`——MyBatis 插件开发常用技巧。

使用场景：单表向分表架构迁移期间保证数据一致性、平滑迁移、可随时回滚。通过 policy 配置 doubleWriteAndReadOld / doubleWriteAndReadNew 控制。

### 4.5 双读的处理

方法：`private static void changeStatementForDoubleRead(BoundSql boundSql, MetaObject metaParam)`

将单表查询 SQL 转换为双读 SQL，同时查原始表和分表并合并结果。

关键技术点：

1. SQL 合并 `mergeSqlForDoubleRead(changedSql, originalSql)`：移除原 SQL 末尾分号、移除 ORDER BY（后续重处理）、移除 LIMIT（后续重处理）、appendSelectColumns 合并 SELECT 列。
2. ORDER BY 处理：UNION ALL 查询中 ORDER BY 含表别名（如 `m.update_time`）会报 "SQL Unknown column"，因为 UNION ALL 后的结果集不再有原表别名。
3. COUNT 处理：各表 COUNT 经 UNION ALL 合并后外层 SUM：
   `SELECT SUM(countNumForSharding) FROM (SELECT COUNT(*) AS countNumForSharding FROM table_0 UNION ALL SELECT COUNT(*) AS countNumForSharding FROM table) tempForSharding`
4. SUM 处理：类似，多个分表 SUM 结果外层再求和。
5. 参数映射：`appendParameterMappings(BoundSql boundSql)` 处理。

SQL 转换示例：

```sql
-- 简单查询双读
SELECT * FROM st_stock_stream_5 WHERE warehouse_no = ? AND deleted = 0
UNION ALL
SELECT * FROM st_stock_stream WHERE warehouse_no = ? AND deleted = 0

-- 带 ORDER BY/LIMIT
SELECT * FROM st_stock_stream_5 WHERE warehouse_no = ?
UNION ALL
SELECT * FROM st_stock_stream WHERE warehouse_no = ?
ORDER BY update_time DESC LIMIT 10
```

双读价值：保证读到完整数据（旧表 + 新表）、无需停机平滑迁移、提供回滚能力。

### 4.6 路由计算

路由算法：

1. 配置优先：首先检查是否已有配置的分表。
2. 负载均衡：选择分配仓库最少的分表。
3. 分布式锁：使用分布式锁确保分配唯一性。
4. 容错机制：支持重试。

### 4.7 参数处理

- 双写模式下参数列表复制一份。
- 双读模式下根据 LIMIT 子句调整参数。
- 保持参数与 SQL 占位符一致。

### 4.8 性能优化

1. 缓存机制：ThreadLocal 缓存分表后缀。
2. 批量处理：支持批量操作的分表。
3. 索引优化：分表键上有索引。
4. 连接池优化：每个分表使用独立连接池。

### 4.9 可扩展性

1. 自定义分表策略：实现 ShardingSuffixCalculator 接口。
2. 灵活配置：mybatis-config.xml 配置分表规则。
3. 策略模式：多种读写策略可动态切换。

### 4.10 监控与日志

监控指标：SQL 重写耗时、分表路由计算耗时、分表命中率、分布式锁竞争情况。

日志：分表键提取日志、SQL 重写前后对比、路由计算结果、异常记录。

## 五、研发过程中的问题和解决方案

### 5.1 双读排序字段缺失报错

```
ERROR 1250 (42000): Table 'm' from one of the SELECTs cannot be used in field list
```

解决：将排序字段放在子查询的 SELECT column 中：

```sql
select 1, m.update_time from wms_stock.st_stock_stream m
UNION ALL
select 1, m.update_time from wms_stock.st_stock_stream_0 m
order by m.update_time asc limit 1;
```

### 5.2 双读 select count 报错

```sql
select count(1) from wms_stock.st_stock_stream
UNION ALL
select count(1) from wms_stock.st_stock_stream_1
```

解决：先将 select count 通过 UNION ALL 合并，外层再 SUM。

### 5.3 sum() 函数 UNION ALL 后需要再次 sum

每个 SUM 语句作为子查询，外层再次 SUM，累加所有子数量作为总数量。
