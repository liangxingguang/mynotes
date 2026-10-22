---
id: wiki-source-jd-haibo-ai-knowledge-base
type: source
title: 拆解京东海博 AI-Native 落地保障：海博团队 AI 知识库能力建设
status: active
created: 2026-10-22
updated: 2026-10-22
confidence: high
tags:
  - source
  - ai
  - knowledge-base
  - context-engineering
sources:
  - raw/sources/ai/2026-10-14-jd-haibo-ai-knowledge-base.md
related:
  - wiki/entities/jd-haibo.md
  - wiki/concepts/okf-knowledge-format.md
---
# 拆解京东海博 AI-Native 落地保障：海博团队 AI 知识库能力建设

## Overview（概览）

京东云开发者文章，介绍 [[jd-haibo|京东海博]]（即时零售 SaaS，截止 2026 年 5 月底覆盖 780+ 商家、10 万+ 门店）团队的 AI 知识库实践。核心判断：AI 用不好的瓶颈不在模型、也不在运行时检索，而在知识生产；解法是把"知识编译"前移到维护期，采纳 Google OKF 规范，用 Skill 从代码自动生成结构化互链 Markdown 知识树，并织入研发流水线双向闭环。

## Key Facts（关键事实）

- 问题定义：大模型像"天才实习生"，每次会话都要重建业务认知；三大痛点——读不懂系统（百万行代码里乱猜）、影响面靠老人脑记、测试预期散落 PRD/聊天记录。
- 选型结论：向量 RAG / GraphRAG / Agentic Search 都只解决"运行时检索"，真正卡点是知识源头；借鉴 Karpathy LLM Wiki 与 Google Cloud [[okf-knowledge-format|OKF 规范]]，入库时即编译成互链 Markdown 树，运行时只做"导航+摘录"，精确定位到 文件:行号。
- 三层知识架构：底层"项目知识×领域知识矩阵"（横向每仓一个 catalog，views/ 反向索引记录每张表/Redis-key/MQ-topic 的读写方；纵向 domain-knowledge/ 按业务时序缝合多仓链路，领域层只引用不复制）；中层角色化视图（测试/产品/运营）；上层 Skill 能力（跨仓依赖分析、需求拆解、测试拆解、impact 影响面分级、okf-knowledge-read）。
- 初始化规模：40 万行 yzt-erp-wms 仓生成约 1051 篇（flows 1001：HTTP 584、RPC 167、MQ 140、JOB 96、OpenAPI 14；chains 41 等）；微前端仓约 530 篇；聚合配送域知识库 93 篇。抽取铁律：只写代码可查证事实，查不到留白，绝不编造。
- Harness 知识引擎：消费侧把研发全链路每步变成"读知识库定方向+按需索引代码补细节"；沉淀侧需求完成后 master 代码+过程产物经 /distill-catalog 蒸馏成三类知识，人工确认后才合并；生命周期四步防腐（建档绑负责人→蒸馏反哺→冲突人工拍板→置信度过期治理）。
- AB 实验（同提示词同代码仓，跨仓配置门禁类需求）：A 组（知识库）需求分析 542 秒、读 8 篇知识+核对 3 个源码文件；B 组（仅代码）967 秒、翻 16 个文件——快约 44%；A 组额外发现跨仓消费端缺重试、上线白名单门禁静默失败两个隐藏阻塞点。
- 测试实践：用例即资产挂在领域知识 test-knowledge/cases/；code diff 经 views 反向索引+chains 链路扩散反查回归范围，输出必跑/应跑/建议跑三级；4 个业务组落地，采纳率 90%~100%、覆盖率最高 100%。
- 下一步：平台化、提升 contracts/chains 自动蒸馏置信度、从"人找知识"走向"知识找人"。

## Important Claims（重要论断）

### Claim 1：AI 研发的卡点是知识生产而非运行时检索

RAG 类方案重心都在运行时检索；知识要结构化、绑定关联、精确定位、全生命周期维护，必须把"知识编译"前移到维护期。

### Claim 2：供给端质量决定 AI 上限（Context Engineering）

带结构化知识库的 Agent 比只读代码的 Agent 快约 44% 且更全（发现纯代码触达不到的隐藏阻塞点），还更省 token。

### Claim 3：知识库必须"用中喂养"双向闭环

蒸馏结果不直接落库，人工确认、冲突由负责人拍板后才合并 master 知识分支；置信度过期治理防知识腐败。

## Concepts Introduced（引入的概念）

- [[okf-knowledge-format]]

## Entities Mentioned（提及的实体）

- [[jd-haibo]]
- GitNexus（代码图谱引擎，未单独建页）

## Implications（影响／启示）

企业级遗留系统的 AI 落地，先行投资"从代码自动生成可维护知识树 + 流水线双向闭环"比升级模型或检索器收益更直接；AB 数据（44% 提速 + 隐藏阻塞点发现）为此类投资提供了量化论据。

## Limitations（局限）

- 数据为京东内部单一团队自报，AB 实验规模与需求类型有限。
- OKF 规范原文未随文给出，文中转述为二手描述。

## Related Knowledge（相关知识）

- [[jd-haibo]]
- [[okf-knowledge-format]]

## Source（信源）

- `raw/sources/ai/2026-10-14-jd-haibo-ai-knowledge-base.md`
