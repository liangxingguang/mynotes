---
id: wiki-source-redisearch-vs-elasticsearch
type: source
title: 换掉 ES！Redis 官方搜索引擎 RediSearch 介绍与实操
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: low
tags:
  - source
  - redis
  - elasticsearch
  - search
sources:
  - raw/sources/architecture/2026-10-22-redisearch-vs-elasticsearch.md
related:
  - wiki/entities/elasticsearch.md
  - wiki/sources/elasticsearch-interview-deep-dive.md
---
# 换掉 ES！Redis 官方搜索引擎 RediSearch 介绍与实操

## Overview（概览）

RediSearch 入门文章（公众号「Java基基」）：介绍该 Redis 模块的全文搜索/二次索引能力、与 Elasticsearch 的官方基准对比、安装方式与 ft.* 命令实操。标题党成分重，性能数据全部来自 Redis 官方基准。

## Key Facts（关键事实）

- RediSearch 是什么：Redis 模块，提供全文索引、二次索引与查询语言；压缩倒排索引内存占用少；支持短语匹配、字段权重、数字/地理过滤、自动完成等。
- 官方基准对比（注意偏向性）：索引构建 221s vs ES 349s（快 58%）；多租户场景 50K 索引 201s 完成而 ES 在 921 个索引后崩溃；双词查询吞吐 12.5K ops/s vs ES 3.1K（4 倍），延迟 8ms vs 10ms。
- 安装：源码 make 或 `docker run -p 6379:6379 redislabs/redisearch:latest`；`module list` 见 "ft"/"search" 即成功。
- 实操要点：`ft.create` 建索引（text/tag、weight 权重）；`ft.add` 必须带评分且中文需 `language "chinese"` 否则查不到；`ft.search` 支持 SORTBY/limit 分页/字段过滤（`@phone:185*`）。
- 模糊匹配真相：`%%词%%` 基于 Levenshtein 距离（最大 LD=3），是相似度查询非真正模糊搜索；中文分词用 friso（比 ES 的 ik 弱），可组合 `词*` 前缀补偿。

## Important Claims（重要论断）

### Claim 1（信源标题）：换掉 ES

信源自评亦不成立：生产替换 ES 还需评估生态、集群、聚合分析等能力差距（信源末尾边界提示，本页采纳其自我修正）。

## Concepts Introduced（引入的概念）

（无）

## Entities Mentioned（提及的实体）

- RediSearch（单一信源且入门向，不立实体页）、[[elasticsearch|Elasticsearch]]（作为基准对比对象）

## Implications（影响／启示）

- "已有 Redis 栈 + 轻量搜索需求"场景下 RediSearch 是免新组件的候选；但与 ES 的比较须看聚合/生态/集群维度而非单点吞吐（解读，与 [[elasticsearch-search-tuning-production]] 的生产纪律对照）。

## Limitations（局限）

- 入门向+标题党；基准数据全部出自 Redis 官方，无第三方复测；版本为 `redislabs/redisearch:latest` 旧镜像（旧版 API `ft.add` 已弃用，新版用 HSET+FT.CREATE ON HASH——解读提示）。

## Related Knowledge（相关知识）

- [[elasticsearch|Elasticsearch（实体页）]]
- [[elasticsearch-interview-deep-dive|ES 面试深拆（信源页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-22-redisearch-vs-elasticsearch.md`
