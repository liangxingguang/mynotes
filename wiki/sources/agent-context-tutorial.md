---
id: wiki-source-agent-context-tutorial
type: source
title: Agent 入门教程：上下文里的 Agent（nano-ai 可交互演示）
status: active
created: 2026-10-27
updated: 2026-10-27
confidence: medium
tags:
  - ai
  - agent
  - 教程
sources:
  - raw/sources/ai/2026-10-26-agent-context-tutorial.md
related:
  - wiki/concepts/agent-loop.md
---
# Agent 入门教程：上下文里的 Agent（nano-ai 可交互演示）

## Overview（概览）

微博博主「蚁工厂」推荐的一套可交互 Agent 入门教程（nano-ai.tech/agent/），从「上下文」视角讲解 Agent：把 Agent 讲成一个 while 循环，逐章可视化上下文每轮的变化。

## Key Facts（关键事实）

- 教程地址：`nano-ai.tech/agent/`，以可交互网页形式呈现
- 微博发布于 2026-10-25，作者蚁工厂（科技博主，58 万粉丝），互动 96 转发 / 96 赞
- 教程结合实际代码运行步骤讲解，每章可点「播放」自动演示或逐格步进

## Important Claims（重要论断）

### Claim 1：Agent = while 循环

"Agent 没有什么神秘的，就是一个 while 循环：调模型、执行工具、把结果写回上下文，再调模型。"

该论断与 [[agent-loop|Agent Loop]] 概念页的定义一致（Runtime 驱动的模型-工具循环，结果写回 State 再备下一轮 Context），本信源是其通俗化表述。

### Claim 2：上下文是理解 Agent 技巧的切入面

教程主张逐步观察「上下文每转一圈怎么长、长到哪里会出问题」，从而理解各种 Agent 技巧在上下文层面到底做了什么。（解读：即把 context 增长与问题定位作为教学主线。）

## Concepts Introduced（引入的概念）

- [[agent-loop|Agent Loop]]（印证，非新引入）

## Entities Mentioned（提及的实体）

- nano-ai.tech（教程站点，无独立页面）

## Implications（影响／启示）

适合作为 Agent 入门教学资源：交互式演示把抽象的 Loop/Context 机制可视化，可作为概念页 [[agent-loop|Agent Loop]] 的入门阅读材料。

## Limitations（局限）

- 信源为微博推荐短帖，非教程原文；教程本身的章节细节未在本信源中展开
- 教程站点内容未经抓取核验，置信度中

## Related Knowledge（相关知识）

- [[agent-loop|Agent Loop]]
- [[agent-loop-production-boundaries|从 Chatbot 到 AI Agent：为什么一个 while 循环撑不起生产系统]]（对照：本教程讲 while 循环入门，该文讲其生产边界）
- [[pi-school-agent-course|这门免费课表面在教 Pi，其实在教你 Agent 到底怎么工作]]（同类入门教学资源）

## Source（信源）

- `raw/sources/ai/2026-10-26-agent-context-tutorial.md`
