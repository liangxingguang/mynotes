---
id: wiki-source-elasticsearch-interview-questions
type: source
title: 面试：Elasticsearch 面试题（38 题）
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: medium
tags:
  - source
  - elasticsearch
  - interview
sources:
  - raw/sources/architecture/2026-11-25-elasticsearch-interview-questions.md
related:
  - wiki/entities/elasticsearch.md
  - wiki/sources/elasticsearch-interview-deep-dive.md
  - wiki/concepts/rle-inverted-index.md
---
# 面试：Elasticsearch 面试题（38 题）

## Overview（概览）

微信公众号面试题长文。以现代 Elasticsearch 为主，38 道题（含常见追问），按六大板块组织：基础概念与倒排索引（1-6）、分词与 Mapping（7-13）、写入与数据可靠性（14-19）、查询排序与分页（20-25）、集群分片与扩容（26-33）、数据同步与排障（34-38）。每题先给可直接回答的版本再补追问，涉及默认值与底层实现时说明版本差异，文末附"最容易答错的十句话"纠正常见误区。

## Key Facts（关键事实）

- ES 是基于 Lucene 的分布式搜索与分析引擎，适合全文搜索、日志检索、商品搜索、数据聚合；通常不能替代 MySQL（MySQL 作业务主数据源、ES 作搜索索引）。
- 倒排索引（词条→文档列表）是搜索快的核心；Term Dictionary 存词条、词典索引（FST 是常见实现思路之一，非唯一）、Posting List 记录文档及词频/位置（由 `index_options` 决定，不一定是 Roaring Bitmap）；`doc_values` 为"文档→字段值"列式结构用于排序聚合，普通 text 字段默认不支持；数值/日期范围查询不一定走倒排。
- 分词流程：原始文本→Character Filter→Tokenizer→Token Filter→词条，用 `_analyze` API 检查；text 分词适合全文、keyword 完整值适合精确匹配/排序/聚合（可多字段 title + title.keyword）；match 先分析再检索、term 精确查找；中文用 IK 插件（ik_max_word 切细召回多、ik_smart 切粗）；已建字段类型不能原地修改，平滑改类型走"新索引+Reindex+增量同步+别名原子切换"。
- 写入流程：协调节点→主分片执行并记 Translog→转发副本→满足确认条件返回；refresh 管搜索可见性、flush 管持久化、merge 合并 Segment 并回收删除空间；flush 阈值默认值随版本变化（当前官方文档 `index.translog.flush_threshold_size` 默认 10 GB）；ES 近实时，写完即搜用 `refresh=wait_for`，Get API 默认实时读；Translog `request` 模式确认前持久化、`async` 按周期（默认约 5 秒）同步；Bulk 返回 200 不代表全部成功，须逐 item 检查。
- 查询默认 Query Then Fetch；Query Context 计分、Filter Context 不计分且可能缓存；bool 子句 must/filter/should/must_not 语义；相关性默认 BM25，不同分片得分可能不同（本地统计），`dfs_query_then_fetch` 可全局统计但增开销；深分页用 `search_after` + 稳定排序（需一致视图加 PIT），Scroll 不适合实时翻页；聚合可能慢/有误差，优化靠缩小过滤范围、控制桶数、composite 聚合。
- 集群：节点角色 Master-eligible/Data/Ingest/协调；主分片管写入、副本提升可用性与读能力，副本不能替代备份（误删会同步，需 Snapshot）；文档默认按 `_id` 哈希路由；主分片数不能原地修改但可 Split/Shrink/Reindex；分片设计参考单分片 10-50 GB、文档数低于 2 亿（非硬规则），"每 GB 堆内存 20 分片"已废弃；脑裂靠多数派协调机制，ES 7 起自动管理投票配置；Green/Yellow/Red 对应主副本分配状态，单节点常 Yellow。
- 数据同步：MySQL→ES 用 Binlog/CDC/消息队列异步同步，只能最终一致，用稳定文档 ID 防重复、业务版本防乱序覆盖；ES 无通用跨文档事务，有单文档原子性，并发更新可用 `_seq_no`+`_primary_term` 乐观控制；排障次序：定位范围→查查询/深分页/通配符→慢日志与 Profile→JVM/GC/磁盘/线程池→分片热点与 merge；429 先指数退避重试再查瓶颈。

## Important Claims（重要论断）

### 纠正："写入先写 Translog 再写 Lucene"是常见误区

官方描述是操作先由内部 Lucene 索引处理，再写入 Translog，之后才确认给客户端；Translog 用于恢复尚未包含在 Lucene commit 中的已确认操作。该误区列入"最容易答错的十句话"（信源）。

### 纠正："Flush 默认 30 分钟或 512 MB"不能作为通用结论

默认值随版本变化，当前官方文档 `index.translog.flush_threshold_size` 默认为 10 GB，应以目标版本文档为准（信源）。

### 纠正："ES 查询是 O(1)"等十句常见误答

含：MySQL 搜索不一定全表扫描、FST 不一定二分/词典不一定常驻内存、Posting List 不一定是 Roaring Bitmap、Refresh≠持久化、写入后不一定 1 秒可搜、主分片数不是永远改不了、奇数 Master 不等于防脑裂、ES 不支持事务与近实时是两回事（信源）。

## Concepts Introduced（引入的概念）

（无独立新概念；内容并入 [[elasticsearch]] 实体页，倒排索引相关见 [[rle-inverted-index]]。）

## Entities Mentioned（提及的实体）

- [[elasticsearch|Elasticsearch]] / Lucene / IK 分词器（后两者未立页）

## Implications（影响／启示）

- 本信源对库内既有 ES 面试信源（[[elasticsearch-interview-deep-dive]]）与实体页构成**部分矛盾/澄清**，见 Contradictions——默认值类结论必须标注版本，机制顺序类结论以官方描述为准（解读）。
- "最容易答错的十句话"可作为面试准备的反向检查清单：先排除误区再作答（解读）。

## Contradictions（矛盾）

### Claim A（旧）：写入"先写 Translog，再写内存/Lucene"

Source: `raw/sources/architecture/2026-10-21-elasticsearch-interview-deep-dive.md`（Key Facts：translog "先写日志，再写内存"）

### Claim B（新）：操作先由内部 Lucene 索引处理，再写入 Translog，之后才确认给客户端

Source: `raw/sources/architecture/2026-11-25-elasticsearch-interview-questions.md`（第 14 题追问，并列入"最容易答错的十句话"）

### Current Assessment（当前评估）

倾向 B。B 明确标注为对官方描述的转述并显式纠正旧表述；A 为旧信源的简化表述，措辞含混（"先写日志，再写内存"易被误解为顺序颠倒）。实体页已按 B 修正并保留此矛盾记录，待人工复核是否同步修订旧信源页措辞。

### Claim C（旧）：flush 由"translog 满 512MB 或 30 分钟"触发

Source: `raw/sources/architecture/2026-10-21-elasticsearch-interview-deep-dive.md`

### Claim D（新）：`index.translog.flush_threshold_size` 当前官方默认 10 GB，"30 分钟或 512 MB"不能作为通用结论，默认值随版本变化

Source: `raw/sources/architecture/2026-11-25-elasticsearch-interview-questions.md`（第 15 题追问）

### Current Assessment（当前评估）

倾向 D。D 明确给出参数名与"以目标版本文档为准"的口径，更严谨；C 为旧信源的旧版本默认值表述。两说均为版本相关事实，实体页已记录为版本差异矛盾。

## Limitations（局限）

- 单一二次信源（公众号），作者身份未标注；面试导向，部分表述为经验性总结。
- 采集稿中部分代码块/表格在采集中退化（表格以逐行文本呈现），公式与默认值以正文描述为准。

## Related Knowledge（相关知识）

- [[elasticsearch|Elasticsearch（实体页）]]
- [[elasticsearch-interview-deep-dive|信源页：ES 面试万字长文]]（同主题前信源，含两处矛盾见上）
- [[rle-inverted-index|RLE 倒排索引（概念页）]]

## Source（信源）

- `raw/sources/architecture/2026-11-25-elasticsearch-interview-questions.md`
