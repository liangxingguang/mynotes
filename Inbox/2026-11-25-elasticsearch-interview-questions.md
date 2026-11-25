---
id: 2026-11-25-elasticsearch-interview-questions
title: 面试：Elasticsearch 面试题
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/5CB5mt9-AXXweYjZJCsiOw
source_type: article
platform: wechat
created: 2026-11-25
category: 技术
tags: [MySQL, 自学]
asset_ref: Assets/2026-11/wechat-5CB5mt9-AXXweYjZJCsiOw.md
wiki_status: pending
---

# 面试：Elasticsearch 面试题

> 摘要：以现代 Elasticsearch 为主的 38 道面试题（含常见追问），覆盖基础概念与倒排索引、分词与 Mapping、写入与数据可靠性、查询排序分页、集群分片扩容、数据同步与排障六大板块，每题先给可直接回答的版本再补追问，文末附"最容易答错的十句话"纠正常见误区。

## 核心要点

- **基础概念与倒排索引**：ES 是基于 Lucene 的分布式搜索与分析引擎，适合全文搜索、日志检索、聚合，通常不能替代 MySQL（主数据源仍归 MySQL，ES 作搜索索引）。搜索快靠倒排索引（词条→文档列表）+ 分片并行；高基数聚合、深分页、前置通配符、复杂脚本都可能很慢。Term Dictionary 存词条、词典索引（FST 是常见思路之一）快速定位、Posting List 记录文档及词频/位置（由 `index_options` 决定，不一定是 Roaring Bitmap）。`doc_values` 是"文档→字段值"列式结构，用于排序聚合；text 字段默认不支持。数值/日期范围查询不一定走倒排索引。
- **分词与 Mapping**：分词流程为原始文本→Character Filter→Tokenizer→Token Filter→词条，用 `_analyze` API 检查。`text` 分词适合全文搜索，`keyword` 完整值索引适合精确匹配/排序/聚合，可多字段并用（title + title.keyword）；`match` 先分析再检索，`term` 精确查找。中文分词用 IK 插件，`ik_max_word` 切细召回多、`ik_smart` 切粗；索引与查询分词器不必相同，但查询词条必须能匹配索引词条。前缀搜索用 edge_ngram/search_as_you_type，子串用 ngram，拼写容错用 fuzzy。已建字段类型不能原地修改，平滑改类型走"新索引+Reindex+增量同步+别名原子切换"；动态 Mapping 有 Mapping 爆炸风险。`object` 数组被扁平化，`nested` 把数组元素作为独立内部文档，代价是增加内部文档数与查询成本。
- **写入与数据可靠性**：写入流程为协调节点→主分片执行并记 Translog→转发副本→满足确认条件返回；refresh 后可搜索，flush 做 Lucene commit 降低恢复重放范围。**纠正**：官方描述是 Lucene 内部先处理，再写 Translog，之后确认客户端，不能简单说"先写 Translog 再写 Lucene"。Refresh 管搜索可见性、Flush 管持久化、Merge 合并 Segment 并回收删除空间；flush 阈值默认 10 GB（以目标版本文档为准）。ES 是近实时搜索，写完即搜用 `refresh=wait_for`；Get API 默认实时读，Search 可见性依赖 refresh。Translog `request` 模式确认前持久化、`async` 按周期同步（默认约 5 秒，故障可能丢数据）。Segment 不可变利于并发读取；更新是版本化+旧版失效，删除是标记+merge 回收。Bulk 返回 200 不代表全部成功，须逐 item 检查。
- **查询、排序与分页**：默认 Query Then Fetch（各分片返回候选标识与排序→协调节点合并→Fetch 取文档）。Query Context 计分、Filter Context 不计分且可能被缓存。bool 子句：must 必须匹配参与评分、filter 必须匹配不评分、should 提高评分（是否必须看 minimum_should_match）、must_not 必须不匹配。相关性默认 BM25；不同分片得分可能不同（本地统计），`dfs_query_then_fetch` 可全局统计但增加开销。深分页用 `search_after` + 稳定排序，需要一致视图加 PIT；Scroll 不适合实时翻页。聚合可能慢/有误差，优化靠缩小过滤范围、控制桶数、composite 聚合。
- **集群、分片与扩容**：节点角色有 Master-eligible、Data、Ingest、协调节点（每节点都可承担）。主分片管写入协调，副本提升可用性与读能力，副本不能替代备份（误删会同步，需 Snapshot）。文档默认按 `_id` 哈希路由，自定义 routing 可聚合同实体但可能热点倾斜。主分片数不能原地修改，但可 Split、Shrink 或 Reindex 换新索引；副本数可动态调整。分片设计参考单分片 10~50 GB、文档数低于 2 亿（非硬规则）；"每 GB 堆内存 20 分片"已废弃。加节点不一定提升性能（分片迁移占资源）；脑裂靠多数派协调机制，奇数节点只是部署建议，ES 7 起自动管理投票配置。Green/Yellow/Red 对应主副本分配状态，单节点常 Yellow（主副本不能同节点）。
- **数据同步与排障**：MySQL→ES 用 Binlog/CDC/消息队列异步同步，只能最终一致，用稳定文档 ID 防重复、业务版本防乱序覆盖。ES 无通用跨文档事务，但有单文档原子性，并发更新可用 `_seq_no`+`_primary_term` 乐观控制。查询慢排查：先定位是所有还是特定查询，再看查询范围/深分页/通配符，慢日志与 Profile，JVM/GC/磁盘/线程池，分片热点与 merge。429 先指数退避重试再查瓶颈，扩队列不是首选。分片未分配用 allocation explain 查因，强制分配空主分片须非常谨慎。
- **最容易答错的十句话**：ES 查询不是 O(1)；MySQL 搜索不一定全表扫描；FST 不一定二分/词典不一定常驻内存；Posting List 不一定是 Roaring Bitmap；写入不是"先 Translog 后 Lucene"；Refresh≠持久化；写入后不一定 1 秒可搜；主分片数不是永远改不了；奇数 Master 不等于防脑裂；ES 不支持事务与近实时是两回事。

## 正文

见 `[[Assets/2026-11/wechat-5CB5mt9-AXXweYjZJCsiOw]]`（采集全文，约 1.4 万字，已通读）。全文 38 题按六大板块组织：基础概念与倒排索引（1-6）、分词与 Mapping（7-13）、写入与数据可靠性（14-19）、查询排序与分页（20-25）、集群分片与扩容（26-33）、数据同步与排障（34-38），每题"先给可直接回答的版本，再补充常见追问"，涉及默认值与底层实现时均说明版本差异，文末附"最容易答错的十句话"对照表。

## 来源

- [面试：Elasticsearch 面试题](https://mp.weixin.qq.com/s/5CB5mt9-AXXweYjZJCsiOw)

## 附件

- [[Assets/2026-11/wechat-5CB5mt9-AXXweYjZJCsiOw]]
