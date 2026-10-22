---
id: wiki-source-pi-school-agent-course
type: source
title: 这门免费课表面在教 Pi，其实在教你 Agent 到底怎么工作
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - ai-agent
  - 教程
sources:
  - raw/sources/ai/2026-10-14-pi-school-agent-course.md
related:
  - wiki/entities/pi.md
  - wiki/concepts/agent-loop.md
---
# 这门免费课表面在教 Pi，其实在教你 Agent 到底怎么工作

## Overview（概览）

微信公众号文章，推荐免费课程 Pi School（15 节，pi-school.ziki.boo）。课程形式特殊：第一节装好 [[pi|Pi]]，第二节起"老师"就是 Pi 自己——网站每节只给一段提示词，复制给 Pi 后由它带着讲解和操作，在"用 Agent"的过程中理解 Agent。作者认为它本质是 Agent 入门课，Pi 只是教材。

## Key Facts（关键事实）

- Pi School 共 15 节、免费；另有 11 个练习（做网站、控制浏览器、整理邮件、处理图片视频），教程地址 pi-school.ziki.boo。
- Pi 默认只给模型读文件、改文件、跑命令等最基本能力；作者身边有朋友从 OpenClaw、Hermes Agent 转到 Pi。
- Pi 把一段对话设计成一棵树而非直线：走错可退回任意节点重新走，原尝试保留，类似版本控制的存档点。
- 课程会提前提醒某些登录方式可能违反服务条款、有封号风险。

## Important Claims（重要论断）

### Agent 进入工作环境不止"接上模型"

还要解决用什么模型、在哪个项目干活、守哪些规则、给多大权限四件事。

### 跑偏多因上下文而非模型变笨

Agent 眼前堆着读过的文件、命令输出、工具结果与历史回复；堆积后系统压成摘要，细节易丢。建议：任务换了就开新会话、不轻易压缩、真要压缩就声明什么信息最重要。陷入"犯错→纠正→更错"循环时别再补 prompt，开新会话或回退到问题发生之前更有效。

### 能力最后再加

Skill（给 Agent 的 SOP）、MCP（接外部系统）、Extension（改 Agent 自身）都应在基本流程跑顺后按需引入——先把系统做简单，真需要时再增加复杂度。

### 少告诉 Agent 怎么做，多告诉它要什么

作者以自己用 Claude Code、Codex 的体验印证：Agent 时代比记按钮更重要的是把目标说清楚；真正值得学的是上下文管理、工具引入时机、错误回退与放手让 Agent 自主完成的判断力。

## Concepts Introduced（引入的概念）

- [[agent-loop|Agent Loop]]（相关：上下文管理是会话层问题）

## Entities Mentioned（提及的实体）

- [[pi|Pi]]（课程教材）
- Claude Code、Codex（作者体验印证，未建页）

## Implications（影响／启示）

为"如何学习/使用 Agent"提供了一套可迁移的心智模型：上下文管理、树状会话回退、能力按需引入、目标导向沟通——不绑定特定工具，可迁移到 Claude Code、Codex 等其他 Agent。

## Limitations（局限）

- 三次评论性内容（课程推荐文），论断为作者个人体验与课程观点，非官方文档或一手规格。
- 未给出课程大纲细节与各节具体内容；"树状对话"为作者对 Pi 会话设计的描述，非官方文档口径。

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[learn-pi-agent-01-llm-to-agent|Learn Pi Agent 01｜大模型如何一步步变成 Agent]]

## Source（信源）

- `raw/sources/ai/2026-10-14-pi-school-agent-course.md`
