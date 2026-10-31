---
id: wiki-source-pi-practice-series
type: source
title: Pi 实战系列（16 篇全文本合集）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - source
  - pi
  - ai-coding
sources:
  - raw/sources/ai/2026-10-28-pi-series.md
related:
  - wiki/entities/pi.md
  - wiki/sources/pi-practice-06-daily-patterns-selection.md
---
# Pi 实战系列（16 篇全文本合集）

## Overview（概览）

微信公众号合集，收录 Pi Agent CLI 实战系列 16 篇（编号 01~17，缺 08），从配置到插件全流程覆盖 Pi 的日常使用、扩展开发、多智能体协作、本地模型接入、调试、提示词心法、重构、代码库上手、TDD、技能实战、会话树、插件工具箱与 agent-skills。系列定位为"拿来即用"的实操指南，每篇围绕一个主题给出可复制的配置片段与代码示例。

## Key Facts（关键事实）

- 16 篇文章，编号 01~17（缺 08），覆盖配置、提示词/技能、扩展、多智能体、本地模型/MCP/沙箱、调试、提示词心法、重构、代码库上手、TDD、技能实战、会话树、插件工具箱、agent-skills、插件配置全流程。
- 文章 01（配置篇）详述 settings.json / models.json / AGENTS.md / APPEND_SYSTEM.md / web-search.json / themes 六层配置文件，其中 APPEND_SYSTEM.md（全局高优先级行为规则）与 web-search.json（默认 Exa、免 API key）为已有 wiki 未单独记录的细节。
- 文章 03（扩展篇）给出最小扩展骨架、注册新工具、权限守卫、自定义 footer/状态栏等六种扩展开发经验，并提出"让 Pi 自己写扩展"的最省事方式。
- 文章 04（多智能体篇）介绍子代理、多代理编排（ruizrica2 的 agent）、tmux 并行、会话树与"计划-实现-验证"流水线。
- 文章 05（本地模型篇）给出 Ollama / LM Studio+Gemma 4 / 本地+云混合三种方案，以及 pi-mcporter（带鉴权的 MCP server）的安装配置。
- 文章 07（调试篇）提供 Debug Mode / 子代理提问法 / crash-logger / trace 回溯四种调试模式。
- 文章 09~12 覆盖提示词心法、大项目重构、陌生代码库上手、TDD 四个实操主题。
- 文章 16 介绍 addyosmani/agent-skills——给 Agent 装上资深工程师本能的开源项目。
- 文章 17 给出把 Pi 打造成 Claude Code 的插件清单与配置全流程。

## Important Claims（重要论断）

### Claim 1：Pi 的配置是分层级的，APPEND_SYSTEM.md 优先级高于 AGENTS.md

文章 01 明确配置优先级：APPEND_SYSTEM.md（全局行为规则，高优先级）> AGENTS.md（项目大脑）> settings.json（默认行为）> models.json（模型端点）> web-search.json（联网搜索）> themes（配色）。

### Claim 2：Pi 的扩展开发可以"让 Pi 自己写扩展"

文章 03 提出最省事的扩展开发方式：给 Pi 一个需求描述，让它自己生成扩展骨架代码，再人工审阅调整。

### Claim 3：会话树是 Pi 的核心设计，支持版本控制式的对话回溯

文章 04 和 14 共同强调：Pi 把对话看作树而非直线，走错可退回任意节点重走，类似版本控制的存档点；配套 /tree /fork /clone /resume 命令。

## Concepts Introduced（引入的概念）

无新概念页。本合集覆盖的主题已有 wiki 页面承载：
- [[pi]]（Pi 实体页）——产品定位、版本历史、生态概览
- [[pi-customization-layers]]——五层定制模型
- [[codemode]]——Code Mode 与 MCP
- [[agent-loop]]——Agent Loop
- [[agent-sandboxing]]——沙箱隔离
- [[mcp]]——MCP 协议
- [[durable-execution]]——持久执行

## Entities Mentioned（提及的实体）

- [[pi]]
- [[codemode]]
- [[mcp]]
- [[agent-sandboxing]]

## Implications（影响／启示）

本合集为 Pi 的日常使用提供了系统化的实操手册，与已有 Pi 源页面互补：已有源页面侧重单篇深度（如 pi-practice-06 的选型对照、pi-secondary-dev-5-layers 的五层定制），本合集则提供全链路覆盖。对 wiki 的增量贡献主要在：APPEND_SYSTEM.md 配置层、pi-mcporter、调试四种模式、提示词心法/重构/代码库上手/TDD 四个实操主题的引入。

## Limitations（局限）

- 合集为实操笔记，缺乏底层原理剖析；需要原理性知识时需回退到 [[pi]] 实体页与 [[agent-loop]] 等概念页。
- 文章 08 缺失，可能遗漏某个主题。
- 部分配置片段基于特定版本（未标注版本号），升级后可能不适用。

## Related Knowledge（相关知识）

- [[pi]]
- [[pi-customization-layers]]
- [[codemode]]
- [[mcp]]
- [[agent-sandboxing]]
- [[durable-execution]]

## Source（信源）

- `raw/sources/ai/2026-10-28-pi-series.md`
