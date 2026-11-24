---
id: wiki-topic-ecommerce-search-recommendation
type: topic
title: 电商搜索与推荐系统
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - topic
  - search
  - recommendation
  - elasticsearch
  - architecture
sources:
  - raw/sources/architecture/2026-10-21-ecommerce-search-realtime-personalization.md
  - raw/sources/architecture/2026-11-24-ecommerce-realtime-search-recommendation.md
related:
  - wiki/sources/ecommerce-search-realtime-personalization.md
  - wiki/sources/ecommerce-search-recommendation-practice.md
  - wiki/entities/elasticsearch.md
  - wiki/entities/redis.md
  - wiki/entities/kafka.md
---
# 电商搜索与推荐系统

## Scope（范围）

电商商品搜索 + 个性化推荐的系统设计（Java / SpringCloud 技术栈）：搜索召回与加权查询、搜索建议、推荐双路（协同过滤 + 内容推荐）、数据同步、缓存与性能配置。不含向量检索、广告投放与搜索排序算法研究。

## Current Understanding（当前认知）

双信源互补互证：

- [[ecommerce-search-realtime-personalization|搜索即推荐（生产级方案）]]：读模型与事实数据分离（MySQL+Outbox→Debezium/Kafka→ES），带分数共享候选缓存、有界画像重排、故障三级降级，给出 SLO 与上线清单。
- [[ecommerce-search-recommendation-practice|实时商品搜索与个性化推荐实战（教程骨架）]]：同技术栈的入门级完整代码骨架，多字段加权搜索、completion 建议、协同过滤+内容推荐双路合并、事件监听同步与多级缓存配置。

两源总体判断一致：ES 承担搜索召回、Redis 承担缓存、Kafka 承担同步、个性化只在候选集内调排序；差异在同步路径、刷新间隔、画像深度与缓存失效策略，见下方 Disagreements。

## Key Concepts（关键概念）

- 多字段加权搜索（multiMatch boost，name^3/description^2）
- completion suggester 搜索建议
- 协同过滤（相似用户→偏好商品）
- 内容推荐（用户偏好 boost 进 ES 查询）
- 死信队列（同步失败兜底）
- 多级缓存与缓存失效

以上概念均为单信源或桩级证据支撑，按最小页面规则不单独立页，细节挂靠在两个信源页。

## Key Entities（关键实体）

- [[elasticsearch|Elasticsearch]]（搜索核心：ik 分词、分片/副本/刷新间隔、completion suggester）
- [[redis|Redis]]（多级缓存、搜索指标、行为与相似用户缓存）
- [[kafka|Kafka]]（实时同步通道与死信队列）

## Important Decisions（重要决策）

无独立决策页；设计取舍记录在两个信源页（生产级方案的 Outbox+版本约束、教程骨架的事件监听+死信）。

## Major Developments（重大进展）

- 2026-10-21：登记生产级方案信源（读模型分离、Outbox、有界画像、三级降级）。
- 2026-11-24：登记教程骨架信源，建立本主题页，完成双信源互证与分歧对账。

## Disagreements（分歧）

均为方案路径差异而非事实矛盾，两源各自成立，记录如下：

1. **数据同步路径**：生产级源用事务性 Outbox + Debezium binlog 投影（职责单向、ES 可从快照+事件重建）；教程源用 `@EventListener` 直接监听变更事件 + Kafka 死信（更简单，但存在一致性窗口）。解读：生产级源更可靠，教程源适合轻量/弱一致场景。
2. **ES refresh-interval**：教程源 30s（提升写入吞吐）；生产级源示例 2s（追求新鲜度）。取决于新鲜度 SLO 的取舍。
3. **个性化深度**：教程源协同过滤为简化桩；生产级源为有界画像（Top 50 类目/品牌、Top 200 商品、时间衰减）+ finalScore 重排公式 + 硬约束。
4. **缓存失效**：教程源按 key 删除失效（并自注 `search_results:*` 通配失效需更精确策略）；生产级源缓存 key 含检索版本与实验桶、按版本失效、热 key 用 stale-while-revalidate。

## Open Questions（开放问题）

- 向量检索与词法匹配的分工（生产级源观点：电商型号/SKU 强依赖词法，向量为补充召回）——待新信源补充。
- 协同过滤从桩到生产的路径（生产级源的有界画像 + 重排是一条可行路线）——待生产验证类信源补充。

## Related Topics（相关主题）

- [[system-design-core-components]]（系统设计通用组件背景）
