---
id: wiki-entity-harness2
type: entity
title: Harness2
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - entity
  - ai-agent
  - harness
sources:
  - raw/sources/ai/2026-11-24-google-harness2.md
related:
  - wiki/concepts/harness-engineering.md
  - wiki/sources/2026-11-24-google-harness2.md
---
# Harness2

## Overview（概览）

Google Research 开源的 Agent Harness 自进化框架。它不训练模型、权重锁死，只迭代模型外层的 harness 配置，靠两层递归把"调 harness"从手工活变成可自动迭代的过程：单任务用候选 harness 行为对比替代标准答案打分来精炼，跨任务把有证据的结论沉淀进持久的改进 harness。

## Identity（身份信息）

- Type（类型）: 开源框架 / 项目
- Organization（所属组织）: Google Research
- Role（角色）: Agent Harness 自进化（自动迭代优化）框架
- Status（状态）: 开源，Apache 2.0 协议，**非 Google 官方支持产品**，不在开源软件漏洞奖励计划内

## Important Facts（重要事实）

- **不动模型，只动壳**：不训练模型，模型权重全程锁死，仅迭代 harness 系统配置；前提是同模型换 harness 效果差距可远大于模型本身差距。
- **8 块可编辑组件（4 组）**：上下文组（系统提示词、Guardrails、Memory、Skills，决定模型看到什么/记住什么/被什么约束）；工具接口组（工具说明、Scripts，决定模型怎么理解可调用物）；委派组（Subagents，决定任务怎么分出去）；中间件组（Plugins，决定工具调用循环里的横切行为）。"改 harness"因此具体到"改哪一块、改成什么样"。
- **open world 假设**：Agent 面对的任务在设计 harness 时未出现，故不追求一次调好通用 harness，而是每个新任务触发一次针对性改进。
- **两层递归**：
  - 第一层管当下任务：初始 harness 跑一遍 → 编辑器提修改建议（通用型/领域特定型）→ 每个候选修改同任务各跑一次 → 组合器对比行为差异，合成精炼 harness 完成任务。**不需要标准答案**（无 ground truth、无打分反馈，靠对比差异判断哪些改动值得留）。
  - 第二层管以后任务：任务后反思，把被采纳的改动与有证据支持的结论写入持久"改进 harness"，下个任务编辑器建议参考这份积累。
- **预算控制**：`--k` 控制第一层递归深度。`--k 1` 走一遍三步流程最省；`--k K --mode parallel` 同时探 K 个通用 + K 个领域候选再组合，往宽探；`--mode sequential` 连做 K 步精炼，往深改。
- **执行器**：支持 OpenCode 与 Codex，`--substrate cx` 切到 Codex。
- **自报跑分**：在 JobBench（专业任务）/ LAB（法律）/ WorkBuddy-Bench（办公网页代码）三基准上，单步 Harness 使 GLM-5 与 Gemini 3.5 Flash 超过各自基础 harness；最大提升为 WorkBuddy-Bench 11.5 分、LAB 部分通过率 11.8 个百分点、JobBench 4.5 分（**均为最高值**，实际以论文完整对比表为准，加大第一层预算还能继续往上走）。
- **上手门槛**：本地 demo 需 Linux + Python 3.12 + uv，确定性编辑器 + 真实 Python 执行，无需模型凭证；接真实模型跑基准需 Node.js 20+、Google Cloud CLI、Vertex AI（`.env` 配项目与模型 ID），LAB 额外要 Pandoc/Poppler，WorkBuddy-Bench 要 Docker。judge/report 须与精炼步同基准同参数，结果落 `runs/`，支持断点续跑与 `--dry-run` 预览。
- **成本与风险**：带模型运行产生 API 费用，`--k` 开大成本涨得快；执行器网络默认不受限（Codex 沙箱默认关），正式评测前须配网络限制以防搜到答案与评分标准；非官方支持产品。

## Products / Projects（产品／项目）

- [[harness-engineering|Harness Engineering（Agent 执行系统工程）]]（所属概念）
- 项目仓库：https://github.com/google-research/harness2

## Relationships（关系）

- [[harness-engineering|Harness Engineering]]：Harness2 是"harness 配置自动迭代"这一维度的实现样例，印证 `Agent ≈ Model + Harness` 与"同模型换 harness 差异大于模型本身"，补上此前概念页未充分展开的自进化实现机制。
- [[helixharness|HelixHarness]]：同为开源 Harness，HelixHarness 侧重 Propose/Apply/Archive 三阶段证据门禁与人工决策采纳，Harness2 侧重 harness 配置的自动递归精炼。
- [[zte-cosight-harness|中兴 Co-Sight Harness]]：同为开源 Harness，Co-Sight 侧重企业级长链路四层改造，Harness2 侧重单/跨任务的 harness 配置自动迭代。
- [[deepseek-harness|DeepSeek Harness]]：同属 Harness 产品实例序列。

## Timeline（时间线）

- 2026-11-24 — 经微信公众号「冰河」解读文采集入 wiki，首个介绍 Harness2 的信源，机制与自报数字为单信源转述，置信度中。

## Current Understanding（当前认知）

Harness2 的核心贡献是把 harness 当作可迭代优化对象，用"对比不同壳改动的行为差异"替代"等标准答案"，并以两层递归让单任务越做越好、后续任务不用从零开始。它是 Harness Engineering 概念下"自进化"实现路径的一个具体开源实例。其自报跑分为项目最高值、未经一手材料交叉核验，标题"25K+ Star"在正文无数据佐证，均须以论文与仓库实际数据核验。是否值得上手取决于任务分布与对多次候选执行成本的承受度。

## Evidence（证据）

- `raw/sources/ai/2026-11-24-google-harness2.md`
