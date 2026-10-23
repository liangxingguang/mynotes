---
id: wiki-source-llm-wiki-advanced-four-steps
type: source
title: LLM Wiki 知识库搭建深度教程 2·进阶篇一：四步搭建完整的 LLM Wiki 知识库系统
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - ai
  - knowledge-base
  - llm-wiki
sources:
  - raw/sources/ai/2026-10-14-llm-wiki-advanced-four-steps.md
related:
  - wiki/concepts/llm-wiki.md
  - wiki/sources/knowledge-base-tech-evolution.md
  - wiki/sources/jd-haibo-ai-knowledge-base.md
---
# LLM Wiki 知识库搭建深度教程 2·进阶篇一：四步搭建完整的 LLM Wiki 知识库系统

## Overview（概览）

系列教程进阶篇一：把验证用的纯 Markdown Wiki 升级为可持续维护的完整 LLM Wiki 系统——业界共同模式 `raw/` 不可变原始资料 + `wiki/` 编译知识 + AGENTS.md/Schema 规则，核心操作 Ingest/Query/Lint。本篇定架构、契约与权限边界，下篇才实操。**本仓库（Vault1）即按此文所述模式运行**。

## Key Facts（关键事实）

- **四原则**：Raw 是证据、Wiki 是知识、Schema 是规则、Agent 是执行器。
- **第一步·重构目录**：新增 `inbox/` 缓冲——PDF/网页/笔记/截图先进 inbox，经 Ingest 确认标准化后才进不可变 `raw/`；"inbox ≠ raw"，比直接扔 raw 更安全。
- **8 种页面类型**防 Wiki 变垃圾场：`source`（单份资料知识化摘要，最基础，其他页在其上编译）、`concept`、`entity`、`topic`、`decision`、`comparison`、`synthesis`、`timeline`。
- **第二步·重写 AGENTS.md（项目"宪法"）**：最核心是**证据不变量**——Agent 可持续改 Wiki 但不能修改证据；重要事实必须可追溯到 `raw/`，由 Lint 检查该约束。
- **第三步·统一页面架构**：Schemas 下建 Wiki_Page_Schema.md 规定"知识页面长什么样"，不让每种页面自由发挥。
- **第四步·三套 Agent Workflow 权限表**：Ingest（读 raw、建/改 wiki、改 index/log、可 Archive）/ Query（读 raw/wiki、回答问题、改 log）/ Lint（读全部、改 wiki 仅安全修复、改 index、Archive 只能建议）；**三者均无权修改 raw、无权删除知识**。

## Important Claims（重要论断）

### Claim 1：不要让一个 Agent 拥有所有能力

读写、质检职责分离，系统靠 Ingest（编译入库）/Query（消费回答）/Lint（防腐检查）三工作流协同"活起来"；权限边界要在搭建工作流时就固定下来（信源方法论立场）。

## Concepts Introduced（引入的概念）

- [[llm-wiki|LLM Wiki（概念页）]]——本文为其第 2 信源（可落地架构与权限表）

## Entities Mentioned（提及的实体）

（无）

## Implications（影响／启示）

- 本文是理解本仓库 `AGENTS.md` 四层模型与附录 A 权限表的直接出处之一：inbox/raw 分离、8 页面类型、三工作流权限表均与仓库现状一一对应（解读）。

## Limitations（局限）

- 教程篇一定架构不定实现，目录树/契约/Schema 原文需看原文代码块（抓取稿中代码块仅余首行）；下篇实操未在本库采集。

## Related Knowledge（相关知识）

- [[knowledge-base-tech-evolution|知识库技术演进（信源页）]]（LLM Wiki 模式综述，概念第 1 信源）
- [[jd-haibo-ai-knowledge-base|京东海博 AI 知识库（信源页）]]（同引 Karpathy LLM Wiki 思路的团队实践）

## Source（信源）

- `raw/sources/ai/2026-10-14-llm-wiki-advanced-four-steps.md`
