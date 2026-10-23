---
id: wiki-source-unyra-local-first-ai-learning-app
type: source
title: 归一 Unyra · 探索式学习：本地优先的 AI 学习辅助桌面应用（GitHub README）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - ai
  - tools
sources:
  - raw/sources/products/2026-10-14-unyra-local-first-ai-learning-app.md
---
# 归一 Unyra · 探索式学习：本地优先的 AI 学习辅助桌面应用（GitHub README）

## Overview（概览）

GitHub 仓库 `maplexrain/unyra` 的 README：介绍「归一 Unyra」，一款本地优先的 AI 学习辅助桌面应用。核心主张是把学习从线性聊天改造成一张知识 DAG——每个节点一份教学文档，由「超级导师」通过 JS 沙箱 api 直接改写文档来教学；数据全部本机存储，AI 请求由主进程直发用户自配服务商（默认 DeepSeek）。

## Key Facts（关键事实）

- 技术栈：Electron 44 / React 19 / TypeScript / Vite / Tailwind CSS 4 / KaTeX；electron-updater 走 GitHub Releases 自动更新。
- 平台：仅提供 Windows 安装链（Setup.exe 与免安装 zip）；macOS / Linux 需自行从源码构建。
- AI 接入：兼容 OpenAI / Anthropic / Responses 协议；内置 DeepSeek（默认）、Kimi、GLM、通义百炼、豆包、SiliconFlow 等；支持自定义提供商（中转/内网/Ollama/vLLM）；请求由主进程转发以绕开 CORS 与请求头限制。
- 数据存储：`%APPDATA%\unyra`（v0.4.9 前为 `%APPDATA%\moji-notes`），干净 Markdown 可脱离应用读写；不上传任何服务器。
- 语音输入：SenseVoiceSmall（228 MB 模型），本地识别，音频不出本机、不写盘。
- 仓库 `docs/` 目录含 16 篇设计文档（学习模型、沙箱 api、桌面架构、AI 提供商、数据隐私等）。
- 项目为单人维护（代码、文档、安装包、答疑），README 末尾附外包/兼职/技术咨询合作意向。

## Important Claims（重要论断）

### 学习应当是一张图，而不是线性聊天

聊天窗口里讲过的东西沉进上下文翻不回来；归一用「节点 + 依赖边（DAG）」组织知识，同一概念可被多个上层节点引用而不重复创建，每个节点的文档是可反复打开、原地改写的读物。

### 导师在文档上动笔，而不是只在对话框里说话

超级导师先思考、再写一段 JS 交给沙箱执行，讲解直接写进教学文档，并在对话里说明改动理由——教学正文、节点结构、试卷、注解都在这段代码里一次编排完。

### 一个学习目标一份上下文

目标下所有节点共用同一段对话，切节点不换上下文、不作废前缀缓存；人格切换走隐藏指令而非系统提示词；上下文用到 70% 时自动压缩为交接摘要（原文一条不删）。

## Concepts Introduced（引入的概念）

- [[exploratory-learning|探索式学习（知识 DAG）]]

## Entities Mentioned（提及的实体）

- [[unyra|归一 Unyra]]

## Implications（影响／启示）

- 「导师写 JS 经沙箱改写文档」是 [[codemode|Codemode]] 模式在教学场景的落地：模型以代码编排动作、结果直接落到制品（文档）而非对话。
- 本机 Markdown 直存 + 主进程白名单转发，是本地优先 AI 应用处理隐私与 CORS 限制的参考做法。

## Limitations（局限）

- 仅为项目自述（README），性能、稳定性与实际教学效果无第三方验证。
- 仅 Windows 安装链；版本迭代快（采集时 v0.6.x，抓取时 badge 显示 v0.6.7），细节可能随版本变化。
- 单人维护项目，长期维护可持续性存在不确定性（作者自述资金压力）。

## Related Knowledge（相关知识）

- [[unyra|归一 Unyra]]
- [[exploratory-learning|探索式学习（知识 DAG）]]
- [[codemode|Codemode（代码模式工具编排）]]
- [[agent-sandboxing|Agent 沙箱隔离]]

## Source（信源）

- `raw/sources/products/2026-10-14-unyra-local-first-ai-learning-app.md`
