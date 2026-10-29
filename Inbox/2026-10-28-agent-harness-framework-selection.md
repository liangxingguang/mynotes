---
id: 2026-10-28-agent-harness-framework-selection
title: Agent - harness 框架怎么选（5）
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2095515233271951377
source_type: link
platform: zhihu
created: 2026-10-28
category: 技术
tags: [AI, Harness, 工程实践]
asset_ref: Assets/2026/10/agent-harness-framework-selection.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-29T10:20:24.645Z"
ingest_claim_id: 26432-1793269224645-0
---

# Agent - harness 框架怎么选（5）

> Agent 系列第 5 篇：面向"维护既有系统"需求的 harness 选型结论——首选 deepagents，备选 Microsoft Agent Framework，DeepSeek Harness 因 developer preview 暂缓；附 12 个候选的一句话定位。

## 核心要点

- **harness ≠ 随便一个 agent 库 ≠ LangGraph**：harness 是 loop 的工程外壳，八件套（loop+终止、工具注册、权限/HITL、持久化、上下文管理、子 agent、MCP、可观测）；LangGraph 只是图运行时，八件套全要自拼。
- **四条能力轴**：多模型（换配置不重写）、多 agent（隔离上下文委派）、多 skill（命名技能按需加载）、多模式（单轮/长任务/只读/审批）。
- **首选 deepagents**：`create_deep_agent` 一个函数带齐默认工具/子 agent/上下文管理/HITL/skills/MCP，LangGraph 底座 + LangSmith 观测，多模型只换 chat model 对象。
- **备选 MAF**：企业治理/多语言/流程化多 agent 场景；概念重（workflow/middleware）。
- **DeepSeek Harness**：多模式+插件化最全，但 developer preview 官方明示会有破坏性变更——先当架构参考/POC。
- **一句话排除**：claude-agent-sdk 绑死 Claude、openai-agents 有适配税、ADK/Strands 绑云、CrewAI 偏业务剧本、手写=重复造八件套。
- **边缘定位**：pydantic-ai/smolagents 是轻封装/教材；LangChain 链式已 legacy；SK/AutoGen 被 MAF 收口；LlamaIndex 是检索平台；Pi/OpenClaw 是成品不是库。
- **学习纪律**：先手写看懂 loop 每一行（6-7 篇），再换生产 harness 避免黑盒。

## 正文

见 [[Assets/2026/10/agent-harness-framework-selection.md]]（全文约 1.3 万字符，含打分表、决策表与最小跑通代码）。

## 来源

- [Agent - harness 框架怎么选（5）· 知乎专栏](https://zhuanlan.zhihu.com/p/2095515233271951377)

## 附件

- [[Assets/2026/10/agent-harness-framework-selection.md]]
