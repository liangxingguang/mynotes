---
id: wiki-source-zhihu-agent-column-index
type: source
title: 知乎专栏《Agent》系列索引（10 篇合集）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - source
  - ai-agent
  - series
sources:
  - raw/sources/ai/2026-10-28-zhihu-agent-column-index.md
related:
  - wiki/sources/agent-panorama-roadmap.md
  - wiki/sources/agent-classic-agent-theory.md
  - wiki/sources/agent-loop-context-management.md
  - wiki/sources/agent-model-selection-reasoning.md
  - wiki/sources/agent-harness-framework-selection.md
  - wiki/sources/agent-llm-call-patterns.md
  - wiki/sources/agent-minimal-handwritten.md
  - wiki/sources/agent-rest-api-as-tools.md
  - wiki/sources/agent-tool-security-whitelist.md
---
# 知乎专栏《Agent》系列索引（10 篇合集）

## Overview（概览）

知乎专栏《Agent》系列共 10 篇教程，从经典智能体理论与 agent loop 五阶段出发，逐步深入模型/harness 选型、手写最小 agent、真实 REST API 变工具，最终收束于工具工程化（token 重登、错误分层喂回、确认闸门）与全谱系安全边界。本页为系列索引，各篇已有独立 source 页面。

## Key Facts（关键事实）

- **系列结构**：Part 1-2 打开黑盒（Agent 是什么、经典五类智能体、PMTA 坐标系）→ Part 3 agent loop 与上下文管理 → Part 4-5 模型选型与 harness 框架选型 → Part 6-8 手写闭环（三种 LLM 调用姿势 → 最小 agent M1 → REST 接口变工具 M2）→ Part 9-10 工具工程化与安全边界。
- **已收录 9 篇**：Part 1-8 与 Part 10 已有独立 source 页面；Part 9（真实世界的工具工程设计）链接未在抓取结果中单独列出，暂无独立页面。
- **抓取方式**：jina reader，首次触发知乎安全验证，等待后重试成功。

## Important Claims（重要论断）

### Claim 1：Agent 学习路线是"从理论到手写再到工程化"的递进

系列按 Part 1→10 逐步深入：先理解 Agent 是什么和经典理论，再动手写最小 agent，最后补上工程化（token 过期重登、错误分层、危险操作确认）与安全边界（工具参数注入、防线外移）。这条路线覆盖了从"理解概念"到"能上生产"的完整能力栈。

### Claim 2：工具工程化是 agent 从 demo 到生产的关键一步

Part 9-10 专门讨论把"裸奔版"工具调用补成工程做法：token 过期自动重登、错误分层喂回（哪些错误喂回模型、哪些直接终止）、危险操作二次确认与审计、工具参数注入防线外移。这些是 demo 与生产之间的核心差距。

### Claim 3：harness 框架选型的核心标准是"能接不同大模型、多 agent/多 skill/多运行模式、能上生产"

Part 5 直接给出选型结论：面向"维护既有系统"的需求，harness 须满足三个条件——能接不同大模型、支持多 agent/多 skill/多运行模式、能上生产。这三条标准可作为评估任何 agent harness 框架的基线。

## Concepts Introduced（引入的概念）

无新概念页。各篇概念性知识由已有概念页面承载（agent-loop、pmta-framework、aima-agent-taxonomy、harness-engineering、tool-schema-as-prompt、agent-permission-model、rest-api-as-tools 等）。

## Entities Mentioned（提及的实体）

- 知乎专栏作者（Agent 系列教程作者）
- PMTA 四要素坐标系（见 [[pmta-framework]]）
- 经典 AI 五类智能体（见 [[aima-agent-taxonomy]]）

## Implications（影响／启示）

本系列是一套完整的 LLM Agent 入门到进阶教程，覆盖面从理论到实践。已收录的 9 篇 source 页面与相关概念页面构成了 agent 知识体系的骨架。Part 9 缺失是唯一缺口，未来若获取到该篇原文可补录。

## Limitations（局限）

- 本页仅为系列索引，不含各篇正文；正文内容见各独立 source 页面。
- Part 9 链接未在抓取结果中单独列出，该篇内容暂缺。
- 系列文章为知乎专栏内容，观点未经独立学术核验。

## Related Knowledge（相关知识）

- [[agent-panorama-roadmap|Agent - 全景与学习路线地图（1）]]
- [[agent-classic-agent-theory|Agent - 经典智能体理论（2）]]
- [[agent-loop-context-management|Agent - agent loop与上下文管理（3）]]
- [[agent-model-selection-reasoning|Agent - 模型选型与推理能力（4）]]
- [[agent-harness-framework-selection|Agent - harness 框架怎么选（5）]]
- [[agent-llm-call-patterns|Agent - 调用 LLM 的三种姿势（6）]]
- [[agent-minimal-handwritten|Agent - 手写最小 agent（7）]]
- [[agent-rest-api-as-tools|Agent - 后台API变成工具（8）]]
- [[agent-tool-security-whitelist|Agent - 工具全谱系与安全边界（10）]]
- [[ai-agent-series-album|AI Agent 系列合集（82 篇）]]

## Source（信源）

- `raw/sources/ai/2026-10-28-zhihu-agent-column-index.md`
