---
id: wiki-entity-deepagents
type: entity
title: deepagents
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - entity
  - ai-agent
  - harness
sources:
  - raw/sources/ai/2026-10-28-agent-harness-framework-selection.md
---
# deepagents

## Overview（概览）

deepagents 是 LangChain 官方的「batteries-included」agent harness 库：`create_deep_agent(...)` 一个函数即可建出带完整 harness 的 agent，底层是 [[langgraph|LangGraph]]（复用其 checkpoint/流式/持久化），观测走 LangSmith。

## Identity（身份信息）

- Type（类型）: Python agent harness 库（PyPI `deepagents`，2026-10-19 核验 0.7.28，需 Python 3.11+）
- Organization（所属组织）: LangChain 公司
- Role（角色）: 在 LangGraph 图运行时之上打包好的 harness（图运行时 ≠ harness）
- Status（状态）: 活跃维护（信源 2026-10-19 核验）

## Important Facts（重要事实）

- 默认自带：`ls/read_file/write_file/edit_file/glob/grep/execute/task` 等工具、上下文管理、子 agent、持久记忆、HITL 审批、skills、任意 MCP server 接入。
- 关键参数：`model`（`str | BaseChatModel`，换模型只换这一处）、`tools`、`subagents`、`skills`、`permissions`、`interrupt_on`、`checkpointer`、`memory`、`system_prompt`。
- 接 DeepSeek：`langchain-deepseek` 的 `ChatDeepSeek`（PyPI 1.1.1），key 走 `DEEPSEEK_API_KEY` 环境变量。
- 不内置「运行模式」菜单：只读/审批/计划等模式靠「system prompt + 工具子集 + interrupt_on」组合实现。

## Products / Projects（产品／项目）

- 与 LangChain 三层塔的关系：[[langgraph|LangGraph]]（图运行时底座）→ `create_agent` / deepagents（agent 层）→ LangSmith（观测）；LangChain 链式 API（LCEL）已拆入 langchain-classic 并标 legacy。

## Relationships（关系）

- [[langgraph|LangGraph]]：deepagents 的底层运行时（依赖）。
- [[deepseek-harness|DeepSeek Harness]]：同场选型的竞争候选（DSH 多模式/插件化更全但处 developer preview）。
- [[pi|Pi]]：成品 harness（产品形态），deepagents 是可嵌入 Python 项目的库——形态不同。

## Timeline（时间线）

- 2026-10-19 — 信源核验版本 deepagents 0.7.28
- 2026-10-28 — 知乎《Agent》系列第 5 篇将其选为「维护既有系统」场景的首选 harness（本信源）

## Current Understanding（当前认知）

在「多模型/多 agent/多 skill + 生产可维护」的 Python harness 选型中处第一档（见 [[harness-selection-deepagents|选型决策]]）；主要代价是默认件多带来的黑盒感与 LangChain 栈绑定。当前仅单信源（选型文，作者已对照官方 README/源码核验）。

## Evidence（证据）

- `raw/sources/ai/2026-10-28-agent-harness-framework-selection.md`
