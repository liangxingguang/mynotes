# 搜索即推荐：基于 Spring Cloud、Elasticsearch、Redis、Kafka 构建百毫秒级电商搜索与实时个性化系统

> 来源：https://mp.weixin.qq.com/s/g6VUWmW-QAAbvwbqorjF9A
> 抓取时间：2026-10-21（web-fetch，browser 级）

> 本文的目标不是堆砌组件，而是给出一条能经受**消息重复、索引重建、热点缓存失效、ES 降级和大促并发**考验的实现链路。核心原则：**MySQL 保存事实；Kafka 传播已提交的业务变更；Elasticsearch 保存可重建的搜索读模型；Redis 保存有边界的热点与短期特征；应用层只在有限候选集内做个性化重排。**

## 1. 先定义"可用"：本文承诺什么，不承诺什么

以商品搜索为例，用户搜索"无线降噪耳机"时，系统需同时满足：

```
相关：标题、别名、型号和类目匹配
可卖：上架、粗粒度库存、价格状态可用
个性化：同一候选集内，根据近期兴趣调整顺序
新鲜：商品变更通常在数秒内可搜索
稳定：ES 或 Redis 故障不拖垮交易 MySQL
```

本文的示例 SLO 是：热点查询缓存命中时 P99 < 80 ms，缓存未命中时端到端 P99 < 200 ms，商品索引事件 P99 age < 3 s。它们是**压测起点，不是通用结论**；标题中的"百毫秒级"指完整搜索 API，而非单独 ES 的 `took`。

以下边界必须先说清：

- 搜索展示的价格、库存是允许短暂最终一致的读模型；结算与扣减库存必须回到交易/库存服务校验。
- 个性化只影响有限候选集排序，不能让偏好覆盖型号、品牌、价格等强 query 意图。
- 搜索结果不提供任意页跳转；需要连续翻页时使用受时限约束的 cursor。
- 文中的版本、分片数、TTL、权重均为示例；上线前必须由容量测试、相关性数据和业务 SLA 校准。

## 2. 生产架构：读模型与事实数据分离

```
Client
  │
  ▼
Gateway ──认证、限流、参数边界──► search-service
                                      │
                        ┌────────────┼────────────┐
                        ▼            ▼            ▼
                     Caffeine     Redis     Elasticsearch
                     L1 热点      L2 候选缓存  候选召回/文档
                                      │
                                      ▼
                                实时用户特征
product-service ──事务──► MySQL(product + outbox_event)
                                      │
                                      ▼
                            Debezium / Kafka Connect
                                      │
                                      ▼
                        Kafka(outbox.event.product-index)
                                      │
                                      ▼
                            index-projector ──► ES
behavior-service ──► Kafka(user-behavior) ──► profile-consumer ──► Redis
```

职责必须单向：

| 组件 | 负责 | 不负责 |
| --- | --- | --- |
| `product-service` | 商品事实数据和同事务 Outbox | 直接同步写 ES |
| Debezium | 从 binlog 提取已提交 Outbox | 理解商品搜索字段 |
| `index-projector` | 将索引事件投影到 ES | 面向客户端查询 |
| `search-service` | DTO 校验、召回、缓存、重排、降级 | 修改商品事实 |
| `profile-consumer` | 有界的短期兴趣特征 | 阻塞搜索请求或训练复杂模型 |

因此，ES 索引损坏、mapping 升级、排序字段变更时，系统应能从 MySQL 快照和保留期内的事件重新构建；它不是第二个事实数据库。

## 3. 先做数据契约，再写消费者

### 3.1 面向查询的商品文档

搜索文档不是关系表的镜像，而是一次搜索需要的数据投影：

```json
{
  "productId": "P10001",
  "title": "Pro X 无线主动降噪耳机",
  "searchKeywords": ["主动降噪", "蓝牙耳机", "ANC"],
  "brandId": "B12",
  "categoryId": "C301",
  "priceCent": 129900,
  "sellable": true,
  "stockLevel": 2,
  "sales30d": 18231,
  "qualityScore": 0.93,
  "popularityScore": 1.0,
  "searchVersion": 1872,
  "updatedAt": 1789971000000
}
```

- 金额使用分为单位的 `long`，避免跨 MySQL、JSON、Java 和 ES 的浮点歧义。
- `stockLevel` 仅表达无货/紧张/正常；订单创建时仍由库存服务作精确校验。
- `rank_feature` 的值必须为正数。新商品不能直接写 `0`，可设一个经过业务确认的最小正基线。
- 一个商品文档依赖品牌、类目、活动、库存摘要等表时，**这些依赖表的变更也必须产生该商品的新索引事件**。不要只在 `product` 更新时发事件。

推荐把文档构建封装为独立的 `SearchProjectionFactory`，并对"商品改价、品牌改名、类目迁移、活动结束、上/下架"分别写集成测试。若关联关系复杂且一项变更会影响大量商品，使用 `search_projection` 表承载已聚合字段通常比消费者临时 Join 更可靠。

### 3.2 Mapping：显式、严格、可验证

```json
PUT products_v20260922_01
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "2s",
    "analysis": {
      "normalizer": {
        "lowercase_normalizer": {
          "type": "custom",
          "filter": ["lowercase", "asciifolding"]
        }
      }
    }
  },
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "productId":       { "type": "keyword" },
      "title":           { "type": "text", "analyzer": "smartcn", "fields": { "raw": { "type": "keyword", "normalizer": "lowercase_normalizer", "ignore_above": 256 } } },
      "searchKeywords":  { "type": "text", "analyzer": "smartcn" },
      "brandId":         { "type": "keyword" },
      "categoryId":      { "type": "keyword" },
      "priceCent":       { "type": "long" },
      "sellable":        { "type": "boolean" },
      "stockLevel":      { "type": "byte" },
      "sales30d":        { "type": "long" },
      "qualityScore":    { "type": "rank_feature" },
      "popularityScore": { "type": "rank_feature" },
      "searchVersion":   { "type": "long" },
      "updatedAt":       { "type": "date", "format": "epoch_millis" }
    }
  }
}
```

`analysis-smartcn` 是插件，不是把 mapping 发到集群就会自动存在的 analyzer。自建集群必须在**所有节点**安装同版本插件并重启；Kubernetes 应把它固化到镜像或 init container。上线前应执行 `_analyze` 回归集，覆盖品牌、型号、英文混输、同义词及业务词典。

`number_of_shards: 3` 只是示例，不能照抄。应按文档体积、峰值并发、写入量、节点数、恢复窗口和压测拐点确定；索引模板应带上该决定的容量依据。

## 4. 搜索召回：前台页大小与内部候选数必须分离

一个常见错误是把用户请求的 `size=20` 直接当作重排候选数。正确做法是：用户只看 20 条，ES 先返回经严格上限约束的 200 条候选。

```java
public record ProductSearchRequest(
        String keyword,
        String categoryId,
        String brandId,
        Long minPriceCent,
        Long maxPriceCent,
        int pageSize,
        String cursor) {
    public int safePageSize() {
        return Math.max(1, Math.min(pageSize, 50));
    }
}

public record CandidateHit(
        String productId,
        double baseScore,
        String categoryId,
        String brandId,
        long priceCent,
        long searchVersion) {}
```

召回代码的关键是固定内部候选数，并把 ES score 一同保留：

```java
private static final int RECALL_CANDIDATE_SIZE = 200;

public List<CandidateHit> recallBaseCandidates(ProductSearchRequest req) throws IOException {
    Query text = StringUtils.hasText(req.keyword())
            ? Query.of(q -> q.multiMatch(m -> m.query(req.keyword())
                    .fields("title^5", "searchKeywords^2")
                    .type(TextQueryType.BestFields)
                    .minimumShouldMatch("70%")))
            : Query.of(q -> q.matchAll(m -> m));

    List<Query> filters = new ArrayList<>();
    filters.add(Query.of(q -> q.term(t -> t.field("sellable").value(true))));
    if (StringUtils.hasText(req.categoryId())) {
        filters.add(Query.of(q -> q.term(t -> t.field("categoryId").value(req.categoryId()))));
    }
    if (StringUtils.hasText(req.brandId())) {
        filters.add(Query.of(q -> q.term(t -> t.field("brandId").value(req.brandId()))));
    }
    if (req.minPriceCent() != null || req.maxPriceCent() != null) {
        filters.add(Query.of(q -> q.range(r -> r.number(n -> {
            n.field("priceCent");
            if (req.minPriceCent() != null) n.gte(req.minPriceCent().doubleValue());
            if (req.maxPriceCent() != null) n.lte(req.maxPriceCent().doubleValue());
            return n;
        }))));
    }

    Query query = Query.of(q -> q.bool(b -> b.must(text).filter(filters)
            .should(s -> s.rankFeature(r -> r.field("qualityScore")
                    .saturation(x -> x.pivot(0.6f))))
            .should(s -> s.rankFeature(r -> r.field("popularityScore")
                    .log(x -> x.scalingFactor(0.1f))))));

    SearchResponse<ProductDocument> response = esClient.search(s -> s
            .index("products_read")
            .query(query)
            .size(RECALL_CANDIDATE_SIZE)
            .trackTotalHits(t -> t.enabled(false)), ProductDocument.class);

    return response.hits().hits().stream()
            .filter(hit -> hit.source() != null)
            .map(hit -> new CandidateHit(hit.id(), hit.score() == null ? 0D : hit.score(),
                    hit.source().categoryId(), hit.source().brandId(),
                    hit.source().priceCent(), hit.source().searchVersion()))
            .toList();
}
```

不要让长 `description` 默认参与主召回。标题、别名、品牌、型号、类目是首层；详情描述只能低权重补召回，并需要独立的相关性评估证明收益。

## 5. 缓存的是"带分数的共享候选"，不是最终结果

缓存 key 不含 `userId`，但必须包含任何会改变基础召回的输入：规范化 query、全部 filter、排序模式、locale、索引/同义词版本和实验桶。

```java
public String baseCacheKey(ProductSearchRequest req, String experiment, String retrievalVersion) {
    String canonical = String.join("|",
            normalizeKeyword(req.keyword()),
            Objects.toString(req.categoryId(), ""),
            Objects.toString(req.brandId(), ""),
            Objects.toString(req.minPriceCent(), ""),
            Objects.toString(req.maxPriceCent(), ""),
            experiment,
            retrievalVersion);
    return "search:base:" + DigestUtils.sha256Hex(canonical);
}
```

缓存值不应只是 ID：

```json
{
  "generatedAt": 1789971000000,
  "candidates": [
    {"productId":"P10001","baseScore":14.92,"categoryId":"C301","brandId":"B12","searchVersion":1872}
  ]
}
```

这样缓存命中时仍然有可比较的 `baseScore`。若要在展示前用 `_mget` 读取最新商品卡片，必须按缓存中的候选顺序重建列表，且对下架/缺失文档过滤后用后备候选补齐；不能让 `_mget` 的返回顺序成为排序依据。

推荐策略：L1 Caffeine 10～20 秒，L2 Redis 30～60 秒并加入随机抖动。价格和可售性要求更严时，不盲目缩 TTL，而是对关键商品变更发失效消息或在卡片层以 `searchVersion` 做轻量校验。

### 5.1 热 key：使用安全单飞或 stale-while-revalidate

不建议将"拿不到锁就返回空列表"作为正常路径。更稳妥的优先级是：返回未过期不久的 stale 值并异步刷新；没有 stale 值时用单飞锁；最后才在入口的并发预算内回源。

锁必须带所有权 token，释放时 compare-and-delete：

```java
String token = UUID.randomUUID().toString();
Boolean acquired = redis.opsForValue().setIfAbsent(lockKey, token, Duration.ofSeconds(5));
if (Boolean.TRUE.equals(acquired)) {
    try {
        return loadAndCache();
    } finally {
        redis.execute(DELETE_IF_OWNER_SCRIPT, List.of(lockKey), token);
    }
}
```

其中 Lua 脚本语义必须是"仅当当前值等于 token 时删除"。若加载可能超过租约，还需续约，或使用已实现所有权与 watch-dog 的锁库。不要在高并发 Web 线程中长时间 `park`；等待上限应受总延迟预算约束。

## 6. 分页：PIT cursor 与个性化分页是两种问题

### 6.1 原始搜索的连续翻页

需要连续翻页时，cursor 应是服务端签名的结构体，而非客户端可改的裸 `search_after`：

```json
{
  "pitId": "...",
  "sortValues": [12.3841, "P100983", 4294967298],
  "queryFingerprint": "sha256(...)",
  "expiresAt": 1789971060000
}
```

流程为：

```
首次请求：open PIT → 查询 → 返回最新 pitId + 最后一条完整 sort 值
后续请求：验证签名、过期时间、query fingerprint → 使用最新 pitId + search_after
结束或过期：DELETE PIT
```

使用 PIT 时必须带回 ES 自动附加的 `_shard_doc` tiebreaker；每次响应中的 PIT ID 都可能更新，后续请求应使用最新 ID。查询与 sort 在整个 cursor 生命周期内不可改变。

### 6.2 个性化结果的分页

ES 的 `search_after` 只能延续 ES 的排序，不能延续应用层重排后的顺序。因此以下三种策略只能择一并写入产品定义：

1. 搜索页只对首屏重排，后续页保持基础排序；
2. 首次请求生成短时 session snapshot（例如 200 个候选及最终 rank），后续按 session cursor 分页；
3. 不提供连续的个性化深翻页。

对普通电商搜索，通常采用策略 1 或 2。不要声称"PIT + search_after 已经解决个性化分页"。

## 7. 事务 Outbox：可靠传播已提交的索引事件

### 7.1 表结构与事件版本

```sql
CREATE TABLE outbox_event (
    id             CHAR(36)     NOT NULL,
    aggregate_type VARCHAR(64)  NOT NULL,
    aggregate_id   VARCHAR(64)  NOT NULL,
    type           VARCHAR(64)  NOT NULL,
    event_version  BIGINT       NOT NULL,
    payload        JSON         NOT NULL,
    created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_aggregate_version (aggregate_type, aggregate_id, event_version)
);
```

`event_version` 必须是针对一个 `productId` 的单调递增版本，并覆盖所有会改变搜索投影的变更。若品牌改名影响十万商品，不能复用品牌自身的局部版本号去覆盖商品的 `searchVersion`；应为每个受影响商品生成新的投影版本，或使用可验证的全局单调序列。

业务更新与 Outbox 插入处于同一个 MySQL 事务：

```java
@Transactional
public void updateProduct(UpdateProductCommand cmd) {
    Product product = productRepository.lockById(cmd.productId());
    product.change(cmd);
    product.increaseSearchVersion();
    productRepository.save(product);
    ProductIndexEvent event = ProductIndexEvent.upsert(
            UUID.randomUUID().toString(), product.getId(), product.getSearchVersion(),
            projectionFactory.build(product));
    outboxRepository.insert(event);
}
```

这不保证 ES 与 MySQL 原子提交，但保证"只要业务已提交，就存在一条可由 Debezium 最终读取的索引事件"。要配置 binlog 保留时长、Kafka topic 保留期和 Connect offset 的备份，使事故恢复窗口不小于业务允许的恢复时间。

### 7.2 Debezium：明确字段映射与序列化

Debezium Outbox Event Router 默认期待 `aggregatetype`、`aggregateid`、`type` 等列。本文保留兼容的 `type` 列名，并对其余下划线字段显式覆写；在测试环境必须验证实际 topic、key、header 与 value：

```json
{
  "name": "product-outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "topic.prefix": "commerce",
    "database.include.list": "commerce_db",
    "table.include.list": "commerce_db.outbox_event",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.route.by.field": "aggregate_type",
    "transforms.outbox.route.topic.replacement": "outbox.event.${routedByValue}",
    "transforms.outbox.table.field.event.id": "id",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.payload": "payload",
    "transforms.outbox.table.fields.additional.placement": "event_version:header:eventVersion",
    "transforms.outbox.table.expand.json.payload": "true"
  }
}
```

这里的 payload 必须就是消费者需要的 `ProductIndexEvent` JSON，或明确由消费者从 header 和 payload 组装；二者不能含糊。生产环境还需要明确 key/value converter、schema 策略、错误容忍策略和仅对 Outbox 表应用 SMT 的 predicate。提交前用 Testcontainers 验证：MySQL commit 后事件只出现一次逻辑事件、Kafka key 为 `productId`、header 命名正确、Spring 消费者能反序列化。

## 8. Kafka → Elasticsearch：至少一次投递下的正确 ack

Kafka 到 ES 通常是至少一次：ES 已接受写入但响应在网络中丢失时，消费者会收到同一条消息两次。这不是异常，而是必须实现的正常路径。

### 8.1 Consumer 配置底线

批量 listener 必须显式配置：

```
enable.auto.commit = false
batchListener      = true
AckMode            = MANUAL（或由容器管理的 BATCH）
```

若使用 `Acknowledgment`，容器 factory 必须真的是 batch + manual ack；只在 listener 方法里写一个 `ack` 参数并不会自动建立正确语义。

### 8.2 写入与重复处理

下例使用 `external_gte` 的前提是：**同一个 productId、同一个 eventVersion 对应完全确定的投影内容**。若不能保证，改为 `external` 并把等版本 conflict 分类为已处理；不能把所有 409 当成系统故障。

```java
@KafkaListener(
        topics = "outbox.event.product-index",
        groupId = "product-index-projector",
        containerFactory = "batchKafkaListenerContainerFactory")
public void onMessage(List<ConsumerRecord<String, ProductIndexEvent>> records,
                      Acknowledgment ack) throws IOException {
    BulkRequest.Builder bulk = new BulkRequest.Builder();
    for (ConsumerRecord<String, ProductIndexEvent> record : records) {
        ProductIndexEvent event = record.value();
        if (event.type() == EventType.DELETE) {
            bulk.operations(op -> op.delete(d -> d.index("products_write")
                    .id(event.productId()).version(event.eventVersion())
                    .versionType(VersionType.ExternalGte)));
        } else {
            bulk.operations(op -> op.index(i -> i.index("products_write")
                    .id(event.productId()).document(event.document())
                    .version(event.eventVersion()).versionType(VersionType.ExternalGte)));
        }
    }
    BulkResponse response = esClient.bulk(bulk.build());
    List<BulkResponseItem> retryable = response.items().stream()
            .filter(item -> item.error() != null)
            .filter(this::isRetryableEsFailure)
            .toList();
    List<BulkResponseItem> permanent = response.items().stream()
            .filter(item -> item.error() != null)
            .filter(item -> !isRetryableEsFailure(item))
            .filter(item -> !isExpectedVersionConflict(item))
            .toList();
    if (!retryable.isEmpty()) {
        throw new RetryableIndexException(retryable.toString());
    }
    if (!permanent.isEmpty()) {
        throw new ProductMappingException(permanent.toString());
    }
    ack.acknowledge();
}
```

现实实现还要注意两个细节：

- 一个 poll 可能含多个分区。发生局部失败时，不能把整批成功记录和失败记录混为一谈；应采用能定位失败 record 的批量错误处理方式，或按分区组织 bulk/提交策略。
- 429、连接中断、节点切换等可重试；字段越界、严格 mapping 拒绝、反序列化错误应有限重试后进入 DLT。DLT 不是终点，必须有告警、修复、回放和审计闭环。

不要承诺"exactly once 写 ES"。这里实现的是：**Kafka 至少一次 + ES 版本约束/幂等处理 + 成功后提交 offset**，最终得到按商品版本收敛的读模型。

## 9. 画像与重排：实时，但必须有界且可解释

### 9.1 不信任客户端事件

行为 API 不应让客户端任意提交 `userId`、`PURCHASE` 或任意未来时间戳。服务端从认证上下文取用户身份，校验 event type、商品存在性、曝光 token、时间窗口和限流；购买事件优先由交易域内部事件产生。

```java
@PostMapping("/api/behaviors")
public ResponseEntity<Void> track(@AuthenticationPrincipal UserPrincipal principal,
                                  @Valid @RequestBody BehaviorRequest request) {
    UserBehaviorEvent event = behaviorFactory.from(principal.userId(), request);
    behaviorProducer.send(event); // 有界异步；非关键行为允许按策略丢弃
    return ResponseEntity.accepted().build();
}
```

### 9.2 Redis key 的容量边界

```
user:{uid}:category_affinity  HASH，TTL 30 天，最多保留 Top 50 类目
user:{uid}:brand_affinity     HASH，TTL 30 天，最多保留 Top 50 品牌
user:{uid}:recent_products    ZSET，TTL 7 天，最多保留 200 商品
behavior:dedup:{eventId}      STRING，只对关键事件，TTL 24 小时
```

消费者应使用 pipeline/Lua 保证"累加、过期、截断"尽量在一个原子工作单元内完成，并定期执行时间衰减；不能只增不减：

```
newAffinity = oldAffinity * decayFactor + eventWeight
```

对于高吞吐曝光事件，逐事件创建 24 小时 dedup key 会造成巨大内存放大。可只对购买、加购、收藏做精确幂等，对曝光/点击使用客户端曝光 token、短窗口去重或流式聚合；选择应由事件量和归因精度要求决定。

### 9.3 重排的硬约束与评分

先读取 100～200 个候选，再批量取用户特征。特征读取失败时必须退化为基础排序，不能让 Redis 事故演变为搜索事故。

```
finalScore =
    0.75 * normalizedBaseScore
  + 0.10 * normalizedCategoryAffinity
  + 0.06 * normalizedBrandAffinity
  + 0.05 * normalizedPopularity
  + 0.04 * normalizedFreshness
  - seenPenalty
```

所有输入都必须归一化到确定区间；BM25 `_score` 不能跨 query 做绝对比较，因此只在同一 query 的候选集内归一化，例如 `(score - min) / max(max - min, epsilon)`。权重需要配置化、实验分桶、按 query 类型分析，并记录"重排前/后 rank、特征值、实验桶"的采样日志。

重排前应保留硬规则：严格型号命中、禁售过滤、价格/类目过滤不得因偏好被推翻；新用户退回 query 相关性 + 类目热度，新商品以质量门槛控制的少量探索位进入结果。

## 10. 索引升级：双目标投影消除 alias 切换窗口

只做"全量回灌 → lag=0 → alias switch"仍会漏掉检查 lag 与切 alias 之间刚写入旧索引的事件。可靠流程如下：

```
1. 创建 products_v2，校验 mapping、analyzer 与模板
2. 记录可恢复的 outbox/Kafka watermark
3. 从 MySQL 一致性快照全量写入 v2，携带每个商品 searchVersion
4. 启动 v2 catch-up projector，从 watermark 回放增量
5. 正常 projector 在迁移窗口双写 v1 和 v2（或由迁移 projector 覆盖该窗口）
6. v2 lag=0 后做数量、字段、Top Query 差异校验
7. 在写入栅栏内再次确认并追平最后 watermark
8. 原子切换 products_read 和 products_write alias 到 v2
9. 继续观察、保留 v1 到回滚窗口结束后再删除
```

双写期间两个目标都使用相同的外部版本。版本能阻止旧事件覆盖新文档，但不能自行解决"事件只写到旧 alias"的窗口，所以双写或切换栅栏不可省略。

迁移验收至少包括：文档数、可售数、类目分布、价格分布、空 title 比例、mapping reject、随机样本字段一致性、Top query 结果 diff、v2 端到端事件 age。回滚期内不能提前删除旧索引或缩短 Kafka 保留期。

## 11. 故障降级与容量保护

ES 故障时绝不执行 `SELECT ... LIKE '%keyword%'` 回源交易 MySQL。建议分三级：

```
Level 1：关闭重排/聚合/模糊扩展，候选数 200 降至 50
Level 2：返回 Redis 中最近成功的热点 query 候选、类目榜和品牌榜
Level 3：返回静态导航和活动页，明确提示搜索暂不可用
```

熔断放在 ES 调用边界；缓存读取、用户特征读取和 ES 召回应各自有 timeout 与指标。限流按匿名 IP/device、登录用户、商家 tenant、内部服务身份分层，并限制关键词长度、筛选数、排序字段和 cursor 生命周期。公网客户端只能提交业务 DTO，不能提交原始 ES DSL。

搜索服务 HPA 只能扩 Java Pod，不能创造 ES 容量。若 ES 搜索线程池队列、reject、heap、磁盘水位或 GC 已恶化，继续扩 Pod 只会更快打满 ES；此时应入口限流、降复杂度、启用热点缓存和保护阈值。

## 12. 上线前的验证清单

### 数据正确性

- 商品及所有搜索投影依赖变更都能产生新 `searchVersion` 事件。
- Kafka key 为 `productId`；同商品事件在同分区有序。
- ES 已成功或被判定为版本过期/重复后，才提交 offset。
- bulk 的 429/网络失败、mapping 拒绝、重复事件、乱序事件均有集成测试。
- Debezium Outbox 的 topic、key、headers、payload、converter 在 Testcontainers 中验证。

### 搜索与缓存

- 前台 page size 和内部 candidate size 分离。
- 缓存保存候选 rank 与 base score，不只保存 ID。
- 所有影响召回的字段进入 cache key，索引/词典版本可主动失效。
- 热 key 锁带 token 所有权校验；没有锁时优先返回 stale，而非空结果。
- PIT cursor 含最新 pitId、完整 sort values、query fingerprint 和过期时间。

### 画像与安全

- 行为身份来自服务端认证上下文，关键行为来自可信业务域。
- 用户 feature、ZSET、dedup key 均有 TTL、Top-K 和内存预算。
- Redis feature 失败可退化为基础排序。
- 记录用户偏好时具备同意、删除、保留期限和访问控制方案。

### 可观测与压测

- 监控 Search P50/P95/P99、L1/L2 hit、ES latency/reject、Redis latency、Kafka lag、CDC source lag、index event age、DLT rate、Zero Result Rate、CTR/CVR。
- Trace span 拆分为 cache、ES recall、mget、feature read、rerank 和 fallback。
- 压测混合热门/长尾/无结果/高筛选/恶意参数，同时注入改价、上下架、Kafka backlog、ES 节点故障和 Redis 切换。
- 给指标加标签基数预算；不能把完整 query、userId、productId 写成 Prometheus label。

## 13. 落地顺序

不要第一天就做向量检索或复杂模型。更可靠的迭代顺序是：

```
阶段 1：MySQL + Outbox + Debezium + Kafka + ES，完成可重建读模型
阶段 2：正确的批量投影、版本幂等、DLT、端到端新鲜度指标
阶段 3：基础召回、候选缓存、热点保护、ES 降级
阶段 4：用户行为、容量受控画像、候选级重排和 A/B
阶段 5：同义词、纠错、query rewrite、离线相关性评估
阶段 6：在 lexical 稳定后引入向量召回、混合检索和学习排序
```

电商中的型号、SKU、品牌、尺寸、数字规格高度依赖 lexical matching。向量检索适合作为"露营用大容量电源"等意图型 query 的补充召回，而不是替代精确词项检索。

## 14. 总结

可靠的"搜索即推荐"不等于把推荐算法塞进 Elasticsearch，也不等于多加 Redis 和 Kafka。它要求以下边界同时成立：

1. MySQL 是唯一事实源，ES 是可重建读模型；
2. Outbox 让业务提交与"待传播事件"同事务存在；
3. Kafka 至少一次投递由版本和幂等策略收敛，而不是假设不会重复；
4. 缓存共享基础候选及其分数，用户特征只参与后置重排；
5. 分页、索引迁移、画像内存和故障降级都有明确的生命周期与边界；
6. 延迟、新鲜度、相关性、可用性和成本一起接受观测与压测。

当这些约束被实现并验证后，搜索才能从"一个 ES 查询接口"演进为稳定的实时意图决策入口。

## 参考资料

- Elasticsearch Java API Client: https://www.elastic.co/docs/reference/elasticsearch/clients/java
- Elasticsearch PIT 与 `search_after`: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results
- Elasticsearch 外部版本: https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-exists
- Elasticsearch Smart Chinese 插件: https://www.elastic.co/docs/reference/elasticsearch/plugins/analysis-smartcn
- Debezium Outbox Event Router: https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html
- Spring for Apache Kafka: https://docs.spring.io/spring-kafka/reference/
