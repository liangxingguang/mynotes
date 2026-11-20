---
id: wiki-concept-motion-md
type: concept
title: Motion.md（视频动效制作规范格式）
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - concept
  - video
  - agent
  - specification
sources:
  - raw/sources/ai/2026-11-20-openmotion-ai-video-platform.md
related:
  - wiki/entities/openmotion.md
  - wiki/sources/2026-11-20-weibo-openmotion-ai-video-platform.md
---
# Motion.md（视频动效制作规范格式）

## Definition（定义）

Motion.md 是一种用 Markdown 描述视频**镜头顺序（shot order）、节奏（timing）、转场（transitions）与可替换素材**的制作规范格式，由 OpenMotion 项目提出并用于其视频复刻工作流。它记录一条品牌片「逐镜头如何工作」，让 Agent 与创作者围绕同一份结构化文档协作复刻与改编视频。

## Why It Matters（为什么重要）

- **创作经验的结构化沉淀**：把镜头语言、动效节奏、声音设计等专业制作经验写成 Agent 可理解的规范文档，解决「专业视频制作经验难以沉淀为 Agent 可复用知识」的问题（信源明确列为项目动机之一）。
- **复刻流程的接口**：Motion.md 是「参考片 → 可编辑复刻」四步流程（拆解参考 → 重建镜头 → 对比调整 → 导出分享）中拆解阶段的产出物，也是分享复刻项目的必备文件之一。
- **人机协作的契约**：Brand Kit 与 Design 区让品牌身份、批准素材与视觉规范有明确归属，Agent 按文档执行、人在 Studio 复核。

## Core Characteristics（核心特征）

1. **结构化记录镜头要素**：镜头顺序、时间节奏、转场、声音提示（sound cues）与可替换素材。
2. **Brand Kit 区**：记录品牌身份、话术（voice）与经批准的产品事实与素材，保证复刻结果「可识别为你自己」。
3. **Design 区可引用独立 DESIGN.md**：视觉规则（版式、色彩、字体层级）不与动效规范混写，通过引用复用。
4. **Motion Package 打包**：Motion Package v0.2 草案把设计文档、动效文档、素材、声明的依赖与可选 SKILL.md 组合为可分享包，供整个行业/品牌体系复用。
5. **与 Studio 模板库联动**：在线模板库的详情页将参考视频与对应 Motion.md 指南放在一起，支持下载指南或一键复制复刻指令给 Agent。

## Structure（结构）

- **Brand Kit 区**：身份、话术、经批准的产品事实与素材。
- **Design 区**：引用独立的 `DESIGN.md` 视觉规范。
- **动效记录**：镜头顺序、节奏、转场、声音提示、可替换素材清单。
- **Motion Package v0.2（草案）**：设计 + 动效文档 + 素材 + 声明依赖 + 可选 `SKILL.md`。

## How It Works（运作方式）

1. 观看参考视频，展开详情页的 Visual style / Production notes，或下载 motion.md 保存指南。
2. Agent 按 Motion.md 拆解参考片：记录镜头顺序、转场与声音提示，标记要替换的部分。
3. Agent 用 Brand Kit 与文案重建 HTML 场景，排入 Studio 可编辑时间线；保留参考的动效与节奏，同时让结果可识别为自有品牌。
4. 对比原片与复刻的同一时刻，调整时间、运动与声音；导出 MP4 并保留源码与素材，分享项目时附带 Motion.md。

## Relationships（关系）

### Related Concepts（相关概念）

- [[openmotion]]：Motion.md 的提出者与主要使用方，是该格式的实例载体。

### Dependencies（依赖项）

- 无独立依赖页面；其依赖的视觉规范载体为 DESIGN.md（信源中提及，本库暂无独立页面）。

### Distinctions（区分）

- 与 DESIGN.md 的区分：Motion.md 面向**动态影像的镜头与节奏**（时序、转场、声音），DESIGN.md 面向**静态视觉规则**（版式、色彩、字体）；Motion.md 的 Design 区通过引用复用 DESIGN.md，二者分工不同（解读，依据信源对两区职责的描述）。
- 与普通 Markdown 文档的区分：Motion.md 是面向 Agent 复刻工作流的结构化制作规范，字段语义与使用方（Agent + Studio）绑定，而非通用笔记。

## Evolution（演进）

- 当前形态：随 OpenMotion 项目提出，在线模板库提供 300+ 动效指南（项目方自报数量）。
- Motion Package v0.2 仍为草案：包内附带的示例展示了两个内容预设；**自动导入 Studio 与渲染保真度仍独立于包校验**，尚未合入包规范本身（信源明确）。

## Open Questions（开放问题）

- Motion Package 的自动 Studio 导入与渲染保真度何时纳入规范（信源标注为分离项）。
- 该格式能否脱离 OpenMotion 生态被其他 Agent 视频工具复用（当前仅单一信源，未知）。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-20-openmotion-ai-video-platform.md`（GitHub README 全文，单信源，项目方自述）

## Related Knowledge（相关知识）

- [[openmotion]]
- [[2026-11-20-weibo-openmotion-ai-video-platform]]
