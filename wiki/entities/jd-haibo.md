---
id: wiki-entity-jd-haibo
type: entity
title: 京东海博
status: active
created: 2026-10-22
updated: 2026-10-22
confidence: high
tags:
  - entity
  - enterprise
  - saas
sources:
  - raw/sources/ai/2026-10-14-jd-haibo-ai-knowledge-base.md
related:
  - wiki/sources/jd-haibo-ai-knowledge-base.md
---
# 京东海博

## Overview（概览）

京东海博是京东集团本地生活事业部自主研发的数字化中台 SaaS 系统（隶属北京达冠信息技术有限公司），为本地零售商家提供全流程即时零售数字化解决方案。

## Identity（身份信息）

- Type（类型）: 企业级 SaaS 系统（即时零售数字化中台）
- Organization（所属组织）: 京东集团本地生活事业部 / 北京达冠信息技术有限公司
- Role（角色）: 商家经营数字化解决方案（商品/履约/库存/员工/财务/供应链管理）
- Status（状态）: 运营中（截止 2026 年 5 月底覆盖 780+ 商家、10 万+ 门店）

## Important Facts（重要事实）

- 覆盖商品管理、履约管理、库存管理、员工管理、财务管理、供应链管理等商家经营环节。
- 技术团队公开了 AI 知识库实践：采纳 [[okf-knowledge-format|OKF 规范]]，用 Skill 从代码自动生成互链 Markdown 知识树；40 万行 WMS 仓生成约 1051 篇知识，微前端仓约 530 篇。
- AB 实验显示带知识库的 Agent 需求分析快约 44%（542 秒 vs 967 秒），并能发现纯代码触达不到的隐藏阻塞点。
- 测试侧"用例即资产 + 精准测试反查"已在 4 个业务组落地，采纳率 90%~100%。

## Products / Projects（产品／项目）

- 海博即时零售 SaaS 主系统（含 yzt-erp-wms 仓、middleground-react-web 微前端等子仓）
- Harness 知识引擎（知识库消费/沉淀双向闭环工具链，未单独建页）

## Relationships（关系）

- 京东集团（母公司，未单独建页）

## Timeline（时间线）

- 2026-05 — 官方口径：覆盖 780+ 商家、10 万+ 门店。
- 2026-10-14 — 京东云开发者发布海博 AI 知识库能力建设拆解文章（系列第二期；上期为 Harness、双 Loop 实践）。

## Current Understanding（当前认知）

海博是京东体系内 AI-Native 研发落地的标杆案例之一，其公开价值主要在"知识编译前移 + 流水线闭环"方法论而非 SaaS 产品本身；后续相关系列文章可持续并入本页与 [[okf-knowledge-format]]。

## Evidence（证据）

- `raw/sources/ai/2026-10-14-jd-haibo-ai-knowledge-base.md`
