---
id: wiki-entity-langgraph
type: entity
title: LangGraph
status: active
created: 2026-10-27
updated: 2026-10-27
confidence: medium
tags:
  - entity
  - ai
  - agent
sources:
  - raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md
  - raw/sources/ai/2026-10-27-agent-platform-architecture.md
related:
  - wiki/concepts/agent-loop.md
  - wiki/concepts/rag-production-guardrails.md
---
# LangGraph

## Overview（概览）

LangGraph 是 LangChain 生态的 Agent 编排框架，以状态机驱动 Agent/多 Agent 协作：管理对话历史、工具返回与中间推理结果，原生支持循环、分支、多节点工具调用与状态持久化（Checkpointer）。在本知识库中被两篇信源用作生产级多 Agent 系统的编排核心。

## Identity（身份信息）

- Type（类型）: 开源 Agent 编排框架（Python）
- Organization（所属组织）: LangChain（推测——信源未显式陈述，以其生态归属为常识性事实标注为推断）
- Role（角色）: Agent 编排状态机引擎
- Status（状态）: 活跃（2026 年仍被生产实践采用）

## Important Facts（重要事实）

- 核心能力：循环/分支控制流、多节点工具调用、状态可序列化、Checkpointer 状态持久化；支持单 Agent+工具与多 Agent 协作（规划/检索/校验/总结）两种模式。
- **原生非分布式**：多实例操作同一会话需外部分布式锁防状态错乱；生产中 Checkpointer 配 RedisSaver（临时状态）+ MySQL 快照（持久、断点续跑）。
- 生产定位（信源 2 论断）：解决编排能力，分布式能力由外部存储（Redis+MySQL）补齐；不自研状态机的理由是序列化、断点续跑、并发锁、分支循环工程量巨大且易有隐藏 bug。
- A2A 实战信源中的依赖版本：`langgraph==0.2.15`（2026-10-13 教程语境）。

## Relationships（关系）

- [[agent-loop|Agent Loop]]：LangGraph 是 Agent Loop 的一种框架化实现（模型-工具循环 + 状态管理）。
- LangChain / python-a2a：A2A 实战信源中与 LangGraph 组合构建多 Agent 系统。
- [[rocketmq|Apache RocketMQ]]：在中台架构中承担 LangGraph 长耗时任务的异步卸载。

## Timeline（时间线）

- 2026-10-13 — A2A 实战教程以 langgraph 0.2.15 搭建多 Agent 旅行规划系统（星型拓扑）。
- 2026-10-27 — 企业级 Agent 中台信源将其列为编排核心并给出生产化补齐方案（RedisSaver + 分布式锁 + MySQL 快照）。

## Current Understanding（当前认知）

LangGraph 在「要不要自研编排状态机」的决策中胜出靠生态与工程量权衡；其已知短板（非分布式）有成熟的工程补齐路径（外部锁 + 混合持久化）。两个信源均为使用方视角，框架官方演进细节当前信源未确立。

## Evidence（证据）

- `raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md`（教程级使用：版本、多 Agent 拓扑）
- `raw/sources/ai/2026-10-27-agent-platform-architecture.md`（生产化论断：非分布式短板、RedisSaver+MySQL 补齐、与 LlamaIndex Workflow 的取舍）
