---
id: wiki-source-2026-11-26-end-to-end-business-requirement-agent
type: source
title: 如何搭建一个端到端业务需求专家 Agent
status: active
created: 2026-11-26
updated: 2026-11-26
confidence: medium
tags:
  - source
  - AI
  - Agent
  - 研发体系
sources:
  - raw/sources/ai/2026-11-26-end-to-end-business-requirement-agent.md
related:
  - wiki/concepts/business-requirement-agent.md
  - wiki/concepts/ai-native-sdlc.md
---
# 如何搭建一个端到端业务需求专家 Agent

## Overview（概览）

微信公众号文章（作者森叶，淘天集团-用户&内容技术团队）。记录一套已在真实业务需求上跑通的端到端需求研发 Agent 闭环系统：核心立论是 AI 写代码已不是主要瓶颈，真正贵的是代码之外的串联成本。系统以四层架构（上下文输入层、业务专家编排层、工具执行层、反馈学习层）组织需求从进入、澄清、方案、实现、CR、验收、发布到结项沉淀的完整流程，设三道质量门（需求澄清、技术方案、内部质量），人只在关键节点确认，结项时把过程经验蒸馏回长期 wiki，形成自我成长闭环。落地基于 Multica 平台与 superai-* 系列 Skill。

## Key Facts（关键事实）

- 三个工程化问题：上下文要能组织（需求材料 + 长期业务知识）、工具要能串联（Aone/CR/SLS/HSF/监控/钉钉文档等）、反馈要产生复利（不留在聊天里）。
- 四层架构：上下文输入层（按阶段拉取，不一次性塞 prompt）、业务专家编排层（判断下一步与人工确认点）、工具执行层（按阶段调用平台能力）、反馈学习层（结项沉淀稳定知识、skill 改进候选、归档一次性材料）。
- 上下文三仓库设计：代码仓与项目记忆仓按需求拉 feature 分支，长期 wiki 恒在 master；过程事实先留项目记忆层，经结项审视与人工确认才选择性蒸馏回长期 wiki，避免噪声污染。
- 三道质量门：需求澄清门（结构化 requirements，人确认整体表述而非零散回答）、技术方案门（方案阶段定清验收方式/测试策略/配置 schema）、内部质量门（TDD 驱动 + pre-push hook 硬卡 diff-to-test 映射、PMD、内部 review，不靠提示词自觉）。
- TDD 关键取舍：先按 plan 的验收标准写测试定义「什么是对的」，再让实现满足测试；反对为覆盖率补测试。质量门禁必须变成 Agent 绕不过去的硬规则（git pre-push hook 注入 PMD 与覆盖率检查，不通过拒绝 push）。
- CR/Issue 协同：requirements 与 plan 写入项目记忆仓 feature 分支、push 后建 CR，人机反馈落在平台评论体系；评论协作最密集的阶段是澄清与方案而非写代码；Aone milestone 回刷带 commit link、CR link 与验证证据。
- 真实环境验收：独立项目环境部署后，用 HSF 泛化调用验证业务行为、SLS 查询验证日志、监控/Sunfire 核对运行时指标，覆盖正例/反例/回归三类；验收证据写入 progress/verification 文件可回读；主预发部署与线上发布仍由人工确认。
- 上线不是终点：发布后持续回读 SLS/HSF/监控，观察期无异常才结项。
- 结项沉淀三问：哪些知识稳定（进长期 wiki/codemap）、哪些流程可改进（skill/提示词候选）、哪些材料只需归档（closeout raw log）；每类需人工确认才写入。
- 后续规划：降低接入成本（平台鉴权适配 CLI/API）、建立 Agent 效果度量（人力投入/需求质量/线上稳定性/协作效率四维度）、从单 Agent 走向 Agent Team（共享长期 wiki、各自维护视角，PD/前端/后端/测试多角色，数据方向已试点）。
- 落地组件：Multica（独立 issue 工作区、Agent-skill 绑定、多运行时与沙箱）；superai-clarify / superai-plan / superai-execute / superai-code-review / superai-aone（a1 CLI）/ superai-sls / superai-ops / superai-finish / superai-memories / superai-tjx / superai-mt；天机星 CLI（tjx-cli）与工作台 CLI。

## Important Claims（重要论断）

### Claim 1：瓶颈在代码之外的串联成本

AI 写代码本身已不是主要瓶颈，从 PRD 到上线的中间环节（澄清、方案、实现、CR、验收、发布观察、结项沉淀）中代码生成只是最标准化的一段；如果各环节能力散落在不同对话/工具/命令里，最终负责串起来的还是人，人工介入频次越高整条链路越容易被拖住。

### Claim 2：质量门禁必须工程化硬卡，不能靠提示词

提示词再怎么写「push 前必须跑 PMD」，Agent 在复杂任务中仍可能跳过；必须通过 git pre-push hook 把检查注入 push 流程，让门禁从「Agent 应该做」变成「不做就推不上去」。

### Claim 3：反馈留痕是结项沉淀的前提

CR 评论与 issue 对话不只是当次协作工具，更是结项素材；反馈只停在聊天框里，需求结束就蒸发，无法被系统性回看分析。

### Claim 4：结项蒸馏形成自我成长闭环

每做一个需求，Agent 理解业务的基线就高一点，人需要解释的上下文就少一点——前提是稳定知识经人工确认进入长期 wiki，成为下一个需求进入时的背景拉取来源。

### Claim 5：Agent Team 的关键设计约束

共享长期 wiki，各自维护视角：所有 Agent 共享同一份长期业务知识保证理解一致，但各自只拆解职责相关部分、维护自己的 requirements/plan/过程产物，队长负责对齐产物与接口契约。Agent 拆分不应按流程步骤机械切分，而应看是否真存在独立判断、独立产物、并行执行和责任隔离的需要。

## Concepts Introduced（引入的概念）

- [[business-requirement-agent|业务需求专家 Agent（端到端需求研发闭环）]]
- [[acceptance-agent|验收 Agent（AI 生成代码的验收）]]
- [[ai-native-sdlc|AI 原生 SDLC]]
- [[spec-driven-development|规范驱动开发（SDD）]]
- [[coding-agent-knowledge-base|Coding Agent 知识库（域—场景—知识建模方法）]]
- [[agent-memory-system|Agent 记忆系统]]

## Entities Mentioned（提及的实体）

- **Multica**：Agent 研发落地平台，提供独立 issue 工作区、Agent 与 skill 绑定、多运行时与沙箱（单信源，未建独立实体页）。
- **Aone**：需求工作项/CR 协作平台，Agent 经 a1 CLI 完成评论读写与 milestone 回刷（单信源，未建独立实体页）。
- **淘天集团-用户&内容技术团队**：作者所属团队，聚焦淘宝用户运营与互动场景（淘金币、芭芭农场、红包签到等）。

## Implications（影响／启示）

- 「业务需求专家 Agent」的目标描述值得借鉴：不是更聪明的代码生成器，而是把需求研发过程中的上下文、工具调用、人工确认、验收证据与反馈沉淀组织成闭环。
- 项目记忆层 + 长期 wiki 的双层知识结构，为「过程事实」与「稳定知识」划了明确分流线，与本库 raw/wiki 的 append-only + 蒸馏机制同构（解读）。
- 三道质量门中「方案阶段就定清验收方式/测试策略/配置 schema」把返工成本前置，与 [[ai-assisted-architecture-design]] 的评审预检思路一致（解读）。

## Limitations（局限）

- 单信源（微信公众号团队自述），全部机制细节与「已跑通」均为作者自述，无第三方复现或对照数据。
- 平台绑定较强（Aone/Multica/HSF/SLS/天机星/工作台 CLI 为阿里系内部工具），向其他技术栈的迁移路径未讨论。
- 度量体系（人力投入/需求质量/线上稳定性/协作效率）仅提出维度，无具体指标定义与基线数据。

## Related Knowledge（相关知识）

- [[2026-11-24-weixin-fcd-full-cycle-developer|半年用AI写需求，我终于不用给AI当测试了（信源页）]]
- [[2026-11-20-taobao-ai-native-rd|淘宝天猫海外技术的AI Native研发范式升级实践与思考（信源页）]]
- [[2026-11-20-ai-coding-team|AI Coding之后：搜广推团队的研发工程化探索（信源页）]]

## Source（信源）

- `raw/sources/ai/2026-11-26-end-to-end-business-requirement-agent.md`（原文全文自 Assets/2026-11/how-to-build-end-to-end-business-requirement-agent.md 逐字收录）
