---
id: wiki-source-2026-11-24-enterprise-agent-architecture
type: source
title: 企业 Agent 架构怎么搭？AI Coding + Ontology + Harness，从原型到交付（信源页）
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - source
  - ai
  - agent
  - architecture
sources:
  - raw/sources/ai/2026-11-24-enterprise-agent-architecture-ai-coding-ontology-harness.md
related:
  - wiki/topics/enterprise-agent-architecture.md
  - wiki/concepts/ontology.md
  - wiki/concepts/harness-engineering.md
---
# 企业 Agent 架构怎么搭？AI Coding + Ontology + Harness，从原型到交付（信源页）

## Overview（概览）

微信公众号「架构师(JiaGouX)」的技术文章，提出一套企业业务 Agent 的落地架构：以 AI Coding 做原型、Ontology 说清业务含义、Harness 组织单轮执行、Runtime 承接持久状态与调度、FDE 负责现场交付与打通。文章以「发票异常处理」为贯穿案例，依次展开任务边界、AI Coding 原型、Ontology 业务建模、查询与动作工具设计、Harness 组织执行、等待与恢复、幂等与结果确认、评估与回归、FDE 现场交付九个环节，主张让 Agent 从「给建议」走到「交结果」。属设计示例，接口与流程用于说明各部分如何配合，非生产实证。

## Key Facts（关键事实）

- 五大角色分工：AI Coding 实现原型；Ontology 定义业务对象/关系/动作含义；Harness 准备上下文、调用模型与工具、处理反馈、组织每一轮工作；Runtime 与任务流程提供执行环境、持久状态和调度，承接暂停/恢复/后续跟进；FDE（Forward Deployed Engineer）深入业务现场，打通需求、系统集成、效果验证和交接。
- 核心原则：**调查路径留给 Agent，正式动作的校验留在业务服务，跨轮次的跟进交给持久流程**。原因：查问题可能换几个方向，审批和金额规则已有明确负责系统；等待一天后不能只靠一段聊天记住该做什么。
- 第一版范围限定为一条可验收路径：一个法人主体、一类采购业务、一张发票关联一张采购单，最终停在「付款申请已创建」；合并开票、部分付款、红字冲销先转人工。
- AI Coding 原型用 SDD（规格驱动开发）+ TDD（测试驱动开发）：确定性逻辑先写失败测试再实现；模拟接口跑通只证明程序路径能工作，真实系统的权限、数据延迟、错误返回须接入时逐项验证。
- Ontology 业务建模：定义发票、采购单、收货记录、审批记录、付款申请等对象及关系，通过稳定编号关联；同字段跨系统语义不同（如采购系统与仓储系统的「已完成」含义不同），不能靠模型臆断合并。
- 工具设计少而精（如 `get_invoice_context(invoice_id)` 在工具内部组合多次查询返回调查所需字段）；须严格区分「确实没有记录 / 当前无权查看 / 上游查询失败」三种返回，避免超时返回空数组被误判为「没有收货」。
- 写操作（如 `create_payment_request`）：模型只提议，执行层补已认证身份/稳定操作标识/待核验版本，业务服务校验权限/单据有效性/金额规则/适用审批；审批标识不能由模型参数决定。
- Harness 停止条件：最大工具调用次数、本轮时间和费用预算、连续无进展次数；多 Agent 拆分须用同一组任务比较，确认改善调查质量或耗时再保留。
- 等待与恢复：区分业务事实/任务进度/分析记录三类记录；恢复时先重查事实，再决定是否重新推理；LangGraph `interrupt()` 恢复会从所在节点开头重跑，创建待办需拆步且操作本身支持重复调用。
- 幂等与结果确认：提交超时进「结果待确认」，沿本次操作标识查询而非重发；接收方须真正实现去重（约定标识作用范围/保留期限/同标识不同参数的拒绝），多放 UUID 本身不解决幂等。
- 评估回归：扩展样本覆盖证据缺口、超时/无权限、等待期间改价、事件重复、响应丢失、人工已处理等；开发样本与留出样本分开，换模型/改工具/改规则用同一组任务回归。
- FDE 交付顺序：先只读调查→影子运行（关闭真实写操作）→开放经人工确认的写操作，逐步扩自动化；保留人工接管路径，版本回退与业务撤销需分别处理。
- 文章引用的外部信源：OpenAI《Harness Engineering》、Palantir Ontology overview / Action types、Anthropic 工具设计与 Agent 评估、Harrison Chase 长文、LangGraph Persistence/Interrupts、AWS Builders' Library 幂等 API、Chip Huyen《Agents》。

## Important Claims（重要论断）

### 企业 Agent 不是单个模型调用，而是协作体系

企业 Agent 的交付物是订单、工单或付款申请等业务结果，而非代码 PR。系统要理解业务对象、关系、动作规则，并把模型的一轮工作放进可持续跟进的流程。核心主张是「模型做调查分析、业务服务守正式动作、持久流程管跨轮跟进」。

### 调查与动作的分工是架构的承重决策

调查路径（查发票卡点、找原因）留给 Agent，因其可能需要换几个方向；正式动作（审批、金额规则、创建付款申请）的校验留在业务服务，因这些已有明确负责系统；跨轮次跟进交给持久流程，因等待一天后不能只靠聊天记忆。这一分工决定业务建模、接口设计和 Agent 能走到哪一步。

### 业务模型须同时描述「是什么」和「能做什么」

对象编号、数据来源、时效和动作条件，共同决定 Agent 能否正确使用工具。Ontology 不只是列出对象和关系，还要说清哪些状态和动作对任务有意义，并区分不同证据性质（如「货已送达」邮件与正式收货记录是不同性质证据）。

### 模拟通过不等于系统可用

模拟接口跑通证明程序路径能工作，但真实系统的权限、数据延迟、错误返回须在接入时逐项验证。接口单元测试通过，也不能说明整项业务已能正确完成。这是贯穿全文的校准纪律。

### 幂等靠服务端真正去重，而非请求里多放标识

调用方用稳定请求标识表达同一次意图，服务端识别重试并返回语义等价结果；但接收方必须真正实现去重（标识作用范围、保留期限、同标识不同参数的拒绝、去重记录与业务写入一致性）。在请求里多放一个 UUID 本身没有这些效果。

## Concepts Introduced（引入的概念）

- [[enterprise-agent-architecture|企业 Agent 架构（从原型到交付）]]
- [[ontology|Ontology（企业本体）]]
- [[harness-engineering|Harness Engineering]]
- [[idempotency-design|幂等设计]]
- [[durable-execution|持久执行（等待与恢复）]]
- [[agent-evaluation|业务 Agent 全生命周期评测]]

## Entities Mentioned（提及的实体）

- [[ontology|Ontology]]（Palantir Foundry 实现参考）
- [[harness-engineering|Harness]]（OpenAI Harness Engineering 概念）
- LangGraph（checkpointer 持久化、`interrupt()` 恢复）
- Palantir（Ontology overview、Action types）
- AWS Builders' Library（幂等 API）
- Anthropic（工具设计、Agent 评估）
- OpenAI（Harness Engineering）
- Harrison Chase（managed agents 长文）
- Chip Huyen（Agents）

## Implications（影响／启示）

- 企业 Agent 建设可从一条能验收的业务路径起步，不必一开始覆盖整个企业；先约定完成条件、做只读原型，再逐步接入等待、审批与写操作。
- 业务对象模型是 Agent 正确使用工具的前提：没有清晰对象/关系/动作定义，工具返回和写操作校验都缺乏依据。
- 调查与动作的分工、持久流程承接跨轮跟进，是把 Agent 从「给建议」推到「交结果」的关键架构决策。
- 评估样本须随执行能力扩展同步增加，且开发样本与留出样本分离，才能在换模型/改规则时用同一组任务回归。

## Limitations（局限）

- 本文为设计示例，接口与流程用于说明各部分如何配合，非生产实证数据；量化效果未给出。
- 文中引用的外部信源（OpenAI、Palantir、Anthropic、LangGraph、AWS、Chip Huyen）的具体主张为转述，未逐条核验原文。
- 发票异常处理案例为作者设定的贯穿示例，实际业务复杂度（多法人、多币种、复杂审批链）可能超出示例范围。

## Related Knowledge（相关知识）

- [[enterprise-agent-architecture|企业 Agent 架构（从原型到交付）]]
- [[ontology|Ontology（企业本体）]]
- [[harness-engineering|Harness Engineering]]
- [[idempotency-design|幂等设计]]
- [[durable-execution|持久执行（Durable Execution）]]
- [[agent-evaluation|业务 Agent 全生命周期评测]]
- [[agent-production-four-layer-model|Agent 生产化四层模型]]

## Source（信源）

- `raw/sources/ai/2026-11-24-enterprise-agent-architecture-ai-coding-ontology-harness.md`
- 原文：https://mp.weixin.qq.com/s/8R60mUjASxtxWCSBbj2T5w
