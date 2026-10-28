---
id: 2026-10-28-agent-classic-agent-theory
title: Agent - 经典智能体理论 → 现代 LLM Agent 映射（2）
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2094449859252197165
source_type: link
platform: zhihu
created: 2026-10-28
category: 技术
tags: [AI, Harness, 课程]
asset_ref: Assets/2026/10/agent-classic-agent-theory.md
wiki_status: pending
---

# Agent - 经典智能体理论 → 现代 LLM Agent 映射（2）

> Agent 系列第 2 篇（纯理论）：AIMA 五类智能体（reflex/model-based/goal-based/utility-based/learning）逐档映射到 LLM agent 构件，提出 PMTA 四要素（Planning/Memory/Tool use/Action）作为全系列坐标系。

## 核心要点

- **五档是叠加维度不是进化树**：决策环节里加什么决定档位——查表 → 内部状态 → 目标+规划 → 效用权衡 → 学习改进；真实系统是多档混合体。
- **映射**：单轮 tool call ≈ reflex；loop 上下文 ≈ model-based（messages 即内部状态）；显式规划 ≈ goal-based；守卫/路由/评测 ≈ utility-based；eval 闭环 ≈ learning（改的是外围资产而非权重，模型是"租来的"）。
- **PMTA 坐标系**（学术根基 CoALA, arXiv 2309.02427）：描述任何 agent 问四句——会不会先想、记不记得住、有没有手、动没动真格；缺哪块补哪块。
- **老理论为何不过时**：定义的是"智能体要有哪些部件"而非技术栈——通用语言、照出短板、防过度设计（多数内部工具型 agent 到 model-based + 轻度 goal-based 就够用）。
- **诚实边界**：理论给地图（部件清单），工程细节（上下文/token 成本/幻觉/MCP）靠后文。

## 正文

见 [[Assets/2026/10/agent-classic-agent-theory.md]]（全文约 1.6 万字符，含 PMTA 指认表与 Claude Code 动脑练习）。

## 来源

- [Agent - 经典智能体理论（2）· 知乎专栏](https://zhuanlan.zhihu.com/p/2094449859252197165)

## 附件

- [[Assets/2026/10/agent-classic-agent-theory.md]]
