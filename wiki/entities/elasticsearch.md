---
id: wiki-entity-elasticsearch
type: entity
title: Elasticsearch
status: active
created: 2026-10-23
updated: 2026-10-31
confidence: high
tags:
  - entity
  - search-engine
  - lucene
  - distributed
sources:
  - raw/sources/architecture/2026-10-21-elasticsearch-interview-deep-dive.md
  - raw/sources/architecture/2026-10-21-elasticsearch-search-tuning-production.md
  - raw/sources/architecture/2026-10-21-ecommerce-search-realtime-personalization.md
  - raw/sources/architecture/2026-10-27-netty-in-mainstream-middleware.md
  - raw/sources/architecture/2026-10-28-meituan-waimai-search-elasticsearch-rle.md
related:
  - wiki/sources/ecommerce-search-realtime-personalization.md
  - wiki/sources/elasticsearch-interview-deep-dive.md
  - wiki/sources/elasticsearch-search-tuning-production.md
  - wiki/entities/netty.md
  - wiki/concepts/rle-inverted-index.md
  - wiki/sources/meituan-waimai-search-elasticsearch-rle.md
---
# Elasticsearch

## Overview（概览）

构建在 Lucene 之上的分布式搜索引擎：以倒排索引支撑全文检索、以分片+副本支撑水平扩展与高可用、以 refresh/translog/flush 三机制在近实时与可靠性间取平衡。在本库三个信源中分别作为面试知识体系、生产调优对象与电商搜索读模型出现。

## Identity（身份信息）

- Type（类型）: 开源分布式搜索与分析引擎
- Organization（所属组织）: Elastic
- Role（角色）: 全文检索、结构化过滤、聚合分析；在业务架构中通常担任"可重建的读模型"而非事实数据库
- Status（状态）: 活跃主流（信源覆盖 ES7+ 行为）

## Important Facts（重要事实）

- 倒排三结构：Term Dictionary + Posting List（含 TF/Position/Offset）+ Term Index（FST，内存约为哈希表 1/10）；Segment 不可变免锁；排序/聚合走 Doc Values 正排列存。
- 近实时而非实时：refresh（默认 1s，只到 OS Cache）管可搜索、translog（先写日志，默认每请求 fsync）管不丢、flush（512MB 或 30 分钟）管真正落盘。
- 分布式模型：`shard = hash(_routing) % num_primary_shards`，主分片数建后不可改；查询为 Query Then Fetch 两阶段，协调节点合并成本随 `分片数×(from+size)` 膨胀——深分页的根源；解法 search_after（实时）/scroll（导出）/from+size（浅分页，上限 10000）。
- 生产纪律（多信源交叉印证）：Master 奇数个且角色分离；单分片 10-50GB、副本 1-2；堆≤物理内存 50% 且≤31/32GB（压缩指针线）；dynamic:strict 防字段爆炸；枚举/精确匹配用 keyword（text 分词后 term 查不到）；filter 优先于 query（不算分且可缓存，差 3-10 倍）；优化次序=先减命中分片数→再减每分片文档数→最后单文档成本。
- 作为读模型的边界：价格/库存等展示数据允许最终一致，强一致操作必须回交易服务；索引损坏时可从事实库快照+保留期事件重建；写入链路是"至少一次投递+版本约束（external_gte）+幂等消费"，不存在 exactly-once 写 ES。
- 治理要点：在线检索与导出/统计拆链路拆索引（导出拖死在线查询池、text 聚合 fielddata 致 Full GC 是高频事故）；慢查询日志必开；压测先控制变量。
- 传输层（Netty 应用信源）：5.0 后从 Netty 3 全面迁移 [[netty|Netty]] 4；双传输——HTTP Transport（9200 REST，Pipeline 含 HttpRequestDecoder/HttpContentDecompressor+Compressor/HttpObjectAggregator/HttpServerHandler，支持 CORS 与压缩）与 Transport（9300 节点间自定义二进制协议，低延迟）；内存不直接用 ByteBuf 而是封装 `Releasable` 接口自管；bulk 写优化——多个索引请求在 Netty 层聚合后异步提交 Lucene（BulkProcessor + ActionListener 回调 writeAndFlush），"接收→写入→响应"全异步是扛高并发的关键（信源口径）。
- 倒排链合并优化（[[rle-inverted-index|RLE 倒排索引]]，美团外卖一手）：LBS 场景万级 Terms 过滤合并复杂度 O(K×M)；Index Sorting 使同商家 Doc ID 连续 + RLE 编码 [start, length] + SparseRoaringDocIdSet 消除空置 bucket，合并降为 O(M log M)，倒排链合并 TP99 降低 96%，全链路 TP99 从 100ms 降至 16ms。LongObjectHashMap 替换 FST（long 型精确匹配 O(1) 换 O(len(term))）。

## Products / Projects（产品／项目）

- 生态组件（信源提及）：Lucene（内核）、IK 分词器（中文，ik_max_word/ik_smart，生产远程词典热更新）、Kibana/Beats 未涉及。

## Relationships（关系）

- 上游依赖：Lucene——ES 的分片即 Lucene 索引，倒排/段合并/Doc Values 全部继承。
- 常见搭档（信源）：Kafka+Debezium（事实库→ES 的投影管道）、Redis/Caffeine（应用层候选缓存，不押注 ES request cache）。
- 对比：与 MySQL 的"正排+事务"互补——ES 擅长检索与聚合，不擅长作为事实源与强一致写入。

## Timeline（时间线）

- ES6 及以前 — 默认 5 主分片
- ES7+ — 默认 1 主分片（信源提及的版本行为差异）

## Current Understanding（当前认知）

本库四信源构成互补：面试深拆给机制原理、生产调优给边界与纪律、电商方案给完整读模型架构、Netty 应用信源补传输层（5.0 迁 Netty 4/双传输/Releasable/bulk 异步）。一致结论：ES 的问题大多不是引擎问题，而是"没按搜索引擎的工作方式设计"——先画架构边界，再建索引模型，最后才调参数（四信源互证，置信度高）。

## Evidence（证据）

- `raw/sources/architecture/2026-10-21-elasticsearch-interview-deep-dive.md`（机制原理）
- `raw/sources/architecture/2026-10-21-elasticsearch-search-tuning-production.md`（生产调优纪律）
- `raw/sources/architecture/2026-10-21-ecommerce-search-realtime-personalization.md`（读模型架构与写入可靠性）
- `raw/sources/architecture/2026-10-27-netty-in-mainstream-middleware.md`（传输层：5.0 迁 Netty 4/9200+9300 双传输/Releasable 内存管理/bulk 全异步）
