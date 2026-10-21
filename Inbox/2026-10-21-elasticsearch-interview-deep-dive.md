---
id: 2026-10-21-elasticsearch-interview-deep-dive
title: Elasticsearch 面试万字长文：倒排索引/集群/写入/查询/分词/深分页/索引优化
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/4K_8IJ8DFwPbO8Dwz_OSJg
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [Elasticsearch, 工程实践]
asset_ref: Assets/2026/10/elasticsearch-interview-deep-dive.md
wiki_status: pending
---

# Elasticsearch 面试万字长文（七大模块）

> 体系化 ES 面试题库，七大模块：倒排索引（Term Dictionary/Posting List/Term Index 三层结构，FST 内存仅哈希表 1/10，跳表加速 AND/OR 合并）、集群架构（Master/Data/Coordinating/Ingest 角色分离，路由公式 hash(_routing)%主分片数=主分片不可改的根源）、写入三机制（refresh 只到 OS Cache 不落盘、translog 先写顺序日志保命、flush 刷盘清 translog）、Query Then Fetch 两阶段（深分页=每分片回传 from+size 条的根源）、IK 分词（ik_max_word 索引/ik_smart 搜索，远程词典+MySQL 热更新方案）、三种分页选型（浅 from+size / 导出 scroll / 实时 search_after 必须唯一排序字段）、四维索引优化清单。核心一句话：查词翻词典→倒排列表取文档→排序查列存 Doc Values。

## 核心要点

- **倒排三层结构**：Term Index（FST，O(log n) 定位）→ Term Dictionary（字典序词条）→ Posting List（文档 ID+TF/Position/Offset）；Segment 不可变免锁、Doc Values 列存撑排序聚合
- **集群铁律**：Master 奇数个专职、角色分离（数据节点 GC 超时曾引发脑裂重选）、主副分片绝不同节点、单分片 10-50GB、副本 1-2 个
- **写入比喻**：translog=小票、refresh=柜台透明抽屉（可见不可取）、flush=押运进金库；误区：refresh 不落盘、translog 是写入时就同步写
- **深分页本质**：from=9990,size=10 → 每分片回传 10000 条，协调节点排 分片数×10000 条；search_after 让每分片只取 size 条，合并量恒定 shards×size
- **search_after 唯一排序**：排序字段不唯一会丢数据/重复，必须 _id 兜底；scroll 存快照上下文不能用于实时分页
- **IK 实战**：索引 ik_max_word+搜索 ik_smart 平衡查全查准；热更新=远程词典 HTTP 接口（60s 轮询 Last-Modified）+MySQL 词库；排查搜不到第一板斧 _analyze
- **优化清单**：分片=节点数×1.5~3、堆≤31GB（压缩指针失效线）、磁盘<85%、filter 替代 query 快 3-10 倍、Bulk 5-15MB、写密集 refresh 30s+translog async

## 正文

全文（含结构对比表、配置示例、踩坑记录、面试问答）见 [[Assets/2026/10/elasticsearch-interview-deep-dive]]。

## 来源

[吊打面试官！Elasticsearch 面试万字长文：倒排索引、集群、写入、查询、分词、深度分页、索引优化，看完直接拿 Offer！](https://mp.weixin.qq.com/s/4K_8IJ8DFwPbO8Dwz_OSJg)

## 附件

- [[Assets/2026/10/elasticsearch-interview-deep-dive]]
