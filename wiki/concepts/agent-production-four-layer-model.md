---
id: wiki-concept-agent-production-four-layer-model
type: concept
title: Agent 生产化四层模型
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: high
tags:
  - concept
  - ai-agent
  - harness
  - production
sources:
  - raw/sources/ai/2026-11-23-lala-agent-realtime-trading.md
related:
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/agent-evaluation.md
  - wiki/concepts/context-management.md
---
# Agent 生产化四层模型

## Definition（定义）

Agent 生产化四层模型是货拉拉技术总监亓隆基基于意图交易、持续撮合、策略执行三个已上线生产场景提炼的一套工程方法论，回答"如何把 Agent 从 Demo 带进生产"。模型将 Agent 生产化拆为四层，各自承担不同作用：**模型决定起点，Harness 决定下限，Dual Loop 决定方向，业务知识决定上限**。模型能力是所有团队的共同起点，真正拉开差距的是后三层。

## Why It Matters（为什么重要）

当 Agent 从"回答问题"走向"直接改变业务状态"，挑战不再是模型能否思考，而是能否在实时交易系统里可靠行动并带来可衡量的业务结果。四层模型把"Agent 能否进入生产"这一模糊问题拆成四个可分别治理的维度，使每一层的改进有明确着力点，避免把"模型能力"与"系统能力"混为一谈。

## Core Characteristics（核心特征）

1. **模型层——起点**：模型能力大家几乎同时获得，是共同起点，不构成差异化。简单任务用小模型、深度推理任务用更大模型，按难度选择。
2. **Harness 层——下限**：决定系统能否上线。分"帮模型的 Harness"（补偿模型当下不足，随模型变强变薄，须设计成可删除）与"守业务的 Harness"（守业务本身，与模型强弱无关，必须写成代码）。判定法：假设模型已完美，此约束是否仍需——需要即守业务约束，进代码。
3. **Dual Loop 层——方向**：决定持续改进方向。**内环**是 Agent 能力闭环（意图识别、指令遵循、Badcase 率），把事情做对；**外环**是业务指标闭环（一二级业务指标），决定什么是正确的事。外环发现内环看不见的问题，由业务归因定义 Badcase。
4. **业务知识层——上限**：决定 Agent 能把业务做到多深。企业私有知识（装载适配、运输经验、人车货路网理解等）不在公开语料中，须工程化；按确定性分流：确定的知识进代码与 Harness、"什么是好"进评测与指标、有效的打法进策略与话术。

## Structure（结构）

| 层 | 作用 | 原则 |
|---|---|---|
| 模型 | 起点 | 模型是所有团队的共同起点 |
| Harness | 下限 | 帮模型的设计成可删除，守业务的必须是代码 |
| Dual Loop | 方向 | 外环决定内环优化什么；Badcase 由业务归因定义 |
| 业务知识 | 上限 | 确定的进代码，标准进评测，打法进策略 |

## How It Works（运作方式）

**Harness 的两类约束与确定性位置**（详见 [[harness-engineering]]）：帮模型约束（任务拆解、上下文组装、格式约束、补偿性重试）须可删除；守业务约束（SOP、交易事实、权限/幂等/审计、人工接管）须写代码。Harness 更隐蔽的作用是把确定性放在正确位置——以 AI 撮合三阶段演进为例：完全 Agentic（难遵循 SOP、不可度量）→ 工作流编排大节点（流程遵循但上下文冗余）→ 高代码 Harness（代码编排 LLM 节点与状态机，既控 SOP 又按需组装上下文）。核心业务里"更自主不等于更好"，先让过程可遵循、可度量，再讨论扩大自主空间。

**Dual Loop 的内外环分工**：内环优化"把事做对"，外环决定"做正确的事"。当内环持续变好而业务指标（如配对转化率）下降时，根因可能不在对话能力而在触达对象（未圈选到更高意向司机），这类问题只关注内环永远看不见，须由外环发现。闭环速度决定迭代速度：用 LLM-as-a-Judge 按专家标准规模化评估、产出 Badcase 分布后优化 Prompt 与策略，并用人工抽查校准 Judge；金牌话术萃取分析高绩效通话策略回灌，以外环业务指标验收。Judge 不是终审，由人校准、由业务指标验收，评测体系本身也需被评测。

**业务知识的确定性分流**：写入 Prompt 不等于完成知识工程。业界常说"大模型 + Harness = Agent"，核心业务里还要加业务知识。业务专家是 Agent 的老师和裁判——教它什么有效、定义什么是好；产品与研发提供相应能力。

**同一套方法，三条业务线**：用户、目标、交互不同，原则可各自落地。意图交易用结构化订单草稿 + 确定性护栏；持续撮合用高代码 Harness 编排 LLM 节点与状态机；策略执行用标准 Tool 对接真实系统。

## Relationships（关系）

### Related Concepts（相关概念）

- [[harness-engineering|Harness Engineering]]：四层模型中"Harness 层"的展开，本页的"帮模型/守业务"二分与高代码 Harness 演进为其补入的判定法与演进样例。
- [[agent-loop|Agent Loop]]：Dual Loop 的内环即 Agent 能力闭环，外环在其之上叠加业务指标闭环。
- [[agent-evaluation|业务 Agent 全生命周期评测]]：Dual Loop 的评测手段（LLM-as-Judge、业务归因定义 Badcase、人工校准）与评测体系自身的可评测要求。

### Dependencies（依赖项）

- 成熟的业务系统（掌握业务事实）：四层模型针对"已有系统掌握业务事实"的核心业务场景，守业务的 Harness 与事实权威依赖成熟系统可依托。
- 模型 API 与按难度选模型的分层策略。

### Distinctions（区分）

- **四层模型 vs 单一 Harness 视角**：单一 Harness 视角聚焦执行系统，四层模型将其扩展为"起点/下限/方向/上限"四维，明确模型是共同起点、拉开差距的是后三层。
- **业务知识工程 vs 写 Prompt**：写 Prompt 不等于知识工程，须按确定性分流到代码/评测/策略三处。

## Evolution（演进）

- 2026-11-23 — 新建。信源为货拉拉亓隆基《AI Agent 如何进入实时交易系统》一文，基于意图交易/持续撮合/策略执行三个生产场景提炼四层模型；同步更新 [[harness-engineering]]（第 13 信源：帮模型/守业务二分 + "假设模型完美"判定法 + 高代码 Harness 三阶段演进 + 确定性位置）。

## Open Questions（开放问题）

- 四层模型在"事实由 Agent 生成"或"无成熟系统依托"的场景下，守业务的 Harness 与事实权威的含义如何重新推导，原文未给结论。
- LLM-as-Judge 的系统性偏差如何量化评测并纳入外环校准，原文仅提出"评测体系本身需被评测"的方向。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-23-lala-agent-realtime-trading.md`（单信源、作者自述生产实践与自报指标，置信度中——方法框架本身有生产落地佐证，量化指标未经独立验证）

## Related Knowledge（相关知识）

- [[harness-engineering|Harness Engineering（Agent 执行系统工程）]]
- [[agent-loop|Agent Loop]]
- [[agent-evaluation|业务 Agent 全生命周期评测]]
- [[2026-11-23-lala-agent-realtime-trading|AI Agent 如何进入实时交易系统（信源页）]]
