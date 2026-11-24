---
id: wiki-source-ecommerce-search-recommendation-practice
type: source
title: 电商平台实时商品搜索与个性化推荐实战（微信「服务端技术精选」）
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - source
  - elasticsearch
  - search
  - recommendation
  - java
sources:
  - raw/sources/architecture/2026-11-24-ecommerce-realtime-search-recommendation.md
related:
  - wiki/sources/ecommerce-search-realtime-personalization.md
  - wiki/topics/ecommerce-search-recommendation.md
  - wiki/entities/elasticsearch.md
---
# 电商平台实时商品搜索与个性化推荐实战

## Overview（概览）

教程式骨架长文：从电商搜索推荐典型痛点切入，给出以 SpringCloud 为骨架、ES 为搜索核心、Redis 为缓存、Kafka 为数据同步通道、MySQL 为主存储的完整方案，并逐模块给出可落地的代码骨架（搜索、推荐、同步、缓存、数据模型、性能配置）。与生产级方案 [[ecommerce-search-realtime-personalization]] 同主题互补，构成双信源互证（差异对账见 [[ecommerce-search-recommendation]]）。

## Key Facts（关键事实）

- 痛点与选型：搜索语义错配（搜"苹果手机"出农产品）、响应超 3 秒、推荐不精准、热门排名混乱；技术选型 SpringCloud 微服务 + ES 全文搜索 + Redis 缓存 + Kafka 实时同步 + MySQL 主存储。
- 搜索接口：Controller 暴露 `/api/search/products`（关键词/分页/分类/排序参数，透传 userId）与 `/api/search/suggest`。
- 多字段加权查询：MultiMatchQuery 权重 name^3、description^2、brand、category，BEST_FIELDS 策略 + Fuzziness.AUTO 模糊匹配；分类走 term filter（`category.keyword`）不参与评分；默认按 scoreSort 相关性降序。
- 搜索建议：ES completion suggester（suggest 字段 input=name+brand、weight=1），前缀补全，size 10。
- 搜索指标：每日搜索词记录进 Redis Hash `search:metrics:<date>`，TTL 30 天。
- 推荐双路：协同过滤（找相似用户→其喜欢的商品→剔除已购→按热度取 Top10）+ 内容推荐（按用户行为统计分类/品牌偏好，分类偏好 >2、品牌偏好 >1 时以 boost 拼入 ES bool should 查询，page 0 size 20）；两路合并用 LinkedHashSet 去重，再与搜索结果混合去重，返回总数限 50。
- 行为缓存：用户行为历史缓存 1 小时，相似用户缓存 30 分钟。
- 实时同步：`ProductSyncService` 以 `@EventListener` 监听商品变更事件，CREATE/UPDATE→写 ES、DELETE→删 ES；失败消息进 Kafka 死信 topic `product-sync-failed`；同步后失效 `product:{id}` 与 `recommendations:product:{id}` 缓存。
- 数据模型：ES 索引 `products`——name 为 Text（ik_max_word 索引 / ik_smart 搜索）、description 为 Text（ik_max_word）、category/brand/imageUrl/tags 为 Keyword、price 为 Double、salesVolume 为 Long、rating 为 Float、createTime/updateTime 为 Date、suggest 为 CompletionField。
- 缓存策略：商品详情缓存 30 分钟、热门商品缓存 10 分钟，缓存未命中回查 ES；评分更新时更新 ES 并失效商品缓存（文章自注 `search_results:*` 通配失效需更精确策略）。
- 性能配置：ES connection-timeout 5s / socket-timeout 60s、refresh-interval 30s、3 分片 1 副本、segments-per-tier 10、搜索 default-timeout 5s、max-result-window 10000；Redis Lettuce 池 max-active 200 / max-idle 50 / min-idle 10 / max-wait 2000ms。
- 风险提示：ES 与 DB 数据一致性、缓存过期、资源消耗、搜索注入防护、监控告警需配套建设。

## Important Claims（重要论断）

### Claim 1：本骨架的推荐核心算法均为「简化实现」桩

相似用户、热度排序、行为加载等辅助方法在文中明确标注为简化实现、返回空集合——文章的价值在于工程骨架（接口划分、查询构建、缓存 key、同步流程与配置），而非开箱即用的推荐算法。

### Claim 2：多字段加权召回 + filter 分离 + 补全建议 + 双路推荐合并，是该技术栈下搜索+个性化的最小骨架

文章以完整代码给出这套最小组合；与生产级信源的「召回分离」（前台页大小与内部候选数分开）思路互证（解读）。

## Concepts Introduced（引入的概念）

- 多字段加权搜索（multiMatch boost）、completion suggester 搜索建议、协同过滤、内容推荐（偏好 boost）、死信队列——均为单信源且部分为桩级证据，按最小页面规则不立概念页，详见 [[ecommerce-search-recommendation]]。

## Entities Mentioned（提及的实体）

- [[elasticsearch|Elasticsearch]] / [[redis|Redis]] / [[kafka|Kafka]]（均已立页）；SpringCloud / MySQL（未立页）

## Implications（影响／启示）

- 「分类走 filter 不参与评分」减少类目词干扰相关性排序，与生产级方案的 filter 走 sellable/category/brand/price 同构（解读）。
- 教程骨架与生产级方案总体判断一致：ES 承担搜索召回、Redis 承担缓存、Kafka 承担同步、个性化只在候选集内调排序；分歧在同步路径与实现深度，已在主题页记录（解读）。

## Limitations（局限）

- 协同过滤／相似用户／热度排序／行为库加载均为简化桩（返回空集合），不可直接生产使用。
- 无容量测试、SLO 与生产验证数据；全部性能参数为示例配置。
- 微信公众号转载/二次来源（服务端技术精选，作者站 www.jiangyi.space），单信源。
- 采集稿代码块被折叠为单行（采集层格式产物），raw 按原文逐字收录、未改格式。

## Related Knowledge（相关知识）

- [[ecommerce-search-realtime-personalization|搜索即推荐（信源页）]]（同主题生产级方案，双信源互证，差异对账见 [[ecommerce-search-recommendation]]）
- [[ecommerce-search-recommendation|电商搜索与推荐系统（主题页）]]（双信源主题导航与分歧对账）
- [[elasticsearch|Elasticsearch]] / [[redis|Redis]] / [[kafka|Kafka]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-11-24-ecommerce-realtime-search-recommendation.md`
