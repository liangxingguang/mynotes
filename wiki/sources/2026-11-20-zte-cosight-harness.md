---
id: wiki-source-2026-11-20-zte-cosight-harness
type: source
title: 中兴开源企业级 Harness：Co-Sight Harness（微信公众号）
status: active
created: 2026-11-22
updated: 2026-11-22
confidence: medium
tags:
  - source
  - ai
  - agent
  - harness
sources:
  - raw/sources/ai/2026-11-20-zte-cosight-harness.md
related:
  - wiki/entities/zte-cosight-harness.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-evaluation.md
---
# 中兴开源企业级 Harness：Co-Sight Harness（微信公众号）

## Overview（概览）

Datawhale 干货类公众号文章，解读中兴通讯开源的 Co-Sight Harness：支撑 2000 人研发团队、200+ 步骤生产级工作流的 Agent 底座系统（Apache 2.0，ZTE-AICloud/Co-Sight 仓库）。文章按业务、执行、资产、证据四层拆解改造方案，结合中兴内部三个真实业务域的落地数据，论证「长链路稳定性取决于模型外那层 Harness」。

## Key Facts（关键事实）

- 问题背景：长链路单步成功率指数衰减（每步 95%，10 步后约剩 60%）；改造前业务域 A 的 200 步链路无人干预完成率仅 50%；2000 人团队四大痛点（公共代码反复改坏、换需求冷启动成本高、质量门禁空文件摆设、经验无法留存）。
- 业务层：按五维（模型难度、自由度、可验收性、检索依赖、专业依赖）给步骤打分分流——易验收环节直接写脚本，复杂环节拆为 11 个专职子 Agent（Orchestrator/Worker/Review 三层，生成与审查隔离），准确率提升约 10%；agent-genesis 把口头需求自动编译为标准控制文件，新场景接入从 2-4 小时压缩到 5-10 分钟，验证 Agent 在隔离上下文运行、严禁查看设计方案。
- 执行层 Drive：声明式工作流 + 状态机 + Hook 固定流程，模型只能改产出不能改流程状态，控制数据存于上下文外本地文件；按分析/规划/执行/评估/核算五岗位流转，不合格带证据打回，支持断点续跑；200 步链路无人干预完成率 50%→100%，端到端耗时 440→159 分钟（缩短 64%）。
- 资产层：运行态检索 + 生产态构建双引擎，先语义对齐（业务语言→研发术语）再检索，从任务记录自动挖掘经验回写知识库；检索召回率 56%→91.67%，生成 F1 68%→91.25%（代价：子系统变更检索精确率 72%→70%）。
- 证据层：评测从总分下钻到阶段里程碑再到具体 Step；v1.0（7 维度+裁判 LLM）→v2.0（审校规则转召回/精确率公式）→v3.0（节点埋点 + Golden Set 逐节点比对）；回归门禁拦截倒退改动，召回率 45%→43% 教训后稳步提升至 93%；与 DSPy/GEPA 算法层优化互补。
- 跨团队验证：业务域 C 多卡适配跨人移交（非原作者 7 天完成配置切换，门禁下 5 小时自动跑通支撑 V0.5 发布）；业务域 B 两位非原班工程师 4 天接管，运行稳定性 50%→90%；组织级任务成功率 60%→90%。
- 开源形态：Apache 2.0，含 agent-genesis、drive（817 个测试）、GoldEval、skill-optimizer、cosight-viewer 等 8 个组件；可作为插件装进 Claude Code 或 DSH，一键安装、自带依赖、可完全离线运行。

## Important Claims（重要论断）

### Claim 1

业界共识：Prompt → Context → Harness → Loop，决定长链路能不能稳定的关键，在于模型外的那层 Harness。（原文论断）

### Claim 2

企业级系统与个人工具的发力点不同：高手提效 30% 只作用于他自己的环节；把整个团队的交付下限从 60% 拉升到 90%，收益覆盖 2000 人和全部 200 多个步骤——团队规模越大，提升下限的价值越高。（原文论断）

### Claim 3

业务流程不能建立在「指望大模型自觉配合」之上：执行引擎用声明式工作流、状态机与 Hook 把流程固定，模型在运行中只能修改产出，无权改动流程状态。（原文论断，Drive 设计前提）

### Claim 4

光靠换一个更强的底座模型效果有限：200 多步串行研发链路的交付，取决于整条链路上最薄弱的环节和上下游的交接质量。（原文论断）

## Concepts Introduced（引入的概念）

- [[harness-engineering|Harness Engineering]]（四层改造的企业级实例）
- [[agent-evaluation|业务 Agent 全生命周期评测]]（证据层三级指标下钻与回归门禁）
- [[durable-execution|持久执行]]（断点续跑、依赖分批并行、强制对账）

## Entities Mentioned（提及的实体）

- [[zte-cosight-harness|中兴 Co-Sight Harness]]
- DSPy、GEPA（算法层优化工具，对照提及，未建独立页面）
- Claude Code、DSH（宿主运行时，未建独立页面）

## Implications（影响／启示）

- 解读：在不换底座模型的前提下，通过运行时控制结构（业务分流 + 流程固化 + 知识资产双引擎 + 证据门禁）可把超长链路交付从「一半卡死」拉到「无人干预全成」，说明企业级 Agent 系统的主战场在模型之外的控制面。
- 解读：把「新场景接入」做成自动化流水线（agent-genesis）并以隔离验证防止「自己改自己的作业」，是规模化复用的关键设计，可迁移到其他团队级 Agent 平台。

## Limitations（局限）

- 数据为中兴内部自报（业务域 A/B/C），未经第三方核验；文章为 Datawhale 转载解读，非官方一手文档。
- 采集稿中架构图/流程图为 1px 占位图，原图细节无法还原。
- 开源组件的具体实现与仓库状态需到 GitHub 仓库自行核验。

## Related Knowledge（相关知识）

- [[zte-cosight-harness|中兴 Co-Sight Harness（实体页）]]
- [[harness-engineering|Harness Engineering]]
- [[agent-evaluation|业务 Agent 全生命周期评测]]
- [[helixharness|HelixHarness]]、[[ep-harness|EP-Harness]]、[[deepseek-harness|DeepSeek Harness]]（同类 Harness 实例）

## Source（信源）

- `raw/sources/ai/2026-11-20-zte-cosight-harness.md`
