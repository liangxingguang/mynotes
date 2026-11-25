---
id: 2026-11-25-enterprise-ai-agent-fullstack
title: 从 0 到 1 构建企业级 AI Agent：AI Coding + Ontology + Harness + FDE，全链路技术实战
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/4Hh7XaCg5iInfrt4Yhdy1A
source_type: article
platform: wechat
created: 2026-11-25
category: 技术
tags: [AI, Agent, 系统设计]
asset_ref: Assets/2026-11/wechat-4Hh7XaCg5iInfrt4Yhdy1A.md
wiki_status: pending
---

# 从 0 到 1 构建企业级 AI Agent：AI Coding + Ontology + Harness + FDE，全链路技术实战

> 摘要：企业级 Agent 的分水岭不在能不能回答问题，而在能不能把一句话安全地做成一笔真实业务操作。文章以电商智能售后 Agent 为贯穿案例，分三段展开：AI Coding 从 0 搭出 Agent、Ontology 建模让 Agent 看懂业务关系、FDE 工程交付（Agent Runtime + Harness Engineering + Evaluation）把 Agent 送进生产，并给出完整参考架构与交付物清单。

## 核心要点

- **企业级 Agent 的难点**：从"查物流答题"到"帮我退货退款"，需跨订单、支付、物流、售后多系统执行多步操作，任何一步出错都是真实业务损失。
- **FDE（Forward Deployed Engineer，前线部署工程师）**：源自 Palantir 实践，贴着业务结果走、从调研管到交付的工程角色，横跨业务调研、需求拆解、架构设计、应用开发、系统集成、测试评估、生产交付。AI Coding 让小团队能扛起多角色的活，但 AI 能写代码不等于懂业务规则，需求定义与交付质量反而更要紧。
- **第一段·AI Coding 搭建**：把售后业务拆为订单查询、物流查询、商品查询、退款查询、退货申请、人工转接六个工具（明确输入/输出/权限）。**踩坑**：不能信任模型传来的 customer_id，权限与业务校验必须由可信后端做，退款工具不能因模型判断想退就直接动资金。参考技术栈：React+Vite 前端、FastAPI 后端、WebSocket、Qwen/DeepSeek、LangChain 或自定义、PostgreSQL、Claude Code/Codex 辅助；已有 Java 微服务的企业不必重写，架构应适应现有系统。用 Coding Agent 时分阶段开发，**每做完一个模块就跑一次测试**，别让 AI 一口气生成整个项目。
- **第二段·Ontology 建模**：解决跨系统数据（商品用 sku_code、订单用 sku_id、库存自有编码）语义割裂问题。定义 Customer、Product、SKU、Order、OrderItem、Payment、Inventory、Shipment、Return、Refund 十个核心对象及关系；RDF 用三元组描述业务事实，OWL 定义概念/关系/逻辑语义（静态），SPARQL 查询图数据（动态业务判断如退款期限、金额上限仍靠规则引擎或应用程序，两类规则分开设计）。AI 辅助建模五步：明确业务问题→识别业务对象→建立对象关系→映射真实数据（解决跨系统 ID 对齐，不能凭名称相同当同一实体）→用 Competency Questions（业务能力问题）验证本体。
- **Ontology + Agent**：设计统一 Ontology 查询服务（如 get_order_context 聚合订单、明细、物流、支付、售后），流程为意图识别→选工具→查对象关系→规则引擎判断→Agent 组织回答→必要时创建售后申请。退货资格判断等确定性规则由正式业务政策服务实现，不能让模型推测，且须符合消保法规。**踩坑**：退款接口超时后重调可能重复退款，必须用幂等键、业务流水号和执行状态查询。
- **Multi-Agent**：Supervisor Agent 拆任务，商品/营销/库存/订单/物流/售后专业 Agent 分工，各守明确职责与工具权限（商品 Agent 不需退款权限，库存 Agent 不碰支付）。统一 SKU 标识让多 Agent 确认说的是同一规格；该不该拆取决于任务复杂度，Agent 一多协调成本也涨。
- **第三段·Harness Engineering + Agent Runtime**：Harness 是围绕 Agent 的执行管理机制，含 Goal、Context、Planning、Tools、Execution、Observation、Verification、Recovery、Safety、Evaluation 模块；Runtime 管运行环境与生命周期（"Runtime 让 Agent 跑起来，Harness 让 Agent 按预期做完"）。退款任务走完整圈：目标→上下文→规划→工具调用→观察→验证→安全校验→执行→再验证→完成；按错误类型区分处理（查询超时有限重试、订单不存在终止、权限不足拒绝、退款超时先查原状态、金额不符交人工）。**最后的安全约束必须由程序执行**。
- **FDE 四阶段交付**：① 需求分析与快速原型（尽早交业务人员体验）；② SDD（规格驱动）+ TDD（先写测试再实现），但测试通过后仍要用真实系统验证，不能只信模型生成的测试；③ Evaluation 双重评估——业务指标（AI 独立解决率、查询/规则/退款准确率、人工接管率）与系统指标（Tool Calling 成功率、端到端成功率、P95 延迟、异常恢复率、权限拦截准确率），**评估对象是最终业务结果**，测试集须覆盖边界条件；④ Canary Release 金丝雀发布（如 5% 走新版），盯核心指标，达标扩量，异常暂停回滚，保留人工接管与完整审计。
- **参考架构公式**：`Enterprise AI Agent = Model + Context + Tools + Ontology + Harness + Runtime + Evaluation`（作者个人归纳，非标准定义）。
- **交付物清单**：业务需求、Ontology（含对象定义、字段映射、数据来源、实体标识、更新机制、版本变更）、应用代码、数据集成、业务规则、测试评估、生产部署（Runtime、监控、审计、恢复、回滚）。Agent 不能只交一份 Prompt，须含工具定义、权限配置、任务状态、错误处理和执行日志。
- **结语**：模型决定 Agent 能想多深，业务模型决定它看不看得懂企业，工程体系决定它能不能把任务安全做完。

## 正文

见 `[[Assets/2026-11/wechat-4Hh7XaCg5iInfrt4Yhdy1A]]`（采集全文，约 2.1 万字，已通读）。文章以电商智能售后为贯穿案例：先讲 FDE 概念与电商业务背景，再用 AI Coding 搭建售后 Agent（含工具设计、技术栈、Coding Agent 使用要点），随后引入 Ontology（对象建模、RDF/OWL/SPARQL、AI 辅助建模五步、查询服务与退货实战），扩展到 Multi-Agent 智能运营系统，再讲 Harness Engineering 与 Runtime 的生产执行管理，最后给出 FDE 四阶段交付流程、完整架构图、交付物清单与"何时算做完"的判断标准。

## 来源

- [从 0 到 1 构建企业级 AI Agent：AI Coding + Ontology + Harness + FDE，全链路技术实战](https://mp.weixin.qq.com/s/4Hh7XaCg5iInfrt4Yhdy1A)

## 附件

- [[Assets/2026-11/wechat-4Hh7XaCg5iInfrt4Yhdy1A]]
