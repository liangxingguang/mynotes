---
id: wiki-concept-forward-deployed-engineer
type: concept
title: FDE（前线部署工程师 / Forward Deployed Engineer）
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: medium
tags:
  - concept
  - ai
  - agent
  - delivery
  - engineering
sources:
  - raw/sources/ai/2026-11-24-enterprise-agent-architecture-ai-coding-ontology-harness.md
  - raw/sources/ai/2026-11-25-enterprise-ai-agent-fullstack.md
related:
  - wiki/topics/enterprise-agent-architecture.md
  - wiki/concepts/ontology.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-evaluation.md
  - wiki/concepts/spec-driven-development.md
  - wiki/concepts/ai-native-engineering.md
  - wiki/concepts/agent-production-four-layer-model.md
---
# FDE（前线部署工程师 / Forward Deployed Engineer）

## Definition（定义）

FDE（Forward Deployed Engineer，前线部署工程师）是一种**贴着业务结果走、从调研管到交付**的工程角色，源自 Palantir 的工程实践（Palantir 在招聘与岗位介绍中将 Forward Deployed Engineering 描述为深入客户实际业务环境、围绕客户问题构建解决方案的工程工作方式）。FDE 没有统一的技术标准，也不是某个现成的产品或开发框架，更像一种工程角色：同一个人从业务调研一直管到生产交付，并对最终交付的业务结果负责（信源 2026-11-25）。在企业 Agent 落地语境中，FDE 负责把 AI Coding、Ontology、Harness、Runtime、Evaluation 等技术攒成一个能解决实际问题的应用（信源 2026-11-24、2026-11-25）。

## Why It Matters（为什么重要）

企业级 Agent 的交付物是订单、工单、付款申请等**业务结果**而非代码 PR。从「能演示的 Demo」到「真能处理业务的生产系统」之间存在工程缺口，需要有人打通需求、系统集成、效果验证与交接。FDE 正是承担这一打通的角色：它不替模型做推理，而是把数据、业务语义、工具和执行流程连起来，让 Agent 安全、稳定地把任务做完（信源 2026-11-24、2026-11-25）。AI Coding 让小团队能扛起过去要多个角色配合的活，但 AI 能写代码不等于懂业务规则——需求定义与交付质量反而更要紧，FDE 的业务分析、架构设计和工程验证仍绕不开（信源 2026-11-25）。

## Core Characteristics（核心特征）

1. **贴着业务结果走**：对最终交付的业务结果负责，而非只对代码或模型输出负责。
2. **横跨全链路**：工作贯穿业务调研、需求拆解、架构设计、应用开发、系统集成、测试评估、生产交付七个阶段（信源 2026-11-25）。
3. **非统一技术标准**：不是现成产品或框架，是工程角色与工作方式；具体技术栈因企业现有系统而异，架构应适应现有系统而非为用 AI 重写业务（信源 2026-11-25）。
4. **AI Coding 放大其杠杆**：Claude Code/Codex 等 Coding Agent 让熟悉业务的人更快做出原型，但需求定义、业务规则确认与交付质量反而成为更要紧的环节（信源 2026-11-25）。
5. **连接业务与技术**：作为业务需求、技术开发和最终交付之间的连接者，把各项技术攒成解决实际问题的应用（信源 2026-11-25）。

## Structure（结构）

FDE 的七阶段工作（信源 2026-11-25）：

| 工作阶段 | 主要工作 |
|---|---|
| 业务调研 | 理解电商业务流程、用户角色和实际痛点 |
| 需求拆解 | 把售后需求拆成可以开发的功能 |
| 架构设计 | 设计 Agent、数据、工具和业务系统架构 |
| 应用开发 | 用 AI Coding 构建前后端应用 |
| 系统集成 | 对接商品、订单、支付、物流等系统 |
| 测试评估 | 验证业务逻辑、工具调用和执行结果 |
| 生产交付 | 部署、监控、处理异常并持续迭代 |

## How It Works（运作方式）

**四阶段交付流程**（信源 2026-11-25，FDE 把 Agent 从 Demo 送到生产）：

1. **需求分析与快速原型**：先跟业务人员谈定目标，问清哪些问题可由 AI 独立处理、哪些只允许查询不能执行、哪些必须人工审批、哪些系统愿开放 API、哪些数据有权限限制；用 Claude Code/Codex 快速搭能跑的原型，尽早交业务人员体验，反馈进下一轮开发。交付业务需求说明、核心业务流程、技术架构设计、Agent 原型和初步测试结果。
2. **SDD + TDD 立工程规范**：规格驱动开发先把需求转成明确功能规格（输入/前置条件/业务约束/输出），再测试驱动开发先写测试用例再实现；AI Coding Agent 照规格和测试任务写代码，但测试通过后仍须用真实系统验证，不能只信模型生成的测试。
3. **Evaluation 双重评估**：分业务指标（AI 独立解决率、订单查询准确率、退货规则准确率、退款处理准确率、人工接管率）与系统指标（Tool Calling 成功率、端到端成功率、P95 延迟、异常恢复率、权限拦截准确率），评估对象是最终业务结果，测试集覆盖边界条件。
4. **Canary Release 金丝雀发布**：如 5% 流量走新版，盯核心指标，达标扩量、异常暂停回滚，保留人工接管与完整审计。

**解读**：四阶段把「能对话」到「能上岗」的工程缺口拆成可逐步验收的环节，与 [[enterprise-agent-architecture|企业 Agent 架构]] 的「从一条能验收的业务路径起步、逐步扩大自动化」建设顺序一致；FDE 是这一顺序的执行者与把关人。

## Relationships（关系）

### Related Concepts（相关概念）

- [[enterprise-agent-architecture|企业 Agent 架构（从原型到交付）]]：FDE 是该架构五大角色之一，负责现场打通与交付。
- [[harness-engineering|Harness Engineering]]：FDE 借助 Harness/Runtime/Evaluation 把 Agent 送进生产，是 FDE 交付流程第三、四阶段的核心工具。
- [[agent-evaluation|业务 Agent 全生命周期评测]]：FDE 四阶段交付的第三阶段即双重评估，评估纪律由该概念承载。
- [[spec-driven-development|规范驱动开发（SDD）]]：FDE 第二阶段用 SDD+TDD 立工程规范，SDD 是 FDE 交付的方法支撑。
- [[ontology|Ontology（企业本体）]]：FDE 在第二阶段做 Ontology 建模，让 Agent 看懂业务关系。

### Dependencies（依赖项）

- AI Coding 工具（Claude Code/Codex）与参考技术栈（FastAPI/PostgreSQL 等）；业务系统的 API 开放与数据权限。

### Distinctions（区分）

- **FDE vs 传统交付角色**：FDE 非产品经理/架构师/开发/测试的单一角色，而是从调研到交付全程贯穿的工程角色，对最终业务结果负责，贴着业务走（信源 2026-11-25）。
- **FDE vs AI Coding**：AI Coding 是提效工具，FDE 是利用 AI Coding 把业务做成的工程角色；AI 能写代码不等于懂业务规则，FDE 的业务分析与交付质量把控不可省。

## Evolution（演进）

- 2026-11-24 — 信源《企业 Agent 架构怎么搭？AI Coding + Ontology + Harness，从原型到交付》将 FDE 列为五大角色之一，定位为「深入业务现场，打通需求、系统集成、效果验证和交接」，并给出交付顺序：先只读调查→影子运行→开放经人工确认的写操作，逐步扩自动化。落成 [[enterprise-agent-architecture|企业 Agent 架构]] 主题页。
- 2026-11-25 — 信源《从 0 到 1 构建企业级 AI Agent》给出 FDE 的完整定义（源自 Palantir、贴着业务结果走）、七阶段工作清单、与 AI Coding 的关系（小团队可扛多角色活但需求定义与交付质量更要紧），以及四阶段交付流程（需求分析与原型→SDD+TDD→双重评估→金丝雀发布）。本页据此从主题页中的提及升格为独立概念页。

## Open Questions（开放问题）

- FDE 角色在不同规模企业中的落地形态（全职岗 vs 团队协作）与人力配置，当前信源未给出量化数据（未知）。
- FDE 交付的四阶段在真实生产中的周期与验收阈值，信源为方法论建议，无对照实验数据。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-24-enterprise-agent-architecture-ai-coding-ontology-harness.md`（FDE 为五大角色之一、现场打通与交付、渐进扩自动化的交付顺序）
- Source: `raw/sources/ai/2026-11-25-enterprise-ai-agent-fullstack.md`（FDE 定义与 Palantir 来源、七阶段工作、与 AI Coding 的关系、四阶段交付流程、参考架构公式中 FDE 的角色）

## Related Knowledge（相关知识）

- [[enterprise-agent-architecture|企业 Agent 架构（从原型到交付）]]
- [[harness-engineering|Harness Engineering]]
- [[agent-evaluation|业务 Agent 全生命周期评测]]
- [[spec-driven-development|规范驱动开发（SDD）]]
- [[2026-11-24-enterprise-agent-architecture|企业 Agent 架构怎么搭（信源页）]]
- [[2026-11-25-enterprise-ai-agent-fullstack|从 0 到 1 构建企业级 AI Agent（信源页）]]
