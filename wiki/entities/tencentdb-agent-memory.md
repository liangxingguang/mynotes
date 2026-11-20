---
id: wiki-entity-tencentdb-agent-memory
type: entity
title: TencentDB Agent Memory
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: medium
tags:
  - entity
  - ai
  - agent
sources:
  - raw/sources/ai/2026-11-20-ontology-rsi-coding-agent.md
related:
  - wiki/concepts/three-layer-project-graph.md
  - wiki/concepts/ontology.md
  - wiki/concepts/recursive-self-improvement.md
---
# TencentDB Agent Memory

## Overview（概览）

腾讯云数据库团队开源的 Agent 记忆系统，承载团队在研发 Loop 中使用的四类记忆资产（Chat Memory、Wiki、CodeGraph、Skill）与三层互索引项目图谱的工程实践。已在 GitHub 开源，面向社区共建 Agent 记忆基础设施（信源 2026-11-20）。

## Identity（身份信息）

- Type（类型）: 开源 Agent 记忆系统/基础设施
- Organization（所属组织）: 腾讯云数据库团队
- Role（角色）: Agent 研发 Loop 中的知识保存与复用基础设施
- Status（状态）: 已开源（GitHub）

## Important Facts（重要事实）

- 承载四类记忆资产：Chat Memory（对话中的背景、澄清与决定）、Wiki（业务与架构知识）、CodeGraph（代码结构和依赖）、Skill（可复用的处理方法）
- 支撑三层互索引项目图谱：工程事实（静态）、项目语义（本体体现层）、bug_fixed（历史经验）
- 内部 Bug 定位试验成功率 58%→65%（+7pp），为初步正向结果
- 开源仓库：github.com/Tencent/TencentDB-Agent-Memory

## Products / Projects（产品／项目）

- [[tencentdb-agent-memory|TencentDB Agent Memory]]（本页）

## Relationships（关系）

- [[three-layer-project-graph|三层互索引项目图谱]]：系统承载的核心知识组织结构
- [[ontology|Ontology]]：本体体现在项目语义层的概念与约束表达
- [[recursive-self-improvement|递归自我改进（RSI）]]：系统在研发 Loop 中探索 RSI 的实践载体

## Timeline（时间线）

- 2026-11-21 — 信源首次记录项目开源信息与团队实践（内部研发 Loop 中的 Memory 与三层图谱）。

## Current Understanding（当前认知）

TencentDB Agent Memory 是腾讯云数据库团队 Agent 记忆系统的开源载体，核心实践是在研发 Loop（设计完成→上线前测试由 Agent 承担）中用四类记忆资产加三层互索引图谱组织项目知识。当前对系统的具体实现细节、评测集构造方法、开源仓库的实际功能范围在信源中未详述，需独立核验。

## Evidence（证据）

- `raw/sources/ai/2026-11-20-ontology-rsi-coding-agent.md`
