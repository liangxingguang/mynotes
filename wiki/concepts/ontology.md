---
id: wiki-concept-ontology
type: concept
title: Ontology（企业本体／业务本体）
status: active
created: 2026-11-20
updated: 2026-11-24
confidence: medium
tags:
  - concept
  - ai
  - enterprise
sources:
  - raw/sources/ai/2026-11-20-agent-knowledge-base.md
  - raw/sources/ai/2026-11-20-ontology-rsi-coding-agent.md
  - raw/sources/ai/2026-11-24-enterprise-agent-architecture-ai-coding-ontology-harness.md
related:
  - wiki/concepts/rag.md
  - wiki/concepts/graphrag.md
  - wiki/concepts/llm-wiki.md
  - wiki/comparisons/agent-knowledge-base-capabilities.md
  - wiki/concepts/recursive-self-improvement.md
  - wiki/concepts/three-layer-project-graph.md
  - wiki/sources/ontology-rsi-agent.md
  - wiki/topics/enterprise-agent-architecture.md
  - wiki/sources/2026-11-24-enterprise-agent-architecture.md
---
# Ontology（企业本体／业务本体）

## Definition（定义）

Ontology（企业本体或业务本体）是把企业业务世界中的业务对象、属性、关系与术语用统一的业务语义表达出来的模型。它不只告诉 AI"企业里有什么"，还定义这些对象在业务上意味着什么、彼此如何关联，并把不同系统中名称各异、编码不同的记录映射到共同的业务对象上（信源 2026-11-20）。

## Why It Matters（为什么重要）

当 AI 要回答复杂业务问题，光有文档（RAG）和关系（GraphRAG）还不够，系统还需要知道：企业里有哪些业务对象、它们有什么状态和属性、对象之间是什么业务关系、不同系统中的同名对象如何对应、业务规则和指标采用什么定义。尤其当"客户""订单""风险"等概念在不同部门或系统中含义不一致时，清晰的业务模型变得关键（信源 2026-11-20）。

## Core Characteristics（核心特征）

1. **统一业务语义**：把客户、订单、产品、供应商、工厂等对象及关系用统一的业务语义表达，不同系统里名称各异、编码不同的记录映射到共同业务对象。
2. **关键在业务含义**：不只是"对象和关系"，还在于这些对象和关系具有什么业务含义——一个供应商、一张订单在不同企业里的业务含义和处理规则可能不同。
3. **定义业务对象、规则和关系语义**：在四种能力中，Ontology 定义业务对象、规则和关系语义，回答"企业业务对象是什么，彼此如何关联"（信源 2026-11-20）。
4. **参考实现**：以 Palantir 的 Ontology 为例，其概念包括 Objects、Properties 和 Links；重点在于它如何统一业务对象、关系和语义（信源 2026-11-20）。

## Structure（结构）

与 RAG / GraphRAG / LLM Wiki 的对照（信源 2026-11-20）：

| 能力 | 主要回答 | 常见对象 |
|---|---|---|
| [[rag|RAG]] | 哪些资料与问题相关？ | 文档、文本片段、检索结果 |
| [[graphrag|GraphRAG]] | 对象之间有什么关系？ | 实体、关系、知识网络 |
| [[llm-wiki|LLM Wiki]] | 知识如何整理、更新和追溯？ | 主题、摘要、来源、版本 |
| **Ontology** | 企业业务对象是什么，彼此如何关联？ | 对象、属性、关系、业务定义 |

## How It Works（运作方式）

企业系统里，Ontology 把客户、订单、产品、供应商、工厂等对象及关系用统一业务语义表达，不同系统里名称各异、编码不同的记录映射到共同业务对象。Agent 据此结合库存、产能等当前数据，比较不同方案的成本、交付和风险，并说明建议依据（信源 2026-11-20 供应链案例）。

评估是否需要 Ontology，信源给出五个从具体流程入手的检查问题：① 业务对象和关系是否难以用现有系统表达；② 数据孤岛是否让关键决策依赖人工拼接；③ Agent 是否需要结合实时业务状态回答问题；④ 不同系统中的同名对象是否代表同一业务实体；⑤ 如何追踪定义、数据和结论的来源（信源 2026-11-20）。

**业务建模的落地实践**（信源 2026-11-24，发票异常处理案例）：先围绕一项业务任务整理小范围业务模型，不必一开始覆盖整个企业。第一版须说清核心对象的字段（如发票的所属法人、供应商、金额与币种、有效状态、关联采购单；采购单的明细、数量、计价口径、变更版本），对象通过**稳定编号**关联；执行动作时落到主数据标识及其系统映射，两个名字相似的供应商不能靠模型觉得"应该是同一家"就合并。关系也须具体：核对数量时要知道计量单位是否一致，金额比较要明确含税还是未税、币种是否相同，无法直接比较的返回人工确认。可用几个业务问题检查模型是否够用（这张发票关联哪些单据？当前缺少什么？谁能补齐？补齐后允许发起哪个动作？）。AI 可根据接口文档提出对象、字段映射和规则草案，但**业务负责人须结合样本确认**——模型建议"已完成等于可付款"正好暴露需核对的口径，它不能自己批准这条映射。实现上定义可先落在数据库视图、带类型的对象结构和领域服务里；需跨来源交换形式化语义或逻辑推理时再评估 RDF、OWL，第一版能沿对象关系找到数据、按明确条件发起动作即已可验证（信源 2026-11-24）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[graphrag|GraphRAG]]：GraphRAG 能讲清关系但不一定统一业务定义、不知实时状态；Ontology 统一业务对象、规则和关系语义，二者分工不同。
- [[rag|RAG]]、[[llm-wiki|LLM Wiki]]：四种能力组合使用，处理的信息形态和应用目标不同，不应当成同一种"知识库"来选型。

### Distinctions（区分）

- **Ontology vs GraphRAG**：GraphRAG 仍在回答/检索层，把关系讲清楚但不一定能统一业务定义、不知实时状态；Ontology 定义业务对象、规则和关系语义，把不同系统的同名记录映射到共同业务对象（信源 2026-11-20）。
- **Ontology vs Schema/知识图谱/RAG**：Schema 管数据组织、知识图谱管实体关联、RAG 管检索供给，本体强调对象与关系的共同含义与成立条件；"所有边都叫'相关'"的图谱解决不了含义澄清，本体真正要补的是"找到知识后判断它在说哪个对象、在什么条件下成立、能支持哪步推断"（信源 2026-11-21）。

## Evolution（演进）

- 2026-11-20 — 新建本页。信源 `raw/sources/ai/2026-11-20-agent-knowledge-base.md` 给出 Ontology 的定义、Palantir Objects/Properties/Links 参考、与 GraphRAG 的边界及企业评估问题清单。
- 2026-11-21 — 第二信源 `raw/sources/ai/2026-11-20-ontology-rsi-coding-agent.md` 补充 AI 时代 Ontology 的 Agent 视角：本体开始更直接地参与 Agent 的检索、判断和行动，并需随业务与执行反馈持续维护；EvoOntology 让本体根据 Agent 使用反馈演进（Content/Schema/Tool 三部分、browse/resolve 两类访问）；在研发 Loop 中，本体不必成为第四层，体现在三层项目图谱的第二层（项目语义）的概念与约束表达中。
- 2026-11-24 — 第三信源 `raw/sources/ai/2026-11-24-enterprise-agent-architecture-ai-coding-ontology-harness.md` 补上**业务建模落地实践**：围绕一项业务任务先做小范围模型，核心对象须说清字段并经稳定编号关联；同字段跨系统语义不同（如采购与仓储的"已完成"）不能靠模型臆断合并；AI 提的映射草案须业务负责人确认，模型不能自批口径；实现先落数据库视图/带类型对象结构/领域服务，形式化语义需求再评估 RDF/OWL。案例见 [[enterprise-agent-architecture|企业 Agent 架构（从原型到交付）]]。

## Open Questions（开放问题）

- Ontology 构建成本、维护成本与具体行业的落地差异，当前信源未给出量化数据（未知）。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-20-agent-knowledge-base.md`
- Source: `raw/sources/ai/2026-11-20-ontology-rsi-coding-agent.md`
- Source: `raw/sources/ai/2026-11-24-enterprise-agent-architecture-ai-coding-ontology-harness.md`（业务建模落地实践：对象字段与稳定编号、跨系统语义差异、AI 映射草案须业务确认、RDF/OWL 按需评估）

## Related Knowledge（相关知识）

- [[agent-knowledge-base-capabilities|Agent 知识库四种能力对照（RAG / GraphRAG / LLM Wiki / Ontology）]]
- [[recursive-self-improvement|递归自我改进（RSI）]]
- [[three-layer-project-graph|三层互索引项目图谱]]
- [[ontology-rsi-agent|不只是Memory：Ontology如何让Coding Agent越用越懂项目？]]
- [[enterprise-agent-architecture|企业 Agent 架构（从原型到交付）]]
