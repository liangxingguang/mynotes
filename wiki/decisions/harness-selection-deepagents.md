---
id: wiki-decision-harness-selection-deepagents
type: decision
title: Harness 选型决策：首选 deepagents
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - decision
  - ai-agent
  - harness
sources:
  - raw/sources/ai/2026-10-28-agent-harness-framework-selection.md
related:
  - wiki/entities/deepagents.md
  - wiki/concepts/harness-engineering.md
---
# Harness 选型决策：首选 deepagents

## Decision（决策内容）

为「用现代 harness 维护既有系统（调用现有后台 API）」的 Python 场景选定生产 harness：**首选 [[deepagents|deepagents]]（LangChain 官方），备选 Microsoft Agent Framework（MAF），DeepSeek Harness 因 developer preview 暂作架构参考/POC**。

## Context（背景）

需求六条硬标准：多模型无关（DeepSeek/OpenAI/Claude/Ollama 只换配置）、多 agent（隔离上下文委派）、多 skill（命名技能按需加载）、多运行模式（单轮/长任务/只读/审批）、功能全面且封装好（八件套一个入口）、生产可维护（断点续/审批/trace）。模型已选定（系列第 4 篇），缺的是 harness——即 [[harness-engineering|Model + Harness = Agent]] 中的 Harness 侧。

## Options Considered（考虑过的方案）

### Option A：deepagents（选中）

`create_deep_agent(...)` 一个函数带齐八件套（默认文件系统工具、子 agent、上下文管理、持久记忆、HITL、skills、任意 MCP server），底层 [[langgraph|LangGraph]]（checkpoint/流式/持久化复用）+ LangSmith trace/eval；多模型换 chat model 对象一处；模式靠组合（system prompt + 工具子集 + interrupt_on）。

### Option B：Microsoft Agent Framework（备选）

teams/handoff/group 多 agent 流程、中间件、checkpoint、HITL、Agent Skills、OpenTelemetry，Python/.NET/Go 一套 API，多 provider 原生。代价：概念重（workflow/middleware/process），不绑 Azure 时配置自理。

### Option C：DeepSeek Harness（暂缓）

多模式（标准/PTC/极简/创造）+ 插件化三家最全，但 developer preview——官方原话 "THERE WILL BE COMPATIBILITY-BREAKING CHANGES"。

### 排除项（一句话理由）

LangGraph 裸框架（图运行时非 harness，八件套全自拼）、claude-agent-sdk（绑死 Claude）、openai-agents（接 DeepSeek 有适配税）、Google ADK / AWS Strands（绑云）、CrewAI（角色/任务抽象偏业务剧本）、手写（生产期 = 重复造八件套）、pydantic-ai / smolagents（轻封装/教材，补件太多）。

## Rationale（理由）

deepagents 胜在：八件套齐 + 封装一个函数 + 生态最大且中文资料多 + 与在学的 LangGraph 一脉相承；四条能力轴上「多模型/多 agent/多 skill」均为命名参数开箱即有，「多模式」用组合实现可满足。决策规则：立刻稳定上生产 + 生态大 + 封装好 → deepagents；企业治理 + 多语言 + 流程化 → MAF；多模式开箱 + 主锁 DeepSeek + 接受 preview → DSH。

## Consequences（后果）

### Positive（正面）

- 14 行最小跑通（`create_deep_agent` + `ChatDeepSeek`）；生产化收口路径明确（permissions= 收紧文件系统 → 统一工具出口/MCP → interrupt_on= 审批 → checkpointer=/LangSmith 断点续跑与 trace）。

### Negative（负面）

- 可控性中低：默认件多，黑盒感强（对策：系列 6-7 篇先手写 loop 看懂每一行）；绑 LangChain 栈；不内置「模式」菜单需自行组合。

## Constraints（约束条件）

- Python 3.11+；模型串以 DeepSeek 官方清单为准（框架文档出现过 `deepseek-v4-flash` 等过时写法）；版本快照 2026-10-19（deepagents 0.7.28）。

## Evidence（证据）

- `raw/sources/ai/2026-10-28-agent-harness-framework-selection.md`

## Reconsideration Criteria（重新评估条件）

- DeepSeek Harness 发布稳定版（撤出 developer preview）且主锁 DeepSeek 时；
- 需求转向企业治理/多语言（.NET/Go）/强流程化多 agent 时切 MAF；
- deepagents 停止维护或许可证变更。

## Evolution（演进）

- 2026-10-29 — 新建，信源为知乎《Agent》系列第 5 篇选型文。
