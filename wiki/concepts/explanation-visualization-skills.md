---
id: wiki-concept-explanation-visualization-skills
type: concept
title: 解释型可视化 Skill
status: active
created: 2026-11-22
updated: 2026-11-22
confidence: medium
tags:
  - concept
  - ai
  - skill
  - visualization
sources:
  - raw/sources/ai/2026-11-20-visualization-skills.md
related:
  - wiki/concepts/claude-skills.md
  - wiki/entities/drawio-skill.md
  - wiki/sources/2026-11-20-visualization-skills.md
---
# 解释型可视化 Skill

## Definition（定义）

一类面向「解释概念、让内容信息更易懂」的 Agent Skill：把文章/讲解中的判断、流程、状态、隐喻或关键信息，自动转成图表、配图或信息图，用于正文插图与概念说明。是 Skill 机制在视觉表达方向的子类，区别于工程交付类（架构图、代码）与行为规范类 Skill。

## Why It Matters（为什么重要）

内容生产中「解释清楚一个概念」长期依赖手工找图/画图；该类 Skill 让智能体直接产出风格统一、与正文语境绑定的可视化产物，降低解释类内容（教程、课件、科普、汇报）的配图成本。（解读）

## Core Characteristics（核心特征）

1. **按输出形态分工**：①自包含图表（HTML+SVG，可品牌适配与动效）；②手绘风格正文配图（白底、怪诞清爽、可自定义视觉 IP）；③素材插画（带字解释图、图表美化、参考配图）；④多引擎智能插图（按内容类型自动选引擎）；⑤信息图风格（对标 GPT-Image2 Template 库的 Infographic Engine）。
2. **按宿主适配**：多数 Skill 面向 Claude Code / Codex 等智能体，且注明可让 AI 适配到其他主流智能体，不强制绑定单一宿主（原文表述，未逐一验证）。
3. **调用即产出**：把内容信息发给智能体并调用 Skill，由 Skill 主动从内容中提取关键信息再投入生成图片，无需人工先整理素材。（concept-infographic-engine 的工作方式）

## Structure（结构）

按输出形态可分为五类（信源给出的五个实例）：

| 形态 | 代表 Skill | 输出 | 风格/机制 |
|---|---|---|---|
| 自包含图表 | diagram-design | HTML+SVG | 38 种图表类型，品牌适配+动效 |
| 手绘配图 | ian-xiaohei-illustrations | 正文配图 | 白底手绘、怪诞清爽，默认 IP「小黑」可改 |
| 素材插画 | guizang-material-illustration | 带字解释图等 | 归藏素材插画，图表美化 |
| 多引擎插图 | smart-illustrator | 文章插图 | Gemini 创意视觉 + Excalidraw 手绘 + Mermaid 结构化，按内容选引擎 |
| 信息图 | concept-infographic-engine | 信息图 | 对标 GPT-Image2 Template 库，自动提取关键信息 |

## How It Works（运作方式）

典型调用路径（以 concept-infographic-engine 为样本，信源描述）：用户需要解释概念 → 把内容信息发给智能体并调用该 Skill → Skill 主动从内容中提取关键信息 → 投入到生成的图片中。（原文流程；其余 Skill 的调用细节信源未展开）

## Relationships（关系）

### Related Concepts（相关概念）

- [[claude-skills|Claude Skills]]：本概念是 Skill 机制在视觉表达方向的子类；Skill 的按需加载、文件即资产特性是该类 Skill 的运行基础。

### Distinctions（区分）

- 与 [[drawio-skill|drawio-skill]]：drawio-skill 面向工程架构图（代码/配置 → 可编辑 .drawio + CI 检查），属工程交付方向；本概念面向解释类内容的视觉表达，输出为文章配图/信息图，不要求可编辑源数据与 CI 集成。

## Evolution（演进）

- 2026-11-22 — 由微信信源 `raw/sources/ai/2026-11-20-visualization-skills.md` 新建：归纳「解释概念」共同定位下的五种视觉形态与宿主适配模式。

## Open Questions（开放问题）

- 各 Skill 的实际生成质量、安装渠道与维护状态：信源未给出，需在具体智能体中按名称搜索后自行验证。
- 与多模态模型原生出图能力（如 GPT-Image2）的边界：该类 Skill 是模板化/流程化封装，优势在结构化与一致性，但未经对比验证。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-20-visualization-skills.md`（微信短分享，五 Skill 功能描述未经独立核验，confidence=medium）

## Related Knowledge（相关知识）

- [[2026-11-20-visualization-skills|5个能让内容信息更易懂的可视化skill（信源页）]]
- [[claude-skills|Claude Skills]]
- [[drawio-skill|drawio-skill]]
