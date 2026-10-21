---
id: 2026-10-21-spring-ai-milvus-rag-production
title: Spring AI + Milvus 企业级 RAG 生产工程实践
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/HgQxSmTRD--3QLTWR7c4wQ
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [AI, spring, 工程实践]
asset_ref: Assets/2026/10/spring-ai-milvus-rag-production.md
wiki_status: pending
---

# Spring AI + Milvus 企业级 RAG 生产工程实践

> 以多租户电商客服知识库为例的可评审、可压测、可回滚 RAG 工程方法。核心立场：Spring AI/Milvus 不替你保证权限、发布生效时机、证据充分性与故障收敛——企业 RAG 的目标是「在给定权限、知识版本、模型配额和 SLO 下稳定产生可追溯回答，无法满足时安全拒答」。四条主线贯穿全文：容量（入口 QPS≠生成能力，用 Little 定律算在途）、证据（模型调用前的证据门禁，无证据短路拒答）、权限（AccessScope 服务端构造、过滤条件只能由适配层生成）、恢复（写入 ACK≠全局可见，发布目录原子切换）。附缓存键安全语义、SSE 取消协议、故障实验矩阵与第一周最小闭环清单。

## 核心要点

- **容量口径**：入口 QPS、检索 QPS、生成启动速率、完整回答吞吐、活跃流是五个不同指标；10k 入口 QPS × 缓存命中 80% × 拒答 25% = 实际生成 1500 次/秒
- **Little 定律**：在途数 L = 完成速率 λ × 停留时间 W；队列只吸收短突发，5000 槽位只会让拒绝变成更贵更晚的超时
- **权限三件套不可拆**：tenantId/kbId/aclRevision 必须服务端生成（不信请求 JSON）；过滤表达式只能由适配层构造（业务方不得直造原生 MilvusSearchRequest）；召回不足不是删过滤重查的理由
- **向量空间隔离**：embeddingSpaceId=模型+维度+归一化+预处理的不可变组合，同维度不同模型也是不同语义空间，禁止混写
- **证据门禁**：RetrievalAugmentationAdvisor 空上下文只是"指示模型别答"≠不调用模型；要求零生成费用必须在编排层显式短路
- **发布语义**：kb_revision 原子切换（条件更新/单调序号防慢任务覆盖）；增量版本不能直接把全库查询切到新 revision（未改文档会消失）；撤权先禁新请求再异步清理，不等 TTL
- **缓存安全**：答案缓存键必须含 kb_revision+acl_revision+embedding_space_id+模型版本；语义缓存对"支持退款吗 vs 超过七天支持退款吗"这类近似问极度危险
- **SSE 治理**：HTTP 200 后失败只能靠事件协议（meta/delta/done/error/revoked）；断连/Deadline/撤权走同一幂等取消路径，舱壁许可在流结束才释放
- **落地顺序**：第一周先交付 AccessScope+发布目录+证据短路+Deadline 舱壁+SSE 取消，混合检索/Rerank/语义缓存放后面

## 正文

全文（含 AccessScope/ScopedRetriever/Bulkhead 代码、Chunk Schema 表、故障实验矩阵、容量测算公式）见 [[Assets/2026/10/spring-ai-milvus-rag-production]]。

## 来源

[Spring AI + Milvus 企业级 RAG 生产工程实践：可验证的知识、权限、容量与恢复](https://mp.weixin.qq.com/s/HgQxSmTRD--3QLTWR7c4wQ)

## 附件

- [[Assets/2026/10/spring-ai-milvus-rag-production]]
