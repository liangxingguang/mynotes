---
id: wiki-source-pi-custom-agent-setup
type: source
title: 用 Pi 搭一个自己的 Agent：Skills、Extensions、Subagents 和定时任务
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - pi
  - ai-coding
sources:
  - raw/sources/products/2026-10-17-pi-custom-agent-setup.md
related:
  - wiki/entities/pi.md
  - wiki/concepts/pi-customization-layers.md
---
# 用 Pi 搭一个自己的 Agent：Skills、Extensions、Subagents 和定时任务

## Overview（概览）

译文（原载 Mario Zechner 博客）动手篇：给 [[pi|Pi]] 搭一套分层定制——skill 管怎么想、prompt 模板省打字、extension 保证必定发生、subagent 并行干活、定时任务分"Pi 开着/关着"两条路。核心原则：能用轻方案就别上重的，关键在知道需求该放哪一层。印证并充实 [[pi-customization-layers|Pi 五层定制模型]]。

## Key Facts（关键事实）

- 开篇定位：Pi 是 Mario Zechner 写的极简 coding agent，"也是 OpenClaw 的内核"；安装 `npm i -g @earendil-works/pi-coding-agent`。
- 成本结构：skill 按需加载不占上下文；工具名字和描述常驻 system prompt——只把高频/性能敏感/需结构化返回/需 TUI 专门渲染的能力做成工具，其余写成 skill 或 CLI 让 Pi 用 bash 调。
- skill（Agent Skills 标准，agentskills.io）：放 `~/.pi/agent/skills/` 或 `.pi/skills/`，`/skill:name` 手动点；示例 git-workflow（Conventional Commits）与 code-review 清单（正确性→测试→安全→复杂度→命名，标 [严重]/[建议]/[nit]）。
- prompt 模板：放 `~/.pi/agent/prompts/` 或 `.pi/prompts/`，文件名即命令名；参数 `$1`/`$@`/`${1:-main}`/`${@:2}`（bash 风格）。
- skill/模板上限：只能影响模型怎么想，不能保证"必定发生"——强制行为（改完代码必评审）用 extension 监听 `tool_result`（记录本轮是否调过 write/edit）+ `agent_settled`（等重试/压缩/排队消息处理完触发）；`sendUserMessage` 的 `deliverAs: 'followUp'` 把评审排在本轮之后；需状态位防止评审触发评审。
- Extension 状态存放：会话线内状态（todo 等）存 tool result 的 `details` 字段，随会话树 `/tree` `/fork` 走（分支 A 的 todo 切到 B 消失、跳回 A 恢复）；跨会话数据才写文件；官方 todo.ts 示例即此模式。
- pi-subagents（npm）：探子/顾问/评审/执行者/规划者角色，说人话委派；并行审（三个 reviewer 分角度同时看 diff）、review loop（最多三轮）；自动触发仍需 extension 挂钩或 AGENTS.md 提醒。
- 定时两条路：pi-schedule-prompt（in-process，cron/interval/一次性/ISO 都认，会话关即停）vs launchctl/cron 调 `pi -p` headless（全新进程无记忆，休眠唤醒补跑；坑：极简环境 PATH/API key 读不到，用 `zsh -lc` 或绝对路径 + 钥匙串；无人值守用 `--tools read,bash` 收窄工具）。
- 打包：`package.json` 加 `"pi": {"extensions": [...]}` 与 `keywords: ["pi-package"]`，`pi install git:/npm:` 一行安装，skill 可同包分发。

## Important Claims（重要论断）

### Claim 1：分层的本质是成本与保证强度的权衡

skill 便宜但无强制力；extension 重但能保证发生——"能用一句固化的命令解决，就别急着写代码"。

## Concepts Introduced（引入的概念）

- skill vs extension 的判据：影响模型怎么想 vs 保证必定发生（与五层模型"说明书 vs 代码"判据互补）

## Entities Mentioned（提及的实体）

- [[pi|Pi]]、OpenClaw（Pi 为之提供内核的产品，未单独立页）
- pi-subagents / pi-schedule-prompt（社区扩展，未立页）

## Implications（影响／启示）

details 字段存会话状态、headless 收窄工具两条经验，对本仓库 cc-connect 定时任务设计亦有参照价值（解读）。

## Limitations（局限）

- 译文面向 macOS（launchctl 示例），Windows 调度需自行替换；pi-subagents 角色以实际安装版本为准。

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[pi-customization-layers|Pi 五层定制模型]]
- [[pi-secondary-dev-5-layers|Pi 二次开发一篇讲透]]

## Source（信源）

- `raw/sources/products/2026-10-17-pi-custom-agent-setup.md`
