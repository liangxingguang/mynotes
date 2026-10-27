---
id: wiki-source-agent-platform-architecture
type: source
title: 高性能弹性扩展智能体中台架构：FastAPI+Nacos+RocketMQ+LangGraph+Milvus+ES+Redis+MySQL 实践
status: active
created: 2026-10-27
updated: 2026-10-27
confidence: high
tags:
  - ai
  - architecture
  - rag
sources:
  - raw/sources/ai/2026-10-27-agent-platform-architecture.md
related:
  - wiki/entities/langgraph.md
  - wiki/concepts/rag-production-guardrails.md
---
# 高性能弹性扩展智能体中台架构实践

## Overview（概览）

公众号「AI技术达摩院」的企业级多 Agent 中台架构方案：FastAPI（在线服务 + Worker 双链路）+ Nacos（注册发现 + 配置热更新）+ RocketMQ（异步解耦）+ LangGraph（多 Agent 编排）+ Milvus + ES（混合检索）+ Redis + MySQL（状态与元数据）。特色是每个组件都给出备选方案与「不选备选的理由」，并附六个生产避坑点、项目目录结构与 K8s 部署形态。

## Key Facts（关键事实）

- 架构主线：**在线链路（同步对话）与异步链路（文档解析/长任务）物理隔离**，FastAPI 拆为在线服务与 RocketMQ Worker 两套无状态服务，K8s 独立 Deployment + 独立 HPA。
- 技术选型第一原则是 **LLM 生态优先**：LangGraph/Embedding/RAG 工具链绝大多数原生 Python，故选 FastAPI 而非性能更高的 Gin(Go)。
- 存储分层各司其职：Milvus 只存向量、ES 存文档块原文与元数据、MySQL 只存结构化元数据、Redis 承载会话缓存/分布式锁/限流/幂等去重。
- 混合检索链路：query → embedding → Milvus 向量召回 + ES 全文召回 → 重排。
- LangGraph 状态持久化：临时状态走 Redis（RedisSaver，会话级过期），持久状态走 MySQL 完整工作流快照（断点续跑）。
- RocketMQ Topic 规划：`agent-task-topic`（异步 Agent 任务）、`doc-parse-topic`（文档解析/分块/向量化）、`agent-event-topic`（生命周期事件）。

## Important Claims（重要论断）

### Claim 1：LangGraph 原生非分布式，分布式能力由外部存储补齐

LangGraph 解决编排能力（循环/分支/多节点工具调用/Checkpointer），但原生非分布式——多实例操作同一会话必须加分布式锁防状态覆盖，Checkpointer 用 RedisSaver + MySQL 快照补齐持久化。不自研状态机（序列化、断点续跑、并发锁、分支循环工程量巨大易有隐藏 bug）；LlamaIndex Workflow 偏单应用 RAG，多 Agent 协作弱。

### Claim 2：Embedding 等 CPU 密集任务绝对不能进在线链路

文档解析与 Embedding 独立部署、单独扩缩容不混部；大批量走 RocketMQ 异步链路，同步链路只追求低延迟。

### Claim 3：MQ 选型按场景分界——业务任务 RocketMQ、日志流 Kafka

文档解析需要重试、失败告警、死信人工处理，不是单纯日志流；Kafka 高吞吐但重试/死信/事务消息弱于 RocketMQ；RabbitMQ 海量堆积下稳定性差。

### Claim 4：检索与 Agent 参数必须可热更新

召回 topk、prompt 模板、相似度阈值、向量库连接等经 Nacos 热更新不重启调参；Nacos 注册+配置二合一减少中间件数量，namespace 隔离环境、group 分业务线。

### Claim 5：多写存储放弃分布式事务

MySQL/Milvus/ES 多写无法强一致，采用最终一致性：消费失败重试 + 定时任务校对补偿，放弃分布式事务降复杂度。消息体只传任务 ID，文档内容不进 MQ。

## Concepts Introduced（引入的概念）

- [[rag-production-guardrails|企业级 RAG 生产护栏]]（本信源为其提供第二个独立印证：Milvus+ES 混合检索标配、存储分层、参数热调）

## Entities Mentioned（提及的实体）

- [[langgraph|LangGraph]]（编排引擎，双信源）
- [[rocketmq|Apache RocketMQ]]（异步解耦底座）
- [[kafka|Apache Kafka]]（作为 RocketMQ 对照：日志流场景）
- [[elasticsearch|Elasticsearch]]（混合检索全文侧）
- FastAPI / Nacos / Milvus / Redis / MySQL（技术栈，未建页）
- 备选未选：Starlette、Tornado、Gin、Apollo、Consul、etcd、RabbitMQ、LlamaIndex Workflow、Chroma、FAISS、Qdrant、OpenSearch、Memcached、PostgreSQL/pgvector

## Implications（影响／启示）

- 企业 Agent 中台可复用的分层范式：接入层 → FastAPI 网关（鉴权/限流/路由）→ 同步 LangGraph 执行器 + 异步 RocketMQ Worker 双链路 → 四类存储分层。
- 「选型对比表 + 不选备选的理由」是沉淀架构决策的好格式，与本 Wiki 的 decision 页面契约同构。
- 六个避坑点（LangGraph 分布式锁、Embedding 独立部署、Milvus 生产用 HNSW、MQ 只传任务 ID、检索参数热调、最终一致+定时校对）均为单信源经验性断言，采信时按 confidence medium 对待。

## Limitations（局限）

- 单一公众号信源，无生产规模数字（QPS/数据量/集群规模均未给出），方案合理性为作者经验性论断。
- 未覆盖成本测算与团队规模前提；K8s Operator、OpenTelemetry 等一笔带过。

## Related Knowledge（相关知识）

- [[rag-production-guardrails|企业级 RAG 生产护栏]]
- [[langgraph|LangGraph]]
- [[a2a-multi-agent-langgraph|A2A 实战：从零搭建工业级多 Agent 协作系统]]（另一篇 LangGraph 生产化信源）
- [[agent-long-task-reliable-execution|AI Agent 长任务可靠执行]]（异步任务/状态机的另一技术栈路线）
- [[spring-ai-milvus-rag-production|Spring AI + Milvus 企业级 RAG 生产工程实践]]

## Source（信源）

- `raw/sources/ai/2026-10-27-agent-platform-architecture.md`
