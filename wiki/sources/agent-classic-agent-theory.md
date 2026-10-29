---
id: wiki-source-agent-classic-agent-theory
type: source
title: Agent - 经典智能体理论 → 现代 LLM Agent 映射（2）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - ai-agent
  - 理论
sources:
  - raw/sources/ai/2026-10-28-agent-classic-agent-theory.md
---
# Agent - 经典智能体理论 → 现代 LLM Agent 映射（2）

## Overview（概览）

知乎专栏《Agent》系列第 2 篇（纯理论篇）：把 AIMA 五类智能体（simple reflex / model-based / goal-based / utility-based / learning）逐档映射到 2026 年 LLM agent 的构件，并提出 PMTA 四要素（Planning / Memory / Tool use / Action）作为全系列的描述坐标系；附以 Claude Code 为标本的 PMTA 指认练习。

## Key Facts（关键事实）

- AIMA（Russell & Norvig《Artificial Intelligence: A Modern Approach》，Pearson，1995 首版、2020 第 4 版，ISBN 978-0134610993）第 2 章 §2.4 定义五类智能体；五档是「决策环节里加了什么」的叠加维度，不是进化树（§1）。
- 映射表：无记忆单次 tool call ≈ simple reflex；agent loop 的对话历史回填 ≈ model-based（messages 即内部状态）；显式规划 ≈ goal-based；守卫/路由/评测打分 ≈ utility-based；eval 闭环 ≈ learning（§2）。
- PMTA 学术根基是 CoALA（Cognitive Architectures for Language Agents，Sumers/Yao/Narasimhan/Griffiths，arXiv 2309.02427，2023 提交、2024 更新至 v3）；PMTA 是对 CoALA 的教学化提炼（§3）。
- LLM 时代的 learning 改的是环绕模型的外围资产（评测集、prompt、记忆、工具描述）而非权重——「模型本体是租来的」（§2.5）。
- Claude Code 文档站已从 docs.anthropic.com 301 重定向到 code.claude.com/docs（作者 2026-10-15 实测）。

## Important Claims（重要论断）

### 分类是坐标系，不是单选标签

主流 LLM agent 是多档混合体（model-based + 部分 goal-based 起步，加规划/守卫/eval 逐档叠加）；真实系统同时落在多个维度上。

### 老理论不过时的三个理由

通用语言（教科书名词跨框架可懂）、照出短板（PMTA 四问做自检）、防过度设计（多数内部工具型 agent 到 model-based + 轻度 goal-based 就够用）。

### 理论给地图，工程给路

AIMA 定义「要有哪些部件」但不回答 2026 年的工程细节（上下文窗口、token 成本、幻觉、MCP）——这是本系列后文的活。

## Concepts Introduced（引入的概念）

- [[aima-agent-taxonomy|AIMA 五类智能体分类]]
- [[pmta-framework|PMTA 四要素坐标系]]

## Entities Mentioned（提及的实体）

- Claude Code（PMTA 指认练习标本：plan mode / CLAUDE.md+auto memory+checkpoint / 五大类内置工具 / 确认与回滚）
- CoALA 论文（arXiv 2309.02427）

## Implications（影响／启示）

给整个《Agent》系列提供了统一的描述语言：后续各篇的知识地图标签（A0/A1/B1/B2/B3…）都挂在 PMTA 四要素上；评价任何 agent 都用「记什么、想不想、手多长、会不会变好」四问。

## Limitations（局限）

纯理论篇，无代码；Claude Code 的指认全部基于公开文档描述（闭源 harness 内部实现不在范围内）；作者自述理论不覆盖上下文工程/token 成本等工程细节。

## Related Knowledge（相关知识）

- [[agent-loop|Agent Loop]]（model-based 档的现代对应物）
- [[agent-evaluation|业务 Agent 全生命周期评测]]（utility-based / learning 档的工程形态）

## Source（信源）

- `raw/sources/ai/2026-10-28-agent-classic-agent-theory.md`
