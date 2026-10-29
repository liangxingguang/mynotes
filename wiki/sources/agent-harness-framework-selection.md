---
id: wiki-source-agent-harness-framework-selection
type: source
title: Agent - harness 框架怎么选（5）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - ai-agent
  - harness
  - 选型
sources:
  - raw/sources/ai/2026-10-28-agent-harness-framework-selection.md
---
# Agent - harness 框架怎么选（5）

## Overview（概览）

知乎专栏《Agent》系列第 5 篇：面向「用现代 harness 维护既有系统」的需求做框架选型——在 deepagents / Microsoft Agent Framework / DeepSeek Harness 三家中按 harness 八件套 + 四个能力轴打分，结论首选 deepagents；并对 12 个边缘候选各给一句话定位。全部版本号与 star 数经 PyPI/GitHub API 当日核验（2026-10-19）。

## Key Facts（关键事实）

- harness ≠ 随便一个 agent 库 ≠ LangGraph：harness 是 agent loop 的工程外壳，八件套 = loop+终止、工具注册、权限/HITL、持久化、上下文管理、子 agent、MCP、可观测；公式 Model + Harness = Agent（§1）。
- 四个能力轴：多模型（换配置不重写）、多 agent（隔离上下文委派）、多 skill（命名技能按需加载）、多模式（单轮/长任务/只读/审批）（§1）。
- 八件套三家中齐；DeepSeek Harness 在「多模式 + 插件化」最全但处 developer preview（官方明示会有破坏性变更）（§2）。
- 版本核验（2026-10-19 PyPI）：deepagents 0.7.28、langgraph 1.2.16、agent-framework 1.22.0、langchain 1.4.6、openai-agents 0.24.0、google-adk 2.12.0、strands-agents 1.61.1、crewai 1.15.28、smolagents 1.26.0、claude-agent-sdk 0.2.168。
- LangChain 链式 API（LCEL）已被官方拆进 langchain-classic 并标 legacy；SK/AutoGen 已被 Microsoft Agent Framework 收口（§3）。

## Important Claims（重要论断）

### 首选 deepagents

`create_deep_agent(...)` 一个函数带齐默认工具（ls/read_file/write_file/edit_file/glob/grep/execute/task）、子 agent、上下文管理、持久记忆、HITL 审批、skills、任意 MCP server；LangGraph 底座 + LangSmith 观测；多模型只换 chat model 对象。

### LangGraph 是图运行时，不是 harness

它只给「把控制流画成状态图」的执行引擎；工具、权限、会话、上下文管理一件都不打包——deepagents 才是 LangChain 家族在它上面打包好的 harness。

### 边缘候选一句话定位

pydantic-ai/smolagents 是轻封装/教学库；openai-agents 有适配税；claude-agent-sdk 绑死 Claude；ADK/Strands 绑云；CrewAI 偏业务剧本；LlamaIndex 是检索平台；Pi/OpenClaw/OpenHarness 是成品不是库；生产期手写 = 重复造八件套。

## Concepts Introduced（引入的概念）

- [[harness-engineering|Harness Engineering]]（八件套清单为该概念的具体化）

## Entities Mentioned（提及的实体）

- [[deepagents|deepagents]]（首选）
- [[deepseek-harness|DeepSeek Harness]]（developer preview 暂缓）
- [[langgraph|LangGraph]]（deepagents 底座，图运行时非 harness）
- Microsoft Agent Framework（备选，企业治理/多语言/流程化场景）
- [[pi|Pi]]（成品 harness，非库选型）

## Implications（影响／启示）

为「维护既有系统的 Python harness」场景给出了可执行的决策树（立刻稳定上生产→deepagents；企业治理多语言→MAF；主锁 DeepSeek 且接受 preview→DSH），并确立「先手写看懂 loop（系列 6-7 篇）再换生产 harness 避免黑盒」的学习纪律。

## Limitations（局限）

选型结论绑定作者的特定需求（多模型/多 agent/多 skill/多模式 + 维护既有系统）；真实 API 调用未逐个实测（作者自述）；版本与生态快照为 2026-10-19，框架迭代快。

## Related Knowledge（相关知识）

- [[harness-selection-deepagents|Harness 选型决策：首选 deepagents（决策页）]]

## Source（信源）

- `raw/sources/ai/2026-10-28-agent-harness-framework-selection.md`
