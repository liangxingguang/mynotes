---
id: wiki-source-2026-11-20-visualization-skills
type: source
title: 5个能让内容信息更易懂的可视化skill（微信公众号）
status: active
created: 2026-11-22
updated: 2026-11-22
confidence: medium
tags:
  - source
  - ai
  - skill
  - visualization
sources:
  - raw/sources/ai/2026-11-20-visualization-skills.md
related:
  - wiki/concepts/explanation-visualization-skills.md
  - wiki/concepts/claude-skills.md
  - wiki/entities/drawio-skill.md
---
# 5个能让内容信息更易懂的可视化skill（微信公众号）

## Overview（概览）

微信短分享，作者整理工作中常用的 5 个「解释概念」可视化 Skill：覆盖自包含图表、手绘正文配图、素材插画、多引擎智能插图、信息图风格五类形态，均面向 Claude Code / Codex 等智能体，多个 Skill 注明可让 AI 适配到其他主流智能体。

## Key Facts（关键事实）

- diagram-design：38 种架构/流程/数据/战略图表，输出自包含 HTML+SVG，支持品牌适配与动效。
- ian-xiaohei-illustrations：把中文文章里的判断、流程、状态和隐喻转成白底、手绘、怪诞但清爽的正文配图；默认视觉 IP 是「小黑」，可让 AI 把 Skill 中主人公改成自己想要的形象。
- guizang-material-illustration：归藏素材插画技能，为文章生成带字解释图、图表美化与参考配图；适配 Claude Code / Codex，可让 AI 适配到其他主流智能体。
- smart-illustrator：智能文章插图 Skill，三引擎系统（Gemini 创意视觉 + Excalidraw 手绘图表 + Mermaid 结构化图表），自动根据内容类型选择引擎；可适配其他主流智能体。
- concept-infographic-engine：对标 GPT-Image2 Template 库的 Infographic Engine 风格 Skill；解释概念时把内容信息发给智能体并调用该 Skill，它会主动从内容中提取关键信息再投入到生成图片中。

## Important Claims（重要论断）

### Claim 1

这批 Skill 的共同定位是「解释概念」：让内容信息更易懂。（作者分享定位，未经独立验证）

### Claim 2

多个 Skill 可让 AI 把自身适配到其他主流 AI 智能体上跑通，即 Skill 不绑定单一宿主。（原文表述，作者未逐一实测）

## Concepts Introduced（引入的概念）

- [[explanation-visualization-skills|解释型可视化 Skill]]

## Entities Mentioned（提及的实体）

- diagram-design、ian-xiaohei-illustrations、guizang-material-illustration、smart-illustrator、concept-infographic-engine（5 个具体 Skill；单信源、无独立核验，未建独立实体页，收录于 [[explanation-visualization-skills]]）

## Implications（影响／启示）

- 解读：智能体生态的 Skill 供给已覆盖「视觉表达」这一内容生产环节，解释类内容可让 Agent 直接产出配图，减少手工找图/画图成本。
- 解读：同一任务（解释概念）出现多种视觉风格的 Skill 分工，说明选型维度首先是「想要什么视觉风格/输出格式」，其次才是宿主兼容性。

## Limitations（局限）

- 短分享未给出各 Skill 的安装/调用细节、仓库地址与维护状态，功能描述未经独立核验。
- 单一微信信源，置信度中。

## Related Knowledge（相关知识）

- [[explanation-visualization-skills|解释型可视化 Skill（概念页）]]
- [[claude-skills|Claude Skills]]（Skill 机制背景）
- [[drawio-skill|drawio-skill]]（架构图方向的 Skill 实例，与本批互补）

## Source（信源）

- `raw/sources/ai/2026-11-20-visualization-skills.md`
