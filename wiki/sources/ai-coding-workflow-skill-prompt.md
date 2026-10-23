---
id: wiki-source-ai-coding-workflow-skill-prompt
type: source
title: 一位 Agent 开发者的 AI Coding 工作流：轻 Skill、方法论 Prompt 与端到端测试
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - ai-coding
  - workflow
sources:
  - raw/sources/ai/2026-10-16-ai-coding-workflow-skill-prompt.md
related:
  - wiki/concepts/pi-customization-layers.md
---
# 一位 Agent 开发者的 AI Coding 工作流：轻 Skill、方法论 Prompt 与端到端测试

## Overview（概览）

X 用户黄同学h（大厂 Agent 开发）分享的数月 AI Coding 实践：重型 Skill 在强模型时代变成噪声且费 Token，趋势是做减法——轻 Skill 组织流程、方法论短 Prompt 当"思维快捷键"；工作流靠 Spec 沉淀上下文、subagent worktree 并行、小 MR + 端到端测试兜底；核心瓶颈是人的 Review 带宽。

## Key Facts（关键事实）

- 常用轻 Skill 分工：think（方案对齐）、grill（需求澄清追问，沉淀 ADR/CONTEXT.md）、implement、ponytail（清理过度设计）、handoff（跨工具交接）、check（MR 前审查）；一个流程重复超 3 次就让 Codex 沉淀成 Skill。
- 五类方法论短 Prompt 及激活的认知动作：第一性原理（重新定义问题）、对抗性审查（攻击假设）、消融实验（验证贡献）、奥卡姆剃刀（删除复杂度）、高内聚低耦合（整理边界）。
- 需求对齐尺度：追问到"剩余问题不再显著改变实现方向和验收"即停；结论沉淀 Spec/CONTEXT.md 供多 Agent 共享。
- 端到端测试环境四件事：一键起环境/造数/重置；Agent 经浏览器/API/CLI 操作真实业务入口；只读数据库 MCP 查库表 + 日志 Skill/Trace 查链路；稳定流程脚本化、入口与排障写成 Skill。
- 工具提供证据，但验收标准必须来自业务契约——"不能让 Agent 看到系统返回什么就认为什么正确"。
- Review 实践：先看验收标准再看测试结果；精力放权限/状态变化/并发/重试/数据一致性/迁移回滚；稳定 CRUD 可跳过；新增抽象用奥卡姆剃刀再审。
- 作者观察：最大瓶颈是人的 Review 速度，不是 Agent 产能；工作流须随模型迭代定期做减法（如 Astra 更新后删除 AGENTS.md 过严约束）。

## Important Claims（重要论断）

### Claim 1：强模型时代 Prompt Engineering 从"写死流程"转向"指定思考方式"

几十字方法论 Prompt 可指定五种认知动作，胜过几百行手写 Workflow；模型训练时已学过这些标准化方法论。

### Claim 2：重型 Skill 的固定流程会变成噪声

上下文已足够时模型仍沿既定流程强制执行"没必要的一步"；OpenAI 发布 Astra 时也专门清理不必要 Skill 与系统提示词（信源转述）。

### Claim 3：Agent 友好的端到端测试环境是关键基建

让重复问题在交到人之前被发现；浏览器自动化推荐 ego lite 开源浏览器（信源观点）。

## Concepts Introduced（引入的概念）

- 方法论 Prompt（"思维快捷键"：用标准化方法论名称激活模型已学会的认知动作）

## Entities Mentioned（提及的实体）

- Codex / GPT-5.6 Sol / Astra / Claude 5 Fable / DeepSeek V4 Flash / pi agent / ego lite（工具链提及，均无承重事实，不立页）

## Implications（影响／启示）

与 [[pi-customization-layers|Pi 五层定制模型]] 互补：该模型给出扩展点成本阶梯，本信源给出"何时做减法"的判据——流程类约束须随模型能力定期重审删除（解读）。

## Limitations（局限）

- 个人经验帖，单一信源，无对照数据；提及的模型版本（GPT-5.6 Sol、Claude 5 Fable 等）为作者当时所用，时效性强。
- 公司业务细节因保密未展开，端到端环境搭建只有原则无可复现步骤。

## Related Knowledge（相关知识）

- [[pi-customization-layers|Pi 五层定制模型]]

## Source（信源）

- `raw/sources/ai/2026-10-16-ai-coding-workflow-skill-prompt.md`
