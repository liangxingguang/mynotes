---
id: 2026-10-28-meituan-waimai-search-elasticsearch-rle
title: 美团外卖搜索基于Elasticsearch的优化实践
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/6k8THshasaYfSaLr58O1NA
source_type: link
platform: wechat
created: 2026-10-28
category: 技术
tags: [Elasticsearch, 工程实践, Java]
asset_ref: Assets/2026/10/meituan-waimai-search-elasticsearch-rle.md
wiki_status: pending
---

# 美团外卖搜索基于Elasticsearch的优化实践

> 美团外卖搜索每天承载十亿级检索流量，LBS 场景下单次查询需对上万商家做 Terms 过滤，万级 Terms 检索耗时达 5-10ms。团队基于 RLE（Run-Length Encoding）重新设计倒排索引，倒排链合并 TP99 降低 96%，全链路检索时延 TP99 从 100ms 降至 16ms（-84%），线上 CPU 大幅下降。

## 核心要点

- **问题定位**：火焰图显示热点集中在 TermInSetQuery 的倒排链查询（FST 检索 + 磁盘读 + Decode）与合并（DocIdSetBuilder 单条循环插入）。M 个 Term、平均链长 K 时合并复杂度 O(K×M)，一万商家×一千商品 = 千万次循环。
- **查询优化**：Term 为 long 型、仅精确匹配，用 LongObjectHashMap（O(1)）替换 FST（O(len(term))），以空间换时间。
- **关键洞察——Index Sorting**：按城市 ID + Geohash + 门店 ID 排序，使同一商家的商品 Doc ID 完全连续，稀疏倒排链变为自增无空洞序列，为 RLE 编码创造条件。
- **RLE 倒排格式**：连续倒排链编码为 [start, length]，两个整数即可表示整条链（1000 条从 2000B 压到 4B）；合并问题从循环 K×M 次转化为对 M 个分段的排序合并，复杂度降为 O(M log M)。
- **SparseRoaringDocIdSet**：解决 RoaringBitmap 按高 16 位分桶时空置 bucket 的内存与遍历浪费——额外索引只记录有值 bucket，紧密排列。相比官方基准实现合并耗时降低 96%（TP99 13ms → 0.5ms）。
- **工程集成**：不新写 PostingsFormat（保证版本兼容与可降级），索引加载时 Hook 初始化 RLE 倒排全量入内存；通过 ES 插件机制新增 Query 类型，无 RLE 倒排时自动降级回原生检索。
- **方法论**：流量录制建基准集 → Profiler/火焰图定位热点 → 索引与检索链路两侧设计方案 → JMH 压测验证 → 灰度上线。

## 正文

见 [[Assets/2026/10/meituan-waimai-search-elasticsearch-rle.md]]（全文约 2.4 万字符，含完整原理分析、数据结构对比与压测数据）。

## 来源

- [美团外卖搜索基于Elasticsearch的优化实践](https://mp.weixin.qq.com/s/6k8THshasaYfSaLr58O1NA)

## 附件

- [[Assets/2026/10/meituan-waimai-search-elasticsearch-rle.md]]
