---
id: 2026-10-16-db-table-sharding-practice
title: 大表治理之分表实践：手搓一个简单的数据库分表组件
source: 微信公众号（京东零售技术）
source_url: https://mp.weixin.qq.com/s/q9EaCqqHxXtdZKjU_n6W1w
source_type: article
platform: mp.weixin.qq.com
created: 2026-10-16
category: 技术
tags: [工程实践, 分布式系统]
asset_ref: Assets/2026/10/db-table-sharding-practice.md
wiki_status: pending
---

# 大表治理之分表实践：手搓一个简单的数据库分表组件

> 京东库存流水表（日增 3400 万行/31GB）大表治理实战。因 Sharding-JDBC/Mycat 等中间件 SQL 语法限制多，团队基于 MyBatis 插件机制自研轻量分表拦截器（策略模式 + 责任链），按仓号分 128 表，核心是五种读写策略（双写读旧/双写读新/单写读旧/单写读新/单写双读）支撑单表→分表的不停机平滑迁移与回滚；双写靠分号拼接双 SQL + 复制参数映射，双读靠 UNION ALL 合并新旧表并对 COUNT/SUM 外层再聚合、ORDER BY/LIMIT 特殊重写；路由按"配置优先 + 最少仓负载均衡 + 分布式锁"分配后缀。

## 核心要点

- **大表判定**：单表 >1000 万行或 10GB、读写明显变慢、DDL 超 1 小时；治理组合拳=分库分表、冷热分离、索引优化、读写分离。
- **为何自研**：Sharding-JDBC 不支持 UNION/子查询/CASE WHEN 等，Mycat/Cobar 跨分片限制更多，KISS 原则下自研够用组件。
- **架构**：MyBatis 拦截器 `TableShardingInterceptor`，模块含拦截、Policy 策略枚举、SQL 解析重写、后缀路由（ShardingSuffixCalculator）、参数映射。
- **迁移关键**：双写（` ; ` 拼接两条 INSERT + 参数复制一份 + 反射改 BoundSql）保证迁移期一致；双读 UNION ALL 新旧表结果合并。
- **聚合重写**：跨表 COUNT/SUM 必须子查询 UNION ALL 后外层再 SUM；ORDER BY 别名在 UNION ALL 后失效需将排序字段纳入子查询 SELECT 列。
- **路由与性能**：配置优先、最少仓库负载均衡、分布式锁 + 重试；ThreadLocal 缓存后缀、分表键索引、每分表独立连接池。

## 正文

完整正文（含五种策略定义、SQL 重写示例与三类踩坑报错解决）见采集态原件：[[Assets/2026/10/db-table-sharding-practice.md]]

## 来源

- [大表治理之分表实践：带你手搓一个简单的数据库分表组件 · 微信公众号](https://mp.weixin.qq.com/s/q9EaCqqHxXtdZKjU_n6W1w)

## 附件

- [[Assets/2026/10/db-table-sharding-practice.md]]（web-fetch 抓取正文，约 23,380 字符，fetch_level=browser；已清理追踪像素与空白 SVG 占位图）
