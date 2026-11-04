---
id: wiki-source-tencent-agent-whitepaper-78-pages
type: source
title: 78 页讲透 Agent 落地：腾讯企业智能体路线图（易海工程AI）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - source
  - agent
  - 企业落地
sources:
  - raw/sources/enterprise/2026-11-03-tencent-agent-whitepaper-78-pages.md
related:
  - wiki/concepts/enterprise-agent-three-stage-transition.md
  - wiki/sources/bend-ai-agent-legacy-integration.md
  - wiki/sources/workflow-vs-agent.md
  - wiki/sources/ai-native-organization.md
---

# 78 页讲透 Agent 落地：腾讯企业智能体路线图

## Overview（概览）

公众号「易海工程AI」行业观察（2026-11-01 发布，2026-11-03 采集），解读 2026 腾讯全球数字生态大会互联网与数字技术专场发布的 78 页《AI Agent 企业解决方案及落地实践》白皮书。文章把白皮书读成「一张时间表」：什么阶段该上、从哪一层上、哪条业务线先跑通。概念本体见 [[enterprise-agent-three-stage-transition|企业 Agent 三阶段跃迁]]。

## Key Facts（关键事实）

- 发布背景：2026-10-29~30 腾讯全球数字生态大会互联网与数字技术专场发布 78 页白皮书；本文为媒体解读。
- 三阶段跃迁：知识问答（对提问负责）→ 办公助手/Agent 工作台（对动作负责）→ 数字员工（对结果负责，按 KPI 交付）；分界线是责任边界而非模型强弱。
- 四块底座：WorkBuddy（企业级智能体，执行主体）、ClawPro（Agent 管控台，管权限/边界/审计）、Agent Runtime（执行引擎/云沙箱/记忆/网关/可观测五件套）、TokenHub（混元/第三方/开源模型统一调度路由）。
- 九章目录：AI 整体方案、内部提效、技术底座、SaaS Agent、内容生产、AI 社交陪伴、游戏内 AI 玩法、运营与智能客服、WorkBuddy 生态共建；篇幅最厚的是内部提效（研发运维全链路）。
- 高管时间表（发布会后媒体群访）：腾讯云互联网行业技术总经理陈亮——具身智能 80 分模型 2 年内、通用机器人 5~8 年，AI 在游戏行业降本增效「落地和验证最多」但业态级创新还在试点；钛动科技「钛极」大模型负责人丁俊玮——广告营销洞察/创意生产/投放调优 90%+ 任务可交给 Agent；素材产能一人一天从 10 条到上千条。
- 对工程企业的三个动作：从岗位立项（算重复动作吃掉的人天）不从平台立项；把 SOP 写成可被调用的 Skill；先内部跑通再对外交付。

## Important Claims（重要论断）

### Claim 1：Agent 第一波价值在对内省，第二波才对外卖

全书篇幅最厚的是内部提效而非对外创新；被重点展开的业务方向都符合同一形状——人天密集、动作重复、结果可验收（内容生产、智能客服、研发运维），动作模糊、结果难验收的谈得少。

### Claim 2：技术瓶颈正让位给判断瓶颈

模型能逐帧描述一条广告的内容，却说不出哪几秒最关键；预算决策还得人拍板——人的精力成了卡点。

### Claim 3：门槛不在模型，在流程有没有被写清楚

三阶段跃迁的前提是企业先把自己的流程讲得明白到机器能听懂；四层底座中模型层（TokenHub）最易被高估，权限与审计（ClawPro）应先理清。

## Concepts Introduced（引入的概念）

- 三阶段跃迁（责任边界分界线）——概念页：[[enterprise-agent-three-stage-transition]]
- 数字员工 / 第三代办公范式
- SOP 即 Skill（标准作业程序沉淀为 Agent 可调用能力库）

## Entities Mentioned（提及的实体）

- 腾讯（白皮书发布方）、WorkBuddy/ClawPro/TokenHub（腾讯产品骨架组件）、钛动科技（「钛极」大模型）
- 陈亮（腾讯云互联网行业技术总经理）、丁俊玮（钛动科技大模型负责人）

## Implications（影响／启示）

对工程企业的用法：做预算/立项报告时按四层底座拆（谁干活、谁管、跑在哪、用哪个模型），避免「上一个 AI 到底买的是哪部分」的糊涂账；内部提效容错高、验收快，是最适合的第一个 PoC 场景。

## Limitations（局限）

- 单一信源且为二次解读：本文是公众号行业观察，非白皮书原文；白皮书本体（PDF/大会材料）未直接采集，关键论断经转述。
- 部分数字（90%+ 任务可 Agent 化、素材产能 10 条→上千条、具身智能时间表）来自高管群访表态，属前瞻性判断而非已验证结果。
- 原文配图为白皮书内页截图，无法文字化。

## Related Knowledge（相关知识）

- [[enterprise-agent-three-stage-transition]]（三阶段跃迁概念本体）
- [[bend-ai-agent-legacy-integration]]（B 端 Agent 落地旧系统对接框架，互为落地视角）
- [[workflow-vs-agent]]（控制流分界：能用 workflow 别上 agent）
- [[ai-native-organization]]（AI 原生研发组织：工具→工作流→组织原生）

## Source（信源）

- `raw/sources/enterprise/2026-11-03-tencent-agent-whitepaper-78-pages.md`
