---
id: wiki-source-spring-ai-milvus-rag-production
type: source
title: Spring AI + Milvus 企业级 RAG 生产工程实践：可验证的知识、权限、容量与恢复
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - ai
  - rag
  - spring
sources:
  - raw/sources/ai/2026-10-21-spring-ai-milvus-rag-production.md
related:
  - wiki/concepts/rag-production-guardrails.md
  - wiki/sources/langchain4j-multimodal-rag.md
  - wiki/sources/knowledge-base-tech-evolution.md
---
# Spring AI + Milvus 企业级 RAG 生产工程实践

## Overview（概览）

以多租户电商客服知识库为例的企业级 RAG 工程方法论，围绕容量、证据、权限、恢复四条主线，给出 AccessScope/ScopedRetriever/舱壁/SSE 取消协议等关键契约代码、Chunk Schema、故障实验矩阵与第一周最小闭环清单。作者明确声明：文中容量与阈值均为设计示例，非线上实测。

## Key Facts（关键事实）

- 容量口径：入口 QPS、检索 QPS、生成启动速率、完整回答吞吐、活跃流是五个不同指标；示例算式 10,000 入口 QPS ×(1−80% 缓存命中)×(1−25% 拒答) = 1,500 次/秒生成
- Little 定律估算在途：L = λ×W（120 次/秒 × 6 秒 ≈ 720 在途）；队列只吸收短突发，5,000 槽位只会让拒绝变成更贵更晚的超时
- 权限三件套不可拆：tenantId/kbId/aclRevision 必须服务端构造（不信请求 JSON）；过滤表达式只能由适配层生成，业务方不得直造原生 MilvusSearchRequest
- `embeddingSpaceId` = 模型+维度+归一化+预处理的不可变组合；同维度不同模型也是不同语义空间，禁止混写
- RetrievalAugmentationAdvisor 空上下文只是「指示模型别答」≠不调用模型；零生成费用必须在编排层显式短路
- 发布语义：发布目录原子切换（条件更新/单调序号防慢任务覆盖）；增量版本不能直接把全库查询切到新 revision（未改文档会消失）；写入 ACK ≠ 全局可见
- 答案缓存键至少含 kb_revision + acl_revision + embedding_space_id + 模型版本等；语义缓存对近似问（"支持退款吗 vs 超过七天支持退款吗"）极度危险
- SSE：HTTP 200 后失败只能靠事件协议（meta/delta/done/error/revoked）；断连/Deadline/撤权走同一幂等取消路径，舱壁许可在流结束才释放
- 版本基线示例：JDK 21.x、Spring Boot 3.4.x/3.5.x、Spring AI 1.0.9；1,000,000 条 1536 维 float32 向量原始体积 ≈ 5.72 GiB

## Important Claims（重要论断）

### Claim 1：企业 RAG 的目标是「可验证的系统性质」而非功能演示

在给定权限、知识版本、模型配额和 SLO 下稳定产生可追溯回答；无法满足前提时安全且可解释地拒答。拆服务不是目标。

### Claim 2：召回不足不是删除过滤条件重查的理由

权限过滤早于一切外发处理；缺少租户上下文、授权服务不可用、过滤构建失败时一律拒绝受保护知识访问。

### Claim 3：撤权与删除优先于普通缓存策略

先禁新请求（更新权威 ACL/撤销目录）再异步清理，不等 TTL；已交付客户端的字节不可撤回，合规承诺必须明确这一边界。

## Concepts Introduced（引入的概念）

- [[rag-production-guardrails|企业级 RAG 生产护栏]]

## Entities Mentioned（提及的实体）

- Spring AI（1.0.9）、Milvus、Redis、Kafka、Nginx
- Spring Boot 3.4/3.5、JDK 21（虚拟线程）

## Implications（影响／启示）

RAG  Demo 到生产的距离主要在非功能面：容量测算口径、证据门禁、权限与向量空间隔离、发布/撤权恢复语义。第一周应先交付最小闭环（AccessScope+发布目录+证据短路+Deadline 舱壁+SSE 取消），混合检索/Rerank/语义缓存放后面。

## Limitations（局限）

作者自述：未在特定生产环境执行模型调用、集群部署或性能基准，所有数字为设计示例；代码只展示关键契约，须锁定依赖后编译压测。单一信源，confidence=medium。

## Related Knowledge（相关知识）

- [[langchain4j-multimodal-rag|LangChain4j 多模态 RAG：图片+表格检索实战]]
- [[knowledge-base-tech-evolution|一文搞懂知识库的技术演进]]

## Source（信源）

- `raw/sources/ai/2026-10-21-spring-ai-milvus-rag-production.md`
