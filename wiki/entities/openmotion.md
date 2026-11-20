---
id: wiki-entity-openmotion
type: entity
title: OpenMotion
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - entity
  - video
  - agent
  - open-source
sources:
  - raw/sources/ai/2026-11-20-openmotion-ai-video-platform.md
related:
  - wiki/concepts/motion-md.md
  - wiki/sources/2026-11-20-weibo-openmotion-ai-video-platform.md
---
# OpenMotion

## Overview（概览）

OpenMotion 是一个开源的**全栈 Agent 视频工作室**，定位为 Claude Motion 与剪映（CapCut）的开源替代方案。用户上传参考视频或粘贴社交视频链接后，由本地 Agent 拆解参考片、用自有品牌套件与文案重建 HTML 场景，在 Studio 中可视化编辑时间线并渲染 MP4。项目以「Video as Code」为核心路线，把创作规范沉淀为 Motion.md 与可复用 Skill。

## Identity（身份信息）

- Type（类型）: 开源项目 / 全栈 Agent 视频创作与剪辑平台
- Organization（所属组织）: nexu-io，由 OpenDesign（nexu-io/open-design）开发并提供 UI 基础、资源结构与品牌方向
- Role（角色）: Claude Motion + CapCut 的开源替代；HTML 场景描述 + Studio 编辑 + 多模态生成网关
- Status（状态）: 活跃；Apache 2.0 许可；仓库由 `nexu-io/html-anything` 更名而来（旧应用存于 `legacy` 分支）

## Important Facts（重要事实）

- **仓库与热度**：github.com/nexu-io/openmotion，Apache 2.0；GitHub stars 约 9.5k（2026-11-09，README 徽章自报）。
- **BYOA（自带 Agent）**：支持 22 款本地 Agent，含 Claude Code、Codex、Cursor Agent、WorkBuddy、DeepSeek TUI/Harness、Gemini CLI、Kimi CLI、Qwen Code、Aider、Devin、Trae CLI 等；经 Skills + MCP（含 CLI）接入。
- **BYOK（自带密钥）**：媒体模型 API Key 在 Studio 的 Model Settings 配置，凭证存于工作区、与视频项目分离；本地运行不收取软件订阅或按渲染计费。
- **多模态模型网关**：图片（Codex Image、Nano Banana 2.1 via Atlas Cloud、FLUX Schnell via fal.ai）、视频（Seedance 2.0 via Atlas Cloud、Wan 2.2 via fal.ai，目录刷新后可见 Seedance 2.5、Kling 4.0、Wan 3.0）、音乐（Suno v4）、TTS（Kokoro）；密钥经 `openmotion_media_use` 工具调用。
- **Motion.md 生态**：在线模板库 300+ 动效指南；Motion Package v0.2 草案打包设计/动效文档、素材、声明的依赖与可选 SKILL.md。
- **核心 Skill（6 个）**：openmotion（安装与流程选择）、openmotion-recreate（参考视频重建与对比）、openmotion-template-to-video（模板改编）、openmotion-director（原创影片与创意审查）、openmotion-video-to-template（可复用模板产出）、openmotion-production（范围编辑、预览、检查、导出）。
- **MCP 表面**：第一阶段公开 18 个名称（9 个项目工具、2 个模板目录工具、2 个 Skill 库工具、项目归档/管理工具、BYOK 媒体使用工具、2 个工作区资产名称）；公开契约不含发布能力。
- **技术栈**：Studio 编辑器 React 19 + TypeScript 5.9 + Vite 6 + Tailwind CSS 4 + Zustand + CodeMirror + Dockview；应用运行时 Node.js + TypeScript + node:http；渲染 Chromium（Puppeteer Core）+ FFmpeg/FFprobe；动效 HTML/CSS/JS + GSAP；组合引擎 HyperFrames（heygen-com/hyperframes，固定 0.9.7）。
- **复刻四步流程**：拆解参考片（Motion.md 记录镜头顺序、转场、声音提示）→ Agent 用品牌套件重建 HTML 场景并排入可编辑时间线 → 对比原片与复刻调整节奏 → 导出 MP4 并保留 HTML 源码与素材。
- **版本管理**：项目工具带修订检查，过期请求不能覆盖新工作；每次导出使用任务启动时保存的版本，导出后校验文件规格。
- **安装**：ChatGPT Marketplace 一键安装；`npx skills add nexu-io/openmotion --skill openmotion`；源码安装要求 Node.js 26.11.1（与徽章 Node.js 22.18+ 不一致，原文矛盾未消解）；可导入 HyperFrames 项目 ZIP 继续编辑。

## Products / Projects（产品／项目）

- [[motion-md]]（其核心创作规范格式）

## Relationships（关系）

- [[motion-md]]：OpenMotion 引入的动效制作规范格式，是本项目沉淀创作经验的核心载体。
- 信源页：[[2026-11-20-weibo-openmotion-ai-video-platform]]。
- 上游基础：HyperFrames（HeyGen 的 HTML 转视频组合引擎，固定 0.9.7，信源中提及，本库暂无独立页面）。

## Timeline（时间线）

- 2026-11-09 — README 徽章显示 GitHub stars 约 9.5k（自报时点）。
- （更名 html-anything → openmotion 的具体日期：未知，信源未给出。）

## Current Understanding（当前认知）

OpenMotion 代表「Agent 驱动视频生产」的开源全栈实现：以 HTML 为视频的可编辑中间表示，以 Motion.md 为制作规范载体，以 BYOA/BYOK 解耦 Agent 与模型账单。其定位、功能与数据均来自仓库 README 自述（单一信源、宣传性质），模板数量、模型清单与 stars 未经第三方核验；Node 版本要求存在原文矛盾，建议使用时以仓库当前 package.json 为准。

## Evidence（证据）

- `raw/sources/ai/2026-11-20-openmotion-ai-video-platform.md`（GitHub README 全文，经微博帖子采集，2026-11-20）
