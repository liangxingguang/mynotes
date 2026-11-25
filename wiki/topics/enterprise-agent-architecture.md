---
id: wiki-topic-enterprise-agent-architecture
type: topic
title: 企业 Agent 架构（从原型到交付）
status: active
created: 2026-11-24
updated: 2026-11-25
confidence: medium
tags:
  - topic
  - ai
  - agent
  - architecture
sources:
  - raw/sources/ai/2026-11-24-enterprise-agent-architecture-ai-coding-ontology-harness.md
  - raw/sources/ai/2026-11-25-enterprise-ai-agent-fullstack.md
related:
  - wiki/concepts/ontology.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/agent-evaluation.md
  - wiki/concepts/agent-production-four-layer-model.md
  - wiki/concepts/forward-deployed-engineer.md
  - wiki/sources/2026-11-24-enterprise-agent-architecture.md
  - wiki/sources/2026-11-25-enterprise-ai-agent-fullstack.md
---
# 企业 Agent 架构（从原型到交付）

## Scope（范围）

本主题覆盖企业业务 Agent（交付物为订单、工单、付款申请等业务结果，而非代码 PR）从原型到交付的整体架构与落地路径。核心是五大角色的分工协作，以及以一条可验收业务路径为起点、逐步扩大自动化的建设顺序。不包括单点技术（如某框架源码细节），那些由相关概念页承载。

## Current Understanding（当前认知）

企业 Agent 不是单个模型调用，而是一个协作体系：模型做调查分析，业务服务守正式动作，持久流程管跨轮跟进（信源 2026-11-24）。这一主张由五个角色分工承载：

| 角色 | 职责 |
|---|---|
| AI Coding | 根据业务规格实现代码、运行检查，迭代原型 |
| Ontology（业务本体） | 定义业务对象、关系和动作含义，让不同系统数据对应起来 |
| Harness | 准备上下文、调用模型和工具、处理反馈，组织 Agent 每一轮工作 |
| Runtime 与任务流程 | 提供执行环境、持久状态和调度，承接暂停、恢复及后续跟进 |
| FDE（Forward Deployed Engineer） | 深入业务现场，打通需求、系统集成、效果验证和交接 |

**承重原则**：调查路径留给 Agent，正式动作的校验留在业务服务，跨轮次的跟进交给持久流程（信源 2026-11-24）。原因具体：查问题可能换几个方向，审批和金额规则已有明确负责系统；等待一天后不能只靠一段聊天记住该做什么。

**建设顺序**（信源 2026-11-24）：从一条能验收的业务路径起步——先约定完成条件、做只读原型，用真实数据校准对象和工具，再接入等待、审批与写操作；评估和现场反馈贯穿，每增加一种执行能力就增加相应验收样本。

**第二信源印证与扩展**（信源 2026-11-25，电商智能售后 Agent 为贯穿案例）：独立印证上述五大角色分工与「调查留给 Agent、动作校验留业务服务」的承重原则，并以电商退货退款场景给出更具体的落地细节。该信源给出参考架构公式（作者个人归纳，非标准定义）：`Enterprise AI Agent = Model + Context + Tools + Ontology + Harness + Runtime + Evaluation`——模型决定智能能力，Ontology 帮 Agent 理解业务，Tools 提供操作外部系统的能力，Harness 与 Runtime 管住执行过程，Evaluation 检查最终结果，FDE 负责把这些技术攒成能解决实际问题的应用。FDE 的完整定义与四阶段交付流程落成独立概念页 [[forward-deployed-engineer|FDE（前线部署工程师）]]。**解读**：两信源案例不同（发票异常 vs 电商售后）但架构口径一致，互为印证，说明该分工是跨业务场景的稳定工程模式，而非单案例设计。

**解读**：这一路径把「能对话」到「能上岗」之间的工程缺口拆成可逐步验收的环节，与 [[enterprise-agent-three-stage-transition|企业 Agent 三阶段跃迁]] 的成熟度视角互补——后者给阶段划分，本文给每阶段内的具体建设动作。

## Key Concepts（关键概念）

- [[ontology|Ontology（业务本体）]]：定义业务对象、关系和动作含义，区分不同证据性质，是 Agent 正确使用工具的前提。
- [[harness-engineering|Harness Engineering]]：组织单轮执行的外围程序；本文区分「研发 Harness」（面向代码仓库/测试/PR）与「业务 Agent Harness」（面向发票/权限/业务动作），两套环境凭证与可执行操作各自配置。
- [[idempotency-design|幂等设计]]：提交超时进「结果待确认」，沿稳定操作标识查询而非重发；服务端须真正去重，多放 UUID 不解决幂等。
- [[durable-execution|持久执行（等待与恢复）]]：区分业务事实/任务进度/分析记录三类记录；恢复时先重查事实再决定是否重新推理；LangGraph `interrupt()` 恢复会重跑节点，创建待办需拆步且支持重复调用。
- [[agent-evaluation|业务 Agent 全生命周期评测]]：开发样本与留出样本分开，换模型/改工具/改规则用同一组任务回归；评估关注是否正确完成及是否遵守约束，不强求查询顺序一致。
- [[agent-production-four-layer-model|Agent 生产化四层模型]]：本文「调查留给 Agent、动作校验留在业务服务」的分工与「帮模型/守业务」二分互证，正式动作校验属守业务约束。

## Key Entities（关键实体）

- [[ontology|Ontology]]：Palantir Foundry 实现参考，含对象/属性/关系/动作/函数/动态安全机制。
- [[harness-engineering|Harness]]：OpenAI《Harness Engineering》概念，本文用作业务 Agent 单轮执行的组织层。
- LangGraph：用 checkpointer 保存图状态，`interrupt()` 恢复从所在节点开头重跑。
- FDE（Forward Deployed Engineer）：[[forward-deployed-engineer|FDE（前线部署工程师）]]，负责现场打通与交接，并对最终业务结果负责。

## Important Decisions（重要决策）

- **调查与动作分工**：调查路径留给 Agent，正式动作校验留在业务服务，跨轮次跟进交给持久流程（信源 2026-11-24）。这是把 Agent 从「给建议」推到「交结果」的承重决策。
- **第一版范围收敛**：限定一条可验收路径（发票卡点→补材料→等审批→创建付款申请），合并开票/部分付款等先转人工（信源 2026-11-24）。解读：以可验收产物锚定范围，避免一次性铺开导致不可验收。
- **写操作分层校验**：模型只提议，执行层补身份/版本/操作标识，业务服务校验权限/单据/金额/审批；审批标识不由模型参数决定（信源 2026-11-24）。
- **交付渐进扩自动化**：先只读→影子运行（关闭真实写操作）→开放经人工确认的写操作（信源 2026-11-24）。

## Major Developments（重大进展）

- 2026-11-24 — 信源《企业 Agent 架构怎么搭？AI Coding + Ontology + Harness，从原型到交付》给出五大角色分工、核心原则与九环节落地路径，以发票异常处理为贯穿案例。落成主题页本页，信源页见 [[2026-11-24-enterprise-agent-architecture|企业 Agent 架构（信源页）]]。
- 2026-11-25 — 信源《从 0 到 1 构建企业级 AI Agent：AI Coding + Ontology + Harness + FDE，全链路技术实战》以电商智能售后为案例独立印证五大角色分工与承重原则，并扩展参考架构公式、Harness 十模块、FDE 四阶段交付流程与双重评估指标。FDE 升格为独立概念页 [[forward-deployed-engineer|FDE（前线部署工程师）]]，信源页见 [[2026-11-25-enterprise-ai-agent-fullstack|从 0 到 1 构建企业级 AI Agent（信源页）]]。两信源案例不同、架构口径一致，互为印证。

## Disagreements（分歧）

- Harness 与 Runtime 的边界：不同框架对二者的命名与覆盖范围并不一致；本文按「Harness 组织当前一轮，Runtime/任务流程管持久状态与调度」划分（信源 2026-11-24）。这是本文的设计口径，与 [[harness-engineering|Harness Engineering]] 概念页中各信源的划分不完全对齐，属命名与职责切分差异，未构成事实矛盾。

## Open Questions（开放问题）

- 五大角色分工是设计示例，真实生产中各角色的部署边界（同服务 vs 独立服务）与量化效果，当前信源未给出。
- 业务对象模型的维护成本与跨业务复用路径，当前信源只给「先小范围、再逐步扩大」的起步建议，无规模化数据。
- 多 Agent 拆分的改善判据（调查质量/耗时）在本文为方法论建议，无对照实验数据。

## Related Topics（相关主题）

- [[enterprise-agent-three-stage-transition|企业 Agent 三阶段跃迁]]
- [[multi-agent-collaboration-architecture|多 Agent 协作架构]]
- [[agent-production-four-layer-model|Agent 生产化四层模型]]
