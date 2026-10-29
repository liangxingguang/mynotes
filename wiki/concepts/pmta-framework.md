---
id: wiki-concept-pmta-framework
type: concept
title: PMTA 四要素坐标系
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - concept
  - ai-agent
  - 框架
sources:
  - raw/sources/ai/2026-10-28-agent-classic-agent-theory.md
related:
  - wiki/concepts/aima-agent-taxonomy.md
  - wiki/concepts/agent-loop.md
---
# PMTA 四要素坐标系

## Definition（定义）

PMTA 是描述任何 Agent 的四要素框架：Planning（会不会先想——把目标拆成步骤）、Memory（记不记得住——保存复用感知/决策/结果）、Tool use（有没有手——把能力注册成模型可调用的清单）、Action（动没动真格——真发 HTTP / 真写文件 / 真改数据）。学术根基是 CoALA（Cognitive Architectures for Language Agents，arXiv 2309.02427）为代表的语言 agent 认知架构；PMTA 是其教学化提炼。

## Why It Matters（为什么重要）

描述、复盘、评审任何 agent 只需回答四个问题（记什么、想不想、手多长、会不会变好），缺哪块补哪块。它是知乎《Agent》系列的全系列地图坐标——后续每篇的知识地图标签都挂在四要素上，也是防止「能力听起来很全、实际缺零件」的自检表。

## Core Characteristics（核心特征）

四要素与经典理论对应（信源 §3.3）：

| 要素 | 大白话 | AIMA 对应 | 现代 Agent 形态 |
| --- | --- | --- | --- |
| Planning | 动手前先想路径 | goal-based、utility-based | plan mode、Plan-and-Execute、执行中重规划 |
| Memory | 记得住、忘得掉 | model-based 内部状态、learning 经验沉淀 | 上下文窗口、会话/长期记忆、自动压缩 |
| Tool use | 能伸出去的手 | 无直接对应（最接近 actuator） | function calling、工具注册、MCP |
| Action | 真正改变世界 | 五类共同底座（感知→动作环的动作端） | 工具真执行：HTTP、SQL、写文件 |

learning 作为横跨四要素的第五维度（eval 闭环、trace 驱动改进）。

## How It Works（运作方式）

用法（信源 §3.4）：见到任何 Agent 问四句——**Planning**：会不会为多步目标先出计划、计划崩了会不会重规划？**Memory**：用完即弃 / 有对话历史 / 跨会话还记得？**Tool use**：接住了哪些外部能力、工具描述清不清楚？**Action**：执行有没有副作用、有没有人能拦下来（权限/确认）？

标本示例（Claude Code，信源 §4 指认练习）：Planning=plan mode（先出计划、批准后执行）；Memory=CLAUDE.md + auto memory + JSONL 会话 + /compact；Tool use=Read/Edit/Write/Bash/Grep/Glob/WebFetch 等五大类内置工具；Action=真改文件真跑命令 + checkpoints 回滚 + 危险操作确认。

## Relationships（关系）

### Related Concepts（相关概念）

- [[aima-agent-taxonomy|AIMA 五类智能体分类]]：PMTA 的理论前身与逐档对应关系来源。
- [[agent-loop|Agent Loop]]：PMTA 四要素在运行时串成的循环（决策→工具→执行→结果回填）。
- [[harness-engineering|Harness Engineering]]：Harness 是为 PMTA 各要素提供工程实现的执行系统（解读）。

### Dependencies（依赖项）

- CoALA 论文（arXiv 2309.02427）——行动空间/记忆/决策程序等术语出处。

### Distinctions（区分）

- 与 AIMA 五档的区别：五档按「决策环节加了什么」分维度；PMTA 按「agent 有哪些零件」列清单，二者互补（信源 §3.3 给出要素×经典类型对照表）。

## Evolution（演进）

- 2026-10-29 — 新建，信源为知乎《Agent》系列第 2 篇；定位为该全系列的描述坐标系，后续同系列信源应回链本页。

## Open Questions（开放问题）

- PMTA 与 CoALA 原框架（模块化记忆 working/episodic/semantic/procedural、internal/external actions、decision procedure）的精确对应关系，待 CoALA 原信源摄入后核验。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-classic-agent-theory.md`

## Related Knowledge（相关知识）

- [[agent-classic-agent-theory|Agent - 经典智能体理论（2）（信源页）]]
