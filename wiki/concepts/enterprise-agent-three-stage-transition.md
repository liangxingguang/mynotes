---
id: wiki-concept-enterprise-agent-three-stage-transition
type: concept
title: 企业 Agent 三阶段跃迁（能对话 → 能干活 → 能上岗）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - concept
  - agent
  - 企业落地
sources:
  - raw/sources/enterprise/2026-11-03-tencent-agent-whitepaper-78-pages.md
related:
  - wiki/sources/tencent-agent-whitepaper-78-pages.md
  - wiki/sources/workflow-vs-agent.md
  - wiki/sources/ai-native-organization.md
  - wiki/concepts/agent-legacy-system-integration.md
  - wiki/concepts/agent-permission-model.md
---

# 企业 Agent 三阶段跃迁（能对话 → 能干活 → 能上岗）

## Definition（定义）

腾讯《AI Agent 企业解决方案及落地实践》白皮书（78 页，2026 腾讯全球数字生态大会发布）提出的企业智能体成熟度模型：把企业用 Agent 的方式切成三段——**知识问答**（问答工具，只对提问负责）→ **办公助手 / Agent 工作台**（嵌入工作流、调用工具、操作文档，对动作负责）→ **数字员工**（进入系统、操作数据、完成业务闭环，对结果负责、按 KPI 交付）。三段的真正分界线**不是模型强弱，而是责任边界**。

## Why It Matters（为什么重要）

它把「我们公司 AI 用得怎么样」变成可自查的问题：多数工程企业今天停在第一段（买几个问答工具，写方案时查规范、改措辞），真正省人天的是第二、三段，因为它们接的是流程，不是聊天框。

## Core Characteristics（核心特征）

1. 责任边界递进：对提问负责 → 对动作负责 → 对结果负责。
2. 第三代办公范式：人负责给目标、设边界、做判断；数字员工理解上下文、持续执行、交付结果（一项完成的工作，而非一份文件）。
3. 业务选择形状：被重点展开的方向符合「人天密集、动作重复、结果可验收」（内容生产、智能客服、研发运维）；动作模糊、结果难验收的谈得少。
4. 价值次序：第一波价值在对内提效省钱，第二波才是把 Agent 做成产品卖给客户。

## Structure（结构）

白皮书把「Agent 能上岗」拆成四层可采购的底座，可直接当立项拆解线：

| 层 | 组件 | 职责 |
|---|---|---|
| 执行主体 | WorkBuddy | 企业级智能体：给目标和边界，调工具、操作文档、持续执行 |
| 管控层 | ClawPro | Agent 管控台：管权限、管边界、管审计 |
| 基础设施 | Agent Runtime | 执行引擎、云沙箱、记忆、网关、可观测五件套（长任务续跑/回溯） |
| 模型服务 | TokenHub | 混元/第三方/开源模型统一调度、按场景路由 |

提醒（原文观点）：第四层（模型）最易被高估——换模型往往不如先把第二层的权限和审计理清。

## How It Works（运作方式）

对工程企业的三个落地动作：

1. **从岗位立项，不从平台立项**：挑一个具体岗位的重复动作（投标资料整理、图纸会审纪要、进度周报汇总、材料询价比价），先算它一周吃掉多少人天，再谈要不要上系统。
2. **把 SOP 写成能被调用的 Skill**：部门标准作业程序沉淀成 Agent 可直接调用的能力库；工程企业的 SOP（工序、验收、标书模板）是被严重低估的资产。
3. **先内部跑通，再对外交付**：内部提效容错高、验收快，是最适合的第一个 PoC 场景。

## Relationships（关系）

### Related Concepts（相关概念）

- [[workflow-vs-agent]]：控制流分界（路径写死 vs 运行时动态决定）——选型纪律「能用 workflow 别上 agent」与本模型的阶段递进互补：前者决定「要不要上 agent」，后者决定「上到第几段」。
- [[ai-native-organization]]：AI 原生组织（工具原生→工作流原生→组织原生）与三阶段跃迁在组织层面同向。
- [[agent-legacy-system-integration]]：第二、三段落地的具体技术形态（对接旧系统的四类模式与灰度策略）。

### Dependencies（依赖项）

- 第三段（数字员工）依赖流程被写清楚到机器能执行的程度——流程文档化是前提。
- 管控层依赖 [[agent-permission-model]] 的权限/审计思路。

### Distinctions（区分）

- 与 [[agent-permission-model]] 的区别：本页是**阶段划分**（成熟度路径），权限模型是**授权机制**（静态基线+临时授权+动态校验），二者是不同抽象层。
- 与 [[super-agent]] 的区别：本页面向企业采购/立项视角，[[super-agent]] 面向架构原型（单 Session 绑定打破等机制）。

## Evolution（演进）

- 2026-11-04：依据易海工程AI对腾讯 78 页白皮书的解读文（单一信源）建立本概念页；白皮书原文未直接采集，论断为转述。

## Open Questions（开放问题）

- 阶段判定的量化标准缺失：原文未给出「何时算对结果负责」的可操作判据（KPI 如何拆解到数字员工）。
- 分界线论断的适用范围：白皮书出自腾讯产品语境，对非平台型中小企业是否同样成立未验证。
- 待第二信源验证：数字员工的实际交付案例与效果数据目前无独立信源。

## Evidence（证据）

- Source: `raw/sources/enterprise/2026-11-03-tencent-agent-whitepaper-78-pages.md`

## Related Knowledge（相关知识）

- [[tencent-agent-whitepaper-78-pages]]（信源页：白皮书解读全文）
- [[ai-native-sdlc]]（AI 原生 SDLC：制品提交链驱动的闭环）
- [[bend-ai-agent-legacy-integration]]（B 端 Agent 落地旧系统对接完整框架）
