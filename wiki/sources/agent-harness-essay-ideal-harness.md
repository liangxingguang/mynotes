---
id: wiki-source-agent-harness-essay-ideal-harness
type: source
title: Agent Harness 随笔：我理想中的 Harness
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - ai-agent
  - harness
sources:
  - raw/sources/ai/2026-10-31-agent-harness-essay-ideal-harness.md
---
# Agent Harness 随笔：我理想中的 Harness

## Overview（概览）

知乎专栏作者（《Agent》系列同作者）手搓个人 Harness 后的体验随笔，提出"理想 Harness"的七点 TL;DR：审美追求（Intelligent UI/UX）、Harness of Harness（集成各厂原生 CLI）、以 Session 为核心重构、Harness CLI（CLI + Skill/斜杠命令优化上下文管理）、Agent as Memory（Mono）、Agent Search 的重要性、多模型协作/Remote Control/Mobile App 体验。核心判断：软件行业当下第一要务是找到顺手工作流、靠 SOTA model token 快速迭代（personal RSI），人应把精力放在优化 Agent 工作流与驾驭能力上。

## Key Facts（关键事实）

- 第三方 Harness 分两类：① 一套工具 + System Prompt 适配所有模型（Pi、Cursor、Devin）——工具集与原生 CLI 不一致，性能无保证；② 集成多套原生 CLI 的「Harness of Harness」（T3 Code、Synara/Monocode）——保住表现但实现复杂、bug 多、UI 问题多（ACP 等协议兼容性仍不足）。作者倾向后者。
- 厂商原生 Harness（Codex、Claude Code）只对自家模型极致优化，无意多模型协作；且 UI 不美观。
- 以 Session/Thread 为核心可天然克服多 Agent 协作问题（orchestrator、主模型带辅模型、subagent）；Codex App 与 Claude Desktop 已有成熟 Session 功能，多数 App 未做到。
- Session 两种实现注入方式：MCP 形式（T3 Code、Synara）与 Skill 形式；作者质疑 Tool Search 的意义（"本质和 Skill 的差别也不是很大"）。
- token 账本：MCP 注入 30K 描述 token，新对话只说"你好"也要付几万；Cache read 1000 次 = 30M；社区称 Agent 账单中 Cache read 占比常超 97%；社区称 Claude Desktop 比 CLI 少约 10% 额度，因 Desktop 注入额外 MCP token；256K 后模型性能显著下降，MCP 占 30K = 少 30K 有效窗口。
- 作者主张把 Session 操作做成 CLI + 斜杠命令（近似 Skill）：不激活不付 token tax；子对话未激活这些 Skill 可避免循环嵌套 Spawn。Session 分普通 Session 与类 Mono 高级 Session（作者实现版为 `/operator`）；Session 间信息传递由主 Agent 负责，不强约束。
- 多模型分工实例：Claude 总览规划、Codex 实现、DeepSeek 速度、Gemini 文字；Muse、OpenAI Dot、Grok bot 底层 Personal Agent 也需要 Session 级重构——单个 Agent 超长上下文难维护、会被多次 Compact 污染，更好做法是同一 Bot 管多个 session。
- UI：底层技术/存储趋同，审美与 Design 将百花齐放，是未来 Harness 主要分歧点；"纯粹的 AI vibe 产品有浓浓的 AI Slop 的味道"；主张 UI 卡片化（Session 卡片、Artifact 卡片、HTML 卡片），模型产出 Artifact 的说明也要 Skill 化。
- Agent Memory：前沿实验室仍选最简单实现（Claude Auto-Memory、Codex Memory），"Simple is effective"；记忆分长期（偏好/注意点，Markdown 文件化保存）与短期（todo 进度，传统留 Context）；作者提出 Agent as Memory（见 [[agent-as-memory]]）。
- Agent Search 二分法：有事实标准答案的走 API（DeepSeek Web Search/Fetch、Exa）；偏主观/讨论性的走 OpenCLI 类复用登录态方案；现状方案（Web Search/Fetch、百度/Google）很 naive，做不到"去小红书搜公司社会评论""去 Linux.do 搜技术帖"；个人本地工具在复用登录态上比大厂有优势。
- 作者实际经验：Claude 审美/进度把控/任务分配无可替代；给定计划书与具体指导时 GPT 实现与测试完善度无对手；Gemini 文字能力望尘莫及；为平衡速度成本引入 DeepSeek；自建 Harness 上由 Claude 作主 Agent 协调 Claude/GPT/Gemini/DeepSeek 子 Session。
- 收尾：手搓 Harness 好玩但"小作坊永远打不过大公司"，希望思想被大公司采纳。

## Important Claims（重要论断）

### Claim 1：以 Session 为核心重构是理想 Harness 的底层架构

每个 Session 下挂不同 Provider 与原生 CLI，像 Monocode 那样把多 Provider/Harness 映射为同一套体系；多模型协作与多 Session 协作因此解耦。此为作者个人架构主张（解读：与 [[harness-engineering|Harness Engineering]] 的"模型适配"与"多 Agent 协调"观察面对应）。

### Claim 2：MCP 全量注入的 token 账不划算，激活式描述（Skill/斜杠命令）是更优解

Tool Search 与 Skill 差别不大时，为何不用 Skill；Session 管理 CLI 的描述应像斜杠命令——只有用户手动激活模型才得到描述。此主张把"上下文管理"从窗口技巧推进到**注入经济学**（解读）。

### Claim 3：UI 审美是 Harness 寿命与粘性的底层保障

底层技术趋同后，审美是百花齐放点；ChatGPT Open Intelligence UI 受追捧是因为交互体验。属于趋势判断，未经验证。

### Claim 4：Agent as Memory——用主 Agent 承担记忆职责

用户心智有限，频繁手动切换 Session 会耗尽精力；由主 Agent 控制项目进展、Spawn 子 Session 并协调，用户只与主 Agent 对接（详见 [[agent-as-memory]]）。

### Claim 5：Search 是打破信息壁垒的关键，Agent 自己想不出成熟方案

"由 Agent 本身去思考的一个解决方案，大概率是没法打破信息壁垒的"；事实型走 API、主观型走复用登录态的 OpenCLI 方案。

## Concepts Introduced（引入的概念）

- [[agent-as-memory|Agent as Memory]]
- [[harness-engineering|Harness Engineering]]（本信源为第 7 信源）
- [[context-management|上下文管理]]（注入式 token 账视角）
- [[claude-skills|Claude Skills]]（激活式 token 账视角）

## Entities Mentioned（提及的实体）

- [[pi|Pi]]、[[deepseek-harness|DeepSeek Harness]]（第三方/原生 Harness 实例；Cursor、Devin、T3 Code、Synara/Monocode 无独立页面）
- Codex App、Claude Code、Claude Desktop、Muse、OpenAI Dot、Grok bot、Personal Agent（产品，无独立页面）
- Argon（润色工具）、OpenCLI、Exa、DeepSeek Web Search/Fetch（工具/服务，无独立页面）

## Implications（影响／启示）

- 对多模型协作选型：Session 为单位的重构把"多模型"与"多会话"两个维度合并管理，个人自建 Harness 可作为大厂产品的替代实验场。
- 对上下文管理：注入形式（MCP vs Skill/CLI）的选择应纳入 token 账与 cache read 占比核算，而非仅看功能。
- 对记忆系统设计：短期记忆可从 Context 移入"主 Agent 的协调职责"，减少用户心智负担。

## Limitations（局限）

- 个人体验随笔，非基准测试；97% cache read 占比、Desktop 少 10% 额度均为"社区里有人说"，未经本文独立核验。
- 知乎专栏抓取经 jina 兜底，正文每个实体词被替换为知乎站内搜索链接（zhida），raw 信源保留该噪声形态，可读性差（笔记正文已还原实体名）。
- 作者为单一实践者，其"Session 核心"主张与官方产品路线（Codex app-server、Claude Projects）存在重合但口径不同，未给出评测数据。

## Related Knowledge（相关知识）

- [[harness-engineering|Harness Engineering（Agent 执行系统工程）]]
- [[agent-as-memory|Agent as Memory]]
- [[context-management|上下文管理]]
- [[claude-skills|Claude Skills]]
- [[agent-loop|Agent Loop]]
- [[codex-agent-harness-architecture-6|Codex 桌面客户端开发（六）：Agent Harness 的架构设计]]
- [[agent-harness-framework-selection|Agent - harness 框架怎么选（5）]]
- [[agent-loop-context-management|Agent - agent loop 与上下文管理（3）]]

## Source（信源）

- `raw/sources/ai/2026-10-31-agent-harness-essay-ideal-harness.md`
- 原文：<https://zhuanlan.zhihu.com/p/2096275149876216777>
