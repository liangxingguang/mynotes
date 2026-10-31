---
id: wiki-source-ste-zh-skill
type: source
title: ste-zh：借鉴 ASD-STE100 的 AI Agent 中文汇报规范 Skill
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - source
  - ai
  - skill
  - writing
sources:
  - raw/sources/ai/2026-10-28-ste-zh-skill.md
related:
  - wiki/concepts/claude-skills.md
  - wiki/sources/uncle-bob-ub-mode-skill.md
---
# ste-zh：借鉴 ASD-STE100 的 AI Agent 中文汇报规范 Skill

## Overview（概览）

蚁工厂发布的 `ste-zh`：一个面向 AI Agent 的任务汇报规范 skill。借鉴航空与工业界的 ASD-STE100（Simplified Technical English）原则，约束 Agent 用清晰、严密、无歧义的中文汇报工作结果。开源在 GitHub，微博互动 57 转 / 87 赞。

## Key Facts（关键事实）

- **是什么**：一份 Agent Skill，规范 Agent 汇报工作结果时的中文表达，对标工业界 ASD-STE100（Simplified Technical English）的严谨写作原则。
- **解决什么**：Agent 汇报常含糊、有歧义；用受控语言（controlled language）思路约束措辞，让结果描述清晰、严密、可核对。
- **地址**：https://github.com/dualface/ste-zh
- **社区反馈**：评论中多人 @印象笔记/@Notion 收藏，有用户反馈"用了，不错"。
- **与 ub-mode 的关联**：同属"用 Skill 约束 Agent 行为"的思路——ste-zh 管汇报语言，ub-mode 管开发纪律。

## Important Claims（重要论断）

### Claim 1：受控语言可以约束 Agent 汇报质量

ste-zh 借鉴 ASD-STE100（简化技术英语）的严谨写作原则，用受控语言思路约束 Agent 的中文表达。这提供了一个把工业界写作规范迁移到 AI Agent 场景的范例：不是靠模型自觉，而是靠外部规范约束输出格式和措辞。

### Claim 2：Skill 可以覆盖 Agent 行为的不同维度

ste-zh 约束汇报语言，ub-mode 约束开发纪律——两者展示了 Agent Skill 的两个不同应用维度：一个管"怎么说"，一个管"怎么做"。Agent Skill 的适用范围比"领域知识包"更广，可以覆盖 Agent 行为的任意可规范化的维度。

## Concepts Introduced（引入的概念）

无新概念页。本文属于 Skill 实例，概念性知识由已有 [[claude-skills]] 概念页承载。

## Entities Mentioned（提及的实体）

- ASD-STE100（Simplified Technical English，简化技术英语标准）
- dualface/ste-zh（GitHub 仓库）

## Implications（影响／启示）

ste-zh 展示了 Agent Skill 的一个实用方向：把工业界成熟的写作规范迁移到 AI Agent 场景，用外部约束而非模型自觉来保证输出质量。这与 ub-mode 把 TDD/重构纪律压成 Skill 的思路一脉相承——两者都是"用确定性规范约束 Agent 行为"。对于需要 Agent 产出规范化文档（如技术汇报、项目报告）的场景，ste-zh 提供了一个可直接复用的模板。

## Limitations（局限）

- 来源为微博帖子，信息量有限；Skill 的具体内容和效果未在文中详细展示。
- 与 ASD-STE100 的对标关系为作者声称，未提供逐条对照。
- 社区反馈样本小（57 转 / 87 赞），不足以判断实际使用效果。

## Related Knowledge（相关知识）

- [[claude-skills|Claude Skills]]（概念页：Skill 是模块化技能包机制）
- [[uncle-bob-ub-mode-skill|Uncle Bob 给 Agent 写了一份开发 Skill（ub-mode）]]
- [[writing-craft-training-system|拆解《写作是门手艺》]]（写作方法论）

## Source（信源）

- `raw/sources/ai/2026-10-28-ste-zh-skill.md`
