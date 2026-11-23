---
id: wiki-source-2026-11-23-bisheng-3-office-agent
type: source
title: 一个能平替 WorkBuddy 和豆包工作的开源办公 Agent，来了！支持私有化部署
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - source
  - ai-agent
  - office-agent
  - private-deployment
sources:
  - raw/sources/products/2026-11-23-bisheng-3-office-agent.md
related:
  - wiki/entities/bisheng.md
  - wiki/entities/deepseek-harness.md
---
# 一个能平替 WorkBuddy 和豆包工作的开源办公 Agent，来了！支持私有化部署

## Overview（概览）

微信公众号体验长文，介绍 Dataelem 团队开源的企业级办公 Agent 平台 BISHENG 3.0。文章以项目汇报（Chat 模式）与销售数据整理（Work 模式）两个真实任务实测全流程，并介绍企业侧的模型/技能/知识权限管理、外部 Agent 接入与员工应用托管能力，论证其作为 WorkBuddy/豆包工作开源平替、支持私有化部署的定位。

## Key Facts（关键事实）

- BISHENG 3.0 由 DSH Desktop 桌面端 + BISHENG 企业平台组成；DSH Desktop by Dataelem 已有 100 万+下载、20.8K GitHub ⭐。
- Chat 偏云端（复杂任务自动转任务模式，界面可见工具调用与执行进度），Work 偏本地（选授权目录，本地跑文件任务，产出存本地）。
- 实测一·项目汇报（Chat）：上传会议纪要+进度跟踪表，引用知识空间产品方案，按公司周报模板生成五部分汇报，同会话持续迭代，文件可下载或上传知识空间共享。
- 实测二·销售数据 Excel（Work）：本地 CSV 生成含月度汇总/区域分布/产品线拆分的工作簿，用 Excel 公式而非写死数值；一句话改预算即可联动更新合计与图表。
- 企业管理五模块：模型管理（积分账本+倍率）、技能与工具授权（工具管动作、技能管方法）、知识空间（文件级权限）、用量审计、内容安全（敏感词+留痕）。
- 外部 Agent 接入：WorkBuddy/千问办公/Codex 等装知识检索技能+配密钥即可接入企业知识，管理员统一控制接入开关与访问范围。
- 应用托管：员工小应用经预检+密钥扫描+审批上架应用中心，接入平台用户体系/模型/工具/知识库。
- 已服务中国气象局、汇丰、博世、中国移动、中粮、中金等头部组织（信源转述）。

## Important Claims（重要论断）

### Claim 1

办公 Agent 的核心企业需求是私有化部署、数据不出边界：会议纪要、方案、客户资料、财报等核心资产经通用办公 Agent 处理意味着数据过第三方服务器，金融/政务/制造等数据安全硬要求行业过不去。

### Claim 2

BISHENG 不强制替换现有工具，而是把企业知识与资源能力开放出来，让各种 Agent 都能接得上——比强推一套新工具更人性化（解读：降低企业迁移阻力的务实策略）。

### Claim 3

AI 越强大，谁来控制它越重要；对企业而言是在自己基础设施上跑 AI、用自己的规则管数据，其价值比任何单一功能都大。

## Concepts Introduced（引入的概念）

- [[bisheng|BISHENG（毕昇）]]
- [[harness-engineering|Harness Engineering]]（企业级权限治理在办公场景的落地）

## Entities Mentioned（提及的实体）

- [[bisheng|BISHENG（毕昇）]]
- [[deepseek-harness|DeepSeek Harness]]（DSH Desktop 底座）
- 解读：WorkBuddy、豆包工作、千问办公、Codex 为被对标的外部 Agent 产品，当前未建独立实体页。

## Implications（影响／启示）

私有化部署的办公 Agent 把"模型自选、知识自建、权限自管"收回企业侧，是 Harness 权限治理在非研发场景（办公文档/数据）的延伸；「工具管动作、技能管方法」的分工可复用于企业 Agent 资源治理设计。

## Limitations（局限）

- 单信源体验文，客户名单与下载量/Star 数均为信源转述，未独立核验。
- 文章为产品体验与功能介绍，未涉及技术实现细节、性能基准或与竞品的量化对比。
- 采集稿配图均为 1px 占位符（公众号配图抓取所致），原文截图未留存。

## Related Knowledge（相关知识）

- [[bisheng|BISHENG（毕昇）]]
- [[deepseek-harness|DeepSeek Harness]]
- [[harness-engineering|Harness Engineering]]

## Source（信源）

- `raw/sources/products/2026-11-23-bisheng-3-office-agent.md`
