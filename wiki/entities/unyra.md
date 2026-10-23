---
id: wiki-entity-unyra
type: entity
title: 归一 Unyra
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - entity
  - ai
  - tools
  - learning
sources:
  - raw/sources/products/2026-10-14-unyra-local-first-ai-learning-app.md
related:
  - wiki/concepts/exploratory-learning.md
  - wiki/concepts/codemode.md
---
# 归一 Unyra

## Overview（概览）

归一 Unyra 是一款本地优先的 AI 学习辅助桌面应用（Electron + React），GitHub 开源（`maplexrain/unyra`）。它把学习组织成目标→节点的知识 DAG，每个节点带一份教学文档与任意多份笔记，由「超级导师」模型通过 JS 沙箱 api 直接改写文档来教学；数据全部本机存储，AI 请求由主进程直发用户自配服务商（默认 DeepSeek）。

## Identity（身份信息）

- Type（类型）: 开源桌面应用（AI 学习工具）
- Organization（所属组织）: 个人项目（作者：maplexrain / B站「岚中古桥」）
- Role（角色）: 探索式学习环境与 AI 导师工作台
- Status（状态）: 活跃开发（采集时 v0.6.x；仅 Windows 安装链，macOS/Linux 需源码构建）

## Important Facts（重要事实）

- 技术栈：Electron 44 / React 19 / TypeScript / Vite / Tailwind CSS 4 / KaTeX / vscode-textmate（40 门语言高亮）；electron-updater 走 GitHub Releases。
- 知识模型：目标→节点 DAG，概念不重复创建、可被多节点引用；选词可「学习/了解/注解/询问」（数字键 1~4 触发）。
- 超级导师：一个目标共用一段上下文（切节点不作废前缀缓存）；先思考再写 JS 交沙箱执行、讲解直接落进文档；三种人格用隐藏指令切换不重发历史；上下文 70%（可调）自动压缩为交接摘要，原文不删。
- 文档工作区：一节点一文档 + 任意多份笔记文件；跨文档跳转带行号锚点（`#L12`、`#L12-L20`）；页签可分割排序；暂存区 + Ctrl+S 落盘；导出 Markdown/HTML/PDF。
- 考试与状态追踪：独立考试窗口（客观题本地判、主观题 AI 判）；自评/系统掌握度/错误记忆时间线；「有效阅读」时长口径为前台 + 主位 + 未静坐超 60 秒 + 看教学文档。
- 可执行文档：` ```plot ` 围栏画函数图（LaTeX）；代码块经导师「编译」为 JS 后在一次性沙箱运行；围栏语法走插件接口可扩展。
- AI 提供商：内置 DeepSeek（默认）/Kimi/GLM/通义百炼/豆包/SiliconFlow 等，兼容 OpenAI/Anthropic/Responses 协议；可自定义提供商接 Ollama/vLLM；主进程白名单转发绕开 CORS。
- 隐私：数据存 `%APPDATA%\unyra` 干净 Markdown，不上传服务器；语音输入用 SenseVoiceSmall 本地识别，音频不出本机。

## Products / Projects（产品／项目）

- 归一 Unyra 本体（前身数据目录名为 moji-notes，v0.4.9 起迁移）。

## Relationships（关系）

- [[exploratory-learning|探索式学习（知识 DAG）]]——Unyra 提出的学习组织模型。
- [[codemode|Codemode（代码模式工具编排）]]——超级导师「写 JS 经沙箱编排动作」是其教学模式底层机制。
- [[agent-sandboxing|Agent 沙箱隔离]]——导师代码在一次性沙箱执行，联网需逐次确认。

## Timeline（时间线）

- 2026-10-14 — 经知乎跳转链接采集其 GitHub README（当时 v0.6.1，抓取时 badge v0.6.7）。
- v0.4.9 — 数据目录从 `%APPDATA%\moji-notes` 迁移至 `%APPDATA%\unyra`。

## Current Understanding（当前认知）

个人独立开发的学习类 AI 应用，设计完成度高（16 篇设计文档），把 [[codemode|Codemode]] 与本地优先存储组合成「可翻回去看」的学习记录系统。局限：仅 Windows 安装链、单人维护（作者自述资金压力，寻求合作）、实际教学效果无第三方验证。

## Evidence（证据）

- `raw/sources/products/2026-10-14-unyra-local-first-ai-learning-app.md`
