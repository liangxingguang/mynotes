---
id: inbox-2026-11-20-sdd-spec-driven-dev
title: 代码都被AI写了，那规范是AI写，还是人来写？（SPEC与PPT可收藏）
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/9MKGsp0NgxZZNeByCLCEbQ
source_type: web
platform: 微信
created: 2026-11-20
category: 技术
tags: [AI]
asset_ref: Assets/2026-11/wechat-9MKGsp0NgxZZNeByCLCEbQ.md
wiki_status: ingested
---

> **摘要**：SDD（Specification-Driven Development，规范驱动开发）直播纪要：AI 编码效率高但缺约束时自由发挥，人与人沟通成为项目主要矛盾，破解之道是从"人工驱动"转向"规范驱动"、从"人执行"转向"人定规范、AI 执行、人兜底"。三大基线宪法（prd.md/design.md/arch.md）+ 三阶段实例化（prd-A/design-A/arch-A）+ PLAN/CODE 两执行模式，核心要诀：规范先行、人类决策、AI 执行、人类兜底。

## 核心要点

- **问题**：AI 知识太广、幻觉多，无约束时产出质量方差特别大；AI 提效后古法编程流程的瓶颈转向人与人的沟通与评审。
- **SDD 定义**：流程上从"人工驱动"转向"规范驱动"；执行上从"人执行"转向"人定规范、AI 执行、人兜底"。
- **全流程四阶段**：①需求约束（需求结构化）→ ②设计约束（原型相关）→ ③架构约束（技术相关，含测试）→ ④计划与执行。
- **三大基线"宪法"**：
  - `prd.md`：PRD 模板母版，规定公司内所有 PRD 怎么写；传统 PRD 是给人评审用的、充满自然语言歧义，prd.md 是给 AI 看的；
  - `design.md`：特定产品原型设计的"宪法"，可复用公司级资产，同产品固定、不同产品不同（AI 没有设计直觉，会过度设计或设计不足）；
  - `arch.md`：架构约束规范，跨需求不变——不同公司/产品/团队/技术栈约束不同，相同组合原则上约束相同。
- **实例化五步骤**（每步都需人调优、审核、兜底）：需求实例化（prd.md 模板+具体需求→prd-A.md）→ 设计实例化（design.md+prd-A→design-A.html）→ 架构实例化（arch.md+prd-A+design-A→arch-A.md）→ 生成执行计划（AI 读基线+实例文档，产出 PLAN-A.md，含原子任务拆解、依赖管理、验收标准、风险回退）→ CODE 模式执行。
- **人的不可替代性**：AI 生成的 prd-A/PLAN/交付物都不可能完全确定，人要在中间反复对话、调优、审核、折衷、兜底——人的角色从写代码变成定规范、定约束、反馈、审核、决策、兜底；产品/设计/架构岗位不会消失，技术岗最难被其他岗位吃下。
- **效率来源**：把每个需求重复的需求/设计/架构评审沟通前置为规范沉淀，极大减少人与人低效沟通。
- **落地路径**（无基线公司）：建立 3 个基线 → 梳理并跑通流程 → 在项目中找流程与基线不足 → 持续迭代，提升公司 AI 能力上限；通用设计实践可反哺升级基线。

## 正文

完整正文见 [[Assets/2026-11/wechat-9MKGsp0NgxZZNeByCLCEbQ.md]]。全文一句话总结：通用层三个基线（prd 模板/design 约束/arch 约束）→ 实例化层三个产出（prd-A/design-A/arch-A）→ 执行层两个模式（PLAN/CODE）。文末附 SPEC 与 PPT 资料（发布在作者星球），本文为直播《AI 驱动 SDD 企业级开发全流程》纪要。

## 来源

- [代码都被AI写了，那规范是AI写，还是人来写？（SPEC与PPT可收藏）](https://mp.weixin.qq.com/s/9MKGsp0NgxZZNeByCLCEbQ)

## 附件

- [[Assets/2026-11/wechat-9MKGsp0NgxZZNeByCLCEbQ.md]]
