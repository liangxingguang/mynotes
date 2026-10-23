---
id: wiki-source-deepseek-hyperframes-video-workflow
type: source
title: 用 DeepSeek + HyperFrames 做视频：AI 写网页、逐帧渲染成 MP4 的科普视频流水线
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - deepseek
  - video
  - workflow
sources:
  - raw/sources/ai/2026-10-20-deepseek-hyperframes-video-workflow.md
related: []
---
# 用 DeepSeek + HyperFrames 做视频：AI 写网页、逐帧渲染成 MP4 的科普视频流水线

## Overview（概览）

知乎专栏实测：DeepSeek V4.1-Flash-1017 发布（"许愿式编程"）后，用 Codex 接 DeepSeek API + HeyGen 开源的 HyperFrames（视频即网页 + 逐帧渲染），做出 40 秒降噪耳机科普视频，全程 18 分钟、API 花费约 1 元。

## Key Facts（关键事实）

- DeepSeek V4.1-Flash-1017：主打"许愿式编程"（说清想要什么，模型自己规划/写码/检查/修改做完整项目）；11 项基准多项超 Claude Opus 5 与 GPT 5.6-Sol（信源口径）；API 名称与价格不变（deepseek-flash）；max 档一个编程任务平均约 1.3 元（上一版约 3.3 元）。
- HyperFrames（HeyGen 开源，信源称 6.6 万 Star，面向 AI Agent）：一条视频=一个网页文件，元素出现时机用标签标好；浏览器实时预览；渲染时后台开浏览器逐帧截图 + FFmpeg 合成 MP4——逐帧而非录屏，不卡顿掉帧、结果可复现。
- Agent 配套：21 个 Skill（`npx skills add heygen-com/hyperframes`）；内置多套创作流程自动挑选——产品网址→宣传片（官方建议 30–90 秒）、文字→知识讲解视频、歌曲→卡点视频、口播原片→加字幕标题条数据标注。
- 组件库：转场/动态图表/社媒浮层等现成效果，`npx hyperframes add <name>` 一行安装；多风格模板供 Agent 照做。
- 接入：DeepSeek 官方提供 Claude Code 与 Codex 一键配置脚本；需 Node.js 22+ 与 FFmpeg。
- 实测：生成降噪耳机科普视频用 18 分钟、约 1 元；配音用本地 Kokoro（中文普通话、可换男女声、免费）；成片 40 秒讲清主动降噪原理。

## Important Claims（重要论断）

### Claim 1：网页即视频是 Agent 友好的视频生产范式

模型擅长写网页；把时间轴标进网页、逐帧渲染，就把"做视频"变成"写网页 + 渲染"，绕开 AE/剪映技能门槛（信源立场）。

## Concepts Introduced（引入的概念）

- 视频即网页（video-as-webpage）+ 逐帧确定性渲染——单信源，未立概念页

## Entities Mentioned（提及的实体）

- HyperFrames（HeyGen 开源工具，未立页）、DeepSeek V4.1-Flash（模型，未立页）、Kokoro（本地 TTS，未立页）

## Implications（影响／启示）

与 [[475-claude-opus-demos-repo|Claude 演示仓库]]同属"模型生成完整前端产物"趋势；逐帧渲染保确定性这一点可迁移到任何 Agent 生成视频的管线（解读）。

## Limitations（局限）

- 单作者单次实测（18 分钟/1 元为个案）；基准对比与 Star 数为信源转述，未核官方。

## Related Knowledge（相关知识）

- [[475-claude-opus-demos-repo|475 个 Claude 演示仓库（信源页）]]

## Source（信源）

- `raw/sources/ai/2026-10-20-deepseek-hyperframes-video-workflow.md`
