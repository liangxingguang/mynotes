---
id: wiki-source-2026-11-04-pgvector-rag-retrieval-engineering
type: source
title: 别急着换向量库：PostgreSQL + pgvector 的生产级 RAG 检索工程
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: medium
tags:
  - source
  - ai
  - rag
  - pgvector
sources:
  - raw/sources/ai/2026-11-04-pgvector-rag-retrieval-engineering.md
related:
  - wiki/concepts/rag-production-guardrails.md
---
# 别急着换向量库：PostgreSQL + pgvector 的生产级 RAG 检索工程

## Overview（概览）

微信公众号文章（2026-11-04 采集，资料核对日期 2026-11-03）。以多租户客服知识库为例的生产级 RAG 检索工程设计：先定义五条正确性契约（租户隔离/授权有效/版本原子性/新鲜度/资源有界），再给出模型空间注册、文档版本化+ACL、RLS 第二道防线、小集合精确/大集合 ANN 检索路由、混合检索（向量+词法+RRF）、发布 CAS、缓存键与两步删除、Go 调用边界、运维与评测矩阵。核心主张：向量索引只产生候选，权限与版本的最终解释权在关系层；换专用向量库的决策应由契约与证据驱动。作者自述为工程设计示例，参数均为实验起点。

## Key Facts（关键事实）

- 五条正确性契约：①租户隔离（显式谓词+RLS，失败拒绝并记安全事件）②授权有效（权威 ACL 复核+epoch，失败关闭不以 TTL 替代）③版本原子性（building/ready+active 指针，失败继续读旧版本）④新鲜度（Outbox+路由+副本位点，"更新后 30 秒可见"是 SLO 非强一致性）⑤资源有界（超时/扫描/连接预算）。向量索引只参与候选生成，不拥有权限和版本的最终解释权。
- 容量：1024 维 float32 × 10M 条仅数值约 40.96 GB（38.15 GiB），未计行头、TOAST、正文、GIN、HNSW、WAL、备份、副本、索引重建与新旧版本并存峰值；容量评估须记录数据集哈希、平均 chunk 数、活跃/退役版本比例、维度、索引对象大小、构建峰值磁盘与 WAL 速率。
- 模型空间注册：dimensions/distance_metric/model_revision/preprocessing_revision/normalized 注册为权威对象（rag_embedding_spaces 表），防字符串拼写错误绕过部分索引；相同维度≠同一向量空间；换维度用新表新列双轨迁移。
- 数据模型：rag_documents 持 active_version 指针+requested_version；rag_document_versions 状态机 building/ready/failed+manifest_hash；rag_chunks 带 content_tsv 词法索引与按 embedding_space 分区的 HNSW 部分索引；集合迁移视为发布状态（更新 retrieval epoch 走授权变更流程）。
- ACL 是数据：rag_document_acl（granted_at/revoked_at）；向量、词法、缓存命中、最终返回前复核必须使用相同授权语义。
- RLS 是第二道防线：策略用 current_setting('app.tenant_id')；请求开始 set_config 事务局部设置；业务账号不能是表所有者/superuser/BYPASSRLS；自定义 GUC 可被任意 SQL 角色篡改，不能代替认证；tenant_id/principal_id/collection_id 由服务端认证派生，客户端传入只作待校验输入。
- 检索路由：小合法集合用两个 MATERIALIZED CTE（authorized/eligible）固定授权集后精确距离排序（最便宜路径）；大集合 HNSW+iterative_scan+strict_order+ef_search/statement_timeout 预算；过滤后 ANN 返回不足不代表合法内容不存在；pgvector 0.8.0+ 支持迭代扫描。
- 混合检索：中文分词在应用侧写 search_text（不假定 PG 默认分词器）；向量/词法候选共享同一可见性条件，RRF 1/(60+rank) 融合（k=60 为待验证参数）；保存 EXPLAIN (ANALYZE, BUFFERS, SETTINGS) 作发布证据；小租户精确排序优于 HNSW 是正确路由不是故障。
- Go 调用：go:embed hybrid.sql；输入校验（长度 1024、非 NaN/Inf、非零）；只读事务循环 set_config；400ms 超时；超时/池等待/DB 取消/embedding 失败/空结果五类错误不可混同——资源错误不得转成"知识库没有答案"，网关/服务/SDK 不得同时重试同一次查询。
- 发布协议：短事务建 building+Outbox → Worker 事务外写 chunk → 发布事务校验 manifest 后 CAS 切 active（零行返回=请求过期禁止重试到成功）；缓存 key 含 tenant+collection+authorization_scope_version+retrieval_epoch+embedding_space+tokenizer_version+query_hash+filters_hash+retriever_version；撤权敏感路径主库复核。
- 删除两步走：逻辑删除事务（deleted_at+epoch+清理 Outbox，新请求立刻拒绝）→ 物理清理 Worker（先置空 active_version 解除外键，再删 chunk/版本/ACL，最后删文档行与对象存储）。
- 运维与评测：CREATE INDEX CONCURRENTLY 不放事务块（失败查 invalid index）；指标分延迟/质量/生命周期/数据库/安全五类；ANN Recall@K 用同一租户/ACL/版本快照对比精确基准；评测六类实验（过滤/索引/混合/负载/生命周期/故障）；上线门槛演练跨租户访问、串租户、半成品版本、乱序 Worker、删除重放、旧缓存命中、副本停滞，由业务签字不伪造"已通过"。
- 换库信号：目标质量下持续无法达到延迟/成本预算、索引维护干扰核心事务、需分布式/跨地域且团队承担同步/复核/恢复复杂度；迁移的是契约不是状态，主库权威复核与评测体系保留。

## Important Claims（重要论断）

### Claim 1：向量索引只产生候选，不拥有解释权

五条契约中前四条（租户/授权/版本/新鲜度）的最终解释权在关系层；向量索引只参与候选生成。这是"PostgreSQL + pgvector"路线成立的根本前提，也是成熟检索层应能回答的问题：证据属于谁、来自哪个版本、为何有权、何时失效、候选在哪产生、权威判断在哪完成、预算用了多少。

### Claim 2：换库决策由契约与证据驱动

判断依据是过滤后候选数、目标延迟、并发与质量目标，而非"超过 X 条向量即换库"；引入专用检索系统的信号是延迟/成本持续不达标、维护干扰核心事务、需分布式/跨地域能力且团队能承担同步/复核/恢复复杂度。

### Claim 3：删除与撤权是事务问题不是缓存问题

"撤权后立即不可见"必须定义生效点；删除必须先解除 active 外键再物理清理；流式已发出内容无法被事务收回，须定义撤权后输出闸门、取消行为与已发出内容的产品语义。

## Concepts Introduced（引入的概念）

- [[rag-production-guardrails|企业级 RAG 生产护栏]]（更新为四信源：五契约/检索路由/发布 CAS/两步删除/评测矩阵均为本信源新贡献）
- RRF 倒数排名融合（k=60 为待验证参数；原始文献 SIGIR 2009 Cormack et al.）
- ANN Recall@K 近邻质量评测（同快照对比精确基准，空合法集单列）
- 发布 CAS（active 指针条件更新，零行返回=请求过期禁止重试）

## Entities Mentioned（提及的实体）

- PostgreSQL 17（RLS、文本检索、CREATE INDEX CONCURRENTLY、日志传送备库）
- pgvector（0.8.0+ 迭代扫描、HNSW、IVFFlat）
- RRF（Reciprocal Rank Fusion，SIGIR 2009 Cormack, Clarke, Büttcher）

## Implications（影响／启示）

- 审查现有 RAG 检索链路：向量 SQL 是否隐含租户/版本/授权条件、缓存键是否含 authorization_scope_version 与 retrieval_epoch、删除是否两步走、撤权是否主库复核。
- 换库评估先跑六类实验（过滤/索引/混合/负载/生命周期/故障）建立质量-延迟证据，再做架构决策；迁移的是契约不是状态。

## Limitations（局限）

- 作者自述：工程设计与示例，不是千万级压测报告；文中参数（ef_search=80、RRF k=60、400ms 超时、statement_timeout 250ms 等）均为实验起点，不应被理解为通用生产推荐值。
- 单一信源（公众号）；schema、发布协议、ACL 路由与验收矩阵为作者工程设计，需结合项目实际验证。
- 示例以多租户客服知识库为假设场景；跨地域复制、多模型空间灰度等扩展场景的实操细节未展开。

## Related Knowledge（相关知识）

- [[rag-production-guardrails|企业级 RAG 生产护栏（概念页）]]
- [[langchain4j-multimodal-rag|LangChain4j 多模态 RAG 实战]]
- [[knowledge-base-tech-evolution|知识库的技术演进]]

## Source（信源）

- `raw/sources/ai/2026-11-04-pgvector-rag-retrieval-engineering.md`
