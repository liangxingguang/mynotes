---
id: wiki-concept-aima-agent-taxonomy
type: concept
title: AIMA 五类智能体分类
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - concept
  - ai-agent
  - 理论
sources:
  - raw/sources/ai/2026-10-28-agent-classic-agent-theory.md
related:
  - wiki/concepts/pmta-framework.md
  - wiki/concepts/agent-loop.md
---
# AIMA 五类智能体分类

## Definition（定义）

《Artificial Intelligence: A Modern Approach》（Russell & Norvig，AIMA）第 2 章 §2.4 的智能体分类框架：任何智能体都在「感知 → 决策 → 行动 → 再感知」的环上运转，五类的区别只在**决策环节里放了多少东西**。五档自下而上叠加：

1. **simple reflex**：当前感知 → 查表（condition-action rule），无内部状态；
2. **model-based**：加内部状态（世界模型），补全感知盲区、记住过去；
3. **goal-based**：加目标 + 规划，按动作的预期后果选动作；
4. **utility-based**：加效用函数，在多个可达目标的方案间权衡打分；
5. **learning**：加 critic + learning element，用表现反馈改进决策部件。

关键认知：五类不是「从笨到聪明」的进化树，而是五个叠加维度——分类是坐标系，不是单选标签，真实系统常是多档混合体。

## Why It Matters（为什么重要）

它定义的是「智能体要有哪些部件」而非技术栈——LLM 只改变了决策程序的实现（从规则引擎/搜索换成「读上下文、写文本的巨型函数」），没有改变部件清单。因此它是跨框架的通用语言（比「我用了 XX 框架」更快讲清架构）、是照短板的自检表（缺哪档补哪档）、也是防过度设计的上限参照（多数内部工具型 agent 到 model-based + 轻度 goal-based 即够用）。

## Core Characteristics（核心特征）

各档判定标准（信源 §1）：

1. **simple reflex**：掐掉历史痕迹，对当前输入的反应完全不变（类比：无状态 HTTP handler）。
2. **model-based**：改它过去的经历，它对同一输入会做出不同动作（类比：带 session 的服务；注意此 model 指世界模型非 LLM）。
3. **goal-based**：动作前有显式计划产物（路线/步骤/方案），选动作看「离目标更近了吗」（类比：编排器）。
4. **utility-based**：有显式效用函数给候选方案打分，问「好不好」而非只问「到没到」（类比：网关评分路由）。
5. **learning**：多了 learning element + critic；同问题多次经历后表现变好（类比：线上自调优系统）。

## How It Works（运作方式）

映射到 2026 年 LLM agent 构件（信源 §2）：

| 经典分类 | LLM agent 构件 |
| --- | --- |
| simple reflex | 无记忆的单次 tool call（只对当前完整输入做一次反应） |
| model-based | 有状态的 [[agent-loop|agent loop]]：对话历史 + 工具结果回填 messages，即内部状态 |
| goal-based | 显式规划：Plan-and-Execute、Claude Code plan mode |
| utility-based | 模型路由（成本 vs 质量）、护栏（按风险放行/问人/拒绝）、LLM judge 评测打分 |
| learning | eval 闭环：失败样本进测试集 → 改 prompt/工具描述 → 回归验证 |

时代差异：AIMA 的 learning 改 agent program 内部（权重/规则）；LLM 时代的 learning 改**环绕模型的外围资产**（评测集、prompt、记忆、工具描述），因为模型本体是「租来的」。

## Relationships（关系）

### Related Concepts（相关概念）

- [[pmta-framework|PMTA 四要素坐标系]]：把五档与 CoALA 压缩成 Planning/Memory/Tool use/Action 四个工程问题，是本分类的教学化落地。
- [[agent-loop|Agent Loop]]：model-based 档的现代对应物——messages 即内部状态。
- [[agent-evaluation|业务 Agent 全生命周期评测]]：utility-based（LLM judge 打分）与 learning（eval 闭环）的工程形态。

### Dependencies（依赖项）

- AIMA 教材原文（Ch.2 §2.4.2-§2.4.6）；CoALA（arXiv 2309.02427）为语言 agent 认知架构的学术化延续。

### Distinctions（区分）

- 与「agent 框架分层」（框架/库）不同：本分类是能力维度坐标系，与具体框架无关。

## Evolution（演进）

- 2026-10-29 — 新建，信源为知乎《Agent》系列第 2 篇，作者称已对照 AIMA 官网目录逐节核验五类出处。

## Open Questions（开放问题）

- 五档到 PMTA 的映射中，Tool use 在 AIMA 无直接对应物（最接近 actuator），属系列作者的理解性映射——更严格的学术对应待 CoALA 原信源摄入后核验。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-classic-agent-theory.md`

## Related Knowledge（相关知识）

- [[agent-classic-agent-theory|Agent - 经典智能体理论（2）（信源页）]]
