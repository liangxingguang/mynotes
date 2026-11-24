---
id: inbox-2026-11-24-enterprise-agent-architecture
title: 企业 Agent 架构怎么搭？AI Coding + Ontology + Harness，从原型到交付
source: 微信公众号 · 架构师(JiaGouX)
source_url: https://mp.weixin.qq.com/s/8R60mUjASxtxWCSBbj2T5w
source_type: web
platform: 微信
created: 2026-11-24
category: 技术
tags:
  - Agent
  - AI
  - 系统设计
asset_ref: Assets/2026/11/enterprise-agent-architecture-ai-coding-ontology-harness.md
wiki_status: ingesting
ingest_claimed_at: "2026-11-24T06:58:36.008Z"
ingest_claim_id: 9504-1795503516008-0
---

# 企业 Agent 架构怎么搭？AI Coding + Ontology + Harness，从原型到交付

> 用 AI Coding 做原型、Ontology 说清业务含义、Harness 组织执行，让企业 Agent 从"给建议"走到"交结果"。文章以"发票异常处理"为例，给出从任务边界、建模、工具、执行、等待恢复、幂等到评估交付的完整落地路径。

## 核心要点

1. **五大角色分工**：AI Coding 实现原型，Ontology 定义业务对象/关系/动作，Harness 组织单轮执行，Runtime 承接持久状态与调度，FDE 负责现场交付与打通。
2. **核心原则**：调查路径留给 Agent，正式动作校验留在业务服务，跨轮次跟进交给持久流程。
3. **任务边界**：首版聚焦"发票卡点→补材料→等审批→创建付款申请"一条可验收路径，合并开票/部分付款等先转人工。
4. **AI Coding 原型**：用 SDD+TDD，先跑通只读调查，再逐层替换真实接口；模拟接口通过≠真实系统可用，权限/延迟/错误返回需逐项验证。
5. **Ontology 建模**：定义发票、采购单、收货记录、审批记录、付款申请等对象及关系，稳定编号关联；同字段跨系统语义不同（如"已完成"），不能靠模型臆断合并。
6. **工具设计**：少而精，如 `get_invoice_context()` 组合多次查询返回调查所需字段；严格区分"无记录/无权限/查询失败"三种返回，避免误判。
7. **写操作**：如 `create_payment_request`，模型只提议、执行层补身份与版本、业务服务校验权限与规则，审批标识不能由模型参数决定。
8. **Harness**：组织上下文、工具调用、结果处理，含停止条件（调用数/预算/无进展）；多 Agent 拆分需证明改善再保留。
9. **等待与恢复**：区分业务事实/任务进度/分析记录三类记录；恢复时先重查事实，再决定是否重新推理；LangGraph `interrupt()` 恢复会重跑节点，创建待办需拆步且支持幂等。
10. **幂等与结果确认**：提交超时进"结果待确认"，用稳定操作标识查询而非重发；服务端需真正去重，多放 UUID 不解决幂等。
11. **评估回归**：扩展样本覆盖证据缺口、超时无权限、改价、事件重复、响应丢失、人工已处理等；开发样本与留出样本分开，版本变更用同一组任务回归。
12. **FDE 交付**：先只读→影子运行→开放写操作，逐步扩自动化；保留人工接管路径，版本回退与业务撤销需分别处理。

## 正文

详见 [[Assets/2026/11/enterprise-agent-architecture-ai-coding-ontology-harness]]。

文章从整体架构切入，以"发票异常处理"为贯穿案例，依次展开任务边界、AI Coding 原型、Ontology 业务建模、查询与动作工具设计、Harness 组织执行、等待与恢复、幂等与结果确认、评估与回归、FDE 现场交付九个环节。核心主张是：企业 Agent 不是单个模型调用，而是"模型做调查分析、业务服务守正式动作、持久流程管跨轮跟进"的协作体系。每一步都强调用真实样本和可验收产物校准，避免把"模拟通过"当成"系统可用"。

## 来源

- [企业 Agent 架构怎么搭？AI Coding + Ontology + Harness，从原型到交付](https://mp.weixin.qq.com/s/8R60mUjASxtxWCSBbj2T5w) — 架构师(JiaGouX)

## 附件

- [[Assets/2026/11/enterprise-agent-architecture-ai-coding-ontology-harness]]
