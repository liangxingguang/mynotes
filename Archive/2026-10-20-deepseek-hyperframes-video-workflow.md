---
id: 2026-10-20-deepseek-hyperframes-video-workflow
title: 用 DeepSeek + HyperFrames 做视频：AI 写网页、逐帧渲染成 MP4 的科普视频流水线
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2095222728152330716
source_type: link
platform: 知乎
created: 2026-10-20
category: 技术
tags: [AI, 工具]
asset_ref: Assets/2026/10/deepseek-hyperframes-video-workflow.md
wiki_status: ingested
---

# 用 DeepSeek + HyperFrames 做视频

> DeepSeek V4.1-Flash-1017 发布，主打"许愿式编程"，编程任务成本从约 3.3 元降到 1.3 元。作者用它搭配 HeyGen 开源的 HyperFrames（66k Star）做科普视频：视频本质是一个网页文件，Agent 写好标题/动画/配乐后经无头浏览器逐帧截图 + FFmpeg 合成 MP4。实测 40 秒降噪耳机科普视频：18 分钟、约 1 元钱、本地 Kokoro 免费中文配音。

## 核心要点

- **项目地址**：[github.com/heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)（HeyGen 开源，专给 AI Agent 用，66k Star）
- **原理**：一条视频 = 一个网页文件，元素出现时机用标签标注；渲染时后台开浏览器逐帧截取（非录屏，不卡顿掉帧、结果可复现）+ FFmpeg 合成 MP4
- **Agent 工作流**：装 21 个 Skill（`npx skills add heygen-com/hyperframes`），按"确认需求 → 规划 → 写页面 → 动画 → 素材 → 检查 → 预览 → 渲染"执行；内置多套创作流程：产品网址→宣传片（30~90s）、文字→知识讲解视频、歌曲→节拍卡点视频、口播原片→加字幕包装
- **组件库**：转场/动态图表/关注浮层等现成效果，`npx hyperframes add <name>` 一行装；多风格模板可让 Agent 照着做
- **接入**：DeepSeek 官方提供 Claude Code / Codex 一键配置脚本，API 用 `deepseek-flash` 即可调新模型，价格不变；需 Node.js 22+ 与 FFmpeg
- **成本**：max 档编程任务平均约 1.3 元（上版 3.3 元）；配音用本地 Kokoro（中文男女声可换）零成本
- **变现思路**：流程跑通后批量产科普视频发短视频平台起号

## 正文

全文（含演示案例、配置截图与视频效果）见 [[Assets/2026/10/deepseek-hyperframes-video-workflow]]。

## 来源

[用 DeepSeek + HyperFrames 做视频，效果惊艳！](https://zhuanlan.zhihu.com/p/2095222728152330716)

## 附件

- [[Assets/2026/10/deepseek-hyperframes-video-workflow]]
