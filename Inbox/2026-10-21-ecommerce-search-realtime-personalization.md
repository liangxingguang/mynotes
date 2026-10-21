---
id: 2026-10-21-ecommerce-search-realtime-personalization
title: 搜索即推荐：Spring Cloud + ES + Redis + Kafka 电商搜索与实时个性化
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/g6VUWmW-QAAbvwbqorjF9A
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [Elasticsearch, Kafka, 工程实践]
asset_ref: Assets/2026/10/ecommerce-search-realtime-personalization.md
wiki_status: pending
---

# 搜索即推荐：百毫秒级电商搜索与实时个性化系统

> 一条能经受消息重复、索引重建、热点缓存失效、ES 降级、大促并发考验的完整链路。核心原则：MySQL 保存事实、Kafka 传播已提交变更、ES 保存可重建读模型、Redis 保存有边界的热点与短期特征、应用层只在有限候选集内做重排。关键设计：Outbox+Debezium 传播 searchVersion 单调事件 → Kafka 至少一次 + ES external_gte 版本约束收敛 → 前台 size=20 与内部候选 200 分离 → 缓存存"带 baseScore 的共享候选"（key 不含 userId）→ PIT 签名 cursor 翻页（个性化分页是另一种问题）→ 索引升级双写+栅栏消 alias 切换窗口 → ES 故障三级降级绝不 LIKE 回源 MySQL。

## 核心要点

- **职责单向**：product-service 不直接写 ES、index-projector 不服务查询、search-service 不改事实；ES 损坏可从 MySQL 快照+保留期事件重建
- **投影契约**：依赖表（品牌/类目/活动）变更也必须产生受影响商品的新索引事件；金额用分（long）防浮点歧义；rank_feature 必须正数
- **召回分离**：用户看 20 条、ES 返回 200 候选；长 description 不进主召回；track_total_hits=false
- **缓存候选不存 ID**：缓存值带 baseScore/categoryId/searchVersion，命中后仍可重排；_mget 取卡片时必须按缓存顺序重建+后备补齐；热 key 用 stale-while-revalidate+带 token 所有权单飞锁
- **个性化分页三选一**：首屏重排后续基础序 / session snapshot 分页 / 不提供深翻页——PIT+search_after 延续不了应用层重排
- **Kafka→ES 正确性**：enable.auto.commit=false+manual ack；external_gte 前提是同 productId 同 version 投影内容确定；版本冲突 409 分类为已处理而非故障；DLT 必须有告警修复回放闭环
- **画像有界**：Redis 特征 key 全带 TTL+TopK+内存预算+时间衰减；特征读取失败退化基础排序；行为事件身份只信服务端认证上下文
- **降级与扩容**：ES 故障三级降级（关重排→热点缓存→静态页）；HPA 扩 Java Pod 不能创造 ES 容量，ES 已恶化时应入口限流而非扩容
- **落地六阶段**：可重建读模型→版本幂等+DLT→召回+缓存+降级→画像重排 A/B→同义词纠错→向量召回（lexical 稳定后再上）

## 正文

全文（含 mapping JSON、召回/缓存/消费者 Java 代码、Debezium 配置、迁移流程、验证清单）见 [[Assets/2026/10/ecommerce-search-realtime-personalization]]。

## 来源

[搜索即推荐：基于 Spring Cloud、Elasticsearch、Redis、Kafka 构建百毫秒级电商搜索与实时个性化系统](https://mp.weixin.qq.com/s/g6VUWmW-QAAbvwbqorjF9A)

## 附件

- [[Assets/2026/10/ecommerce-search-realtime-personalization]]
