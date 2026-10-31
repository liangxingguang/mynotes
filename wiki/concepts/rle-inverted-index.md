---
id: wiki-concept-rle-inverted-index
type: concept
title: RLE 倒排索引（Run-Length Encoding Inverted Index）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - concept
  - elasticsearch
  - search-engine
  - compression
sources:
  - raw/sources/architecture/2026-10-28-meituan-waimai-search-elasticsearch-rle.md
related:
  - wiki/entities/elasticsearch.md
  - wiki/sources/meituan-waimai-search-elasticsearch-rle.md
  - wiki/sources/elasticsearch-search-tuning-production.md
  - wiki/sources/elasticsearch-interview-deep-dive.md
---
# RLE 倒排索引（Run-Length Encoding Inverted Index）

## Definition（定义）

一种基于游程编码（Run-Length Encoding, RLE）的倒排索引格式：当 Index Sorting 使同一 Term 的 Doc ID 序列完全连续时，将整条倒排链编码为 `[start, length]` 两个整数，将 TermInSetQuery 的合并问题从 O(K×M) 循环降为 O(M log M) 排序合并。由美团外卖搜索团队在 LBS 场景下设计，集成为 ES 插件，倒排链合并 TP99 降低 96%，全链路检索时延 TP99 降低 84%。

## Why It Matters（为什么重要）

ES 原生 TermInSetQuery 在万级 Terms 检索时，合并复杂度 O(K×M)：LBS 场景下单次查询需对上万商家做 Terms 过滤，万级 Terms 检索耗时 5-10ms，全链路 TP99 达 100ms。RLE 倒排索引通过 Index Sorting 前置使 Doc ID 连续 + RLE 编码压缩 + SparseRoaringDocIdSet 消除空置 bucket，将合并从"循环千万次"转化为"排序 M 个分段"，是 ES 倒排链合并优化的一手工程范式。

## Core Characteristics（核心特征）

1. **依赖 Index Sorting 前置**：按 city_id + Geohash + poi_id 排序，使同一商家的商品 Doc ID 完全连续——这是 RLE 编码生效的前提；无连续 Doc ID 则 RLE 退化为 2×M byte，比数组存储还差一倍。
2. **RLE 编码格式**：`[start1, length1, start2, length2, ...]`，段间两两互不重叠；完全连续的倒排链仅需 `[start, length]` 两个整数（1000 条 Doc ID 从 ArrayContainer 2000B 压到 4B）。
3. **合并复杂度转换**：从 O(K×M) 循环插入降为 O(M log M) 排序合并——RLE 把"倒排链合并"问题转化为"分段排序"问题。
4. **SparseRoaringDocIdSet**：在 RoaringDocIdSet 基础上额外用 `int[] index` 记录有值 bucket 的位置，`Container[] denseSets` 紧密排列非空 bucket，消除按高 16 位分桶时空置 bucket 的遍历浪费。
5. **LongObjectHashMap 替换 FST**：Term 为 long 型、仅精确匹配时，用 O(1) 哈希查找替换 O(len(term)) 的 FST——以空间换时间，牺牲内存效率换查询速度。

## Structure（结构）

数据结构选型对比（信源实测）：

| 维度 | FST | HashMap | LongObjectHashMap |
|---|---|---|---|
| 查询复杂度 | O(len(term)) | O(1) | O(1) |
| 内存效率 | 极佳（约为哈希表 1/10） | 差 | 差 |
| 适用场景 | 通用 Term 检索 | 通用精确匹配 | long 型精确匹配（最佳） |

Container 类型对比：

| Container | 适用数据量 | 存储方式 | 空间效率 |
|---|---|---|---|
| Array Container | < 4096 | short[ ] | 稀疏数据最优 |
| Bitmap Container | ≥ 4096 | bitmap | 稠密数据最优 |
| RLE Container | 连续序列 | [start, length] | 连续序列最优（4B 表 1000 条） |

## How It Works（运作方式）

完整链路：

1. **索引阶段**：开启 Index Sorting（city_id + Geohash + poi_id），使同商家商品 Doc ID 完全连续。
2. **索引加载**：Hook 拦截 InternalEngine，遍历所有 segment，对配置了 RLE 优化的字段生成 RLE 倒排表并全量入内存。
3. **查询阶段**：LongObjectHashMap O(1) 查找 Term → 获取 RLE 编码的倒排链 → SparseRoaringDocIdSet 对 M 个 `[start, length]` 分段排序合并 → O(M log M)。
4. **降级保障**：索引无 RLE 倒排时，Query 类型自动降级回原生 TermInSetQuery。

## Relationships（关系）

### Related Concepts（相关概念）

- [[elasticsearch|Elasticsearch]]：RLE 倒排索引是 ES 倒排链优化的具体实现，通过 ES 插件机制集成。
- RoaringBitmap：SparseRoaringDocIdSet 是 RoaringDocIdSet 的改造版，保留接口兼容。

### Distinctions（区分）

- 与原生倒排格式：原生用 FST + DocIdSetBuilder 循环合并（O(K×M)）；RLE 用哈希表 + SparseRoaringDocIdSet 排序合并（O(M log M)）。
- 与 ES 搜索调优（[[elasticsearch-search-tuning-production]]）：调优面是架构边界与参数；RLE 面是索引数据结构本身的改造。

## Evolution（演进）

- 2026-10-31：美团外卖搜索信源引入概念：Index Sorting + RLE Container + SparseRoaringDocIdSet 三件套，倒排链合并 TP99 降低 96%，全链路 TP99 降低 84%。

## Open Questions（开放问题）

- RLE 倒排索引在非 LBS 场景（如纯文本检索、前缀匹配）的适用性——信源仅验证 LBS + long 型 Term 精确匹配场景。
- 增量索引频繁更新时内存 RLE 倒排的维护成本——信源提到可将 RLE 结构固化到文件（写时编码）作为后续优化。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-meituan-waimai-search-elasticsearch-rle.md`（美团外卖搜索一手工程复盘：Index Sorting + RLE Container + SparseRoaringDocIdSet 三件套、合并 TP99 降低 96%、全链路 TP99 降低 84%）

## Related Knowledge（相关知识）

- [[elasticsearch|Elasticsearch（实体页）]]
- [[meituan-waimai-search-elasticsearch-rle|美团外卖搜索 ES 优化（信源页）]]
- [[elasticsearch-search-tuning-production|ES 生产级搜索性能调优（信源页）]]
- [[elasticsearch-interview-deep-dive|ES 面试深拆（信源页）]]
