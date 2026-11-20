---
id: wiki-source-20261120-openmotion
type: source
title: OpenMotion——开源全栈 Agent 视频工作室（微博采集 · GitHub README 全文）
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - source
  - weibo
  - github
  - video
sources:
  - raw/sources/ai/2026-11-20-openmotion-ai-video-platform.md
related:
  - wiki/entities/openmotion.md
  - wiki/concepts/motion-md.md
---
# OpenMotion——开源全栈 Agent 视频工作室（微博采集 · GitHub README 全文）

## Overview（概览）

微博帖子（t.cn 短链，正文页有登录墙）指向的原始信源为 OpenMotion 项目 GitHub 仓库的 README 全文。OpenMotion 是一个开源的**全栈 Agent 视频工作室**，定位为 Claude Motion 与剪映（CapCut）的开源替代方案：上传参考视频或粘贴社交视频链接，Agent 即可用自有品牌套件与文案复刻，产出可在 Studio 中编辑、可渲染为 MP4 的项目。

## Key Facts（关键事实）

- 项目地址 github.com/nexu-io/openmotion，Apache 2.0 许可，由 OpenDesign（nexu-io/open-design）开发；仓库由 `nexu-io/html-anything` 更名而来，旧应用保留在 `legacy` 分支。
- GitHub stars 约 9.5k（2026-11-09，README 徽章自报）；Node.js 版本在 README 中出现两处：徽章标 22.18+，源码安装章节要求 Node.js 26.11.1（原文如此，未消解，待人工核验）。
- BYOA（自带 Agent）：支持 22 款本地 Agent（Claude Code、Codex、Cursor、DeepSeek Harness、WorkBuddy 等）；BYOK（自带密钥）：媒体模型 API Key 存于工作区，与视频项目分离。
- 多模态模型网关（Model Gateway）：图片（Codex Image、Nano Banana 2.1、FLUX.3）、视频（Seedance 2.5、Kling 4.0、Wan 3.0）、音乐（Suno v4）、TTS（Kokoro、Eleven v4），经 fal.ai / Atlas Cloud 接入。
- Motion.md：描述镜头顺序、节奏、转场与可替换素材的 Markdown 格式；在线模板库提供 300+ 动效指南；Motion Package v0.2 草案用于打包分享整套规范。
- 技术栈：React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand（Studio 编辑器）；Node.js + TypeScript + node:http（本地应用）；Chromium/Puppeteer Core + FFmpeg/FFprobe（渲染导出）；GSAP；组合引擎 HyperFrames（heygen-com/hyperframes，固定 0.9.7）。
- 公开 MCP 表面共 18 个名称（9 个项目工具、2 个模板目录工具、2 个 Skill 库工具、1 个项目归档工具、1 个项目管理工具、1 个 BYOK 媒体使用工具、2 个工作区资产名称）；五个核心 Skill：openmotion / openmotion-recreate / openmotion-template-to-video / openmotion-director / openmotion-video-to-template / openmotion-production。
- 安装方式：ChatGPT Marketplace 一键安装；或 `npx skills add nexu-io/openmotion --skill openmotion`；可导入 HyperFrames 项目 ZIP 继续编辑。

## Important Claims（重要论断）

### Claim 1

「OpenMotion is a full-stack agentic video studio and an open-source alternative to Claude Motion and CapCut」——以 HTML/CSS/JS 描述场景、版式、转场与时间，同一项目在 Studio 可视化编辑并渲染 MP4，解决 AI 视频复刻「镜头语言难稳定复现、结果不可编辑、专业经验难沉淀为 Agent 知识」三类问题。

### Claim 2

创作流水线完全开源（Skills、项目工具、模型集成、Studio 与渲染），本地运行不收取软件订阅或按渲染计费；可完全使用自有素材、不调用媒体生成 API 完成项目。

### Claim 3

「Video as Code」路线：编辑时间线与让 Agent 改镜头都更新同一 HTML 项目；项目工具带修订检查，过期请求不能覆盖更新的工作；每次导出使用任务启动时保存的版本。

## Concepts Introduced（引入的概念）

- [[motion-md]]

## Entities Mentioned（提及的实体）

- [[openmotion]]

## Implications（影响／启示）

- Agent 驱动的视频生产从「一次性生成」转向「可编辑项目 + 可复用规范」：创作经验以 Motion.md 与 Skill 形式沉淀，降低对特定顶级模型的依赖（解读：这是把「模型能力」与「制作规范」解耦的工程路线）。
- BYOA + BYOK 模式把 Agent 客户端与模型账单留在用户侧，项目方只提供开源管线与集成，值得同类 Agent 应用参考（解读）。

## Limitations（局限）

- 单信源（仓库 README 自述），stars、模板数量、模型清单等均为项目方自报，未经第三方核验。
- 微博原帖正文页有登录墙，本信源实际承载的是 GitHub README 全文；微博原帖的补充表述未逐字进入 raw。
- README 中 Node.js 版本要求自相矛盾（徽章 22.18+ vs 安装章节 26.11.1），未消解。

## Related Knowledge（相关知识）

- [[openmotion]]
- [[motion-md]]

## Source（信源）

- `raw/sources/ai/2026-11-20-openmotion-ai-video-platform.md`
