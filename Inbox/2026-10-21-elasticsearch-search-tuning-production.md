---
id: 2026-10-21-elasticsearch-search-tuning-production
title: Elasticsearch 生产级搜索性能调优实战
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/3PwUQZX2BwoI3jQoIjn9zA
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [Elasticsearch, 工程实践, 分布式系统]
asset_ref: Assets/2026/10/elasticsearch-search-tuning-production.md
wiki_status: pending
---

# Elasticsearch 生产级搜索性能调优实战

> 基于 20 亿+ 文档、峰值 5000 QPS 的订单搜索系统，系统讲清 ES 从秒级到毫秒级的调优路径：慢的根源在 query/fetch 两阶段与协调节点合并成本，优化优先级是**减分片→filter→缩时间→限字段→search_after 替代深分页→关 track_total_hits→routing**，而不是先调 JVM 参数。索引建模是生死线（dynamic strict、scaled_float、sort.field、慎用 nested），写入用 Kafka+Bulk 幂等链路，高并发靠线程池隔离+熔断降级+热点租户复合路由，长期演进靠 ILM 冷热分层与多集群拆分。完整方法论五步走：定位→砍不合理请求→重做索引模型→补治理→最后调参数。

## 核心要点

- **两阶段查得慢在哪**：query phase 各分片本地查+排序，fetch phase 拉 _source；深分页让每个分片都返回 from+size 条候选再全局归并，是延迟暴涨主因
- **filter vs must**：filter 不评分且结果可缓存为 bitset，高频过滤条件一律放 filter
- **缓存三层**：Query Cache（filter bitset）/ Request Cache（静态聚合）/ OS Page Cache——JVM 堆≤50% 内存且≤32GB，留足文件缓存
- **拆索引**：在线检索/聚合统计/归档三类索引分开，别让报表聚合拖垮在线查询
- **索引模板要点**：`dynamic: strict` 防脏字段、`sort.field: [createTime, orderId]` 配合 search_after、手机号后四位单独存 phoneSuffix、nested 只在数组内字段必须关联时用
- **深分页正解**：列表用 search_after、导出用 PIT+search_after、报表遍历用 composite aggregation
- **写入治理**：Bulk 单批 5-15MB、按字节不按条数；失败分类重试+死信；refresh_interval 放大要匹配可见性要求
- **热点租户**：routing 从单键改 `tenantId + hash(userId)` 复合路由，超大租户拆独立索引
- **五步方法论**：先定位慢在哪 → 砍不合理请求 → 重做索引模型 → 补工程治理 → 最后才调参数（"在更贵的机器上延续原来的问题"是最常见错误）

## 正文

全文（含索引模板 JSON、Java API Client search_after/Bulk/resilience4j 代码、ILM policy 与慢日志配置）见 [[Assets/2026/10/elasticsearch-search-tuning-production]]。

## 来源

[从 10s 到 10ms：Elasticsearch 生产级搜索性能调优实战（附踩坑指南）](https://mp.weixin.qq.com/s/3PwUQZX2BwoI3jQoIjn9zA)

## 附件

- [[Assets/2026/10/elasticsearch-search-tuning-production]]
