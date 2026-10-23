---
id: 2026-10-22-redisearch-vs-elasticsearch
title: 换掉 ES！Redis 官方搜索引擎 RediSearch 介绍与实操
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/L5VrkgzkEGWrsWOgX9aCHA
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - 工程实践
  - Elasticsearch
asset_ref: Assets/2026/10/redisearch-vs-elasticsearch.md
wiki_status: ingested
---

# 换掉 ES！Redis 官方搜索引擎 RediSearch 介绍与实操

> RediSearch 入门文章：介绍这个 Redis 模块的全文搜索/二次索引能力、与 Elasticsearch 的官方基准对比（索引构建快 58%、查询吞吐 4 倍）、安装方式与 ft.* 命令行实操（建索引、增删文档、中文查询、模糊匹配、别名）。

## 核心要点

- **是什么**：Redis 模块，提供全文索引、二次索引与查询语言；压缩倒排索引，内存占用少；支持短语匹配、字段权重、数字过滤、地理过滤、自动完成等
- **性能对比（官方基准）**：索引构建 221s vs ES 349s（快 58%）；多租户场景 50K 索引 201s 完成而 ES 在 921 个索引后崩溃；双词查询吞吐 12.5K ops/s vs ES 3.1K（4 倍），延迟 8ms vs 10ms
- **安装**：源码 make 编译或 `docker run -p 6379:6379 redislabs/redisearch:latest`；`module list` 看到 "ft"/"search" 即成功
- **实操要点**：`ft.create` 建索引（text/tag 类型、weight 权重）；`ft.add` 加文档必须带评分且中文需 `language "chinese"` 否则查不到；`ft.search` 支持 SORTBY/limit 分页/字段过滤（`@phone:185*`）
- **模糊匹配真相**：`%%词%%` 基于 Levenshtein 距离（最大 LD=3），是相似度查询非真正模糊搜索；中文分词用 friso（比 ES 的 ik 弱），可组合 `词*` 前缀匹配补偿
- **边界提示**：文章为入门向，标题党成分重——性能数据来自 Redis 官方基准，生产替换 ES 还需评估生态、集群、聚合分析等能力差距

## 正文

全文命令示例与测试数据见 [[Assets/2026/10/redisearch-vs-elasticsearch.md]]。

## 来源

- [换掉ES！Redis官方搜索引擎来了，性能炸裂！](https://mp.weixin.qq.com/s/L5VrkgzkEGWrsWOgX9aCHA)

## 附件

- [[Assets/2026/10/redisearch-vs-elasticsearch.md]]
