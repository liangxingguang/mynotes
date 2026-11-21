---
id: wiki-source-2026-11-20-sdd-spec-driven-dev
type: source
title: 代码都被AI写了，那规范是AI写，还是人来写？（SPEC与PPT可收藏）
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: medium
tags:
  - source
  - ai
  - sdlc
  - specification
sources:
  - raw/sources/ai/2026-11-20-sdd-spec-driven-dev.md
related:
  - wiki/concepts/spec-driven-development.md
  - wiki/concepts/ai-native-sdlc.md
  - wiki/concepts/ai-native-organization.md
---
# 代码都被AI写了，那规范是AI写，还是人来写？（SPEC与PPT可收藏）

## Overview（概览）

微信公众号直播《AI 驱动 SDD 企业级开发全流程》的纪要，文末附 SPEC 与 PPT 资料（发布在作者星球）。围绕「AI 编码提效后规范由谁写」的命题，系统介绍 SDD（Specification-Driven Development，规范驱动开发）：从「人工驱动」转向「规范驱动」、从「人执行」转向「人定规范、AI 执行、人兜底」。给出全流程四阶段、三大基线「宪法」、实例化五步骤与 PLAN/CODE 两执行模式，并回答人的价值与岗位存续问题。直播纪要，单信源，置信度中。

## Key Facts（关键事实）

- **问题背景**：AI 编码效率极高，但 AI 知识太广、幻觉太多，缺乏约束时自由发挥，产出质量方差特别大；AI 提效后古法编程流程瓶颈转向人与人沟通与评审。
- **SDD 定义**：流程上从「人工驱动」转向「规范驱动」；执行上从「人执行」转向「人定规范、AI 执行、人兜底」。
- **全流程四阶段**：① 需求约束（需求结构化）→ ② 设计约束（原型相关）→ ③ 架构约束（技术相关，含测试）→ ④ 计划与执行。
- **三大基线**：`prd.md`（PRD 模板母版，给 AI 看）、`design.md`（设计约束规范，同产品固定、不同产品不同）、`arch.md`（架构约束规范，跨需求不变）。
- **实例化五步骤**：需求实例化（→prd-A.md）→ 设计实例化（→design-A.html）→ 架构实例化（→arch-A.md）→ 生成执行计划（PLAN 模式，→PLAN-A.md，含原子任务拆解/依赖管理/验收标准/风险回退）→ CODE 模式执行；每步需人调优审核兜底。
- **核心要诀**：规范先行、人类决策、AI 执行、人类兜底。
- **落地路径（无基线公司）**：建立 3 个基线 → 梳理并跑通流程 → 在项目中找流程与基线不足 → 持续迭代，提升公司 AI 能力上限；通用设计实践可反哺升级基线。

## Important Claims（重要论断）

### 人不会被基线「蒸馏」掉

AI 不可能生成完全确定的 prd-A、PLAN 与交付物，必须人在中间反复对话、调优、补充、审核、折衷、兜底；人的角色从写代码变成定规范、定约束、反馈、审核、决策、兜底。产品、设计、架构岗位不会消失，技术岗最难被其他岗位吃下。

### 效率来自沟通前置为规范沉淀

SDD 极大地减少人与人之间的沟通与评审——把传统流程里每个需求都要走一遍的需求评审、设计评审、架构评审等重复低效沟通，前置为规范沉淀。

## Concepts Introduced（引入的概念）

- [[spec-driven-development|规范驱动开发（SDD）]]

## Entities Mentioned（提及的实体）

- 无独立实体（方法性信源）

## Implications（影响／启示）

**解读**：SDD 把「规范」从给人读的评审文档重新定位为给 AI 看的约束边界，是 AI 原生研发中「人守闸门」的一种可操作落地——规范先行保证 AI 在约束内执行，人类兜底保证结果责任仍在人。其价值主张（减少人与人低效沟通）与 [[ai-native-sdlc|AI 原生 SDLC]]「制品提交链驱动闭环」、[[ai-native-organization|AI 原生研发组织]]「Spec 为共同语言」同向。

## Limitations（局限）

- 直播纪要为二手转述，三大基线的具体模板字段、实例文档的完整样例未在正文给出（附资料在作者星球，未公开收录）。
- 单一信源，无第三方验证或生产数据佐证其提效效果。

## Related Knowledge（相关知识）

- [[spec-driven-development|规范驱动开发（SDD）]]
- [[ai-native-sdlc|AI 原生 SDLC]]
- [[ai-native-organization|AI 原生研发组织]]

## Source（信源）

- `raw/sources/ai/2026-11-20-sdd-spec-driven-dev.md`
