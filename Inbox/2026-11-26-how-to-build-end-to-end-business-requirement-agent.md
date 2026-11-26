---
id: inbox-2026-11-26-01
title: 如何搭建一个端到端业务需求专家 Agent
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/9-KVLH2D5VYmyAzbI9nFmA
source_type: web
platform: 微信
created: 2026-11-26
category: 技术
tags:
  - Agent
  - AI
  - 系统设计
asset_ref: Assets/2026-11/how-to-build-end-to-end-business-requirement-agent.md
wiki_status: pending
---

# 如何搭建一个端到端业务需求专家 Agent

> 摘要：一套已在真实业务跑通的端到端需求研发 Agent 闭环。核心观点：AI 写代码不再是主要瓶颈，贵的是代码之外的串联成本。系统用四层架构（上下文输入、业务专家编排、工具执行、反馈学习）加三道质量门（需求澄清、技术方案、内部质量），把需求从进入、澄清、方案、实现、CR、验收、发布到结项组织成自动化流程，人只在关键节点确认，结项时将过程经验蒸馏回长期 wiki，形成自我成长闭环。

## 核心要点

1. **三个工程化问题**：上下文要能组织（需求材料+长期业务知识）、工具要能串联（Aone/CR/SLS/HSF/监控等）、反馈要产生复利（不留在聊天里）。
2. **四层架构**：上下文输入层（按阶段拉取，不一次塞 prompt）、业务专家编排层（判断下一步与人工确认点）、工具执行层（按阶段调用平台能力）、反馈学习层（结项沉淀稳定知识、skill 改进候选、归档一次性材料）。
3. **上下文三仓库设计**：代码仓与项目记忆仓按需求拉 feature 分支，长期 wiki 恒在 master；过程事实先留项目记忆层，经结项审视和人工确认才选择性蒸馏回长期 wiki，避免噪声污染。
4. **三道质量门**：需求澄清门（结构化 requirements，人确认的是整体表述而非零散回答）、技术方案门（方案阶段就定清验收方式/测试策略/配置 schema）、内部质量门（TDD 驱动 + pre-push hook 硬卡 diff-to-test 映射、PMD、内部 review，不靠提示词自觉）。
5. **反馈留痕**：CR 评论、milestone 回刷带 commit/证据，让反馈成为结项素材；评论协作最密集的阶段是澄清与方案，而非写代码。
6. **真实环境验收**：独立项目环境部署后用 HSF 泛化调用、SLS 日志、监控核对正例/反例/回归，验收证据可回读；主预发部署与线上发布仍由人工确认。
7. **上线不是终点**：发布后持续回读日志与指标，观察期无异常才结项。
8. **后续规划**：降低接入成本（平台鉴权适配 CLI/API）、建立 Agent 效果度量（人力投入/需求质量/线上稳定性/协作效率）、从单 Agent 走向 Agent Team（共享长期 wiki、各自维护视角，PD/前端/后端/测试多角色，已在数据方向试点验证）。

## 正文

详见 [[Assets/2026-11/how-to-build-end-to-end-business-requirement-agent.md]]

## 来源

- <https://mp.weixin.qq.com/s/9-KVLH2D5VYmyAzbI9nFmA>

## 附件

- [[Assets/2026-11/how-to-build-end-to-end-business-requirement-agent.md]]
