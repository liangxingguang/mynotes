---
id: wiki-source-elasticsearch-search-tuning-production
type: source
title: 从 10s 到 10ms：Elasticsearch 生产级搜索性能调优实战
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - elasticsearch
  - performance
sources:
  - raw/sources/architecture/2026-10-21-elasticsearch-search-tuning-production.md
related:
  - wiki/entities/elasticsearch.md
---
# 从 10s 到 10ms：Elasticsearch 生产级搜索性能调优实战

## Overview（概览）

复盘型长文：客服工作台订单检索（日增 3000 万单、20 亿+ 文档、峰值 5000 QPS/8 万写入、SLA P95<150ms）从"能跑"到线上失效再调优的全过程——核心立场是调优不是先改参数，而是先重画架构边界、再重建索引与查询模型，最后补治理与可观测。

## Key Facts（关键事实）

- 失效清单（典型反模式）：深分页撑爆协调节点（单次>10s）、wildcard/regexp/脚本滥用打满 CPU、text 字段聚合 fielddata 致 Full GC、分片拍脑袋、大 _source 拖慢 fetch、热点租户单分片过热、统计/导出/检索共用一套索引互相干扰——"本质上不是 ES 不行，而是搜索系统没有按搜索引擎的工作方式来设计"。
- 优化次序：**先减少命中的分片数，再减少每个分片处理的文档数，最后才优化单文档计算成本**；ES 慢不只慢在"查"，还慢在协调节点合并。
- 缓存三层：Query Cache（filter bitset，must 当 filter 用就废了）、Request Cache（聚合/统计类，频繁 refresh 的在线索引效果有限）、OS Page Cache（JVM 堆给太大反而压缩它——堆≤物理内存 50% 且≤32GB）。
- 架构边界：在线检索/导出/统计/离线分析拆索引拆链路；在线索引只负责列表检索+小范围筛选+少量固定维度统计，BI 式聚合放离线索引。
- 索引模板实战：dynamic:strict 防字段爆炸；sort.field 预排序配合 search_after；只展示不搜索的字段 `index:false, doc_values:false`；nested 只在"数组元素内字段必须同元素匹配"时用；金额 scaled_float。
- 分片判断法（比"10-50GB"更可操作）：估单日写入量→定按天/周/rollover 切分→估热期单索引大小→结合节点数定主分片数；路由按真实访问分布而非文档总量（超级租户占 30% 流量时 tenantId 单键路由必热点，改复合路由 tenantId+hash(userId) 或拆独立索引）。
- 治理：在线/导出线程池隔离（导出复用在线接口改大 size 拖死查询池是常见事故）；超时要比网关短避免请求堆积；CompletableFuture 必须指定专用线程池；降级不能给强一致场景返回错误数据。
- 聚合/高亮是事故源：高频统计预聚合、大结果集 composite、UV 用 cardinality 接受近似；高亮只在展开详情时查，限制 fragment 数量与长度。
- 可观测：集群/节点/索引/应用四层指标清单 + 慢查询日志必开（query warn 1s / fetch warn 500ms）；线上变慢四大高频根因：新接口放出重型 DSL、运营功能带深分页、导出抢在线资源、字段误映射。
- 压测纪律：先控制变量（数据规模/查询样本/节点规格/副本数/refresh 策略/缓存命中/并发度），无对照实验则调优结论不成立。

## Important Claims（重要论断）

### Claim 1：调优不是先改参数，而是先重画架构边界

mapping 一旦承载海量数据回改成本极高；把在线检索与导出/统计/离线分析的访问模式硬塞进一套索引，问题迟早出现。

## Concepts Introduced（引入的概念）

（无）

## Entities Mentioned（提及的实体）

- [[elasticsearch|Elasticsearch]] / Canal / Resilience4j（后两者未立页）

## Implications（影响／启示）

- "先分片数、再文档数、后单文档成本"的优化次序与"压测先控制变量"的验证纪律可迁移到一切存储引擎调优（解读）。

## Limitations（局限）

- 数字与 SLA 为个案场景；标题"10s 到 10ms"是叙事表达，非普适收益。

## Related Knowledge（相关知识）

- [[ecommerce-search-realtime-personalization|电商搜索实时个性化（信源页）]]、[[elasticsearch-interview-deep-dive|ES 面试深拆（信源页）]]、[[meituan-waimai-search-elasticsearch-rle|美团外卖搜索 ES 优化（信源页）]]（索引数据结构改造层次）

## Source（信源）

- `raw/sources/architecture/2026-10-21-elasticsearch-search-tuning-production.md`
