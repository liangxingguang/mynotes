---
id: wiki-source-ai-era-framework-reflection
type: source
title: 在AI时代回顾互联网黄金时代技术框架（知乎）
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: medium
tags:
  - source
  - framework
  - ai-engineering
sources:
  - raw/sources/architecture/2026-11-12-ai-era-framework-reflection.md
related:
  - wiki/concepts/true-vs-pseudo-framework.md
  - wiki/concepts/accidental-vs-essential-complexity.md
---
# 在AI时代回顾互联网黄金时代技术框架（知乎）

## Overview（概览）

一篇技术文化评论（知乎专栏文章，2026-11-12 采集）。作者在 LLM 重塑编程的节点回望互联网黄金时代：先定义"真框架"与"伪框架"，再剖析大厂高薪催生的"程序员的傲慢"如何人为制造复杂，并指出这种傲慢在 AI 时代借尸还魂——以 DSH 的宏大叙事为典型；主张以 Claude Code 式的克制为锚，用复杂度二分法分清偶发与根本复杂度，vibe coding 不是工业工程的未来。

## Key Facts（关键事实）

- 真框架案例：Spring Boot（终结 XML 配置地狱）、Koa/Express（洋葱模型与中间件）、Vue/React（声明式渲染）、Prisma/MyBatis（对象映射拉平）。
- 伪框架案例：领域驱动、六边形架构、四层解耦、企业级全家桶、Egg.js、Umi、Weex。
- DSH（DeepSeek 的 harness）被作为 AI 时代"伪框架"典型：Cordis 微内核、万物皆插件、时空可组合性、150+ npm 子包。
- Claude Code 的核心工具集仅 View/Edit/Bash/Glob/Grep 五六个命令，精力在 Unix 管道、进程信号量控制、Token 预算剪枝、Git Diff 原子性。
- 《人月神话》的复杂度二分法：偶发复杂度（技术摩擦）与根本复杂度（业务内生复杂）。

## Important Claims（重要论断）

### Claim 1：真框架用最小心智负担击穿底层物理复杂度

真框架构建清晰、稳定且克制的 API，受众广、普适性强、经得起十年生产环境敲打（信源观点）。

### Claim 2：伪框架的受众从来不是代码，而是人性的虚荣

黄金时代高薪催生"程序员的傲慢"——把时代红利误认为个人卓越，为证明配得上高薪而人为制造复杂；伪框架生命周期随创始者晋升、套现或跳槽而终结（信源观点，类比中世纪教会用拉丁文维持神职权威）。

### Claim 3：AI 时代傲慢借尸还魂，"黑盒许愿"不是严肃工程

当年堆砌概念的人成了 AI 布道师，半天生成上百包、几十万行未审阅的黑盒包装成"颠覆性基建"；DSH 以聊天机器人微内核理念接管操作系统级 Agent 调度，连命令行参数与基础文档都未走通（信源观点，单信源、未独立核验）。

### Claim 4：大模型能粉碎偶发复杂度，无法抹平根本复杂度

AI 时代工程师应把规格与类型当锚点、精力向根本问题收敛、保持对每处变更的知情权（信源观点）。

## Concepts Introduced（引入的概念）

- [[true-vs-pseudo-framework|真框架与伪框架]]
- [[accidental-vs-essential-complexity|偶发复杂度与根本复杂度]]

## Entities Mentioned（提及的实体）

- Claude Code、DSH（DeepSeek harness）、pi（未单独立页）
- Spring Boot、Koa、Express、Vue、React、Prisma、MyBatis、Egg.js、Umi、Weex（框架名，未单独立页）

## Implications（影响／启示）

框架选型与 AI 时代工程姿态的评论性参照：警惕"概念先行、宏大叙事"的框架自嗨，以克制、可维护、经得起生产敲打为判断标准（解读）。

## Limitations（局限）

- 单信源（知乎评论文章），观点性强，事实未经独立核验；DSH 相关批评为作者单方面论断。
- "真/伪框架"二分是评论框架而非严谨学术分类，边界存在主观性。

## Related Knowledge（相关知识）

- [[true-vs-pseudo-framework]]（真框架与伪框架：定义、傲慢成因与 AI 时代借尸还魂）
- [[accidental-vs-essential-complexity]]（复杂度二分法与 AI 时代工程师姿态）
- [[harness-engineering|Harness Engineering]]（Claude Code 与 DSH 同属 harness 范畴，可交叉参照）

## Source（信源）

- `raw/sources/architecture/2026-11-12-ai-era-framework-reflection.md`
