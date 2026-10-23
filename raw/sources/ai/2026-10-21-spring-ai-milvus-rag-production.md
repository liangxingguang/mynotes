---
title: Spring AI + Milvus 企业级 RAG 生产工程实践：可验证的知识、权限、容量与恢复
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/HgQxSmTRD--3QLTWR7c4wQ"
source_type: link
platform: 微信
captured: 2026-10-21
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-21-spring-ai-milvus-rag-production.md
asset_ref: Assets/2026/10/spring-ai-milvus-rag-production.md
---

# Spring AI + Milvus 企业级 RAG 生产工程实践：可验证的知识、权限、容量与恢复

# Spring AI + Milvus 企业级 RAG 生产工程实践：可验证的知识、权限、容量与恢复

> 来源：https://mp.weixin.qq.com/s/HgQxSmTRD--3QLTWR7c4wQ
> 抓取时间：2026-10-21（web-fetch，browser 级）

> 面向 Java 后端、分布式系统与云原生工程师。本文以多租户电商客服知识库为例，给出一套可评审、可压测、可回滚的 RAG 工程方法。文中容量、延迟与阈值均为**设计示例**，不是线上实测结论；代码展示关键契约，必须在锁定依赖后编译、集成与压测。

## 0. 先声明边界：本文保证什么，不保证什么

Spring AI 解决模型、Embedding 与向量库的集成问题；Milvus 解决向量数据管理和近似检索问题。二者都不替应用保证：

1. 某个用户有权看到某条知识；
2. 一次发布在所有读路径上何时生效；
3. 检索结果足以支撑答案；
4. 超载、撤权、断流与节点故障时系统如何收敛。

因此，企业 RAG 的正确目标不是"把文档塞进向量库并得到回答"，而是： **在给定权限、知识版本、模型配额和 SLO 下，稳定地产生可追溯的回答；无法满足前提时，安全且可解释地拒绝。**

本文不把架构图、伪代码或容量估算包装成已上线成绩。任何吞吐结论都必须附带数据规模、过滤选择率、索引参数、模型配额、缓存命中率与测试方法。

## 1. 生产问题的四条主线

一个起步版系统往往只有一个 Spring Boot 进程：接收提问，生成查询向量，查询 Milvus，将片段放入提示词，再流式返回回答。导入任务也在同一进程中进行。它能演示功能，却无法回答以下问题：

| 主线 | 必须回答的问题 | 典型反例 |
| --- | --- | --- |
| 容量 | 最大接入、在途和排队量是多少？超限如何拒绝？ | 入口 1 万 QPS 被宣传成 1 万次实时生成 |
| 证据 | 回答来自哪些片段、哪个版本？证据不足怎么办？ | 检索为空仍调用模型"尽力回答" |
| 权限 | 过滤是否早于所有外发处理？缓存会不会越权？ | 最后展示时才删除无权引用 |
| 恢复 | 导入中断、发布失败、删除撤权如何回到一致状态？ | 写入 ACK 就被当成全局可见 |

后文所有组件都服务于这四条主线。拆成更多服务不是目标；把它们变成可验证的系统性质才是目标。

## 2. 固定版本基线，拒绝"示例 API 拼盘"

### 2.1 基线是交付物，而不是一句"使用最新版"

以下是**示例验证基线**，用于让读者理解版本记录应包含什么；升级前仍须做依赖收敛、编译和回归：

| 项目 | 示例记录方式 | 发布时必须补充 |
| --- | --- | --- |
| JDK | `21.x` | 精确发行版与容器镜像摘要 |
| Spring Boot | `3.4.x / 3.5.x`（范围内选定补丁版） | 实际 parent/BOM 版本 |
| Spring AI | `1.0.9` | BOM、starter、Advisor 模块精确版本 |
| Milvus | 由团队锁定的 Server/SDK/Chart 组合 | Server、Chart、operator、对象存储/WAL 配置 |
| Embedding | 模型名、维度、归一化和预处理 | 模型供应商版本、tokenizer、批处理限制 |
| Chat/Rerank | 模型及提示词版本 | 配额、区域、数据处理边界 |

Spring AI 1.0.9 官方文档声明支持 Spring Boot 3.4.x 与 3.5.x；官网也同时提供更新的稳定系列。不要将 1.x 示例、当前文档和 SNAPSHOT 依赖拼在同一个工程中。

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.ai</groupId>
      <artifactId>spring-ai-bom</artifactId>
      <!-- 使用团队经过验证的精确稳定版本；示例不使用 SNAPSHOT -->
      <version>${spring-ai.version}</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
<dependencies>
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-milvus</artifactId>
  </dependency>
  <!-- 使用 RetrievalAugmentationAdvisor 时按锁定版本引入 -->
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-rag</artifactId>
  </dependency>
</dependencies>
```

### 2.2 配置分层：开发便利不能变成生产权限

```yaml
spring:
  ai:
    openai:
      api-key: ${MODEL_API_KEY}
      embedding:
        options:
          model: ${EMBEDDING_MODEL}
      chat:
        options:
          model: ${CHAT_MODEL}
    vectorstore:
      milvus:
        client:
          host: ${MILVUS_HOST}
          port: 19530
          # TLS、token、RPC deadline 依锁定版本配置
        collection-name: ${MILVUS_COLLECTION}
        initialize-schema: false
        embedding-dimension: ${EMBEDDING_DIMENSION}
```

生产环境中，Schema、索引和数据库权限由部署流程管理；应用运行账号默认不具备建库、删库、改 Schema 的能力。`initialize-schema` 只宜在隔离的开发或短生命周期测试环境启用。

Embedding 维度匹配 Collection 只是必要条件。模型、归一化方式或预处理变化后，即使新旧向量都是 768 维，也属于不同语义空间，必须重建新版本，不能在旧集合中混写。

## 3. 统一容量口径：入口流量不是生成能力

### 3.1 五个不同指标

| 指标 | 统计对象 | 不应混淆为 |
| --- | --- | --- |
| 入口 QPS | 到达网关的提问 | 模型生成吞吐 |
| 检索 QPS | 实际发出的检索操作 | 用户请求数；查询改写和混合召回会放大它 |
| 生成启动速率 | 每秒开始的模型调用 | 已完成回答数 |
| 完整回答吞吐 | 每秒成功完成的回答 | SSE 连接建立数 |
| 活跃流数量 | 同时存在的流会话 | 平均 QPS |

例如入口为 10,000 QPS，授权后的精确答案缓存命中率为 80%，余下请求有 25% 因证据不足直接拒答：

```
生成启动速率 = 10,000 × (1 - 0.80) × (1 - 0.25)
             = 1,500 次/秒
若平均输入 1,800 token、输出 200 token：
token 需求 = 1,500 × 2,000 × 60
           = 180,000,000 token/分钟
```

该算式没有计入重试、查询改写、Rerank 或缓存 token。它的意义不是得出通用容量，而是揭露"高网关 QPS"与"高实时生成能力"之间的差距。

### 3.2 用 Little 定律估计在途，而不是拍脑袋配线程

稳定系统可粗略使用：

```
平均在途数 L = 完成速率 λ × 平均停留时间 W
```

每秒启动 120 次生成、平均持续 6 秒，意味着约 720 个生成调用在途。若某依赖最多允许 200 个阻塞调用、平均耗时 5 秒，其理想完成速率约 40 次/秒。这里使用的是平均值，不能把 P99 直接代入，也不能忽略连接池、异步模型、SSE 会话和供应商并发配额。

队列只是吸收短突发，不是容量方案。处理能力 100 次/秒、额外等待预算 200 ms 时，约 20 个排队请求就已经耗尽这部分预算；5,000 个槽位通常只会把拒绝变成更贵、更晚的超时。

## 4. 总体架构：在线路径与离线路径隔离

```
用户 → 网关（认证、速率和请求大小）→ 问答编排（授权、Deadline、准入）
  → 带 ACL/版本的答案缓存 ──miss──→ 受限检索与混合召回 → Milvus
  → 证据、权限与注入策略 ──充分──→ 模型网关（全局配额）→ SSE（取消、背压、引用）
                       └──不足──→ 明确拒答

文档上传 → 原文对象存储 → 任务表 + Outbox → 独立 Worker（解析、分块、Embedding）→ 验证与发布目录
```

问答、检索和精排可以在早期部署为一个应用，但要使用独立的并发舱壁和预算。文档解析与批量向量化应尽早移到独立 Worker，避免离线任务耗尽在线 Embedding、连接和 CPU 预算。

普通同步问答不应默认丢进 Kafka。Embedding、检索和生成通常有依赖关系；异步化只适合导入、重建、批量评测或明确返回 `202 + taskId` 的长任务。异步任务必须先持久化任务与 Outbox，再返回"已接受"；客户端超时不能成为后台继续无限付费执行的理由。

## 5. 安全主链路：权限、版本、向量空间是不可拆开的上下文

### 5.1 服务端构造不可伪造的访问范围

不要从请求 JSON 直接反序列化 `tenantId`、`kbId`、角色或修订版本。它们必须由认证主体、授权服务和发布目录在服务端生成。

```java
import java.util.Set;

public record AccessScope(
        String tenantId,
        String knowledgeBaseId,
        String aclRevision,
        Set<String> permittedDocumentIds) {}

public record RetrievalRelease(
        String knowledgeRevision,
        String embeddingSpaceId,
        String collectionAlias,
        String retrievalConfigVersion) {}
```

`embeddingSpaceId` 表示模型、维度、归一化和预处理的不可变组合。发布目录必须保证该空间与查询 Embedding 模型相配套；因此检索请求不会因"刚好同维"而检索到另一模型写入的向量。

### 5.2 过滤条件只能由适配层生成

```java
import java.util.List;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;

public final class ScopedRetriever {
    private final VectorStore store;

    public ScopedRetriever(VectorStore store) {
        this.store = store;
    }

    public List<Document> retrieve(String question, AccessScope scope,
                                   RetrievalRelease release) {
        var b = new FilterExpressionBuilder();
        var filter = b.and(
                b.eq("tenant_id", scope.tenantId()),
                b.and(
                    b.eq("kb_id", scope.knowledgeBaseId()),
                    b.and(
                        b.eq("kb_revision", release.knowledgeRevision()),
                        b.eq("embedding_space_id", release.embeddingSpaceId()))))
                .build();
        return store.similaritySearch(SearchRequest.builder()
                .query(question)
                .topK(30)
                .filterExpression(filter)
                .build());
    }
}
```

Spring AI 的 Milvus 适配器支持可移植的 metadata filter，也提供可能覆盖普通 filter 的 Milvus 原生表达式入口。因此，`MilvusSearchRequest` 不能被业务调用方直接构造；如果必须使用原生参数，封装层必须把授权与版本约束作为不可移除的条件合并进去。

缺少租户上下文、发布目录无法解析、授权服务不可用、过滤构建失败时，一律拒绝受保护知识访问。召回不足不是删除过滤条件重新检索的理由。

### 5.3 主编排必须在模型调用前完成证据门禁

```
scope    = authorize(principal, requestedKb)
release  = publicationCatalog.resolve(scope)
key      = cacheKey(scope, release, normalizedQuestion, conversationDigest)
cached   = answerCache.get(key)
if cached != null and permissionStillAllows(cached.sources, scope):
    return cached

candidates = retriever.retrieve(question, scope, release)
candidates = permissionService.recheck(candidates, scope)
ranked     = reranker.rank(question, candidates, remainingBudget)
evidence   = evidencePolicy.select(ranked, contextTokenBudget)
if evidence.isInsufficient():
    return REFUSED_NO_EVIDENCE

answer = generator.generate(question, evidence, remainingBudget)
return citationPolicy.validateAndAttach(answer, evidence)
```

`QuestionAnswerAdvisor` 和 `RetrievalAugmentationAdvisor` 能协助完成标准 RAG 流程；后者在默认空上下文情形会指示模型不要回答。这不等价于"不调用模型"。凡是要求无证据零生成费用的业务，必须在应用编排层显式短路。

## 6. Schema 与元数据：让安全语义能跑出性能

每个 Chunk 至少应具有下列数据。高频过滤字段应设计为明确的标量字段或经验证可索引的 metadata 路径；不要只把它们藏进一段不透明 JSON 后再期待高选择率查询稳定。

| 字段 | 类型/约束 | 用途 |
| --- | --- | --- |
| `tenant_id` | 标量，必填 | 租户过滤、审计 |
| `kb_id`、`kb_revision` | 标量，必填 | 知识归属与发布快照 |
| `embedding_space_id` | 标量，必填 | 向量空间隔离 |
| `document_id`、`document_version` | 标量，必填 | 原文与版本追溯 |
| `chunk_id`、`chunk_index` | 唯一 ID + 整数 | 幂等、去重、定位 |
| `source_uri`、`page`、`section` | 元数据 | 可核查引用 |
| `parser_version`、`splitter_version` | 元数据 | 解释内容变化 |
| `content_hash` | 元数据 | 内容去重与校验 |
| `sensitivity`、`revocation_epoch` | 标量/元数据 | 数据处理和快速撤销 |

建立容量基线时必须包含真实过滤选择率：例如某租户占 50%、1%、0.01% 数据时，分别测量召回、P95/P99、`topK`、`nprobe/ef`、索引和内存。无过滤 ANN Benchmark 不能预测多租户生产检索。

Chunk ID 推荐由 `tenant + kb + documentVersion + splitterVersion + chunkIndex` 确定性生成，但这只满足幂等的必要条件。还要用当前锁定的 `VectorStore.add`/原生 SDK 验证同 ID 写入究竟是插入、覆盖还是失败，并将其写进导入重试测试。

## 7. 检索质量：Top-K、融合和阈值都要有职责

### 7.1 分块先尊重文档结构

FAQ 保留问答对；制度条款保留标题层级和生效日期；表格保留列名与行关联；代码按函数或 API 边界切分。扫描 PDF、跨页表格、页眉页脚应单列解析验收规则。

300、600、900 token 与不同重叠比例只是实验候选，绝非通用最佳值。使用与目标模型预算相符的 tokenizer，不能用字符数替代 token 数。

### 7.2 混合检索的职责边界

Dense 检索发现语义相近表达；BM25/关键词负责 SKU、错误码、合同编号和精确术语。典型过程：两路各自按同一 ACL、版本、向量空间条件召回有限候选，按 Chunk ID 去重，用 RRF 等基于名次的方法融合，再交给 Reranker。

不要直接相加 BM25、向量相似度和 Cross-Encoder 分数；它们没有天然可比尺度。若需加权融合，先在带标签数据上校准。

### 7.3 阈值不是可信概率

`0.55` 不是"55% 可信"。它受度量方式、向量归一化、模型和适配器分数转换影响。阈值应由业务正负样本校准，并在模型、索引、预处理变化后重新验证。

证据门禁至少检查：

- 是否覆盖问题所需的关键条件和例外；
- 来源是否仍在当前有效期；
- 多份来源是否冲突；
- 引用是否来自本次已授权证据集；
- 最终上下文是否在 token 预算内且未因截断丢失限定语。

引用 ID 白名单可以防止模型杜撰来源，但不能证明断言被来源支持。高风险断言可走规则、NLI/LLM 辅助评审和人工抽样；自动评审器同样可能出错，不能被视为确定性裁判。

## 8. 提示词注入：检索文本永远不是指令

知识库可能包含"忽略前文""打印密钥""调用工具"等文本。不能用"模型会遵守系统提示词"来把这种风险归零。应采用分层控制：

1. 导入时记录来源、作者、审批状态和敏感级别；对外部、用户生成和未审核资料增加风险标记；
2. 组装提示词时，将检索内容放进明确的不可执行证据区，与系统指令和工具策略分离；
3. 工具调用由服务端根据用户权限、参数策略和业务状态重新授权，文档内容无权扩展工具能力；
4. 仅发送完成回答所需的最小证据给外部模型；记录外发文档版本和审批链；
5. 对高风险资料做人工审阅、抽样检测与可撤销发布。

这套措施不能保证模型永不受攻击，但能把"文档文本影响应用权限"的风险从提示词层移到可审计的服务端控制面。

## 9. 知识导入与发布：写入成功不等于可以对外读

版本状态机：`PENDING → BUILDING → VALIDATING → (FAILED) → READY → ACTIVE → RETIRED`

建议流程：

1. 原文进入对象存储；关系库在同一事务中写入文档版本、导入任务与 Outbox。
2. Worker 幂等消费任务，解析、分块、Embedding、批量写入，并记录阶段进度与 Chunk 清单。
3. 以**线上同样的读一致性、客户端、过滤器和权限**验证新版本的可检索性、数量、哈希与引用定位。
4. 发布目录用条件更新或单调序号，将当前指针从 A 原子切换到 B。
5. 新请求绑定 B；旧请求继续使用已绑定版本或按业务安全策略中止。
6. 等待缓存 TTL、在途请求和回滚窗口结束，再回收 A。

Milvus 的一致性等级影响读可见性；一次写入 ACK 或一次探测读到新数据，都不能自行证明所有实际读路径已一致。发布屏障必须记录所采用的一致性、读客户端、集合/别名和验证样本。

### 9.1 全量快照与增量版本不可混用

| 方案 | 发布语义 | 优点 | 风险 |
| --- | --- | --- | --- |
| 全量快照 | 一个 `kb_revision` 含完整知识库 | 查询和回滚清晰 | 存储与构建开销大 |
| 增量文档版本 | 发布清单指向每份文档当前版本 | 写入更省 | 检索必须保证旧版不会占满候选 |

不能只给变更文档写新 `kb_revision`，然后将全库查询切到该值；未改文档会消失。多个构建并行时，发布操作必须使用预期旧版本条件或递增序号，避免慢任务覆盖新发布。

### 9.2 撤权和删除优先于普通缓存策略

权限撤销与敏感删除不能等待 TTL：先更新权威 ACL/撤销目录，禁止新请求命中证据与答案；再异步清理向量、缓存、原文、预览、评测副本和日志，并按备份保留政策处理。

若业务承诺"撤权后立即停止流式泄露"，系统还需维护 `requestId -> session -> downstream-call` 注册关系：撤权事件按主体/文档匹配活跃会话，取消下游请求，释放许可，并记录撤权事件到实际停止之间的时间。已交付给客户端的字节不可撤回，产品和合规承诺必须明确这一边界。

## 10. Milvus：按约束选择拓扑、索引和隔离边界

Standalone 与 Distributed 的区别是拓扑、可用性和独立扩缩容能力；不要据此断言 Standalone 没有对象存储，也不要假设它固定只有某个内存大小。小规模且可接受恢复停机的工作负载可以使用 Standalone；需要节点容错、独立扩容或更高可用性时考虑 Distributed 或托管服务。

对于 1,000,000 条、1536 维 float32 向量：

```
原始向量 = 1,000,000 × 1536 × 4
         = 6,144,000,000 B ≈ 5.72 GiB
```

这不是节点内存需求。索引、标量字段、文本、Segment、查询工作区、加载副本、索引构建峰值与滚动升级冗余都要计算进去。

| 方案 | 适用价值 | 实测项 |
| --- | --- | --- |
| FLAT | 小样本精确基线 | 扫描成本与正确性对照 |
| HNSW | 低延迟、较高召回 | 图索引内存、构建时间、`ef` |
| IVF_FLAT | 可控聚类搜索预算 | `nlist/nprobe` 对过滤后召回的影响 |
| 支持版本中的 HNSW_PQ | 降低存储/加载成本 | 量化损失、精排补偿、端到端质量 |

Milvus 提供 HNSW_PQ 文档，但不应把它写成所有版本都存在的"HNSW 开关"，更不能承诺固定压缩率或固定召回损失。

多租户可选择独立集群、Database/Collection、手动 Partition 或 Partition Key。它们是资源和运维边界，不自动等于应用层授权隔离；所有共享路径仍必须在服务端强制 ACL 过滤。

## 11. 并发、Deadline 与全局预算

分别为在线 Embedding、Milvus、Rerank、生成、离线 Embedding 和 SSE 会话建立舱壁。以下示例只表达"进程内无等待准入"，不是集群配额或 RPM/TPM 限流器：

```java
import java.util.concurrent.Callable;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.Semaphore;

public final class Bulkhead {
    private final Semaphore permits;

    public Bulkhead(int maxInFlight) {
        if (maxInFlight <= 0) throw new IllegalArgumentException("maxInFlight");
        this.permits = new Semaphore(maxInFlight);
    }

    public <T> T call(Callable<T> action) throws Exception {
        if (!permits.tryAcquire()) {
            throw new RejectedExecutionException("dependency busy");
        }
        try {
            return action.call();
        } finally {
            permits.release();
        }
    }
}
```

流式调用不能在返回 `Publisher` 时释放许可，而要在完成、异常或取消信号到来时释放。十个 Pod 每个允许 100 个生成在途，可能同时形成 1,000 个供应商调用；需要模型网关或共享配额组件负责全局限流，各 Pod 只持有保守的本地预算。

每个请求携带不可变的 `RequestContext`：租户、ACL 快照、知识版本、向量空间、traceId 与绝对 Deadline。不要以 ThreadLocal 作为跨线程授权事实来源。

示例预算可以是 Embedding 250 ms、检索 200 ms、Rerank 350 ms、首 token 目标 2 s、生成总上限 20 s。每一跳用"剩余总预算"和"阶段上限"的较小值；连接、首次响应、流式空闲和总时长分别设限。`CompletableFuture.orTimeout` 可能只停止等待，真实 HTTP/gRPC 调用仍在继续，必须把 Deadline 与取消传递给底层客户端。

虚拟线程改善大量阻塞等待的调度效率，不能增加模型配额。MVC + 虚拟线程与 WebFlux 都需要有限缓冲、连接限制和取消传播；在 WebFlux 事件循环中调用阻塞 SDK 一样会造成停顿。

## 12. 缓存：命中答案前，先命中同一安全语义

最终答案缓存键至少包含：

```
tenant + kb + kb_revision + embedding_space_id
+ authorization_scope_digest + acl_revision
+ normalized_question_hash + conversation_digest
+ prompt_version + retrieval_config_version + reranker_version
+ generation_model_version + language + output_policy_version
```

知识新修订让旧缓存自然脱离读路径，通常不需要每次扫描 Redis 删除前缀。权限撤销不同：读取时验证 ACL 版本，或使用具有明确传播上限的授权缓存与撤销目录。

请求合并只能发生在完全相同的知识版本、权限范围和输出策略内。语义缓存尤其危险："支持退款吗"与"超过七天支持退款吗"可能相近但结论不同；涉及订单、价格、地域、合同、时间与个人状态时，先证明精确缓存正确，再评估语义复用。

## 13. SSE：流式成功不是 HTTP 200

```nginx
location /api/rag/stream {
    proxy_pass http://rag_backend;
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 60s;
}
```

应用使用 `text/event-stream`，可设置 `X-Accel-Buffering: no`；同时必须逐跳检查 CDN、网关、Ingress、负载均衡和客户端的缓冲及空闲超时。只改 Nginx 不能保证端到端流式。

建议定义应用自己的事件协议：

- `meta`：`requestId`、知识版本、允许公开的来源摘要；
- `delta`：受大小和会话缓冲上限约束的文本增量；
- `done`：完成状态、最终引用、用量和可缓存标识；
- `error`：流开始后的失败，明确 `partial=true`；
- `revoked`：撤权或安全策略中止，客户端停止展示后续增量。

HTTP 响应开始后不能通过改状态码表达失败。浏览器断开、服务端 Deadline、撤权和下游错误都必须调用同一幂等取消路径：取消模型调用、注销会话、释放舱壁许可、停止计量。部分回答不进入完整答案缓存。

应分别观测首 token、完成、客户端确认接收、取消成功和"取消后仍产生 token"的浪费量。若必须在输出前审核内容，应选择缓冲审核或分段审核，并接受其对首 token 延迟的影响。

## 14. 可观测性、评测与压测

一条请求应关联认证、缓存、Embedding、检索、Rerank、生成与流关闭。记录 `trace_id`、版本链、候选数、拒答原因、阶段耗时、token、取消原因和外发审计；默认不要记录完整问题、片段与输出，调试使用受控抽样、脱敏和保留期限。

| 维度 | 指标 | 必要问题 |
| --- | --- | --- |
| 容量 | 在途、排队、拒绝、连接利用率 | 是否应降载或扩容？ |
| 依赖 | P95/P99、超时、重试、限流 | 瓶颈在本地还是外部？ |
| 检索 | Evidence Recall@K、nDCG、零结果 | 分母是片段、文档还是问题所需证据？ |
| 回答 | 引用支持率、正确/错误拒答率 | 是可靠还是只是有引用？ |
| 安全 | 越权命中、撤权传播延迟 | 是否应停止发布？ |
| 成本 | 成功回答成本、浪费 token、缓存成本 | 是否在预算内？ |
| 数据 | 导入积压、发布耗时、构建失败 | 能否恢复和回滚？ |

容量实验分为三层：

1. **检索层**：固定数据量、维度、索引、过滤选择率、Top-K、一致性和冷热状态，对照精确基线召回。
2. **编排层**：模型桩注入首 token 节奏、限流、慢响应、错误与取消；结果只能称为编排能力。
3. **端到端**：真实模型配额下报告 RPM/TPM、输入输出分布、拒答、缓存、费用与完成吞吐。

使用开放式到达率压测，报告超时和延迟统计口径，避免负载工具因等待慢响应自动减压而掩盖过载。

## 15. 发布前故障实验矩阵

| 注入 | 预期 | 证据 |
| --- | --- | --- |
| 模型时延升高 5 倍 | 在途封顶、明确拒绝、无无限积压 | 许可、连接、拒绝与 token |
| 模型持续限流 | 重试次数和总预算有界 | 实际尝试和费用 |
| Milvus 超时 | 不放宽 ACL，不无证据回退 | 过滤与外发审计 |
| Worker 写入后崩溃 | 重放不产生逻辑重复，不提前发布 | Chunk 清单、任务状态 |
| 旧任务晚完成 | 不能覆盖更高发布序号 | 条件更新记录 |
| Redis 故障 | 回源仍在本地/全局预算内 | 下游并发和入口拒绝 |
| 跨租户伪造请求 | 服务端拒绝，无片段外发 | 检索过滤与模型审计 |
| 撤权后读取缓存 | 在承诺时限后不可读 | ACL 版本、事件时间线 |
| 客户端断开 | 下游取消、许可和缓冲释放 | 活跃流、取消确认、浪费 token |
| 计算节点故障 | 在既定 SLO 内恢复 | 故障时长、数据与错误 |
| 备份恢复 | 原文、发布目录、向量和引用对齐 | RPO/RTO 与抽样结果 |

安全负例"测试中未发现越权"不能证明所有未来输入安全，但它是发布的最低门槛。失败时可以回滚发布指针、检索配置和模型适配；权限撤销与敏感删除绝不能随内容回滚被恢复。

## 16. 最小生产闭环：第一周应该交付什么

不要从混合检索、语义缓存或多集群开始。先完成以下最小闭环：

| 类别 | 必须交付物 | 验收标准 |
| --- | --- | --- |
| 身份与权限 | 服务端 `AccessScope`、拒绝策略、审计 | 篡改 tenant/kb 参数不会外发任何片段 |
| 知识版本 | 原文、文档版本、Chunk 清单、发布目录 | 单条回答可追溯到页/段和知识修订 |
| 检索 | 向量空间 ID、强制过滤适配层 | 不同模型向量无法混检 |
| 证据 | 无证据短路、结构化引用验证 | 无证据不发起生成调用 |
| 治理 | 全链路 Deadline、舱壁、取消 | 慢模型不会耗尽在线资源 |
| 流式 | SSE 事件协议、断连和撤权取消 | 许可最终归还，无部分答案缓存 |
| 验收 | 小型标注集和故障矩阵 | 质量、安全、延迟、成本都有基线 |

达到闭环后再依次投入结构化分块、混合检索、Rerank、全局配额、HA 与有限语义缓存。每一步都需要写清"收益假设、成本、失败模式和退出条件"。

## 结语

Spring AI 降低了接入模型与向量库的成本，Milvus 提供了向量检索能力；企业 RAG 的难处在于让证据、权限、版本、向量空间、预算和恢复在每条真实请求上保持一致。

可被信任的性能结论应表达为：在给定知识规模、租户分布、ACL 选择率、模型配额、索引配置和质量门槛下，系统能稳定完成多少请求；超出容量如何拒绝；撤权和故障后多久恢复。只有这些结论经过压测、故障实验和版本化证据验证，吞吐数字才有业务意义。

## 参考资料与核验边界

以下均为官方文档链接。链接页面会随产品更新，生产实施时应把选定版本的 URL、依赖锁定文件、Chart 值文件和测试报告一起归档。

1. Spring AI 1.0.9 Getting Started：Boot 兼容性与 BOM
2. Spring AI 1.0.9 Milvus Vector Store：配置、过滤和原生表达式
3. Spring AI 1.0.9 RAG：Advisor、RetrievalAugmentationAdvisor 与空上下文
4. Milvus Consistency
5. Milvus Deployment Options
6. Milvus HNSW_PQ
7. Milvus Implement Multi-tenancy
8. Oracle Java 21 Virtual Threads
9. Nginx ngx_http_proxy_module

本文未在特定生产环境执行模型调用、Milvus 集群部署或性能基准；示例参数不是上线指标。请在锁定版本、真实权限模型和真实数据分布下完成编译、集成、压测与安全验收。
