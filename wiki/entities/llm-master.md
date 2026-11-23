---
id: wiki-entity-llm-master
type: entity
title: LLM Master（llm-master 仓库）
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - entity
  - ai
  - agent
  - rag
  - learning
sources:
  - raw/sources/ai/2026-11-23-llm-master-learning-roadmap.md
related:
  - wiki/concepts/rag.md
  - wiki/concepts/agent-loop.md
  - wiki/sources/2026-11-23-llm-master-learning-roadmap.md
---
# LLM Master（llm-master 仓库）

## Overview（概览）

LLM Master 是作者 youngyangyang04 在 GitHub 开源的大模型应用开发学习路线仓库，定位"程序员的大模型全栈学习路线"。将多年大模型技术文章按六阶段知识依赖整理，配可交付项目与面试路线，形成知识—项目—简历—面试闭环。作者称其为"目前全网最完整、最适合程序员的大模型应用开发学习路线之一"。

## Identity（身份信息）

- Type（类型）: GitHub 开源学习仓库（Markdown 文档集）
- Organization（所属组织）: youngyangyang04（作者，个人开源；作者另维护卡码笔记 https://notes.kamacoder.com/）
- Role（角色）: 大模型应用开发（Agent、RAG）学习路线与配套资源
- Status（状态）: active（持续更新）

## Important Facts（重要事实）

- **规模**：172 个 Markdown 文件，150+ 篇中文教程，含教程、路线、专题索引与面试资料（作者本地统计，持续更新）。
- **六阶段路线**（按知识依赖排序，每阶段标注完成标志）：
  1. **全局认知**：岗位、术语、技术版图
  2. **模型调用**：Prompt、流式输出、结构化输出、Function Calling
  3. **RAG**：切片、Embedding、检索、Rerank、引用、评估
  4. **Agent**：工具、状态、规划、记忆、权限、失败恢复
  5. **生产工程**：部署、缓存、量化、压测、监控、容量规划
  6. **原理与面试**：Transformer 原理 + 项目表达
- **覆盖范围**：基础入门、应用开发、RAG、Agent、微调（SFT/RLHF/DPO/LoRA/QLoRA/蒸馏及与 RAG 选型）、部署性能（vLLM/SGLang/KV Cache/PagedAttention/量化/压测）、Transformer（Q/K/V/Attention/位置编码/FFN/LayerNorm/手写实现）、AI 编程（Claude Code/Agent CLI/Skills/Hooks/MCP）、求职面试（RAG/Agent/微调/Transformer/AI 编程/真实面经）。
- **索引体系**：全量资料索引与专题索引（docs/README.md），可按 RAG/Agent/微调/部署/Transformer/AI 编程进入专题，或在全量索引查具体问题；可当课程从头学，也可当手册按问题查。
- **可交付项目**（每阶段）：流式 AI 应用（流式输出/JSON Schema/错误处理/成本统计）、含混合检索/Rerank/答案引用/固定评测集的企业知识库、有权限边界/Checkpoint/Trace/失败恢复/完成率评估的工具型 Agent、生产化服务（限流/缓存/监控/灰度/P99/TTFT/TPOT/容量报告）。
- **使用建议**：零基础从 roadmap 六阶段起步；有 API 经验直接进 RAG/Agent 专题边看边做；求职从面试路线切入练"业务—选型—设计—评估—优化"表达；遇具体问题查全量索引。

## Products / Projects（产品／项目）

- 六阶段学习路线（docs/roadmap/README.md）
- 全量资料索引与专题索引（docs/README.md）
- 各阶段可交付项目标准（流式 AI 应用 / 企业知识库 / 工具型 Agent / 生产化服务）
- 大模型面试路线（含高频题与真实面经）

## Relationships（关系）

- [[rag|RAG（检索增强生成）]]：路线第三阶段，覆盖切片/Embedding/检索/Rerank/引用/评估；配套项目为企业知识库。
- [[agent-loop|Agent Loop]]：路线第四阶段，覆盖工具/状态/规划/记忆/权限/失败恢复；配套项目为可追踪可恢复的工具型 Agent。
- [[2026-11-23-llm-master-learning-roadmap|全网硬核大模型应用开发学习路线（信源页）]]：本实体的信源页。

## Timeline（时间线）

- 2026-11-23 — 本知识库新增信源，记录该仓库的定位、六阶段路线、覆盖范围、索引体系与可交付项目标准。

## Current Understanding（当前认知）

LLM Master 是一个以"可执行的学习路线"为差异化的大模型应用开发开源仓库：按知识依赖拆六阶段、标注每阶段完成标志、配可交付项目，把"看文章"转化为"做作品"。其价值在于组织方式而非单篇内容——覆盖应用开发到原理、Demo 到生产、学习到求职的完整链条，并以专题索引与全量索引支撑"按路线学"与"按问题查"两种用法。规模与内容为作者自报、持续更新，"全网最完整"为主观判断，需结合仓库实际核验。

## Evidence（证据）

- `raw/sources/ai/2026-11-23-llm-master-learning-roadmap.md`（作者自述、自报规模数据，单信源，置信度中——组织方式有明确结构佐证，规模数据未经独立核验）
