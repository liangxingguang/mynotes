---
id: wiki-source-ecommerce-search-realtime-personalization
type: source
title: 搜索即推荐：Spring Cloud + ES + Redis + Kafka 电商搜索与实时个性化
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - elasticsearch
  - search
  - architecture
sources:
  - raw/sources/architecture/2026-10-21-ecommerce-search-realtime-personalization.md
related:
  - wiki/entities/elasticsearch.md
---
# 搜索即推荐：Spring Cloud + ES + Redis + Kafka 电商搜索与实时个性化

## Overview（概览）

生产级方案长文：以电商商品搜索为例，给出"读模型与事实数据分离"的完整架构——MySQL+事务 Outbox 为事实源，Debezium/Kafka 投影到 ES，Caffeine+Redis 两级缓存带分数候选，Redis 短期画像做有界重排；附索引双写升级、故障三级降级与上线验证清单。示例 SLO：缓存命中 P99<80ms、未命中端到端 P99<200ms、索引事件 P99 age<3s。

## Key Facts（关键事实）

- 边界先行：搜索展示的价格/库存是允许最终一致的读模型，结算扣减必须回交易服务校验；个性化只调候选集内排序，不得覆盖型号/品牌/价格等强 query 意图；ES 不是第二个事实数据库，损坏时可从 MySQL 快照+保留期事件重建。
- 职责单向：product-service 只管事实+同事务 Outbox（不直接写 ES）；Debezium 只搬 binlog；index-projector 只投影；search-service 只做校验/召回/缓存/重排/降级。
- 召回分离：前台页大小（≤50）与内部候选数（固定 200）必须分开；multiMatch 主字段 title^5/searchKeywords^2 + minimum_should_match 70%，filter 走 sellable/category/brand/price；长 description 不进主召回。
- 缓存设计：缓存"带分数的共享候选"而非最终结果——key 不含 userId 但含规范化 query+全部 filter+排序+locale+索引/同义词版本+实验桶；value 保留 baseScore 供重排；L1 Caffeine 10-20s、L2 Redis 30-60s 加抖动；热 key 用 stale-while-revalidate > 单飞锁（带所有权 token，compare-and-delete）> 预算内回源。
- 分页二分：原始搜索连续翻页用受时限 PIT+cursor；个性化分页是另一个问题（重排后无法游标化）。
- Kafka→ES 至少一次是正常路径：manual ack + bulk + external_gte 版本约束；等版本 conflict 分类为"已处理"而非故障；可重试错误（429/断连）与永久错误（mapping 拒绝）分流，DLT 需告警-修复-回放闭环；**不要承诺 exactly-once 写 ES**，承诺的是"至少一次+版本约束+幂等+成功后提交 offset"。
- 画像有界：行为事件不信任客户端（身份取自认证上下文，购买事件由交易域产生）；Redis key 全部带 TTL+容量上限（Top 50 类目/品牌 HASH 30 天、200 商品 ZSET 7 天），时间衰减 `new=old*decay+weight`，只增不减是内存炸弹；曝光/点击不做精确幂等（购买/加购/收藏才做）。
- 重排硬约束：finalScore=0.75*base+0.10*类目+0.06*品牌+0.05*热度+0.04*新鲜度-seenPenalty；BM25 分不能跨 query 比，只在同 query 候选集内归一化；严格型号命中/禁售/价格过滤不得被偏好推翻；特征读取失败必须退化为基础排序。
- 索引升级九步：快照全量→watermark 回放→双写 v1/v2→差异校验→写入栅栏追平→原子切 alias→回滚窗口内保留 v1；版本能挡旧事件覆盖，挡不住"只写到旧 alias"的窗口，双写/栅栏不可省。
- 降级三级：L1 关重排/聚合、候选 200→50；L2 返回 Redis 热点候选/类目榜；L3 静态导航页；**ES 故障绝不回源交易 MySQL 做 LIKE**；HPA 只能扩 Java Pod 不能创造 ES 容量。

## Important Claims（重要论断）

### Claim 1：搜索系统的可靠性来自"读模型可重建"而非"读模型不故障"

事实数据只在交易库，ES 索引是随时可从快照+事件重建的投影——这条前提决定了 Outbox、版本约束、双写升级等全部下游设计（解读）。

## Concepts Introduced（引入的概念）

- 带分数共享候选缓存、双目标投影索引升级（方案级模式，未立概念页）

## Entities Mentioned（提及的实体）

- [[elasticsearch|Elasticsearch]] / Debezium / Kafka / Caffeine（后三者未立页）

## Implications（影响／启示）

- "缓存 key 含检索版本与实验桶、value 带 baseScore"是搜索缓存可重排、可失效、可实验的关键设计，可直接复用（解读）。
- Outbox+版本约束+幂等消费者的组合与 [[agent-long-task-reliable-execution]] 的可靠性思路同构（解读）。

## Limitations（局限）

- 所有版本/分片数/TTL/权重均为示例值，信源明确要求上线前经容量测试与业务 SLA 校准。

## Related Knowledge（相关知识）

- [[elasticsearch-interview-deep-dive|ES 面试深拆（信源页）]]、[[elasticsearch-search-tuning-production|ES 生产调优（信源页）]]（同实体三信源）

## Source（信源）

- `raw/sources/architecture/2026-10-21-ecommerce-search-realtime-personalization.md`
