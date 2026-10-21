# 从 10s 到 10ms：Elasticsearch 生产级搜索性能调优实战（附踩坑指南）

> 来源：https://mp.weixin.qq.com/s/3PwUQZX2BwoI3jQoIjn9zA
> 抓取时间：2026-10-21（web-fetch，browser 级）

> 这不是一篇"把几个 ES 参数调一调"的文章，而是一份围绕真实生产链路展开的搜索性能优化实战指南。这里的"10ms"特指在热数据、合理路由、轻量返回字段、命中过滤缓存和小结果集条件下，单次核心查询阶段可以进入的延迟量级；它不是所有搜索请求在任何场景下都能稳定达到的统一结果。

很多团队第一次把 Elasticsearch 用在生产时，都会经历同一条路：

*   数据量小时，`match + from/size` 一切正常；
*   业务一上量，查询开始抖动，P95、P99 飙升；
*   继续堆机器后，问题没有消失，只是换了位置；
*   最后发现真正的瓶颈并不只在 ES，而在索引设计、查询模型、写入链路、线程池、缓存、分片规划和运维策略的组合上。

本文围绕一个订单搜索系统，系统性回答几个核心问题：ES 为什么有时很快、有时慢到秒级；生产级搜索系统应该怎样建模、拆分和治理；深分页、聚合、模糊搜索、批量写入、热点分片分别该怎么处理；Java 服务怎样写成真正可落地的生产级实现；在高并发和持续增长场景下，ES 架构应该怎样演进。

## 一、业务背景：为什么一套"能跑"的搜索方案会在线上失效

某电商平台的客服工作台需要提供订单检索能力，支持按订单号、用户 ID、手机号、订单状态、下单时间、商品名称、备注等条件组合查询，并支持导出、统计和运营筛选。系统规模如下：

*   日新增订单：3000 万+
*   累计索引文档：20 亿+
*   搜索峰值 QPS：5000+
*   写入峰值：8 万文档/秒
*   查询 SLA：普通搜索 P95 小于 150ms，P99 小于 300ms

原始方案很典型：

1.  业务库写 MySQL。
2.  通过 Canal/Kafka 同步到 Elasticsearch。
3.  搜索服务直接拼装 DSL 查询 ES。
4.  前端使用 `from + size` 翻页。
5.  所有字段默认动态映射。
6.  统计需求直接在在线查询索引上做聚合。

上线初期"可用"，但随着数据和并发增长，很快出现以下问题：

*   深分页导致协调节点内存暴涨，单次查询耗时超过 10 秒；
*   `wildcard`、`regexp`、脚本查询被滥用，CPU 长时间打满；
*   `text` 字段直接聚合，fielddata 占用堆内存，Full GC 频繁；
*   分片数设置拍脑袋，节点数增加后反而更慢；
*   大 `_source` 返回导致 fetch 阶段和网络传输变慢；
*   热点用户、大客户订单集中写入，单分片过热；
*   统计、导出、检索共用一个索引，彼此相互干扰。

这类问题本质上不是"ES 不行"，而是搜索系统没有按搜索引擎的工作方式来设计。

## 二、先讲原理：ES 为什么快，又为什么会突然变慢

### 2.1 查询请求真正走过了哪些阶段

一次搜索请求大致分为两个阶段：

1.  `query phase`：协调节点把请求分发到目标分片，每个分片本地执行查询、打分、排序，并返回候选文档 ID、分数、排序值和聚合中间结果。
2.  `fetch phase`：协调节点合并结果后，向相关分片拉取最终命中的 `_source` 或 `docvalue_fields`，拼装响应返回。

真正的延迟往往出现在下面这些位置：

*   分片太多：协调节点 fan-out/fan-in 成本高；
*   查询条件不能走倒排：必须扫描大量文档；
*   排序字段不友好：每个分片都要维护更大的优先队列；
*   `from + size` 太深：每个分片都要返回更多候选文档；
*   `_source` 太大：fetch 和网络传输变慢；
*   聚合桶太多：内存占用和计算成本急剧升高。

### 2.2 倒排索引解决了什么问题

Elasticsearch 建立在 Lucene 之上。Lucene 的核心不是"把 JSON 存起来"，而是为可检索字段构建倒排索引。

以 `remark = "用户要求今天发货"` 为例，分词后会形成类似结构：

```
term -> posting list
用户 -> [doc_1, doc_3, doc_8]
要求 -> [doc_1, doc_5]
今天 -> [doc_1, doc_2, doc_9]
发货 -> [doc_1, doc_4]
```

所以：

*   `term` / `match` 类查询通常很快，因为可以直接命中 posting list；
*   `filter` 更快，因为它不参与评分，命中结果可被缓存为 bitset；
*   `wildcard`、`regexp`、脚本查询往往更慢，因为它们天然更难利用倒排结构；
*   排序、聚合更多依赖 `doc_values`，不是靠倒排索引完成的。

### 2.3 ES 慢，不只慢在"查"，还慢在"合并"

很多人只关注单分片查询，却忽略协调节点的合并成本。假设一个请求命中了 12 个分片，前端要求 `from=10000,size=20`，那每个分片都可能要准备至少 10020 条候选记录，协调节点再进行全局归并。此时即使单分片查询不算慢，整体延迟和内存也会明显上升。

所以 ES 查询优化里最重要的一条经验是：

> 先减少命中的分片数，再减少每个分片需要处理的文档数，最后才是优化单文档的计算成本。

### 2.4 Cache 不是万能药，但懂它的人会快很多

| 缓存 | 作用 | 典型适用场景 | 常见误区 |
| --- | --- | --- | --- |
| Query Cache | 缓存过滤结果 bitset | 高频、稳定 filter 条件 | 把 `must` 当 `filter` 用，导致无法高效复用 |
| Request Cache | 缓存整个请求结果 | 基本不变的聚合/统计接口 | 对频繁 refresh 的在线写入索引效果有限 |
| OS Page Cache | 依赖操作系统缓存 segment 文件 | 热数据查询 | JVM 堆给太大，反而压缩了文件缓存 |

这也解释了为什么 ES 推荐：

*   JVM 堆不要超过物理内存 50%，且通常不要超过 32GB；
*   高频过滤条件尽量放在 `filter` 中；
*   对热点查询做应用层缓存，不要把所有希望都押在 ES request cache 上。

## 三、调优不是先改参数，而是先重画架构边界

如果在线搜索、导出、统计、离线分析、公海筛选都共用一套索引，那么问题迟早出现。生产级方案首先要做边界划分。

### 3.1 推荐的整体架构

```
订单服务/用户服务/商品服务 → MySQL → Outbox/Binlog → Kafka → 索引构建服务
                                                              │
                                                              ▼
客服工作台 ← 搜索 API 服务 ← Elasticsearch 热索引
                │
                ├─ 聚合统计服务
                ├─ 导出任务服务 → 对象存储
                ├─ Redis 热点缓存
                └─ Prometheus + Grafana / Tracing / 日志平台
```

关键设计点：

*   写入链路异步化：业务提交与索引构建解耦；
*   搜索、聚合、导出职责分离：避免一个慢查询拖垮整个集群；
*   热点查询加应用层缓存：把最常见的高频检索挡在 ES 前面；
*   指标和链路追踪内建：否则你无法知道慢在哪里。

### 3.2 按场景拆索引，而不是让一个索引做所有事

对订单场景，推荐至少拆成三类：

*   `order-search-*`：面向在线检索，字段精简、排序明确、返回轻量。
*   `order-analytics-*`：面向大聚合、报表和离线统计，可以允许更多预计算字段。
*   `order-archive-*`：面向低频历史查询和归档导出，放入 warm/cold 层。

代价是写入链路稍复杂，但收益明显：在线索引不用背报表型聚合压力；分片规划可以按使用方式分别优化；冷热数据生命周期可以分开管理。

## 四、索引设计：生产环境真正决定生死的地方

调优 ES 时，索引建模的优先级远高于 JVM 参数。映射一旦上线并承载海量数据，回改成本极高。

### 4.1 字段建模的基本原则

*   精确过滤、排序、聚合字段优先用 `keyword`、数值、`date`；
*   需要全文检索的字段才用 `text`；
*   不要让动态映射默默把所有字符串都变成 `text + keyword`；
*   能不做 `nested` 就不要做，只有当"数组对象内字段必须保持关联语义"时才使用；
*   对金额、比例类字段优先考虑 `scaled_float`；
*   对低频大字段不要默认返回 `_source`。

### 4.2 一份更接近生产的索引模板

```json
PUT _index_template/order-search-template
{
  "index_patterns": ["order-search-*"],
  "template": {
    "settings": {
      "number_of_shards": 6,
      "number_of_replicas": 1,
      "refresh_interval": "5s",
      "codec": "best_compression",
      "sort.field": ["createTime", "orderId"],
      "sort.order": ["desc", "desc"],
      "routing_partition_size": 1
    },
    "mappings": {
      "dynamic": "strict",
      "properties": {
        "orderId": { "type": "keyword" },
        "tenantId": { "type": "keyword" },
        "userId": { "type": "keyword" },
        "phone": { "type": "keyword", "index": false, "doc_values": false },
        "phoneSuffix": { "type": "keyword" },
        "status": { "type": "keyword" },
        "channel": { "type": "keyword" },
        "amount": { "type": "scaled_float", "scaling_factor": 100 },
        "createTime": { "type": "date" },
        "deleted": { "type": "boolean" },
        "remark": {
          "type": "text",
          "analyzer": "ik_max_word",
          "search_analyzer": "ik_smart",
          "fields": {
            "raw": { "type": "keyword", "ignore_above": 256 }
          }
        },
        "items": {
          "type": "nested",
          "properties": {
            "productId": { "type": "keyword" },
            "productName": {
              "type": "text",
              "analyzer": "ik_max_word",
              "search_analyzer": "ik_smart"
            },
            "quantity": { "type": "integer" }
          }
        }
      }
    }
  }
}
```

关键说明：

*   `dynamic: strict`：防止脏字段、错字段、超长字段把 mapping 污染成不可控状态。
*   `sort.field`：对高频按时间倒序的列表查询非常有帮助，尤其是配合 `search_after`。
*   `phone`：如果手机号不做搜索，仅展示，就不要索引；如果需要按后四位搜索，可以额外建 `phoneSuffix`。
*   `nested`：只有在订单明细中的 `productId` 和 `productName` 必须同一元素内匹配时才值得使用，否则会放大查询成本。

### 4.3 分片到底该怎么定

分片数最常见的错误有两个：过少（单分片太大，恢复慢，热点更明显）；过多（协调成本高，segment 更多，系统管理成本和查询开销都增加）。

生产里比"每个分片 10-50GB"更有用的判断方式是：

1.  先估算单日写入量；
2.  决定按天、按周还是 rollover 切索引；
3.  估算热期内单索引大小；
4.  结合节点数和并发，把单索引拆到可接受的主分片数。

以本文订单场景举例：单日索引数据约 80GB；热数据保留 7 天；每个热索引控制在 30-40GB/主分片；那么单日索引设置 3 个主分片就可能偏紧，6 个主分片更稳妥；但如果在线查询大多按 `tenantId` 或 `userId` 路由，则还要结合热点分布重新评估。

> 分片数不是一个"固定最佳值"，而是写入量、热点分布、路由方式、节点数和恢复时间共同决定的结果。

## 五、查询模型重构：把"能搜"改成"搜得稳、搜得快"

### 5.1 查询 DSL 的优化优先级

生产上可以按下面顺序审查每一个查询：

1.  是否能减少命中分片数；
2.  是否能把 `must` 改成 `filter`；
3.  是否能缩小时间范围；
4.  是否能限制返回字段；
5.  是否必须排序；
6.  是否必须高亮；
7.  是否用了深分页；
8.  是否混入了大聚合。

### 5.2 一个典型的生产级订单查询 DSL

```json
GET order-search-*/_search?routing=tenant_01
{
  "size": 20,
  "track_total_hits": false,
  "_source": ["orderId", "status", "amount", "createTime"],
  "query": {
    "bool": {
      "filter": [
        { "term": { "tenantId": "tenant_01" } },
        { "term": { "userId": "10001" } },
        { "terms": { "status": ["PAID", "SHIPPED"] } },
        { "range": { "createTime": { "gte": "now-30d/d", "lte": "now" } } }
      ],
      "must_not": [
        { "term": { "deleted": true } }
      ]
    }
  },
  "sort": [
    { "createTime": "desc" },
    { "orderId": "desc" }
  ]
}
```

每个细节都有工程含义：`routing=tenant_01` 直接减少 fan-out 分片数；`track_total_hits: false` 列表页通常不需要每次都精确统计全量命中数；`_source` 限制字段降低 fetch 阶段和网络开销；全部使用 `filter` 不参与评分，更容易命中缓存。

### 5.3 深分页不要靠蛮力

`from + size` 的本质问题不是默认只能查 10000，而是越往后翻越贵。

正确策略：

*   用户列表翻页：用 `search_after`；
*   大批量导出：用 `scroll` 或 `point in time + search_after`；
*   运营报表遍历：用 `composite aggregation` 分页。

`search_after` 的 Java 实现（ES 8 推荐的 Java API Client）：

```java
package com.example.orders.search.infrastructure.elasticsearch;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.json.JsonData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class OrderSearchRepository {

    private final ElasticsearchClient elasticsearchClient;

    public SearchResponse<OrderSearchDocument> search(
            String indexPattern,
            String routing,
            String tenantId,
            String userId,
            List<String> statuses,
            Instant startTime,
            Instant endTime,
            int pageSize,
            List<JsonData> searchAfterValues
    ) throws IOException {
        Query query = Query.of(q -> q.bool(b -> b
                .filter(f -> f.term(t -> t.field("tenantId").value(tenantId)))
                .filter(f -> f.term(t -> t.field("userId").value(userId)))
                .filter(f -> f.terms(t -> t.field("status")
                        .terms(v -> v.value(statuses.stream().map(JsonData::of).toList()))))
                .filter(f -> f.range(r -> r.date(d -> d.field("createTime")
                        .gte(startTime.toString())
                        .lte(endTime.toString()))))
                .mustNot(m -> m.term(t -> t.field("deleted").value(true)))
        ));

        SearchRequest.Builder builder = new SearchRequest.Builder()
                .index(indexPattern)
                .routing(routing)
                .size(pageSize)
                .trackTotalHits(t -> t.enabled(false))
                .query(query)
                .source(s -> s.filter(f -> f.includes("orderId", "status", "amount", "createTime")))
                .sort(s -> s.field(f -> f.field("createTime").order(SortOrder.Desc)))
                .sort(s -> s.field(f -> f.field("orderId").order(SortOrder.Desc)));

        if (searchAfterValues != null && !searchAfterValues.isEmpty()) {
            builder.searchAfter(searchAfterValues);
        }

        return elasticsearchClient.search(builder.build(), OrderSearchDocument.class);
    }
}
```

相比很多示例代码，补上了三个生产上很重要的点：使用 routing 避免无意义广播；限制返回字段，不把整个 `_source` 拿回来；使用 `search_after` 而不是继续放大 `from`。

### 5.4 模糊搜索不要直接上 wildcard

用户输入"京东物流""尾号 3456""发货慢"时，系统通常希望支持模糊搜索。但下面这种做法在生产里风险极高：

```json
{
  "wildcard": {
    "remark": "*发货*"
  }
}
```

更合理的替代方案：

*   中文文本检索：`text + analyzer`，优先 `match` / `match_phrase`；
*   前缀搜索：`match_phrase_prefix` 或边界清晰的前缀字段；
*   编号类模糊：额外设计倒排友好的归一化字段；
*   手机号后四位：单独存 `phoneSuffix`；
*   拼音、简称检索：离线生成辅助字段，不要在线脚本计算。

## 六、写入链路优化：很多"查询慢"其实是写入节奏把集群拖垮了

如果写入链路持续制造大量 refresh、merge 和热点分片，再优秀的查询 DSL 也救不了延迟。

### 6.1 推荐的异步索引流程

```
订单服务 → MySQL（提交订单事务）
    → Kafka（发送订单变更事件）
    → 索引构建服务（批量消费、数据清洗/幂等去重/字段归一化）
    → Bulk 写入 Elasticsearch（成功/部分失败）
    → 不可恢复失败 → 死信队列
```

这个流程的关键，不在"用了 Kafka"，而在以下工程细节：

*   事件至少要携带业务主键、版本号、变更类型；
*   构建服务要有幂等能力，防止重复消费覆盖新版本数据；
*   `bulk` 失败要分类型处理，不能一把梭重试；
*   失败重试要有退避和上限，避免雪崩。

### 6.2 生产级 Bulk 写入示例

```java
package com.example.orders.search.infrastructure.elasticsearch;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.BulkRequest;
import co.elastic.clients.elasticsearch.core.BulkResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderIndexWriter {

    private final ElasticsearchClient elasticsearchClient;

    @Value("${search.index.name-prefix:order-search}")
    private String indexNamePrefix;

    public void bulkUpsert(List<OrderSearchDocument> documents) throws IOException {
        if (documents == null || documents.isEmpty()) {
            return;
        }

        BulkRequest.Builder bulkBuilder = new BulkRequest.Builder();
        for (OrderSearchDocument document : documents) {
            String indexName = indexNamePrefix + "-" + document.indexDate();
            bulkBuilder.operations(op -> op.index(idx -> idx
                    .index(indexName)
                    .id(document.getOrderId())
                    .routing(document.getTenantId())
                    .document(document)
            ));
        }

        BulkResponse response = elasticsearchClient.bulk(bulkBuilder.build());
        if (response.errors()) {
            response.items().forEach(item -> {
                if (item.error() != null) {
                    log.error("bulk write failed, index={}, id={}, type={}, reason={}",
                            item.index(), item.id(), item.error().type(), item.error().reason());
                }
            });
            throw new IllegalStateException("bulk write contains failures");
        }
    }
}
```

生产实践建议：

*   单批次 5MB 到 15MB 通常更稳，不要只按文档条数估算；
*   批量线程数不要盲目调大，否则容易把写线程池和 merge 压爆；
*   热写入阶段可适当放大 `refresh_interval`，但要和业务可见性要求匹配；
*   大促前不要临时大改分片、mapping 和副本策略。

## 七、高并发场景下，真正需要补齐的是治理能力

当搜索 QPS 上来后，系统问题往往表现为"偶发慢""部分用户超时""导出一跑全站抖"。这时候不能只看 ES，要看整条调用链。

### 7.1 搜索服务的资源隔离

建议至少做三层隔离：

*   在线检索线程池和导出线程池隔离；
*   普通搜索、聚合统计、批量导出接口隔离；
*   热点租户或大客户必要时做路由级隔离。

一个很常见的事故是：

> 导出任务直接复用在线搜索接口，只是把 `size` 改大，最后把整个查询线程池拖死。

### 7.2 限流、超时、熔断和降级

```java
package com.example.orders.search.application;

import com.example.orders.search.domain.SearchPage;
import com.example.orders.search.domain.SearchRequestParam;
import com.example.orders.search.infrastructure.cache.SearchCacheService;
import com.example.orders.search.infrastructure.elasticsearch.OrderSearchGateway;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@Validated
@RequiredArgsConstructor
public class OrderSearchApplicationService {

    private final OrderSearchGateway orderSearchGateway;
    private final SearchCacheService searchCacheService;

    @TimeLimiter(name = "orderSearch")
    @CircuitBreaker(name = "orderSearch", fallbackMethod = "fallbackSearch")
    public CompletableFuture<SearchPage> search(@Valid SearchRequestParam param) {
        String cacheKey = searchCacheService.buildCacheKey(param);
        SearchPage cached = searchCacheService.get(cacheKey);
        if (cached != null) {
            return CompletableFuture.completedFuture(cached);
        }
        return CompletableFuture.supplyAsync(() -> {
            SearchPage result = orderSearchGateway.search(param);
            searchCacheService.put(cacheKey, result);
            return result;
        });
    }

    public CompletableFuture<SearchPage> fallbackSearch(SearchRequestParam param, Throwable throwable) {
        log.warn("search degraded, tenantId={}, keyword={}, error={}",
                param.getTenantId(), param.getKeyword(), throwable.toString());
        SearchPage cached = searchCacheService.getStale(param);
        return CompletableFuture.completedFuture(cached != null ? cached : SearchPage.empty());
    }
}
```

落地时要注意：

*   缓存只适合热点且短期稳定的查询条件；
*   降级不能返回错误数据给强一致场景；
*   超时时间要比网关超时更短，避免请求堆积；
*   不要把 `CompletableFuture.supplyAsync()` 默认扔给公共线程池，生产里应指定专用线程池。

### 7.3 热点问题：比高并发更难缠

如果你的路由策略是 `routing = tenantId`，而某个超级租户占了 30% 的流量，那热点会非常明显。

常见处理方式：对超大租户拆独立索引；路由从单键改为复合路由，如 `tenantId + hash(userId)`；在应用层对热点查询加缓存；对导出和批处理流量做错峰。

工程里最怕的是"理论均匀，实际上极度倾斜"。所以分片规划一定要结合真实访问分布，而不是只看文档总量。

## 八、聚合、统计和高亮：最容易把在线集群拖慢的三类能力

### 8.1 聚合为什么容易成为事故源

聚合的危险点在于：大基数字段会产生大量桶；嵌套聚合会放大内存和 CPU 消耗；在线索引 refresh 频繁，request cache 命中率有限；业务常常希望"临时多加一个维度"，但代价并不小。

建议做法：高频统计做预聚合；大结果集枚举用 `composite`；UV 类场景用 `cardinality` 接受近似值；不要在客服在线查询索引上做复杂 BI 式聚合。

### 8.2 高亮不是默认开启的"装饰功能"

高亮会增加文本处理成本、fetch 阶段开销、网络响应体大小。如果文章内容、评论内容、日志内容很大，高亮开销会非常可观。生产建议：只有用户真正展开详情时才查询高亮；限制 fragment 数量和长度；对超长字段考虑前端局部高亮方案。

### 8.3 一个更合理的统计方案边界

在线查询索引负责：列表检索、小范围筛选、少量固定维度统计。离线/分析索引负责：多维透视、长时间跨度聚合、导出和报表。这不是"架构更漂亮"，而是避免把两种完全不同的访问模式硬塞到一套索引里。

## 九、可观测性：没有指标，你连"10s 为什么变成 10ms"都证明不了

### 9.1 至少要看这几类指标

集群层：`cluster_health_status`、`unassigned_shards`、`pending_tasks`。

节点层：CPU、load、磁盘使用率、磁盘吞吐；JVM heap 使用率、GC 次数和停顿时间；segment 数量、merge 时间；search thread pool 拒绝数；write thread pool 拒绝数。

索引层：搜索 QPS、P95、P99；查询耗时和 fetch 耗时拆分；refresh 时间、flush 时间、merge 时间；cache 命中率；热索引大小和主分片大小。

应用层：接口成功率、超时率、降级率；不同查询类型分布；命中的分片数；高亮、聚合、导出请求比例。

### 9.2 慢查询日志一定要开

```yaml
index.search.slowlog.threshold.query.warn: 1s
index.search.slowlog.threshold.query.info: 500ms
index.search.slowlog.threshold.fetch.warn: 500ms
index.search.slowlog.threshold.fetch.info: 200ms
index.search.slowlog.level: info
```

经验上，一个线上 ES 集群性能变差，根因经常是：某个新接口放出了重型 DSL；某个运营功能带了深分页；某个导出任务和在线查询抢资源；某个字段被误映射成了不合适的类型。这些问题，不开慢日志很难第一时间看清。

## 十、压测与验证：没有对照实验，调优结论不成立

### 10.1 压测前先控制变量

至少要固定：索引数据规模、查询样本集合、节点规格、副本数、refresh 策略、是否命中缓存、请求并发度。

### 10.2 推荐的验证顺序

1.  单 DSL 压测：验证单类请求的 query/fetch 耗时。
2.  混合流量压测：模拟线上 80% 列表查询、15% 统计、5% 导出。
3.  写查混合压测：同时模拟 Kafka 写入和在线检索。
4.  故障压测：人为下线单节点、制造慢磁盘、模拟热点租户。

### 10.3 判断是否真的优化成功

不要只看平均值，重点看：P95、P99 是否下降；thread pool reject 是否下降；merge 和 GC 是否更平稳；高峰期延迟抖动是否减小；节点扩容后性能是否线性改善。

> 真正的生产优化目标不是"某次截图里 10ms"，而是在高峰、写入、抖动、节点滚动升级等现实条件下，系统仍然稳定可控。

## 十一、常见踩坑清单

1.  **认为"加机器"一定能解决问题**——如果查询模型和分片设计有问题，加节点只会把问题从单点瓶颈变成系统性浪费。
2.  **把所有字符串都映射成 `text + keyword`**——看起来省事，代价是存储膨胀、内存浪费、字段语义混乱。
3.  **用 `wildcard` 兜底所有模糊搜索**——短期交付快，长期成本极高，迟早反噬。
4.  **在线列表每次都精确统计总命中数**——很多页面根本不需要实时精确总数，`track_total_hits=false` 常常就能省掉不少成本。
5.  **在搜索服务里直接暴露"任意 DSL"**——这会把索引边界、性能治理和访问控制全部打穿。生产系统必须封装查询能力，而不是把搜索引擎变成对外裸露的执行器。
6.  **导出、报表、在线查询共用一套接口**——这是最常见的"系统平时还行，一到月底全站抖"的根因之一。

## 十二、方案演进：什么时候该从单集群走向多集群

单集群不是不能做大，但当你出现以下信号时，就该考虑进一步拆分：在线查询和分析负载长期互相干扰；单集群节点数持续扩大但性能收益递减；跨地域访问明显增加；历史归档数据规模已经远超热数据；大租户需要独立 SLA。

常见演进路径：

1.  单集群单索引
2.  单集群按场景拆索引
3.  单集群冷热分层 + ILM
4.  多集群按业务域拆分
5.  多集群 + 跨集群搜索

ILM 示例：

```json
PUT _ilm/policy/order-search-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_primary_shard_size": "40gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {}
      },
      "delete": {
        "min_age": "180d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

注意：`forcemerge` 不要对活跃热索引执行；warm/cold 分层前先确认查询 SLA 是否允许；多集群不是免费午餐，会增加运维和一致性治理成本。

## 十三、一套更可执行的调优方法论

如果你正在接手一个已经"慢了"的 ES 系统，可以按下面顺序推进，而不是一上来就改堆内存。

**第一步：先定位慢在哪里**——是 query 慢还是 fetch 慢；是个别 DSL 慢还是整体都慢；是热点问题还是分片过多；是查询本身慢还是写入/merge 干扰；是 ES 慢还是应用层连接池、线程池、序列化慢。

**第二步：先砍掉最不合理的请求**——深分页改 `search_after`；重型聚合迁出在线链路；模糊搜索改字段设计；大字段不默认返回；不必要的总数统计关闭。

**第三步：再重做索引模型**——明确每个字段的搜索语义；收敛动态映射；重新评估分片和 routing；将在线、统计、归档索引拆开。

**第四步：补齐工程治理**——线程池隔离；限流、超时、熔断；热点缓存；慢日志、指标、Tracing；Bulk 失败重试和死信治理。

**第五步：最后再做参数级优化**——JVM 堆和 GC；refresh 策略；副本和写入节奏；线程池与连接池；ILM 与冷热迁移。

> 先改错误的使用方式，再改正确的系统参数。否则你只是在更贵的机器上延续原来的问题。

## 十四、总结

Elasticsearch 的性能优化从来不是单点技术，而是完整的搜索系统工程。真正把延迟从秒级压到毫秒级，靠的不是某一个"神参数"，而是下面这套组合拳：

*   用倒排索引和查询执行路径理解性能瓶颈；
*   用正确的 mapping、分片和 routing 降低搜索成本；
*   用 `filter`、`search_after`、字段裁剪重构查询模型；
*   用 Kafka + Bulk + 幂等控制稳定写入链路；
*   用线程池隔离、限流熔断、缓存和慢日志保障高并发；
*   用 ILM、冷热分层和多集群演进支撑长期增长。

如果要把全文压缩成一句最重要的经验，那就是：

> Elasticsearch 调优的本质，不是让某条 DSL 更快，而是让搜索系统在真实生产流量下长期稳定、可控、可演进。

当你按这个思路去做，10ms 不再是标题里的口号，而会变成某些核心查询在正确条件下自然达到的结果；更重要的是，你的系统不会因为一次导出、一个大聚合、一个热点租户或一次促销流量就突然退回 10 秒时代。
