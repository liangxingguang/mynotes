---
id: wiki-source-google-harness2-2026-11-24
type: source
title: 谷歌开源 AI Harness 自进化框架 Harness2：一个月狂揽 25K+ Star（信源页）
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - ai-agent
  - harness
  - self-evolution
sources:
  - raw/sources/ai/2026-11-24-google-harness2.md
related:
  - wiki/entities/harness2.md
  - wiki/concepts/harness-engineering.md
---
# 谷歌开源 AI Harness 自进化框架 Harness2：一个月狂揽 25K+ Star（信源页）

## Overview（概览）

微信公众号「冰河」对 Google Research 开源项目 Harness2 的解读文章。Harness2 把"调 Agent harness"从手工活变成可自动迭代的过程：不训练模型、权重锁死，只迭代模型外层系统配置；靠两层递归——单任务用"候选 harness 行为对比"替代标准答案打分来精炼，跨任务把有证据的结论沉淀进持久的改进 harness。

## Key Facts（关键事实）

- Harness2 由 Google Research 开源，项目地址 https://github.com/google-research/harness2，协议 Apache 2.0，非 Google 官方支持产品、不在开源软件漏洞奖励计划内。
- 核心前提：同模型换 harness，效果差距可远大于模型本身差距；harness 是包在模型外、决定规划/调工具/记忆的系统层。
- 不训练模型，模型权重全程锁死，只迭代 harness 配置（"模型不动，动壳"）。
- harness 拆成 4 组 8 块可编辑组件：上下文（系统提示词、Guardrails、Memory、Skills）、工具接口（工具说明、Scripts）、委派（Subagents）、中间件（Plugins）。
- open world 假设：任务无法预先枚举，不追求一次调好通用 harness，每个新任务触发一次针对性改进。
- 两层递归：第一层管当下任务（初始跑 → 编辑器提修改建议 → 候选各跑一遍 → 组合器对比行为差异合成精炼 harness），**不需要标准答案**；第二层管以后任务（反思，把被采纳改动与有证据结论写入持久"改进 harness"）。
- 预算由 `--k` 控制：`--k 1` 最省；`--mode parallel` 往宽探（同时探 K 个通用 + K 个领域候选）；`--mode sequential` 往深改（K 步连续精炼）。
- 执行器支持 OpenCode 与 Codex（`--substrate cx` 切到 Codex）。
- 自报跑分：三基准（JobBench 专业任务 / LAB 法律 / WorkBuddy-Bench 办公网页代码）上，单步 Harness 使 GLM-5 与 Gemini 3.5 Flash 超过各自基础 harness；最大提升为 WorkBuddy-Bench 11.5 分、LAB 部分通过率 11.8 个百分点、JobBench 4.5 分（**均为最高值**，实际以论文完整对比表为准）。
- 上手：本地 demo 需 Linux + Python 3.12 + uv，用确定性编辑器，无需模型凭证；接真实模型跑基准还需 Node.js 20+、Google Cloud CLI，`.env` 填 Vertex AI 项目与模型 ID（LAB 要 Pandoc/Poppler，WorkBuddy-Bench 要 Docker）。
- 注意事项：带模型运行产生 API 费用，`--k` 开大成本涨得快；执行器网络默认不受限，正式评测前须配网络限制（避免搜到答案与评分标准）；非 Google 官方支持产品。

## Important Claims（重要论断）

### 用"行为对比"替代"等标准答案"

大部分真实任务没有可打分的正确答案，Harness2 靠对比同一任务下不同壳改动的行为差异，从差异中判断哪些改动值得留——比依赖评分反馈更实用。

### 两层递归让单任务越做越好、后续任务不用从零开始

第一层针对当下任务精炼 harness，第二层把有证据的结论沉淀进持久改进 harness，下个任务的编辑器建议参考这份积累。

### 方法论可独立复用

哪怕不用这个框架，"把 harness 当可迭代优化对象、用行为对比替代等标准答案、把手工直觉变成可记录可积累的东西"这套思路值得用来审视自己调 Agent 的方式。

## Concepts Introduced（引入的概念）

- [[harness-engineering|Harness Engineering（Agent 执行系统工程）]]
- [[harness2|Harness2]]

## Entities Mentioned（提及的实体）

- [[harness2|Harness2]]
- [[harness-engineering|Harness Engineering]]

## Implications（影响／启示）

Harness2 把"调 harness"从手艺活变成可自动迭代的工程过程，提供一种不依赖标准答案的 harness 改进路径。其价值取决于任务分布与模型价格：有明确任务分布且愿意为多次候选执行付费则值得试；想找现成"更好的 harness"则给不了，它提供的是优化过程。

## Limitations（局限）

- 跑分为项目自报"最高"数字，具体到某模型某配置须看论文完整对比表，不可直接拿最高值当预期（单信源转述，置信度中）。
- 标题所称"25K+ Star"在正文中未出现具体数据佐证，存疑，须以 GitHub 仓库实际数据核验。
- 非 Google 官方支持产品，无漏洞奖励计划覆盖，生产使用需自行评估风险。
- 单信源（微信公众号解读文），对框架机制与数字的表述未经论文/仓库一手材料交叉核验。

## Related Knowledge（相关知识）

- [[harness2|Harness2]]
- [[harness-engineering|Harness Engineering（Agent 执行系统工程）]]
- [[helixharness|HelixHarness]]
- [[zte-cosight-harness|中兴 Co-Sight Harness]]

## Source（信源）

- `raw/sources/ai/2026-11-24-google-harness2.md`
