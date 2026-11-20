---
id: wiki-concept-recursive-self-improvement
type: concept
title: 递归自我改进（Recursive Self-Improvement / RSI）
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: medium
tags:
  - concept
  - ai
  - agent
sources:
  - raw/sources/ai/2026-11-20-ontology-rsi-coding-agent.md
related:
  - wiki/concepts/ontology.md
  - wiki/concepts/agent-memory-system.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/three-layer-project-graph.md
---
# 递归自我改进（Recursive Self-Improvement / RSI）

## Definition（定义）

RSI（Recursive Self-Improvement，递归自我改进）指系统改变自身的某些部分以改善后续表现，其"递归性"体现在产生改进的过程本身也能成为改进对象。自改进意味着系统改变自身；递归性进一步指向：生成、选择和验证改进的方法，也可以被修改（信源 2026-11-20）。

## Why It Matters（为什么重要）

任务反复执行不等于系统已经学会。一个执行 Loop 能把当前任务做得更好，但任务结束后下一轮未必有所不同——如果新会话再次从相同信息出发，可能重新搜索同一条链路、再误解一次相同的业务约定。RSI 把"改进"从单次任务的补丁，扩展到跨任务的知识积累，再到改进机制本身的优化，是 Agent 从"能做"走向"越做越好"的关键框架（信源 2026-11-20）。

## Core Characteristics（核心特征）

1. **三层改进层次**：按改动对象可分为执行内迭代（改当前任务产物）、跨任务自改进（改持久知识/工具/方法）、改进过程的自改进（改生成/选择/验证改进的方法）。这是分析工程系统的视角，不代表所有论文采用统一分级（信源 2026-11-20）。
2. **保存≠学会，复用≠改进**：Memory 保存经验只是必要条件，错误经验被更稳定召回反而让错误重复得更稳定。经验需要改变后续行为，并通过后续结果检验它是否有用（信源 2026-11-20）。
3. **反馈须保留条件与依据**：相同失败可能来自代码缺陷、环境异常、观察器错误或业务概念混淆，使用同一种反思模板会形成宽泛但不能指导行动的建议。有价值的反馈应保留发生条件、判断依据和被排除的解释（信源 2026-11-20）。
4. **改进机制本身可被检验**：借鉴 Skill∞，若修改的是学习策略，就要检验它能否在多个任务中产生更有用的知识或方法，而不仅是修好某一条经验；评分须放在自改进范围之外，候选需经独立审查（信源 2026-11-20）。

## Structure（结构）

RSI 的三层结构（信源 2026-11-20，解读）：

| 层次 | 变化发生在哪里 | 研发例子 |
|---|---|---|
| 执行内迭代 | 当前任务的计划或产物 | 测试失败，修改这次需求的代码 |
| 跨任务自改进 | 持久知识、工具或工作方法 | 保存已验证的兼容经验，供下一轮使用 |
| 改进过程的自改进 | 生成、选择和验证改进的方法 | 根据后续表现，修改经验抽取或 Skill 优化策略 |

## How It Works（运作方式）

相关工作的演进路线（信源 2026-11-20）：

- **Reflexion**：Agent 根据任务反馈形成反思，保存在情节记忆中指导后续尝试——说明反馈可以成为记忆。
- **Agent Workflow Memory**：从历史经历中归纳可复用工作流，选择性提供给后续任务——说明记忆也可以是"怎样做"。
- **Darwin Gödel Machine**：迭代修改 Agent 自身代码，维护候选 Agent 通过编码评测筛选改动，改变的是解题系统的工具和工作机制，而非某道题的代码。
- **Skill∞**：用 task skill 保存解决任务的方法，用 meta-skill 描述如何优化这些 skill；meta agent 诊断问题、提出候选、请求独立审查并分配搜索预算，同一种优化过程还可作用于 meta-skill 自身。

企业研发中可从外部记忆、工具和流程开始探索，无需先改基础模型权重；但一次正向实验不足以说明系统能持续、无限地变强（信源 2026-11-20）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[ontology|Ontology]]：本体帮助系统表达与使用领域知识，RSI 关注系统怎样根据反馈改进自己；当主要卡点来自概念理解时，本体成为值得改进的对象（信源 2026-11-20）。
- [[agent-memory-system|Agent 记忆系统]]：Memory 是 RSI 的燃料，保存经验与方法，但需要后续结果检验才能确认改进成立。
- [[agent-loop|Agent Loop]]：Loop 提供行动与真实结果，是 RSI 验证经验是否生效的反馈来源。
- [[three-layer-project-graph|三层互索引项目图谱]]：三层图谱是 RSI 在研发场景的具体载体——本体修订、经验挂接、策略优化分别对应不同改进层次。

### Distinctions（区分）

- **RSI vs 普通迭代**：执行内迭代（测试失败改代码）是单次任务内的改进，不属于跨任务自改进或改进过程的自改进；RSI 强调改动对象是持久知识或改进机制本身。
- **修订本体 vs 递归改进机制**：EvoOntology 直接研究本体因 Agent 使用反馈而演进（修订内容），Skill∞ 提供理解改进机制本身（修订方法）的参照，二者是不同层次的改进（信源 2026-11-20）。

## Evolution（演进）

- 2026-11-21 — 新建本页。信源 `raw/sources/ai/2026-11-20-ontology-rsi-coding-agent.md` 系统梳理 RSI 定义、三层次结构与 Reflexion/Agent Workflow Memory/EvoOntology/Skill∞/Darwin Gödel Machine 等研究的演进路线。

## Open Questions（开放问题）

- RSI 能否持续、无限地变强，当前研究均在限定任务、预算和验证条件下工作，尚无证据支持无限自我改进（未知）。
- 企业研发中从外部记忆/工具/流程探索 RSI 的具体收益，尚需分层对照实验验证。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-20-ontology-rsi-coding-agent.md`

## Related Knowledge（相关知识）

- [[ontology-rsi-agent|不只是Memory：Ontology如何让Coding Agent越用越懂项目？]]
