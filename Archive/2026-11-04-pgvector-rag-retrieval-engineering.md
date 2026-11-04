---
id: 20261104-pgvector-rag-retrieval-engineering
title: 别急着换向量库：PostgreSQL + pgvector 的生产级 RAG 检索工程
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/YLTmBHYPhNR0lnCx9RhHLw
source_type: 网页
platform: 微信公众号
created: 2026-11-04
category: 技术
tags: [RAG, pgvector]
asset_ref: Assets/2026-11/weixin-YLTmBHYPhNR0lnCx9RhHLw.md
wiki_status: ingested
---

# 别急着换向量库：PostgreSQL + pgvector 的生产级 RAG 检索工程

> 以多租户客服知识库为例的生产级 RAG 检索设计：五条正确性契约（租户隔离/授权有效/版本原子性/新鲜度/资源有界），模型空间注册、文档版本化+ACL、RLS 第二道防线、混合检索（向量+词法+RRF）、发布 CAS、缓存失效与物理清理、评测验收矩阵。核心主张：向量索引只产生候选，权限与版本的最终解释权在关系层；换专用向量库的决策也应由契约与证据驱动。

## 核心要点

- 正确性契约：返回的每个 chunk 必须同时满足①属于当前租户②未删除且是已发布 active version③主体有访问权④模型空间一致⑤资源预算未耗尽；向量索引只参与候选生成，不拥有权限/版本解释权
- 数据模型：模型空间（维度/距离度量/model revision/预处理约定）注册为权威对象防字符串拼错绕过索引；文档表持 active_version 指针，版本状态机 building/ready/failed；chunk 带 tsvector 词法索引 + HNSW 部分索引（按 embedding_space 分区）
- ACL 是数据不是文字：rag_document_acl（granted_at/revoked_at）；向量、词法、缓存命中、最终返回前复核必须使用相同授权语义；集合迁移视为发布状态，需更新 retrieval epoch
- RLS 是第二道防线不是身份提供者：每条 SQL 显式 tenant_id + RLS 拦截遗漏谓词；业务账号不能是表所有者/superuser/BYPASSRLS；tenant_id/principal_id 由服务端认证派生，客户端传入只作待校验输入
- 检索路由：小合法集合先 MATERIALIZED CTE 固定授权集再精确距离排序（最便宜路径）；大集合 HNSW + iterative_scan + ef_search/statement_timeout 预算，须记录合法候选数、返回不足率、ANN Recall@K；过滤后 ANN 不足不代表内容不存在
- 混合检索：中文用应用侧分词写 search_text（不假定 PG 默认分词器）；向量/词法候选共享同一可见性条件，RRF k=60 是待验证参数；保存 EXPLAIN (ANALYZE, BUFFERS, SETTINGS) 作发布证据
- Go 调用边界：事务局部 set_config；超时、池等待、DB 取消、embedding 失败、空结果五类错误不可混同——资源错误不得转成"知识库没有答案"，网关/服务/SDK 不得同时重试同一次查询
- 发布协议：短事务建 building 版本 + Outbox → Worker 事务外写 chunk → 发布事务校验 manifest 后 CAS 切 active 指针（零行返回=请求过期，禁止重试到成功）；半成品只存在于不可见区
- 缓存与清理：缓存 key 含 authorization_scope_version + retrieval_epoch（与发布/删除/ACL 同事务更新）；撤权敏感路径必须主库复核；删除两步走——逻辑删除（即刻拒绝新请求）→ 物理清理 Worker（先置空 active_version 再删版本/chunk/ACL，否则外键失败）；副本滞后不能证明某次提交可见
- 运维与评测：CREATE INDEX CONCURRENTLY 不放事务块；指标分延迟/质量/生命周期/数据库/安全五类，查询原文与证据按敏感级别脱敏采样；ANN Recall@K 用同一租户/ACL/版本快照对比精确基准；上线门槛演练跨租户访问、串租户、半成品版本、乱序 Worker、删除重放、旧缓存命中、副本停滞，由业务签字
- 换库信号：目标质量下持续无法达到延迟/成本预算、索引维护干扰核心事务、需独立分布式/跨地域能力且团队承担同步/复核/恢复复杂度；换库迁移的是契约而非状态，主库权威复核与评测体系保留

## 正文

### 01 先定义正确性

一条向量 SQL 返回十条结果只能说明链路跑通，不能证明结果属于当前租户、主体仍有权看到、来自已发布版本、撤权后缓存与副本不再返回。五个承诺：租户隔离（显式谓词+RLS，失败拒绝并记安全事件）、授权有效（权威 ACL 复核+epoch，失败关闭不以 TTL 替代）、版本原子性（building/ready+active 指针，失败继续读旧版本）、新鲜度（Outbox+路由+副本位点，"更新后 30 秒可见"是 SLO 非强一致性）、资源有界（超时/扫描/连接预算）。撤权前已开始的流式输出是否允许完成，必须显式定义。

### 02 容量

1024 维 float32 向量 1000 万条仅数值就约 40.96 GB，未计行头、TOAST、正文、GIN、HNSW、WAL、备份与新旧版本并存峰值。容量评估须记录数据集哈希、平均 chunk 数、活跃/退役版本比例、维度、索引对象大小、构建峰值磁盘与 WAL 速率。小集合适合 B-tree 过滤后精确排序，大集合才需 ANN——判断依据是过滤后候选数、目标延迟、并发与质量目标，而非"超过 X 条即换库"。

### 03-04 职责边界与数据模型

链路：认证请求 → 预算与路由 → 向量/词法候选（可在只读副本）→ RRF/重排 → 主库版本与 ACL 复核 → 证据组装。涉及刚发布内容、撤权或敏感文档必须走主库复核；外部重排器发送正文前应已完成授权，不能把"重排后再过滤"当泄露防线。模型空间注册含 dimensions/distance_metric/model_revision/preprocessing_revision/normalized；相同维度不代表同一向量空间，换维度用新表新列双轨迁移。ACL 表支持文档级授权，集合级公开可在授权 CTE 中 union；为避免 ANN 路径重复展开组织关系，可在短事务写请求私有授权集合或用稳定 principal_id 做 CTE join。

### 05-06 RLS 与检索路由

RLS 策略用 current_setting('app.tenant_id') 比对，请求开始 set_config 事务局部设置；自定义 GUC 可被任意 SQL 业务角色篡改，不能代替认证。小集合查询用两个 MATERIALIZED CTE（authorized、eligible）先固定合法集再精确排序；大集合用 SET LOCAL hnsw.ef_search/iterative_scan=strict_order/max_scan_tuples/statement_timeout，pgvector 0.8.0+ 支持迭代扫描，strict_order 保证返回候选的距离排序。

### 07 混合检索

中文分词在应用侧完成，正文留 content，词元与错误码规范化写 search_text，查询用同一 tokenizer 版本。RRF 查询把向量（Top-50）、词法（Top-50，ts_rank_cd）、授权条件放在同一候选边界，1/(60+rank) 融合后按分排序；结果还需按文档/相邻 chunk/语义重复度做多样化，避免十条证据来自同一段。型号、订单号、错误码优先走结构化字段或精确通道。

### 08 Go 调用

go:embed hybrid.sql；输入校验（tenantID/collectionID/principalID>0、embedding 长度 1024、非 NaN/Inf、非零）；只读事务内循环 set_config 设置预算参数；400ms 超时；错误按类型包装，资源错误与"空结果"严格区分。

### 09-10 发布、缓存、删除

发布六步：短事务锁文档递增 requested_version 建 building + Outbox → Worker 事务外解析/分词/embedding 批量写 chunk（唯一冲突比较 content_hash，不同内容不算幂等成功）→ 发布事务锁版本校验连续编号/数量/manifest/模型空间/tokenizer → ready + CAS 切 active（UPDATE ... WHERE requested_version=$3 AND active_version IS NOT DISTINCT FROM $4 RETURNING id，零行即过期）→ 提交后消费者失效缓存/驱动副本/清理。缓存 key：tenant+collection+authorization_scope_version+retrieval_epoch+embedding_space+tokenizer_version+query_hash+filters_hash+retriever_version；撤权敏感请求读主库。物理清理顺序必要：先置空 active_version 解除外键，再删 chunk/版本/ACL，最后删文档行与对象存储。流式生成已发出内容无法被事务收回，须定义撤权后输出闸门。

### 11-13 运维、执行计划与评测

CONCURRENTLY 索引失败后查 invalid index；REINDEX INDEX CONCURRENTLY + VACUUM 可替代"每月全量重建"纪律。观测五类：延迟（池等待/P50/P95/P99）、质量（合法候选数/返回不足率/Recall/nDCG）、生命周期（队列年龄/ready 耗时）、数据库（WAL/复制回放/死元组）、安全（跨租户拒绝/缓存旧证据拒绝）。每个检索路由保存小集合精确路径与大集合 ANN 路径两份 EXPLAIN；审查回答是否走 HNSW、ACL 是否可控、是否退化、参数是否生效，小租户精确排序优于 HNSW 是正确路由不是故障。评测分近邻质量（ANN Recall@K，同一快照对比，空合法集单列）、业务质量（分层 Recall/MRR/nDCG/引用支持率/拒答率+bootstrap 区间）、生命周期与故障实验六类；上线门槛由业务签字，不伪造"已通过"。安全测试要模拟忘记 tenant_id、缓存 key 漏主体、复用池连接、Worker 错租户写入、副本返回已撤销 ACL 等常见遗漏。

### 14-15 换模型与换库

模型升级建新空间新索引双轨影子对比后切配置，相同维度新模型也不能混检；删除与撤权状态同时约束新旧空间。引入专用检索系统的信号是持续无法满足延迟/成本、维护干扰核心事务、需分布式/跨地域且团队能承担复杂度。成熟检索层能回答：证据属于谁、来自哪个版本、为何有权、何时失效、候选在哪产生、权威判断在哪完成、预算用了多少。

## 来源

- 原文：https://mp.weixin.qq.com/s/YLTmBHYPhNR0lnCx9RhHLw （微信公众号）
- 资料核对日期：2026-11-03；Schema、发布协议、ACL 路由与验收矩阵为作者工程设计，需结合项目实际验证

## 附件

[[Assets/2026-11/weixin-YLTmBHYPhNR0lnCx9RhHLw.md]]
