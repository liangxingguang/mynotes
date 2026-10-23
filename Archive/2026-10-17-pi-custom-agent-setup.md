---
id: 2026-10-17-pi-custom-agent-setup
title: 用 Pi 搭一个自己的 Agent：Skills、Extensions、Subagents 和定时任务
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/uZrIlXZMq8Rz8cYRN1J5sQ
source_type: link
platform: 微信
created: 2026-10-17
category: 技术
tags: [Pi, AI Coding, 工程实践]
asset_ref: Assets/2026/10/pi-custom-agent-setup.md
wiki_status: ingested
---

# 用 Pi 搭一个自己的 Agent：Skills、Extensions、Subagents 和定时任务

> Pi 是 OpenClaw 内核的极简 coding agent，默认只有 read/write/edit/bash 四个工具。本文给出一套分层定制方案：项目规范写成 skill（按需加载、不占上下文），常用指令固化成 prompt 模板，必须强制执行的行为（如"改完代码必评审"）用 extension 挂事件钩子，复杂任务交给 subagent 并行处理，定时任务按"Pi 开着/关着"分别选 pi-schedule-prompt 或系统调度器调 headless 模式。核心原则：能用轻方案就别上重的，关键在知道需求该放哪一层。

## 核心要点

- **分层定制**：skill（怎么想）→ prompt 模板（少说话）→ extension（保证发生）→ subagent（并行干活）→ 系统调度（无人值守），逐层变重，按需选择
- **成本意识**：skill 按需加载不占上下文，工具描述常驻 system prompt——只把高频/性能敏感/需结构化返回的能力做成工具
- **skill vs extension**：skill 只能影响模型怎么想，不能保证"必定发生"；要强制执行（如改代码后必评审）得用 extension 监听 `tool_result`/`agent_settled` 事件
- **状态存放**：会话线内的状态（todo 等）存 tool result 的 `details` 字段，随会话树 `/tree` `/fork` 走；跨会话数据才写文件
- **subagent 用法**：`pi-subagents` 提供探子/顾问/评审/执行者等角色，说人话即可委派并行评审或 review loop；自动触发仍需 extension 挂钩
- **定时两条路**：会话开着用 pi-schedule-prompt（in-process，说人话排程）；关着也要跑用 launchctl/cron 调 `pi -p` headless，可用 `--tools read,bash` 收窄工具保安全
- **打包分享**：写个 `package.json` 声明 extension，`pi install git:/npm:` 一行安装，skill 可同包分发，换机器一次拉齐

## 正文

见 [[Assets/2026/10/pi-custom-agent-setup.md|抓取正文]]。

## 来源

- [用 Pi 搭一个自己的 Agent：Skills、Extensions、Subagents 和定时任务](https://mp.weixin.qq.com/s/uZrIlXZMq8Rz8cYRN1J5sQ)

## 附件

- [[Assets/2026/10/pi-custom-agent-setup.md]]
