---
id: wiki-concept-rag-production-guardrails
type: concept
title: 企业级 RAG 生产护栏
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - concept
  - ai
  - rag
sources:
  - raw/sources/ai/2026-10-21-spring-ai-milvus-rag-production.md
related:
  - wiki/sources/spring-ai-milvus-rag-production.md
---
# 企业级 RAG 生产护栏

## Definition（定义）

把 RAG 从「文档进向量库、模型给回答」的演示形态，提升为「在给定权限、知识版本、模型配额和 SLO 下稳定产生可追溯回答，无法满足前提时安全且可解释地拒答」的生产系统所需的一组工程机制，围绕容量、证据、权限、恢复四条主线展开。

## Why It Matters（为什么重要）

Spring AI/Milvus 等框架只解决集成与检索，不替应用保证：用户是否有权看到某条知识、发布何时在所有读路径生效、检索结果是否足以支撑答案、超载/撤权/故障时系统如何收敛。这四件事恰是企业 RAG 事故与合规风险的来源。

## Core Characteristics（核心特征）

1. **容量口径统一**：入口 QPS ≠ 生成能力；区分入口/检索/生成启动/完成吞吐/活跃流五个指标，用 Little 定律（L=λW）估在途，舱壁无等待准入，队列只吸收短突发。
2. **证据门禁前置**：模型调用前完成授权→缓存→受限检索→权限复核→Rerank→证据选择；证据不足显式短路拒答（Advisor 的空上下文提示 ≠ 不调用模型）。
3. **权限/版本/向量空间不可拆**：AccessScope 服务端构造；过滤表达式只能由适配层生成；`embeddingSpaceId`（模型+维度+归一化+预处理）隔离语义空间，禁止混写。
4. **发布与恢复语义**：版本状态机 + 发布目录原子切换（条件更新/单调序号）；写入 ACK ≠ 全局可见；撤权先禁新请求再异步清理，不等 TTL。
5. **流式治理**：SSE 事件协议（meta/delta/done/error/revoked）；断连/Deadline/撤权走同一幂等取消路径，许可在流结束才释放。

## How It Works（运作方式）

在线路径：网关 → 编排（授权、Deadline、准入）→ 带 ACL/版本的答案缓存 → 受限检索与混合召回 → 证据/权限/注入策略 → 充分则生成走 SSE，不足则明确拒答。离线路径：原文对象存储 → 任务表+Outbox → 独立 Worker（解析/分块/Embedding）→ 验证与发布目录。缓存键必须含知识修订、ACL 修订、向量空间与模型版本，使命中前先命中同一安全语义。

## Relationships（关系）

### Related Concepts（相关概念）

- [[llm-wiki|LLM Wiki]]（另一种「可追溯知识」形态：原始层不可变 + 每条承重事实可回溯）

### Distinctions（区分）

- 与演示级 RAG 的区别：演示只验证功能通路；生产护栏把权限、版本、容量、恢复变成可压测、可回滚的系统性质（故障实验矩阵驱动验收）。
- 与「框架自带 Advisor 流程」的区别：Advisor 协助标准流程但不保证零费用拒答与权限过滤不可移除，关键约束必须落在应用编排层与适配层。

## Open Questions（开放问题）

- 文中所有容量数字为设计示例，真实生产基线（不同过滤选择率下的召回/P99）当前信源未确立，需自行压测。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-21-spring-ai-milvus-rag-production.md`

## Related Knowledge（相关知识）

- [[spring-ai-milvus-rag-production|Spring AI + Milvus 企业级 RAG 生产工程实践（信源页）]]
- [[langchain4j-multimodal-rag|LangChain4j 多模态 RAG 实战]]
- [[knowledge-base-tech-evolution|知识库的技术演进]]
