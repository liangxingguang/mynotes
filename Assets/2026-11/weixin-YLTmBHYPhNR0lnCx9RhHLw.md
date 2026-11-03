## 别急着换向量库：PostgreSQL + pgvector 的生产级 RAG 检索工程

> 从可检索到可授权、可发布、可回收、可验收
> 
> 面向 Go / Java 后端、数据库、云原生与 AI 平台工程师。

一条向量 SQL 返回十条结果，只能说明链路跑通；它不能说明结果属于当前租户、当前用户仍有权看到它、内容来自已发布版本，或撤权后缓存与副本不会再次把它返回。

生产 RAG 的难点不在“是否使用向量数据库”，而在于把候选检索、授权判断、版本发布、缓存失效和质量评测组合成可证明的系统契约。PostgreSQL + pgvector 的优势，是关系数据、向量、事务与审计可以共享同一套权威状态；它的性能边界同样必须由真实数据、执行计划和故障实验来证明。

本文以多租户客服知识库为例，给出一套可实现的设计：模型空间注册、文档与 ACL 版本化、混合检索、发布 CAS、物理清理、Go 调用边界与验收矩阵。

\*\*本文是工程设计与示例，不是千万级压测报告。\*\*文中的参数均是实验起点，不应被理解为通用生产推荐值。部署时请锁定 PostgreSQL、pgvector、镜像与驱动的具体验证版本。

* * *

## 01｜先定义正确性：系统究竟承诺什么

设一次请求由已经认证的主体 `principal` 发起，目标是一个 `tenant` 内的 `collection`。RAG 返回的每一个 chunk 都必须同时满足：

1.  1\. 属于当前租户；
    
2.  2\. 文档未删除，且是该文档已发布的 active version；
    
3.  3\. 当前主体具有文档或知识库访问权；
    
4.  4\. 所属模型空间与本次查询一致；
    
5.  5\. 请求的资源预算尚未耗尽。
    

这五项中，向量索引只参与第五项之前的“候选生成”；它不拥有权限和版本的最终解释权。

契约

可观察行为

关键实现

失败语义

租户隔离

不返回其他 tenant 的行

显式谓词 + RLS

拒绝并记录安全事件

授权有效

撤权后新请求不再使用旧证据

权威 ACL 复核、epoch

失败关闭，不以 TTL 替代

版本原子性

不暴露半成品 chunk

building/ready + active 指针

继续读旧版本

新鲜度

发布后在约定时间可见

Outbox、路由、副本位点

回主库或明确超时

资源有界

高过滤与高并发不拖垮主库

超时、扫描与连接预算

可识别的资源错误

“更新后 30 秒可见”是新鲜度 SLO，不等于强一致性；“撤权后立即不可见”则必须定义生效点，并回答撤权前已经开始的流式输出是否允许完成。两者不应由同一个五分钟缓存 TTL 来解释。

* * *

## 02｜容量从字节、写放大和生命周期开始

1024 维 `float32` 向量的数值部分为：

\[  
B=N\\times d\\times4  
\]

当 `N=10,000,000`、`d=1024` 时仅向量值约 40.96 GB（38.15 GiB）。这还未包括行头、TOAST、正文、GIN、HNSW、WAL、备份、副本、索引重建以及新旧版本并存的峰值。

```
SELECT pg_size_pretty(pg_table_size('rag_chunks')) AS heap,       pg_size_pretty(pg_indexes_size('rag_chunks')) AS indexes,       pg_size_pretty(pg_total_relation_size('rag_chunks')) AS total;
```

因此容量评估至少记录：数据集哈希、文档平均 chunk 数、活跃/退役版本比例、向量维度、索引对象大小、构建期间峰值磁盘和 WAL 速率。用“内存大小”或“向量数量”单独推导是否换库都不可靠。

小的合法集合往往适合 B-tree 过滤后的精确距离排序；大集合才需要 ANN。判断条件是**过滤后的候选数、目标延迟、并发和质量目标**，而不是一条固定的“超过 X 条向量即换库”规则。

* * *

## 03｜职责边界：候选不是授权结论

认证后的请求

预算与查询路由

向量/词法候选

RRF 与可选重排

主库版本与 ACL 复核

证据组装与生成

处理 Worker

暂存版本与发布事务

PostgreSQL 权威状态

候选检索可以在只读副本完成，但只要请求涉及刚发布内容、撤权或敏感文档，就必须经过主库权威复核。若使用外部重排器，向其发送正文之前就应完成授权复核；不能把“重排后再过滤”当作泄露防线。

* * *

## 04｜数据模型：模型空间、版本、ACL 都必须可追溯

### 4.1 模型空间不是自由文本

相同维度不代表同一向量空间。把模型 revision、维度、距离度量、归一化约定和文本预处理注册为权威对象，避免字符串拼写错误悄悄绕过部分索引。

```
CREATE EXTENSION IF NOT EXISTS vector;CREATE TABLE rag_embedding_spaces (    id text PRIMARY KEY,    dimensions integer NOT NULL CHECK (dimensions > 0 AND dimensions <= 2000),    distance_metric text NOT NULL CHECK (distance_metric IN ('cosine', 'inner_product', 'l2')),    model_revision text NOT NULL,    preprocessing_revision text NOT NULL,    normalized boolean NOT NULL,    enabled boolean NOT NULL DEFAULT true,    created_at timestamptz NOT NULL DEFAULT now());INSERT INTO rag_embedding_spaces    (id, dimensions, distance_metric, model_revision, preprocessing_revision, normalized)VALUES    ('support-1024-v1', 1024, 'cosine', 'example-model@2026-11', 'clean-v3', false);
```

这里的 `vector(1024)` 仍是静态类型约束；如果未来需要不同维度，应使用新表或新列，并以双轨迁移，而不是原地修改生产列。

### 4.2 文档、版本与 chunk

```
CREATE TABLE rag_documents (    tenant_id bigint NOT NULL,    id bigint NOT NULL,    collection_id bigint NOT NULL,    active_version bigint,    requested_version bigint NOT NULL DEFAULT 0,    deleted_at timestamptz,    updated_at timestamptz NOT NULL DEFAULT now(),    PRIMARY KEY (tenant_id, id));CREATE TABLE rag_document_versions (    tenant_id bigint NOT NULL,    document_id bigint NOT NULL,    version bigint NOT NULL,    embedding_space text NOT NULL REFERENCES rag_embedding_spaces(id),    tokenizer_version text NOT NULL,    expected_chunks integer NOT NULL CHECK (expected_chunks >= 0),    manifest_hash text NOT NULL,    state text NOT NULL CHECK (state IN ('building', 'ready', 'failed')),    created_at timestamptz NOT NULL DEFAULT now(),    PRIMARY KEY (tenant_id, document_id, version),    UNIQUE (tenant_id, document_id, version, embedding_space),    FOREIGN KEY (tenant_id, document_id)      REFERENCES rag_documents (tenant_id, id));ALTER TABLE rag_documents ADD CONSTRAINT rag_active_version_fk  FOREIGN KEY (tenant_id, id, active_version)  REFERENCES rag_document_versions (tenant_id, document_id, version);CREATE TABLE rag_chunks (    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,    tenant_id bigint NOT NULL,    document_id bigint NOT NULL,    document_version bigint NOT NULL,    chunk_no integer NOT NULL CHECK (chunk_no >= 0),    embedding_space text NOT NULL REFERENCES rag_embedding_spaces(id),    content text NOT NULL,    content_hash text NOT NULL,    search_text text NOT NULL,    content_tsv tsvector GENERATED ALWAYS AS      (to_tsvector('pg_catalog.simple'::regconfig, search_text)) STORED,    embedding vector(1024) NOT NULL,    created_at timestamptz NOT NULL DEFAULT now(),    UNIQUE (tenant_id, document_id, document_version, chunk_no),    FOREIGN KEY (tenant_id, document_id, document_version, embedding_space)      REFERENCES rag_document_versions      (tenant_id, document_id, version, embedding_space));CREATE INDEX rag_documents_collection_live  ON rag_documents (tenant_id, collection_id, id) WHERE deleted_at IS NULL;CREATE INDEX rag_chunks_doc_version  ON rag_chunks (tenant_id, document_id, document_version);CREATE INDEX rag_chunks_tsv ON rag_chunks USING gin (content_tsv);CREATE INDEX rag_chunks_hnsw_v1 ON rag_chunks  USING hnsw (embedding vector_cosine_ops)  WITH (m = 16, ef_construction = 128)  WHERE embedding_space = 'support-1024-v1';
```

`collection_id` 如果是授权域的一部分，就不能作为无审计的即时可改元数据。本文选择将集合归属视作发布状态：集合迁移需更新 retrieval epoch 并走授权变更流程。若业务需要即时迁移，必须把该语义明确写入审计和缓存失效协议。

### 4.3 ACL：不能只在文字里存在

下面用主体到文档的授权表示文档级 ACL；大多数系统会另外有 group/role 展开表。对于集合级公开访问，可在授权集合 CTE 中 union 对应规则。

```
CREATE TABLE rag_document_acl (    tenant_id bigint NOT NULL,    document_id bigint NOT NULL,    principal_id bigint NOT NULL,    permission text NOT NULL CHECK (permission IN ('read')),    granted_at timestamptz NOT NULL DEFAULT now(),    revoked_at timestamptz,    PRIMARY KEY (tenant_id, document_id, principal_id, permission),    FOREIGN KEY (tenant_id, document_id)      REFERENCES rag_documents (tenant_id, id));CREATE INDEX rag_document_acl_read_live  ON rag_document_acl (tenant_id, principal_id, document_id)  WHERE revoked_at IS NULL AND permission = 'read';
```

为避免在 ANN 路径中重复展开复杂组织关系，服务层可在短事务中写入请求私有的授权集合，或以稳定的 `principal_id` 通过 CTE join。无论采用哪一种，向量、词法、缓存命中和最终返回前复核必须使用相同的授权语义。

* * *

## 05｜RLS 是第二道防线，不是身份提供者

每条业务 SQL 都显式使用 `tenant_id`；RLS 用来阻止遗漏谓词。业务账号不能是表所有者、superuser 或拥有 `BYPASSRLS`。

```
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_documents FORCE ROW LEVEL SECURITY;ALTER TABLE rag_document_versions ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_document_versions FORCE ROW LEVEL SECURITY;ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_chunks FORCE ROW LEVEL SECURITY;ALTER TABLE rag_document_acl ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_document_acl FORCE ROW LEVEL SECURITY;CREATE POLICY rag_chunks_tenant ON rag_chunks  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::bigint)  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::bigint);CREATE POLICY rag_docs_tenant ON rag_documents  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::bigint)  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::bigint);CREATE POLICY rag_versions_tenant ON rag_document_versions  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::bigint)  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::bigint);CREATE POLICY rag_acl_tenant ON rag_document_acl  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::bigint)  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::bigint);
```

请求开始时在事务局部设置租户：

```
SELECT set_config('app.tenant_id', '42', true);
```

自定义 GUC 可由能够执行任意 SQL 的业务角色改变，因此它不能代替认证。`tenant_id`、`principal_id` 与 `collection_id` 必须由服务端认证授权结果派生，客户端传入的值只能作为待校验输入。

* * *

## 06｜检索路由：先判断合法集合，再选择精确或 ANN

### 6.1 小集合：先过滤，后精确排序

当授权且有效的集合较小时，精确距离排序是最佳基准，也常是最便宜的生产路径。

```
WITH authorized AS MATERIALIZED (    SELECT a.document_id    FROM rag_document_acl a    WHERE a.tenant_id = $1 AND a.principal_id = $3      AND a.permission = 'read' AND a.revoked_at IS NULL), eligible AS MATERIALIZED (    SELECT c.id, c.embedding    FROM rag_chunks c    JOIN rag_documents d ON d.tenant_id = c.tenant_id AND d.id = c.document_id                         AND d.active_version = c.document_version    JOIN authorized a ON a.document_id = c.document_id    WHERE c.tenant_id = $1 AND d.collection_id = $2      AND d.deleted_at IS NULL AND c.embedding_space = 'support-1024-v1')SELECT id, embedding <=> $4::vector(1024) AS distanceFROM eligibleORDER BY distance, idLIMIT 10;
```

`MATERIALIZED` 是刻意的：它让“授权有效集合”先固定，再作为精确基准排序。大集合不可无条件走这条路径，应以受控阈值和 `statement_timeout` 路由。

### 6.2 大集合：HNSW 的过滤、迭代扫描与预算

HNSW 在过滤后返回不足，不表示合法内容不存在；过滤发生在近似索引扫描之后。迭代扫描可在不足时继续扫描，但会受 `max_scan_tuples`、内存和超时限制，不能承诺精确 Top-K。

```
BEGIN;SELECT set_config('app.tenant_id', '42', true);SET LOCAL hnsw.ef_search = 80;SET LOCAL hnsw.iterative_scan = strict_order;SET LOCAL hnsw.max_scan_tuples = 20000;SET LOCAL hnsw.scan_mem_multiplier = 2;SET LOCAL statement_timeout = '250ms';-- 运行 ANN 候选查询COMMIT;
```

这些值只是实验起点。必须对每个过滤比例记录“合法候选数、返回不足率、ANN Recall@K、实际扫描/耗时”，而不是只观察结果是否达到 K。pgvector 从 0.8.0 开始支持迭代扫描；`strict_order` 保证返回候选的距离排序，不会把近似搜索变成精确搜索。

* * *

## 07｜混合检索：三条路径必须共享可见性条件

中文词法检索不应假定 PostgreSQL 默认配置就是中文分词器。本文采用应用侧分词：正文保留在 `content`，把同一 tokenizer revision 的中文词元、错误码规范化结果写入 `search_text`，查询使用同一版本分词后传入数据库。型号、订单号和错误码应优先作为结构化字段或额外精确通道。

以下 RRF 查询将向量、词法和授权条件放在同一候选边界。参数依次为：tenant、collection、principal、vector 文本、已分词查询文本。

```
WITH authorized AS MATERIALIZED (    SELECT document_id FROM rag_document_acl    WHERE tenant_id = $1 AND principal_id = $3      AND permission = 'read' AND revoked_at IS NULL), semantic_candidates AS MATERIALIZED (    SELECT c.id, c.embedding <=> $4::vector(1024) AS distance    FROM rag_chunks c    JOIN rag_documents d ON d.tenant_id = c.tenant_id AND d.id = c.document_id                         AND d.active_version = c.document_version    JOIN authorized a ON a.document_id = c.document_id    WHERE c.tenant_id = $1 AND d.collection_id = $2 AND d.deleted_at IS NULL      AND c.embedding_space = 'support-1024-v1'    ORDER BY c.embedding <=> $4::vector(1024)    LIMIT 50), semantic AS (    SELECT id, row_number() OVER (ORDER BY distance, id) AS rank_no    FROM semantic_candidates), keyword_candidates AS MATERIALIZED (    SELECT c.id, ts_rank_cd(c.content_tsv,             plainto_tsquery('pg_catalog.simple'::regconfig, $5)) AS relevance    FROM rag_chunks c    JOIN rag_documents d ON d.tenant_id = c.tenant_id AND d.id = c.document_id                         AND d.active_version = c.document_version    JOIN authorized a ON a.document_id = c.document_id    WHERE c.tenant_id = $1 AND d.collection_id = $2 AND d.deleted_at IS NULL      AND c.embedding_space = 'support-1024-v1'      AND c.content_tsv @@ plainto_tsquery('pg_catalog.simple'::regconfig, $5)    ORDER BY relevance DESC, c.id    LIMIT 50), keyword AS (    SELECT id, row_number() OVER (ORDER BY relevance DESC, id) AS rank_no    FROM keyword_candidates), scores AS (    SELECT id, 1.0::double precision / (60 + rank_no) AS score FROM semantic    UNION ALL    SELECT id, 1.0::double precision / (60 + rank_no) AS score FROM keyword), fused AS (    SELECT id, sum(score) AS score FROM scores GROUP BY id)SELECT c.id, c.document_id, c.document_version, c.content, f.scoreFROM fused fJOIN rag_chunks c ON c.id = f.idJOIN rag_documents d ON d.tenant_id = c.tenant_id AND d.id = c.document_id                     AND d.active_version = c.document_versionJOIN authorized a ON a.document_id = c.document_idWHERE c.tenant_id = $1 AND d.collection_id = $2 AND d.deleted_at IS NULL  AND c.embedding_space = 'support-1024-v1'ORDER BY f.score DESC, c.idLIMIT 10;
```

RRF 的 `k=60` 是待验证参数，而非业务置信度。最终结果还应按文档、相邻 chunk 或语义重复度做多样化处理，避免十条证据来自同一段正文。

\*\*验证索引不能靠肉眼看 SQL。\*\*保存 `EXPLAIN (ANALYZE, BUFFERS, SETTINGS)`：检查 ANN 实验是否确实使用预期 HNSW 索引；若计划走过滤后的顺序扫描与排序，也要把它作为一条可比较的精确路径，而不是视为“异常”。

* * *

## 08｜Go 调用：事务局部设置与错误不可降级为空结果

将上一节 SQL 放入实际随代码提交的 `hybrid.sql` 文件；`go:embed` 只有在文件真实存在时才能编译。下面的接口传入的是服务端已经验证过的 `tenantID`、`collectionID`、`principalID`。

```
package retrievalimport (    "context"    _ "embed"    "encoding/json"    "errors"    "fmt"    "math"    "strconv"    "time"    "github.com/jackc/pgx/v5"    "github.com/jackc/pgx/v5/pgxpool")//go:embed hybrid.sqlvar hybridSQL stringtype Hit struct {    ID, DocumentID, DocumentVersion int64    Content string    Score float64}func Search(parent context.Context, pool *pgxpool.Pool,    tenantID, collectionID, principalID int64, embedding []float32,    tokenizedQuery string) ([]Hit, error) {    if tenantID <= 0 || collectionID <= 0 || principalID <= 0 || len(embedding) != 1024 {        return nil, errors.New("invalid retrieval input")    }    var norm2 float64    for _, x := range embedding {        v := float64(x)        if math.IsNaN(v) || math.IsInf(v, 0) { return nil, errors.New("non-finite embedding") }        norm2 += v * v    }    if norm2 == 0 { return nil, errors.New("zero embedding") }    raw, err := json.Marshal(embedding)    if err != nil { return nil, fmt.Errorf("encode vector: %w", err) }    ctx, cancel := context.WithTimeout(parent, 400*time.Millisecond)    defer cancel()    tx, err := pool.BeginTx(ctx, pgx.TxOptions{AccessMode: pgx.ReadOnly})    if err != nil { return nil, fmt.Errorf("begin retrieval: %w", err) }    defer func() {        cleanup, stop := context.WithTimeout(context.Background(), time.Second)        defer stop()        _ = tx.Rollback(cleanup)    }()    for _, s := range [][2]string{        {"app.tenant_id", strconv.FormatInt(tenantID, 10)},        {"hnsw.ef_search", "80"}, {"hnsw.iterative_scan", "strict_order"},        {"hnsw.max_scan_tuples", "20000"}, {"hnsw.scan_mem_multiplier", "2"},        {"statement_timeout", "250ms"},    } {        if _, err := tx.Exec(ctx, "SELECT set_config($1, $2, true)", s[0], s[1]); err != nil {            return nil, fmt.Errorf("configure retrieval: %w", err)        }    }    rows, err := tx.Query(ctx, hybridSQL, tenantID, collectionID, principalID,        string(raw), tokenizedQuery)    if err != nil { return nil, fmt.Errorf("query retrieval: %w", err) }    defer rows.Close()    hits := make([]Hit, 0, 10)    for rows.Next() {        var h Hit        if err := rows.Scan(&h.ID, &h.DocumentID, &h.DocumentVersion, &h.Content, &h.Score); err != nil {            return nil, fmt.Errorf("scan retrieval: %w", err)        }        hits = append(hits, h)    }    if err := rows.Err(); err != nil { return nil, fmt.Errorf("read retrieval: %w", err) }    if err := tx.Commit(ctx); err != nil { return nil, fmt.Errorf("commit retrieval: %w", err) }    return hits, nil}
```

超时、连接池等待、数据库取消、Embedding 失败与空结果必须使用不同错误类别。不要把资源错误转成“知识库没有答案”，也不要让网关、业务服务和 SDK 同时自动重试同一次查询。

* * *

## 09｜发布协议：半成品只存在于不可见区

清单、向量与 ACL 校验通过

处理失败

文档指针 CAS 成功

更高请求版本已存在

新版本发布或逻辑删除

building

ready

failed

published

superseded

retired

发布过程：

1.  1\. 短事务锁定文档，递增 `requested_version`，创建 `building` 版本，并同事务写入 Outbox；
    
2.  2\. Worker 在事务外解析、分词、调用 Embedding，并按版本批量写 chunk；
    
3.  3\. 重试遇到唯一冲突时比较 `content_hash`；不同内容不能当作幂等成功；
    
4.  4\. 发布事务锁定版本，验证连续 chunk 编号、数量、manifest、模型空间和 tokenizer；
    
5.  5\. 将版本置 `ready`，CAS 切换 active 指针，同时递增检索 epoch 并写发布事件；
    
6.  6\. 事务提交后，消费者失效缓存、驱动副本可见性与清理任务。
    

```
UPDATE rag_documentsSET active_version = $3, updated_at = now()WHERE tenant_id = $1 AND id = $2  AND requested_version = $3  AND active_version IS NOT DISTINCT FROM $4::bigint  AND deleted_at IS NULLRETURNING id;
```

零行返回意味着任务已经过期或存在并发变更；不得“重试到成功”。这保证较新的请求先完成后，迟到的旧请求不会把指针切回去。

* * *

## 10｜缓存、撤权、副本与物理清理

候选缓存键至少包含：

`tenant + collection + authorization_scope_version + retrieval_epoch + embedding_space + tokenizer_version + query_hash + filters_hash + retriever_version`

其中 `authorization_scope_version` 不是把原始权限列表拼进 key，而是代表已认证主体授权状态的可信版本；`retrieval_epoch` 必须与发布、删除、ACL 变更同事务更新。即便 key 中有 epoch，请求若从过期副本读取旧 epoch 仍可能命中旧缓存。因此撤权敏感路径必须读取主库状态或逐条主库复核。

删除分两步：

1.  1. **逻辑删除事务**：设置 `deleted_at`、递增 epoch、写清理 Outbox。新请求的权威复核立刻拒绝该文档。
    
2.  2. **物理清理 Worker**：先确认没有活动请求/法定保留限制；把文档 `active_version` 置空，再删除 chunk、版本与 ACL，最后才删除 document 行和对象存储内容。
    

后一个顺序是必要的：`rag_documents` 与 `rag_document_versions` 之间存在 active-version 外键，直接删除版本会失败。备份、副本和已发送给外部模型的正文不可能被 SQL 事务“收回”；对于流式生成，必须定义撤权后的输出闸门、取消行为和已经发出内容的产品语义。

副本只适合满足约定新鲜度的查询。刚发布验证、删除和撤权敏感请求走主库，或在提交后记录 WAL 位点并等待指定副本回放到该位点；单看“复制延迟低于一秒”不能证明某次提交已经可见。

* * *

## 11｜运维：用证据调整，而不是按月迷信重建

```
-- 专用维护连接；CREATE INDEX CONCURRENTLY 不能放在事务块中。SET maintenance_work_mem = '1GB';SET max_parallel_maintenance_workers = 2;CREATE INDEX CONCURRENTLY rag_chunks_hnsw_v1_replacement  ON rag_chunks USING hnsw (embedding vector_cosine_ops)  WITH (m = 16, ef_construction = 128)  WHERE embedding_space = 'support-1024-v1';RESET maintenance_work_mem;RESET max_parallel_maintenance_workers;ANALYZE rag_chunks;
```

构建失败后要检查 invalid index；`CONCURRENTLY` 不是无代价选项。对于 HNSW，结合死元组、查询退化、索引增长和维护窗口决定是否维护；已证实需要加速 HNSW vacuum 时，可评估 `REINDEX INDEX CONCURRENTLY` 后再执行 `VACUUM`，而不是把“每月全量重建”写成纪律。

核心观测项：

类别

最小指标

延迟

池等待、SQL、授权复核、重排、端到端 P50/P95/P99

质量

合法候选数、返回不足率、ANN Recall、nDCG、错误码命中率

生命周期

队列年龄、ready 耗时、过期 Worker 拒绝、逻辑删除时延

数据库

CPU、I/O、WAL、复制回放、长事务、死元组、索引体积

安全

跨租户拒绝、ACL 复核拒绝、缓存旧证据拒绝

不要把 tenant、document ID 或查询原文作为无限基数的指标标签；日志中的查询与证据应按敏感级别脱敏、采样和访问控制。

* * *

## 12｜把执行计划变成发布证据

一次 `EXPLAIN` 不等于性能结论，但没有执行计划的索引调优也只是猜测。每个要上线的检索路由至少保存以下两份计划：一份是代表性小合法集合的精确路径，一份是大合法集合的 ANN 路径。

```
EXPLAIN (ANALYZE, BUFFERS, SETTINGS, VERBOSE)WITH authorized AS MATERIALIZED (  SELECT document_id  FROM rag_document_acl  WHERE tenant_id = 42 AND principal_id = 1001    AND permission = 'read' AND revoked_at IS NULL)SELECT c.idFROM rag_chunks cJOIN rag_documents d ON d.tenant_id = c.tenant_id AND d.id = c.document_id                     AND d.active_version = c.document_versionJOIN authorized a ON a.document_id = c.document_idWHERE c.tenant_id = 42 AND d.collection_id = 9 AND d.deleted_at IS NULL  AND c.embedding_space = 'support-1024-v1'ORDER BY c.embedding <=> '[0,0,0]'::vector(1024)LIMIT 10;
```

示例中的全零向量只用于展示 SQL 形状，真实向量必须是非零、有限值。审查计划时回答这些问题：

问题

合格判断

不应得出的结论

是否走 HNSW

计划节点和索引名与目标部分索引一致

“出现 Index Scan 就一定是 HNSW”

ACL 是否可控

授权集合规模、join 顺序与缓冲读取可解释

“ACL CTE 一定会先执行”

是否发生退化

大量 heap 读取、长排序、超时与过滤丢弃可观测

“未走 ANN 就是故障”

参数是否生效

`SETTINGS`

 中记录会话预算与超时

“SQL 文本里写过 SET 就说明已生效”

若某个 tenant 的授权集合很小，过滤后精确排序可能自然优于 HNSW；这是正确路由而不是失败。若 ANN 路径因 ACL join 无法稳定使用向量索引，应测量替代设计，例如按授权域分区、对少数稳定大客户建部分索引，或在权威授权检查后采用受控的候选复核。不要为了得到某个计划节点而放宽授权过滤。

### 12.1｜安全测试应覆盖“有 SQL 漏洞时会发生什么”

RLS、显式谓词和服务端认证是互补层。测试不只验证正常请求，也应刻意模拟开发中最常见的遗漏：忘记 `tenant_id` 条件、缓存 key 漏掉主体、复用池连接、Worker 以错误租户写入、只读副本返回已经撤销的 ACL。预期结果应是拒绝或被主库复核拦截，而不是依赖调用方“通常会写对 SQL”。

任何允许用户提供 SQL、表达式或动态列名的功能，都超出了本文基于自定义 GUC 的信任模型，应使用单独受限角色、白名单查询接口或隔离的数据产品，不要把它暴露给 RAG 业务连接。

* * *

## 13｜评测：近邻质量、业务质量和生命周期正确性分别证明

ANN Recall@K 衡量近似结果相对精确近邻的保留度：

\[  
Recall@K=\\frac{|ANN\_K\\cap Exact\_K|}{\\min(K, |Eligible|)}  
\]

精确基准与 ANN 必须使用同一租户、主体、ACL、集合、版本快照和模型空间。合法集合为空的查询单列，不混入均值；第 K 名距离并列需预先定义处理规则。

业务质量使用人工相关性标签，按租户大小、语言、错误码、权限复杂度、文档新旧程度分层报告 Recall、MRR、nDCG、引用支持率和无答案拒答率。总体平均值必须配合分层结果与置信区间，例如 bootstrap 区间，否则大租户和简单问题会掩盖高过滤场景退化。

实验

自变量

必须保留的证据

过滤实验

合法比例、ACL 深度、租户大小

Recall、返回不足率、扫描成本

索引实验

exact/HNSW/IVFFlat、参数

质量-延迟曲线、构建/WAL/存储

混合实验

向量、词法、RRF、重排

nDCG、错误码命中、引用质量

负载实验

冷热状态、到达率、并发、写入混合

offered/完成/成功 QPS、P99、丢弃率

生命周期

更新、撤权、删除、乱序 Worker

可见版本、拒绝旧证据、收敛时间

故障实验

副本滞后、模型超时、主库切换

降级路径、恢复时间、积压量

上线门槛由业务签字，不伪造“已通过”。至少必须演练跨租户访问、连接池 A/B 串租户、半成品版本、新请求先于旧请求完成、删除消息重放、旧缓存命中、副本回放停滞、预算耗尽和备份恢复。

* * *

## 14｜换模型与换库：迁移的是契约

模型升级时建立新模型空间和新索引，双轨产出候选并做影子对比；灰度后再切换查询配置。相同维度的新模型仍不能混检。删除与撤权状态必须同时约束新旧空间。

引入专用检索系统的信号是：在目标质量下持续无法达到延迟或成本预算、索引维护/WAL/复制干扰核心事务、需要独立分布式扩展或跨地域能力，并且团队能承担同步、授权复核、恢复和审计的新增复杂度。

迁移后仍保留主库权威复核、发布协议、删除协议与评测。向量系统改变的是性能边界，不会替应用定义“谁有权看到什么、何时失效”。

* * *

## 15｜结语：一套可验收的检索系统应能回答什么

成熟的 RAG 检索层应能回答：证据属于谁、来自哪个发布版本、当前主体为何有权使用、权限何时失效、候选在哪里产生、权威判断在哪里完成、以及该请求用了多少资源预算。

从小而完整的闭环开始：固定模型空间；建立版本指针和 Outbox；用显式租户条件配合 RLS；将 ACL 放进每一条召回路径；为小集合保留精确基准；再引入 ANN、词法、RRF、缓存和副本。最后，以更新、删除、撤权、乱序和故障实验验收。

当系统不仅“能找到十条内容”，还能证明“这十条为什么可以被此刻的这个人使用”，它才具备生产 RAG 所需的工程边界。

* * *

## 参考资料与核对范围

资料核对日期：2026-11-03。Schema、发布协议、ACL 路由和验收矩阵为本文的工程设计，应结合项目实际验证。

1.  1. pgvector：索引、Filtering、Iterative Index Scans、维护与类型
    
2.  2. PostgreSQL 17：Row Security Policies
    
3.  3. PostgreSQL 17：Controlling Text Search
    
4.  4. PostgreSQL 17：CREATE INDEX
    
5.  5. PostgreSQL 17：Log-Shipping Standby Servers
    
6.  6\. Cormack, Clarke, Büttcher. Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods. SIGIR 2009.