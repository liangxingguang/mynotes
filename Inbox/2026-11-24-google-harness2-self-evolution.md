---
id: 2026-11-24-google-harness2-self-evolution
title: 谷歌开源 AI Harness 自进化框架 Harness2：一个月狂揽 25K+ Star
source: 冰河（微信公众号）
source_url: https://mp.weixin.qq.com/s/HCt_zSiOiLYSv-yEjrz70A
source_type: article
platform: 微信公众号
created: 2026-11-24
category: 技术
tags:
  - AI
  - Agent
  - GitHub
asset_ref: Assets/2026/11/weixin-hct-zsioilysv-yEjrz70A.md
wiki_status: pending
---

# 谷歌开源 AI Harness 自进化框架 Harness2：一个月狂揽 25K+ Star

> 冰河介绍 Google Research 开源项目 Harness2：一个把"调 Agent harness"从手工活变成自动迭代过程的框架。它不训练模型、权重全程锁死，只动模型外层的系统配置。harness 被拆成 8 块可编辑组件，靠两层递归循环——单任务用"候选 harness 行为对比"替代标准答案打分来精炼，跨任务把有证据的结论沉淀进持久的改进 harness。项目在 JobBench / LAB / WorkBuddy-Bench 三基准上报告了单步提升，文章还给出 --k 预算参数、本地 demo 与真实跑分步骤，以及成本、网络、官方支持三方面注意事项。

## 核心要点

1. Harness 是包在模型外、决定规划/调工具/记忆的系统层；同模型换 harness 效果差距可远大于模型本身差距
2. Harness2 不训练模型，模型权重锁死，只迭代 harness 配置；把 harness 拆成 4 组 8 块：上下文（系统提示词/Guardrails/Memory/Skills）、工具接口（工具说明/Scripts）、委派（Subagents）、中间件（Plugins）
3. Open world 假设：任务无法预先枚举，不追求一次调好通用 harness，每个新任务触发一次针对性改进——"模型不动，动壳"
4. 两层递归：第一层针对单任务走"初始跑 → 编辑器提修改建议 → 候选各跑一遍 → 组合器对比行为差异合成精炼 harness"，**不需要标准答案**；第二层把被采纳的改动与有证据的结论写入持久"改进 harness"，供后续任务参考
5. 预算由 `--k` 控制：`--k 1` 最省；`--mode parallel` 往宽探（同时探 K 个通用+K 个领域候选），`--mode sequential` 往深改（K 步连续精炼）；执行器支持 OpenCode 与 Codex（`--substrate cx`）
6. 项目自报数字：三基准（JobBench 专业任务 / LAB 法律 / WorkBuddy-Bench 办公网页代码）上单步 Harness 使 GLM-5 与 Gemini 3.5 Flash 超过各自基础 harness；最大提升为 WorkBuddy-Bench 11.5 分、LAB 部分通过率 11.8 个百分点、JobBench 4.5 分（均为最高值，实际以论文完整对比表为准）
7. 上手：本地 demo 需 Linux + Python 3.12 + uv，用确定性编辑器，无需模型凭证；接真实模型跑基准还需 Node.js 20+、Google Cloud CLI，在 `.env` 填 Vertex AI 项目与模型 ID（LAB 要 Pandoc/Poppler，WorkBuddy-Bench 要 Docker）
8. 注意事项：带模型运行产生 API 费用，`--k` 开大成本涨得快；执行器网络默认不受限，正式评测前须配置网络限制，避免执行器搜到答案与评分标准；非 Google 官方支持产品（Apache 2.0，不在漏洞奖励计划内）
9. 方法论可独立复用：把 harness 当可迭代优化对象，用"对比不同壳改动的行为差异"替代"等标准答案"，让调 Agent 的手工直觉变成可记录、可积累的东西

## 正文

做 Agent 做久了会发现：模型本身的差别，很多时候没有外面那层 harness 的差别大。同一模型，提示词写法、工具描述措辞、记忆策略从"全塞进去"改成"按需召回"，结果能从"勉强交差"变成"像换了个模型"。但调 harness 长期是手艺活——靠人一遍遍试，试到差不多就停，没有系统方法。

Google Research 的 Harness2 想把它变成可自动迭代的过程：不训练模型，只动外面这层配置。

**拆成能改的零件**：harness 拆成八块可编辑组件，按运行时职责分四组——上下文组（系统提示词、Guardrails、Memory、Skills）决定模型看到什么、记住什么、被什么约束；工具接口组（工具说明、Scripts）决定模型怎么理解可调用物；委派组（Subagents）决定任务怎么分出去；中间件组（Plugins）决定工具调用循环里的横切行为。拆完之后"改 harness"就具体到"改哪一块、改成什么样"。

**为什么值得自动化**：标题关键词 open world——Agent 面对的任务在最初设计 harness 时压根没出现过。花两周调出的提示词和工具说明，在某个领域表现好，换领域立刻拉胯，因为那套 harness 是围着旧任务长出来的。既然无法预知任务，就别追求一次调好通用 harness，而是让每个新任务触发针对性改进。

**两层递归**：
- 第一层管当下任务：初始 harness 跑一遍 → 编辑器提出两类修改建议（通用型/领域特定型）→ 每个候选修改在同一任务上各跑一次 → 组合器对比行为差异，合成精炼 harness 完成任务。关键设计是不需要 ground truth，靠对比差异判断哪些改动值得留，这对没有可打分标准答案的真实任务更实用。
- 第二层管以后任务：任务结束后反思，把被采纳的改动和有证据的结论写入持久的"改进 harness"，下个任务的编辑器建议参考这份积累。第一层让单任务越做越好，第二层让后续任务不用从零开始。

**预算与执行**：`--k 1` 走一遍三步流程最省；`--k K --mode parallel` 同时探 K 个通用与 K 个领域候选再组合，往宽探；`--mode sequential` 连做 K 步精炼，往深改。执行器支持 OpenCode 与 Codex。

**跑分与上手**：本地 demo（`uv venv --python 3.12 .venv` → 安装 `.[render]` → `harness2-demo --output runs/demo --k 2`）无需模型凭证，演示两种递归模式。接真实模型需 Node.js 20+、gcloud CLI、`.env` 配 Vertex AI，按 `harness2-setup/check/run/judge/report` 流程执行，judge 与 report 须与精炼步同基准同参数；结果落 `runs/`，支持断点续跑，`--dry-run` 可只预览任务选择。

**总结**：Harness2 最值得看的是处理问题的方式——把 harness 当可迭代优化对象，用行为对比替代等标准答案，把调 Agent 的手工直觉变成可记录、可积累的过程。是否上手：有明确任务分布且愿意为多次候选执行付费则值得试；想找现成"更好的 harness"则给不了，它提供的是优化过程，过程本身要花时间与成本。

项目地址：https://github.com/google-research/harness2

## 来源

- 原文：https://mp.weixin.qq.com/s/HCt_zSiOiLYSv-yEjrz70A
- 项目：https://github.com/google-research/harness2

## 附件

[[Assets/2026/11/weixin-hct-zsioilysv-yEjrz70A.md]]
