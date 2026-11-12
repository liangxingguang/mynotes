---
id: 2026-11-12-ai-agent-tech-overview
title: AI Agent 技术全景解析 —— 从提示词工程到高级智能体构建
source: vivo 互联研发效能团队（微信公众号）
source_url: https://mp.weixin.qq.com/s/sjeOryZ5H2ZZGQOKZ2YS4g
source_type: 网页
platform: 微信公众号
created: 2026-11-12
category: 技术
tags:
  - AI
  - Agent
asset_ref: Assets/2026-11/ai-agent-tech-overview.md
wiki_status: pending
---

# AI Agent 技术全景解析 —— 从提示词工程到高级智能体构建

> 摘要：vivo 互联研发效能团队的一篇 Agent 全景综述，按"基石→核心→实战"的因果链组织：从提示词工程、上下文工程（RAG）、Harness 运行时，到 ReAct 自主循环、工具/MCP/技能、记忆与知识库、多智能体协作，并给出应用场景、五大避坑要点与生产部署 Checklist，目标是构建能自主规划、调用工具、交付结果的"数字员工"。

## 核心要点

1. **演进主线**：人写 prompt 让 LLM 执行 → LLM 自主规划执行；前一步跑不动才催生下一步：提示词工程→RAG→Harness→ReAct→多智能体
2. **提示词工程**：LLM 是自回归概率模型，prompt 决定输出分布；基础技巧为角色扮演、清晰指令、Few-shot，高级技巧为 CoT（拆步降熵，是 ReAct 的思想源头）与 Self-Consistency
3. **RAG vs 微调**：微调改变"能力"（怎么回答），RAG 改变"输入"（基于什么回答）；事实性知识走 RAG（可更新、可溯源），进阶有混合检索、查询改写、分块策略、多跳检索
4. **Harness 工程**：Agent 运行时基础设施，解决状态管理、上下文压缩、错误处理、可观测性；核心是 Middleware 洋葱模型，内置能力按需插在 ReAct 循环上
5. **规划范式三代**：Plan-then-Execute（静态）→ ReAct（推理行动交错，当前主流）→ Tree of Thoughts/MCTS（可回溯，成本高，研究阶段）；复杂任务可在 ReAct 上叠加 Plan Mode
6. **Agent 核心循环**：目标理解→规划→执行→观察→反思修正；运行机制包括 maxIters 上限、并发工具调用、权限闸门（允许/询问/拒绝）、中断恢复
7. **工具与技能**：工具=函数（LLM 决策、框架执行），MCP 让工具与框架解耦；技能=Markdown 工作流指令（SOP），Agent 可自沉淀技能实现自进化
8. **记忆三层**：会话记忆（AgentState，按 userId+sessionId 外部化）/ 长期记忆（Flush→日流水、Consolidation→MEMORY.md、Compaction→摘要）；知识库管"静态领域知识"，记忆管"Agent 经历的事实"
9. **多智能体**：单 Agent 受上下文污染、工具过载、串行瓶颈三重制约；协作模式有 Supervisor、Debate、Pipeline、Handoffs
10. **落地要点**：适合多步推理+动态决策+工具的任务；五大痛点（工具决策不准、上下文爆炸、死循环、安全、评估难）各有对策；生产 Checklist：状态存储、maxIters、STRICT 权限、沙箱、压缩、可观测、降级、脱敏

## 正文

完整正文（含对比表格与 AgentScope 示例说明）见附件，主体结构：

- **01 基石**：提示词工程 / 上下文工程（RAG）/ Harness 工程，附 LangChain、LlamaIndex、AgentScope 2.0 框架选型对比
- **02 核心**：规划与决策（ReAct 等）、核心控制循环、工具与 MCP、记忆（短期+长期）、知识库、多智能体协作，含 Tool/Skill/Subagent 层次关系对比
- **03 实战**：四大应用场景（知识问答、代码工程、数据分析、多 Agent 研发流水线）、五大避坑指南、四项最佳实践（HITL 渐进引入、Model Routing、Skill 沉淀、生产 Checklist）
- **04 展望**：推理/行动/知识/协作四层 + Harness 底座的全景架构；挑战为稳定性、成本、安全、评估；方向为更强规划、Agent 自进化、A2A 生态、具身智能

## 来源

- [AI Agent 技术全景解析 —— 从提示词工程到高级智能体构建](https://mp.weixin.qq.com/s/sjeOryZ5H2ZZGQOKZ2YS4g)

## 附件

- [[Assets/2026-11/ai-agent-tech-overview.md]]
