---
id: wiki-concept-rag-production-guardrails
type: concept
title: 企业级 RAG 生产护栏
status: active
created: 2026-10-23
updated: 2026-10-27
confidence: medium
tags:
  - concept
  - ai
  - rag
sources:
  - raw/sources/ai/2026-10-21-spring-ai-milvus-rag-production.md
  - raw/sources/ai/2026-10-27-agent-platform-architecture.md
  - raw/sources/ai/2026-11-01-enterprise-rag-platform-langgraph-mcp.md
related:
  - wiki/sources/spring-ai-milvus-rag-production.md
  - wiki/sources/agent-platform-architecture.md
  - wiki/sources/2026-11-01-enterprise-rag-platform-langgraph-mcp.md
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

第二信源（智能体中台架构，FastAPI+LangGraph 技术栈）从平台侧独立印证了其中多条形态：Milvus 向量召回 + ES 全文召回 + 重排的混合检索被其称为「企业 RAG 中台标配」；存储分层各司其职（Milvus 只存向量、ES 存原文、MySQL 只存元数据）；离线解析/Embedding 走 MQ 异步 Worker 且绝不进在线链路，与本页「离线路径独立 Worker」一致；召回 topk/相似度阈值/重排策略经配置中心（Nacos）热更新不重启调参；MySQL/Milvus/ES 多写放弃分布式事务、走最终一致 + 定时校对。该信源同时给出两条本页未覆盖的工程边界：Embedding 服务独立扩缩容不混部（CPU 密集），Milvus 生产环境用 HNSW 索引而非 FLAT。

第三信源（Spring Boot 4 × LangGraph × MCP × Milvus 企业级 RAG 平台）从更完整的平台架构侧给出六大设计原则与两条核心链路的实现细节，印证并扩展了本页框架：①**重活异步化**——文档上传走 RocketMQ 异步（上传立即返回 docId，解析/分块/向量化交给 Python 消费者），与本页「离线路径独立 Worker」同构；②**治理能力默认影子模式**——强管控开关（Casbin 强制、配额管控、条件访问）默认观察态运行一周，校验无误再逐项开启强制拦截，避免误伤导致业务方否定整套系统；③**增强能力全是旁路，失败自动降级不阻断主链路**——记忆检索失败降级会话摘要、Rerank 失败降级 RRF 排序、PII 脱敏失败返回原文不阻断问答——本页「证据门禁前置」与「流式治理」在异常路径上的具体化；④**多租户隔离靠 MyBatis-Plus TenantLineInnerInterceptor 框架兜底**——与本页「AccessScope 服务端构造」同一条线，框架层自动注入租户条件防漏写；⑤**混合检索 RRF 融合 + gte-rerank 精排**——双路召回（Milvus 向量 + ES BM25）各 20 条，RRF 融合（只依赖排名不依赖分数，K=60）再 gte-rerank-v2 精排取 top5，印证本页「受限检索与混合召回」；⑥**幻觉拒答底线**——相关性裁判两层闸门（相关性地板 max<0.15 直接拒答省 LLM 调用 + LLM 裁判），资料不足走 intent_route→MCP 工具→无工具则 refuse，拒答时清空引用列表——印证本页「证据不足显式短路拒答」；⑦**SSE 事件契约**——refs/delta/done/error 四类事件，refs 延迟到 generate 启动才下发（避免拒答时已渲染卡片再撤回），前端必须用 fetch 不用 EventSource（无法带 JWT），网关必须 WebFlux 响应式版本才能不缓冲透传——印证并细化本页「流式治理」；⑧**MCP 工具调用真实用户身份**——grade 判定资料不足先意图路由（动态拉 MCP 工具列表转 Function Calling），工具调用必须携带真实用户身份（uid/tid/role 5 分钟短时 JWT），用 contextExtractor 而非 ThreadLocal（SSE 长连接异步线程会丢上下文）——这是企业 RAG 平台「能查业务」的安全红线；⑨**五层记忆模型 + 加权遗忘**——工作/情景/语义/程序/归档五层记忆，score = relevance × importance × exp(−λ·Δt) 加权遗忘（importance≥2 豁免遗忘），Milvus 只存向量+引用 ID 保证删除一致性——扩展本页未覆盖的「长期记忆」维度；⑩**跨语言契约字段逐字对齐**——Python 侧 Pydantic 驼峰 = Java 侧 Record，不依赖 Jackson 自动命名策略转换，少一层配置少一层静默 null 的隐性 Bug。

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
- Source: `raw/sources/ai/2026-10-27-agent-platform-architecture.md`（第 2 信源：平台侧印证混合检索/存储分层/异步离线链路/参数热调/最终一致，新增 Embedding 独立部署与 Milvus 生产用 HNSW 两条边界）
- Source: `raw/sources/ai/2026-11-01-enterprise-rag-platform-langgraph-mcp.md`（第 3 信源：六大设计原则、重活异步化、影子模式治理、旁路降级、RRF 融合+gte-rerank、相关性裁判拒答、SSE 事件契约、MCP 工具调用真实用户身份、五层记忆模型+加权遗忘、跨语言契约字段逐字对齐）

## Related Knowledge（相关知识）

- [[spring-ai-milvus-rag-production|Spring AI + Milvus 企业级 RAG 生产工程实践（信源页）]]
- [[agent-platform-architecture|高性能弹性扩展智能体中台架构实践（信源页）]]
- [[2026-11-01-enterprise-rag-platform-langgraph-mcp|Spring Boot 4 × LangGraph × MCP × Milvus：企业级 RAG 平台（信源页）]]
- [[langchain4j-multimodal-rag|LangChain4j 多模态 RAG 实战]]
- [[knowledge-base-tech-evolution|知识库的技术演进]]
