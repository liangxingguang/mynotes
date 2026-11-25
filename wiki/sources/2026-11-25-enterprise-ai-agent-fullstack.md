---
id: wiki-source-2026-11-25-enterprise-ai-agent-fullstack
type: source
title: 从 0 到 1 构建企业级 AI Agent：AI Coding + Ontology + Harness + FDE，全链路技术实战（信源页）
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: medium
tags:
  - source
  - ai
  - agent
  - architecture
  - ontology
  - harness
sources:
  - raw/sources/ai/2026-11-25-enterprise-ai-agent-fullstack.md
related:
  - wiki/topics/enterprise-agent-architecture.md
  - wiki/concepts/ontology.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/forward-deployed-engineer.md
  - wiki/concepts/agent-evaluation.md
  - wiki/concepts/multi-agent-saas-refactoring.md
  - wiki/sources/2026-11-24-enterprise-agent-architecture.md
---
# 从 0 到 1 构建企业级 AI Agent：AI Coding + Ontology + Harness + FDE，全链路技术实战（信源页）

## Overview（概览）

微信公众号技术文章，以电商智能售后 Agent 为贯穿案例，分三段讲清企业级 AI Agent 的全链路落地：第一段用 AI Coding 从 0 搭出售后 Agent（工具设计、参考技术栈、Coding Agent 使用要点）；第二段做 Ontology 建模（电商十大核心对象、RDF/OWL/SPARQL、AI 辅助建模五步、Ontology 查询服务与退货实战）；第三段讲 FDE 工程交付（Agent Runtime + Harness Engineering + Evaluation）把 Agent 送进生产，并给出完整参考架构、FDE 四阶段交付流程、交付物清单与「何时算做完」的判断标准。属作者个人归纳的方法论文章，参考架构公式为作者自述而非标准定义，单信源、无生产实证数据。

## Key Facts（关键事实）

- **企业级 Agent 的分水岭**：从「查物流答题」到「帮我退货退款」，需跨订单、支付、物流、售后多系统执行多步操作，任何一步出错都是真实业务损失（售后办完一笔退货需 8 步：找订单→查支付→查商品 SKU→查物流签收→查退货政策→查已有售后→按规则判断→创建售后申请）。
- **FDE（Forward Deployed Engineer，前线部署工程师）**：源自 Palantir 工程实践，贴着业务结果走、从调研管到交付的工程角色，横跨业务调研、需求拆解、架构设计、应用开发、系统集成、测试评估、生产交付七阶段；FDE 非统一技术标准或现成产品，是贴着业务结果的工程角色。FDE 热起来与 AI Coding 直接相关——Claude Code/Codex 让小团队能扛起多角色的活，但 AI 能写代码不等于懂业务规则，需求定义与交付质量反而更要紧。
- **AI Coding 搭建**：把售后业务拆为订单查询/物流查询/商品查询/退款查询/退货申请/人工转接六个工具（明确输入/输出/权限）。**踩坑**：不能信任模型传来的 `customer_id`，权限与业务校验必须由可信后端做，退款工具不能因模型判断想退就直接动资金。参考技术栈：React+Vite 前端、Tailwind CSS、Python+FastAPI 后端、WebSocket、Qwen/DeepSeek、LangChain 或自定义、PostgreSQL、Claude Code/Codex 辅助；已有 Java 微服务的企业不必重写，架构应适应现有系统。用 Coding Agent 时分阶段开发，**每做完一个模块就跑一次测试**，别让 AI 一口气生成整个项目。
- **Ontology 建模**：解决跨系统数据（商品用 `sku_code`、订单用 `sku_id`、库存自有编码）语义割裂。定义 Customer、Product、SKU、Order、OrderItem、Payment、Inventory、Shipment、Return、Refund 十个核心对象及关系；RDF 用三元组描述业务事实，OWL 定义概念/关系/逻辑语义（静态），SPARQL 查询图数据（动态业务判断如退款期限、金额上限仍靠规则引擎或应用程序，两类规则分开设计）。AI 辅助建模五步：明确业务问题→识别业务对象→建立对象关系→映射真实数据（解决跨系统 ID 对齐，不能凭名称相同当同一实体）→用 Competency Questions（业务能力问题）验证本体。
- **Ontology + Agent**：设计统一 Ontology 查询服务（如 `get_order_context` 聚合订单、明细、物流、支付、售后），流程为意图识别→选工具→查对象关系→规则引擎判断→Agent 组织回答→必要时创建售后申请。退货资格判断等确定性规则由正式业务政策服务实现，不能让模型推测，且须符合消保法规。**踩坑**：退款接口超时后重调可能重复退款，必须用幂等键、业务流水号和执行状态查询。
- **Multi-Agent**：Supervisor Agent 拆任务，商品/营销/库存/订单/物流/售后专业 Agent 分工，各守明确职责与工具权限（商品 Agent 不需退款权限，库存 Agent 不碰支付）。统一 SKU 标识让多 Agent 确认说的是同一规格；该不该拆取决于任务复杂度，Agent 一多协调成本也涨。
- **Harness Engineering + Agent Runtime**：Harness 是围绕 Agent 的执行管理机制，含 Goal、Context、Planning、Tools、Execution、Observation、Verification、Recovery、Safety、Evaluation 模块；Runtime 管运行环境与生命周期（「Runtime 让 Agent 跑起来，Harness 让 Agent 按预期做完」）。退款任务走完整圈：目标→上下文→规划→工具调用→观察→验证→安全校验→执行→再验证→完成；按错误类型区分处理（查询超时有限重试、订单不存在终止、权限不足拒绝、退款超时先查原状态、金额不符交人工）。**最后的安全约束必须由程序执行**。
- **FDE 四阶段交付**：①需求分析与快速原型（尽早交业务人员体验）；②SDD（规格驱动）+ TDD（先写测试再实现），测试通过后仍要用真实系统验证，不能只信模型生成的测试；③Evaluation 双重评估——业务指标（AI 独立解决率、查询/规则/退款准确率、人工接管率）与系统指标（Tool Calling 成功率、端到端成功率、P95 延迟、异常恢复率、权限拦截准确率），**评估对象是最终业务结果**，测试集须覆盖边界条件；④Canary Release 金丝雀发布（如 5% 走新版），盯核心指标，达标扩量，异常暂停回滚，保留人工接管与完整审计。
- **参考架构公式**（作者个人归纳，非标准定义）：`Enterprise AI Agent = Model + Context + Tools + Ontology + Harness + Runtime + Evaluation`。
- **交付物清单**：业务需求、Ontology（含对象定义、字段映射、数据来源、实体标识、更新机制、版本变更）、应用代码、数据集成、业务规则、测试评估、生产部署（Runtime、监控、审计、恢复、回滚）。Agent 不能只交一份 Prompt，须含工具定义、权限配置、任务状态、错误处理和执行日志。
- **结语**：模型决定 Agent 能想多深，业务模型决定它看不看得懂企业，工程体系决定它能不能把任务安全做完。

## Important Claims（重要论断）

### 企业级 Agent 的难点在「把一句话做成业务操作」

企业级 Agent 的分水岭不在能不能回答问题，而在能不能把一句话安全地做成一笔真实业务操作。从查物流答题到退货退款，需跨多系统执行多步操作，任何一步出错都是真实业务损失。这一判断贯穿全文三段架构设计。

### AI Coding 提速后，需求定义与交付质量更要紧

AI 能生成代码不等于懂企业业务规则——能写退款接口却不知道什么情况下才允许退款，能生成订单查询 SQL 却未必分得清哪个字段才是业务上真正的订单号。AI Coding 把实现速度提上去，需求定义和交付质量反而变得更要紧，FDE 的活仍绕不开业务分析、架构设计和工程验证。

### 确定性规则不能交给模型推测

退货资格判断、退款金额上限等确定性规则必须由正式业务政策服务实现，不能让模型推测，且须符合适用的消费者权益保护法规，不能拿内部规则排除法定权利。最后的安全约束必须由程序执行。

### 评估对象是最终业务结果，而非单步调用成功

端到端成功率是关键指标——Agent 成功调了订单查询和物流查询接口，但最后没把退货申请办成，任务照样算失败。测试集须覆盖边界条件（正常订单、异常订单、重复申请、特殊商品、权限不足、接口超时），评估才有参考价值。

### 幂等靠服务端机制，退款重调须防重复退款

退款接口超时后直接重调可能重复退款，必须用幂等键、业务流水号和执行状态查询保证同一笔业务不会因重复请求动多次钱。

## Concepts Introduced（引入的概念）

- [[forward-deployed-engineer|FDE（前线部署工程师）]]
- [[ontology|Ontology（企业本体）]]
- [[harness-engineering|Harness Engineering]]
- [[agent-evaluation|业务 Agent 全生命周期评测]]
- [[multi-agent-saas-refactoring|多智能体重构 SaaS 业务流]]
- [[idempotency-design|幂等设计]]
- [[spec-driven-development|规范驱动开发（SDD）]]

## Entities Mentioned（提及的实体）

- [[ontology|Ontology]]（Palantir Foundry 实现参考）
- [[harness-engineering|Harness]]（OpenAI Harness Engineering 概念）
- Palantir（FDE / Forward Deployed Engineering 实践来源）
- LangChain（Agent 工具调用与任务组织参考实现）
- React + Vite、FastAPI、PostgreSQL、WebSocket（参考技术栈）
- Qwen / DeepSeek（大模型）
- Claude Code / Codex（AI Coding 辅助）

## Implications（影响／启示）

- 企业级 Agent 建设可从一条能验收的业务路径（如售后退货）起步，先搭能跑的 Agent，再引入 Ontology 让 Agent 看懂业务关系，最后靠 Harness/Runtime/Evaluation 送进生产。
- 业务对象模型是 Agent 正确使用工具的前提；跨系统 ID 对齐（sku_code/sku_id/库存编码）是 Ontology 落地的关键难点，不能凭名称相同合并实体。
- 确定性规则与动态判断须分开设计：OWL 管静态语义，规则引擎/应用程序管动态业务判断，确定性规则不能交给模型推测。
- 评估须以最终业务结果为对象，测试集覆盖边界条件，金丝雀发布逐步扩量并保留人工接管与审计。

## Limitations（局限）

- 本文为作者个人归纳的方法论文章，参考架构公式为作者自述、非标准组织定义，无生产实证数据与量化效果。
- 电商售后案例为作者设定的贯穿示例，实际业务复杂度（多法人、多币种、复杂审批链、部分发货/部分退款）可能超出示例范围。
- 文中技术栈与工具设计为参考实现，不要求每家企业采用同样组合；引用的外部概念（Palantir、OpenAI）的具体主张为转述，未逐条核验原文。

## Related Knowledge（相关知识）

- [[enterprise-agent-architecture|企业 Agent 架构（从原型到交付）]]
- [[forward-deployed-engineer|FDE（前线部署工程师）]]
- [[ontology|Ontology（企业本体）]]
- [[harness-engineering|Harness Engineering]]
- [[agent-evaluation|业务 Agent 全生命周期评测]]
- [[multi-agent-saas-refactoring|多智能体重构 SaaS 业务流]]
- [[idempotency-design|幂等设计]]
- [[spec-driven-development|规范驱动开发（SDD）]]
- [[2026-11-24-enterprise-agent-architecture|企业 Agent 架构怎么搭（信源页）]]

## Source（信源）

- `raw/sources/ai/2026-11-25-enterprise-ai-agent-fullstack.md`
- 原文：https://mp.weixin.qq.com/s/4Hh7XaCg5iInfrt4Yhdy1A
