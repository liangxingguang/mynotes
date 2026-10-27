---
id: 2026-10-27-agent-platform-architecture
title: 高性能弹性扩展智能体中台架构：FastAPI+Nacos+RocketMQ+LangGraph+Milvus+ES+Redis+MySQL 实践
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/3vZDwVLMVSpVk2_LOYrwGg
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [AI, RAG, 工程实践]
asset_ref: Assets/2026/10/agent-platform-architecture.md
wiki_status: pending
---

# 企业级多 Agent 中台架构实践

> 一套企业级智能体中台的完整架构方案：FastAPI（在线服务+Worker 双链路）+ Nacos（注册发现+配置热更新）+ RocketMQ（异步解耦）+ LangGraph（多 Agent 编排）+ Milvus+ES（混合检索）+ Redis+MySQL（状态与元数据）。亮点是每个组件都给出选型对比与「不选备选的理由」，以及六个生产避坑点。

## 核心要点

- **架构主线**：在线链路（同步对话）与异步链路（文档解析/长任务）物理隔离，FastAPI 双服务独立 HPA；Embedding 等 CPU 密集任务绝不进在线链路
- **选型逻辑**：Python 生态优先（LLM/RAG 工具链）→ FastAPI；注册+配置二合一 → Nacos；业务任务重试/死信/轨迹 → RocketMQ（日志流才用 Kafka）；编排状态机 → LangGraph（不自研，分布式靠 Redis+MySQL 补）
- **RAG 标配**：Milvus 向量召回 + ES 全文召回 + 重排的混合检索；Milvus 只存向量、ES 存原文、MySQL 只存元数据，各司其职
- **状态方案**：LangGraph Checkpointer 用 RedisSaver（临时）+ MySQL 快照（持久，断点续跑）；多实例同会话加分布式锁
- **六个避坑点**：LangGraph 非分布式需外部锁、Embedding 独立部署、Milvus 生产用 HNSW、MQ 消息体只传任务 ID、检索参数 Nacos 热调、多写放弃分布式事务走最终一致+定时校对

## 正文

正文约 1 万字符，完整整理稿见附件 [[Assets/2026/10/agent-platform-architecture.md]]，含技术栈选型对比表、架构分层图、同步/异步链路流程、高可用设计、项目目录结构与部署形态。

## 来源

[高性能弹性扩展智能体中台架构：FastAPI+Nacos+RocketMQ+LangGraph+Milvus+ES+Redis+MySQL 实践](https://mp.weixin.qq.com/s/3vZDwVLMVSpVk2_LOYrwGg)（微信公众号「AI技术达摩院」）

## 附件

- [[Assets/2026/10/agent-platform-architecture.md]]（抓取正文整理稿，browser 级抓取）
