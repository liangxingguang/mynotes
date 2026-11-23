---
id: wiki-entity-bisheng
type: entity
title: BISHENG（毕昇）
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - entity
  - ai-agent
  - office-agent
  - private-deployment
sources:
  - raw/sources/products/2026-11-23-bisheng-3-office-agent.md
related:
  - wiki/entities/deepseek-harness.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/mcp.md
  - wiki/concepts/context-management.md
---
# BISHENG（毕昇）

## Overview（概览）

BISHENG 是 Dataelem 团队打造的开源企业级办公 Agent 平台，桌面端基于 DeepSeek Harness（DSH）开发，与 BISHENG 企业平台协同，主打**私有化部署、数据不出企业边界**，定位为 WorkBuddy、豆包工作的开源平替。客户端代码开源，可部署在自有机房/私有云，模型自选、知识库自建、权限自管。

## Identity（身份信息）

- Type（类型）: 开源企业级办公 Agent 平台（桌面端 + 企业平台）
- Organization（所属组织）: Dataelem 团队
- Role（角色）: 面向企业的私有化办公 Agent，承接文档生成、数据整理等日常办公任务
- Status（状态）: BISHENG 3.0（当前信源为 3.0 体验长文，发布时点信源未明确标注）

## Important Facts（重要事实）

- **产品形态**：由 DSH Desktop 桌面端 + BISHENG 企业平台两部分组成。DSH Desktop by Dataelem 在 DSH 发布当晚即开源，截至信源时点已有 **100 万+下载、20.8K GitHub ⭐**。
- **两种工作模式**：**Chat** 偏云端——复杂任务自动转任务模式，服务端处理，界面可见工具调用与执行进度；**Work** 偏本地——选定授权目录，在本地环境跑文件任务，产出直接存本地。
- **产出可迭代**：生成的 Word/Excel/PPT 可在同会话持续提修改要求，上下文不丢失，最终文件可下载或上传知识空间团队共享。
- **企业管理能力**：
  - 模型管理——接入与部门级授权，Chat/Work 共用月度积分账本 + 模型积分倍率。
  - 技能与工具授权——**工具管动作、技能管方法**；工具（API/MCP）管业务接口，技能管报告规范/处理步骤/办公模板，技能依赖的工具仍遵守各自权限与审批。
  - 知识空间——文件级权限，按部门/用户组授权，检索时按权限过滤。
  - 用量审计——模型调用记录/token 用量/积分消费可查。
  - 内容安全——敏感词审查 + 桌面端调用留痕。
- **不强制替换现有工具**：员工习惯的 WorkBuddy、千问办公、Codex 等外部 Agent，安装 BISHENG 知识检索技能并配密钥即可接入企业知识，管理员统一控制接入开关、密钥有效期与访问范围。
- **应用托管（3.0 新增）**：员工本地 Vibe Coding 的小应用可提交平台，自动预检 + 密钥扫描，发布审批后上架应用中心，并可接入平台的用户体系/模型/工具/知识库等基础设施。
- **开源与商业化**：客户端代码开源，可定制换 LOGO/改界面/加技能；基础功能开源，企业旗舰版提供商业能力。已服务中国气象局、汇丰银行、博世、中国移动、中粮集团、中金公司等头部组织与世界 500 强企业（信源转述，未独立核验）。
- **链接**：GitHub https://github.com/dataelement/bisheng ｜官网 https://www.bisheng.ai ｜DSH Desktop https://dshdesktop.com

## Products / Projects（产品／项目）

- [[deepseek-harness|DeepSeek Harness]]（DSH Desktop 桌面端基于其开发）

## Relationships（关系）

- [[deepseek-harness|DeepSeek Harness]]：DSH Desktop 桌面端基于 DSH 开发，是 BISHENG 的运行时底座；BISHENG 是 DSH 在企业办公场景的产品化封装。
- [[harness-engineering|Harness Engineering]]：BISHENG 的企业管理能力（模型/技能/工具/知识权限、用量审计、内容安全）是 Harness 工程「权限与隔离」「扩展机制」观察面在企业办公场景的落地。
- [[mcp|MCP]]：企业工具管理中明确支持接入 API、MCP 等工具，把企业业务接口接入任务。
- 解读：BISHENG 的 Chat/Work 双模式对应 Harness 中"云端托管 vs 本地执行"的运行环境选择，是私有化部署诉求下对执行位置的显式控制。

## Timeline（时间线）

- 2026-11-23 — BISHENG 3.0 体验长文采集入库，确立其开源企业级办公 Agent 平台定位、Chat/Work 双模式、企业资源管理五模块与应用托管能力。

## Current Understanding（当前认知）

BISHENG 切中的是企业办公 Agent 的核心矛盾：通用办公 Agent 体验好但数据要过第三方服务器，对金融/政务/制造等数据安全硬要求行业不可接受。它的解法是把模型、知识、工具、技能全部收回企业侧自管，并允许员工沿用既有 Agent（通过知识检索技能 + 密钥接入企业知识）而非强推替换，降低迁移阻力。其「工具管动作、技能管方法」的分工，以及知识空间文件级权限 + 检索时权限过滤，是把 Harness 的权限治理落到办公场景的具体形态（解读）。当前为单信源体验文，客户名单与下载量为信源转述，未独立核验，置信度中。

## Evidence（证据）

- `raw/sources/products/2026-11-23-bisheng-3-office-agent.md`
