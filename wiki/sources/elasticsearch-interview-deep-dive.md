---
id: wiki-source-elasticsearch-interview-deep-dive
type: source
title: Elasticsearch 面试万字长文：倒排索引/集群/写入/查询/分词/深分页/索引优化
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - elasticsearch
  - interview
sources:
  - raw/sources/architecture/2026-10-21-elasticsearch-interview-deep-dive.md
related:
  - wiki/entities/elasticsearch.md
---
# Elasticsearch 面试万字长文：倒排索引/集群/写入/查询/分词/深分页/索引优化

## Overview（概览）

面试导向的 ES 知识体系长文：倒排索引三结构、集群角色与分片副本、refresh/flush/translog 三机制、Query Then Fetch 两阶段、IK 分词与热更新、三种深分页方案对比、设计/写入/查询/运维四维优化清单。

## Key Facts（关键事实）

- 倒排三结构：Term Dictionary（排序词条，支持前缀匹配）+ Posting List（文档 ID+TF/Position/Offset，支撑评分/高亮/短语查询）+ Term Index（FST，内存仅为哈希表 1/10，查询 O(n)→O(log n)，"90% 面试者会漏"）；Segment 不可变免锁；排序/聚合靠 Doc Values 正排列存而非倒排。
- 集群：Master 奇数个且与 Data 角色分离（踩坑：混合角色节点 GC 超时→Master 重选→集群短暂不可用）；路由公式 `hash(_routing) % num_primary_shards`，故主分片数建后不可改；单分片 10-50GB；副本 1-2 个性价比最高；主副分片绝不同节点。
- 写入三机制：refresh（默认 1s，内存→OS Cache 生成可搜索 Segment，**不落盘**，频繁会制造段合并压力）、translog（先写日志再写内存，默认每请求 fsync，顺序写开销小）、flush（translog 满 512MB 或 30 分钟触发，Segment 落盘+清 translog）；宕机恢复=加载磁盘 Segment+重放 translog；高频误区：refresh≠刷盘、translog 写入时就同步写。
- 查询两阶段：Query 阶段各分片只回 `from+size` 个 ID+排序值，协调节点全局归并——深分页性能杀手的根源（from=10000 时每分片回 10010 条）；Fetch 阶段按 ID multi-get 回 _source。
- 深分页三方案：from+size（浅分页，max_result_window 默认 10000，硬调大是 OOM 隐患）、scroll（快照式，全量导出专用，**绝不能用于用户实时分页**）、search_after（官方推荐：上一页最后排序值作游标，协调节点合并量恒为 shards×size；必须唯一排序字段，通常 _id 兜底）。
- 索引优化四维：设计阶段定 80% 性能（分片 20-40GB/片、写入密集临时 0 副本、dynamic:strict、金额 scaled_float、状态枚举必须 keyword——text 分词后 term 永远查不到）；写入（Bulk 5-15MB/批、refresh_interval 30-60s、translog async）；查询（filter 代替 query 不算分且缓存，性能差 3-10 倍）；运维（堆不超 31GB——压缩指针失效线、SSD、磁盘<85%）。
- 分词器三组件执行顺序严格（character filter→tokenizer→token filter）；IK 两模式 ik_max_word/ik_smart；生产热更新走 IK+MySQL 远程词典。

## Important Claims（重要论断）

（无承重论断；知识体系整理文。）

## Concepts Introduced（引入的概念）

（无）

## Entities Mentioned（提及的实体）

- [[elasticsearch|Elasticsearch]] / Lucene / IK 分词器（后两者未立页）

## Implications（影响／启示）

- "先减命中分片数、再减每分片文档数、最后优化单文档计算"的优化次序与 filter 优先原则，是 ES 查询审查的通用顺序（解读）。

## Limitations（局限）

- 面试导向，部分"加分点"为经验性表述；版本差异（ES6 默认 5 主分片 vs ES7+ 默认 1）需按所用版本核对。

## Related Knowledge（相关知识）

- [[ecommerce-search-realtime-personalization|电商搜索实时个性化（信源页）]]、[[elasticsearch-search-tuning-production|ES 生产调优（信源页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-21-elasticsearch-interview-deep-dive.md`
