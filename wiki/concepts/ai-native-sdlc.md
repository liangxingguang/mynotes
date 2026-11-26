---
id: wiki-concept-ai-native-sdlc
type: concept
title: AI 原生 SDLC
status: active
created: 2026-10-17
updated: 2026-11-26
confidence: medium
tags:
  - concept
  - ai
  - sdlc
  - engineering-practice
sources:
  - raw/sources/ai/2026-10-14-anthropic-ai-native-sdlc-handbook.md
  - raw/sources/ai/2026-10-17-ai-coding-delivery-evolution.md
  - raw/sources/enterprise/2026-10-20-huolala-ai-coding-workflow.md
  - raw/sources/architecture/2026-10-31-ai-coding-eight-stage-workflow.md
  - raw/sources/ai/2026-10-30-alibaba-ai-native-dev-handbook.md
  - raw/sources/ai/2026-10-31-coding-agent-ai-native-workflow.md
  - raw/sources/enterprise/2026-11-04-ai-native-team-org-reconstruction.md
  - raw/sources/ai/2026-11-20-acceptance-agent-opt.md
  - raw/sources/ai/2026-11-20-deepseek-harness-loopforge-voice.md
  - raw/sources/ai/2026-11-20-gaode-ad-linglingqi.md
  - raw/sources/ai/2026-11-20-sdd-spec-driven-dev.md
  - raw/sources/enterprise/2026-11-20-taobao-ai-native-rd.md
  - raw/sources/ai/2026-11-23-coding-agent-software-factory.md
  - raw/sources/ai/2026-11-25-ai-native-engineering.md
  - raw/sources/ai/2026-11-26-end-to-end-business-requirement-agent.md
related:
  - wiki/concepts/ai-native-organization.md
  - wiki/concepts/spec-driven-development.md
  - wiki/concepts/mcp.md
  - wiki/concepts/agent-evaluation.md
  - wiki/concepts/business-requirement-agent.md
  - wiki/entities/kongming-ai-dev-platform.md
  - wiki/sources/ai-native-team-org-reconstruction.md
  - wiki/sources/alibaba-ai-native-dev-handbook.md
  - wiki/sources/coding-agent-ai-native-workflow.md
  - wiki/entities/loopforge.md
  - wiki/concepts/software-factory.md
  - wiki/concepts/ai-native-engineering.md
---
# AI 原生 SDLC

## Definition（定义）

AI 原生 SDLC（AI-Native Software Development Lifecycle，亦称 Agent 化 SDLC）是重新设计的软件开发生命周期：保留传统 SDLC 的控制目标（问责、质量、合规），改用新的执行机制——流程不再线性流转而是闭环，AI 嵌入规划、设计、构建、测试、部署、维护每一个环节，交接自动化并由被接受的制品自动触发下一阶段。

## Why It Matters（为什么重要）

Agent 编码使构建阶段塌缩到以小时计，而规划、评审/测试、部署仍按人速运行，瓶颈转移到构建两侧；逐行手工评审和委员会例外治理在 Agent 产出速度下难以为继。不改造流程，Agent 的生产力增益会被周边流程吃掉，或在评审不足下带病上线。

## Core Characteristics（核心特征）

1. **制品提交链即闭环即审计轨迹**：intent.md → spec.md → plan.md → diff 及测试 → 带评审发现的 PR → 故障记录；每阶段提交制品收尾、读取上阶段制品开始，谁要求、AI 产出什么、谁批准全程可追溯。
2. **人守闸门**：凡是需要判断的决定最终责任由人承担；支配原则是"Agent 可以一路做到生产闸门，但不能越过它"。
3. **三层控制模型**：CLAUDE.md（工作知识，一页内，错误犯第二次即写入）→ Skill（建议性控制，承载政策）→ Hook（确定性控制与审批闸门，allow/ask/block）。
4. **驾驭 Agent 的配置享受代码同等待遇**：CLAUDE.md/Skill/Hook 的变更触发 evals 回归，通过率下降须评审；每次生产故障补一条常驻评测。
5. **无状态闭环**：维护阶段由确定性检测（控制带、Western Electric 规则）唤起 Claude，诊断以 intent.md 写回阶段一，回路自我供给。

## Structure（结构）

六阶段各自的核心打法（据 Anthropic 手册）：

| 阶段 | 核心机制 | 关键制品/闸门 |
|---|---|---|
| 规划 | 意图只捕捉一次、用提出人自己的话 | intent.md；产品负责人 PR 合并/关闭 |
| 设计 | 需求与设计压缩进同一会话，政策即时应用 | spec.md；Skill 编码约束 |
| 构建 | plan 模式默认起点；并行 worktree；子 Agent | plan.md；auto 模式需护栏成熟 |
| 测试 | 反馈回路每轮运行；验证器全新上下文；evals 进 CI | make test 单命令；失败测试先提交 |
| 部署 | 多层 Agent 评审，人只判意图与风险 | REVIEW.md；PreToolUse Hook 闸门；MCP 白名单部署 |
| 维护 | 控制带突破唤起无头诊断，分级响应（1σ/2σ/3σ） | 诊断写成 intent.md 回流 |

## How It Works（运作方式）

起步态是手工逐句提示每一步；终态是闭环——被接受的 intent.md 触发设计、被批准的 spec.md 触发 plan 模式、被合入的 PR 触发流水线、被突破的控制带写下一份 intent.md。各打法模块化、有前置依赖，可从任何无前置的"起点打法"开始改造。对遗留系统（Jira/ServiceNow/Figma/变更委员会），每种制品指定唯一事实来源：仓库为准、遗留系统为准、或互相挂链（记录 ID ↔ commit SHA）。

**SOP 编排与契约驱动的两种工程化路径**（信源 2026-11-20，第 9、10 信源）：

- **LoopForge 的 SOP 编排**（第 9 信源）：腾讯开源团队交付编排工作台，用 SOP（Agent 节点 + Script 节点 + 人工门禁）把需求变成可追溯、可复现、可验收的交付，核心思路"DAG 管主干，Agent 管节点，人管签字"。不需要 AI 的地方不用 AI——构建/测试/lint/压测由 Script 节点承担，AI 只负责节点内分析与编码，关键决策与验收由人（Human gate）签字；门禁失败可打回指定上游步骤，复盘引擎给出健康度评分。腾讯内部实践合入 836 个 MR，一次通过率 54.8%，经门禁打回返工后终态成功率 95.4%。见 [[loopforge|LoopForge]]。
- **高德 Dev Loop 的契约驱动**（第 10 信源）：不再规定研发的每一步操作，而是先明确任务目标、约束和验收标准，再让 Agent 根据执行结果选择路径。研发契约收敛为目标（Goal）+ 约束（Constraints）+ 验收证据（Acceptance Evidence），按任务风险（轻量修改/常规研发/跨仓高风险）调整上下文深度、治理要求和验证方式。见 [[gaode-ad-linglingqi|广告凌凌漆]] 与 [[acceptance-agent|验收 Agent]]。

两者是"AI 原生 SDLC"中"人守闸门"与"制品链可追溯"的不同工程化路径：LoopForge 用确定性 DAG + 人工门禁锁流程，Dev Loop 用契约约束 Agent 自主选择实现路径。

## Relationships（关系）

### Related Concepts（相关概念）

- [[ai-native-organization|AI 原生研发组织]]：同一"AI 原生"命题的组织层对应物——本概念管流程与制品，组织概念管目标、权限、验收、追责与团队形态；前者为后者的开放问题（追责框架）提供了制品链审计这一具体机制。
- [[mcp|MCP]]：在本概念中承担两处连接——部署/回滚能力经 MCP 白名单暴露给 Agent；遗留系统为事实来源时经 MCP 连接器写回。

### Distinctions（区分）

- 与传统 SDLC 的不同之处：控制目标不变，但交接从文档/工单/签字改为制品自动流转，治理从事后评审周期改为动作发生当下（Hook）执行，QA 闸门从阶段边界改为织进实现过程的 evals。
- 与"单点 AI 提效"的不同：不以个人编码速度为目标，衡量取自 PR 元数据、CI、故障跟踪与 DORA 等系统级指标。

## Evolution（演进）

- 2026-08-21：Anthropic（Louis Claxton，Applied AI 团队）发布《The AI-Native SDLC playbook》，系统化六阶段打法与治理配置。
- 2026-10-17：公众号「架构师」《AI 写代码越来越快，研发交付系统该怎么演进？》从交付系统视角印证同一命题：交付建模为七态状态机（当前意图→候选变更→已持久化→已合并→已验证→可部署→已生效），每次推进记录状态/版本/证据/发起者五要素，证据绑定不可变版本；提出"人从 in the loop 移到 on the loop"（Kief Morris）与本概念"人守闸门"呼应，并引 METR 实验（熟悉仓库的开发者用 AI 反慢 19%）与 DORA 2025（AI 是组织能力放大器）佐证局部提速 ≠ 端到端提速。
- 2026-10-20：货拉拉技术公开千人规模落地实践（普及→规范驱动→AI Native 三阶段），提供国内大厂一手印证：SDD 五步产线（澄清/方案/拆任务/实现/审查）对应本概念制品链；spec 打分回写/下架机制是"知识当缓存"的治理实例；度量三层（AI 代码占比三层签名、FPY 首次正确率、全链路 trace）落地了"衡量取自系统级指标"；主从双 Agent 对抗审查（副 Agent 独立回源码核对）与"评审=Agent 一审+人复审"是"人守闸门"的工程化；自治分级 L1-L3（当前 L2：人定目标、AI 起草、人决审）。
- 2026-10-31：银河智学「孔明」AI Coding 框架的八阶段工作流信源（第 4 信源）提供国内自研平台的执行流程实例：需求拆成可逐项核对的验收项（每项挂实现任务+验证方式+负责人+运行编号，定时任务/配置变更也进清单）、规范按框架/阶段/任务类型装配且装配本身被检查、验证快照绑定代码状态（收尾比对，快照缺失不阻断）、问题带触发条件退回原验收项修复、完成由脚本核对而非 AI 自述、评分 10 分制由脚本算（工具采集分模型不能抬）。与 Anthropic 手册六阶段（按 SDLC 阶段切分）互补：孔明按执行流程阶段切分，两者是不同粒度的同一命题。
- 2026-10-31：阿里巴巴 AI Native 研发实践手册（第 5 信源）提供国内大厂多团队一手实践与核心论断：SWE-bench Verified <30%→~80%，Coding 正被解决，瓶颈转移到验证与环境（占研发生命周期 70%～80%）；按阿姆达尔定律，编码只占 20%～30%，压缩三成环节后整体收益有上限；「主战场在验证与环境」是全文最锋利的判断。三个案例（AIDC 数字投手的超级个体→数字员工→云上 Scrum、千问用增 Agent 的三阶段与四个环节、万有无界平台的三元拆分）印证「先建闭环再谈规模」与「人的价值上移到定义与判断」。「约束 vs 假设」的 Spec 新写法（约束→自动门禁、假设→AI 试错空间）直接决定 Agent 自主性上限。万有无界 auto bug fix 60%+ 但 bug 日清率仅 53%→63% 的数据，实证「单点自动化率高≠端到端吞吐提升」——触发与校验依赖人是阿姆达尔定律的现实版。
- 2026-10-31：驾驭 Coding Agent（第 6 信源）从个体开发者视角补充 AI 原生研发工作流的操作框架：架构决策必须在 AI 写码之前完成（3 人团队选模块化单体而非微服务）；真正的杠杆是规约工程 + 上下文工程而非提示词措辞；落地为"AI 研发任务五要素模型"（Goal/Scope/Context/Constraints/Done）；从 Assistant 到 Agent 让开发者实际扮演技术负责人（任务拆解、变更边界锁定、及时熔断）；验证是生死护城河（AI 用最自信的语气写致命漏洞，错误代码和正确代码看起来一样漂亮）；工程铁律——AI 永不替你在凌晨三点的线上故障复盘会上背锅。与前 5 信源互补：前 5 信源从组织/平台/流程视角论述，本信源从个体开发者视角论述。
- 2026-11-04 — 微信公众号方法论长文（第 7 信源）从组织层印证"制品链即唯一事实来源"机制：文档进化为 Spec——连接业务、产品、工程和 Agent 的共同语言，MCP 是当前最可行的连接层；业务决策变更时 Spec 自动同步到所有依赖方包括 Agent。判断标准：不能被 Agent 消费的活上下文就不是 Spec，只是过期文档。这是"How It Works"中遗留系统"每种制品指定唯一事实来源"规则的组织层重述，其治理层评估闭环见 [[agent-evaluation]]。
- 2026-11-20 — 腾讯云开发者·吴思《AI 10分钟写完代码，你2小时还在验？》（第 8 信源）从工程实现侧印证"瓶颈转移到验证"：OPT 平台需求交付小队在编码之后补后端验收 Agent，五阶段流程（变更接口分析→编译发布与接口验证→Gherkin 测试→TAPD 预测试→验收结果输出）+ L1-L4 多层证据链 + 硬阻塞/软失败二分，验收不通过打回修复重验。作者自报 160+ 次运行、单次验收人工投入 2h→20min（无第三方验证）。为六阶段表中"测试/验证"环节提供了接口级验收回路的实例，验收 Agent 概念见 [[acceptance-agent]]。

- 2026-11-21 — 新增 VoxForge 方案信源（第 9 信源）`raw/sources/ai/2026-11-20-deepseek-harness-loopforge-voice.md`，提供 SOP 编排模式的工程实例：LoopForge 用 Agent/Script/Human gate 节点把需求变成可追溯交付，"DAG 管主干，Agent 管节点，人管签字"，门禁失败打回上游，复盘引擎给健康度评分。见 [[loopforge|LoopForge]]。

- 2026-11-21 — 新增高德广告凌凌漆信源（第 10 信源）`raw/sources/ai/2026-11-20-gaode-ad-linglingqi.md`，提供契约驱动的研发协调（Dev Loop：Goal+Constraints+Acceptance Evidence，先明确目标约束验收再让 Agent 按执行结果选路径）与"自主执行≠自主授权"的边界纪律。

- 2026-11-21 — 新增 SDD 信源（第 11 信源）`raw/sources/ai/2026-11-20-sdd-spec-driven-dev.md`，提供规范驱动开发的具体工程化路径：三大基线「宪法」（prd.md/design.md/arch.md）+ 实例化五步骤 + PLAN/CODE 两执行模式，核心要诀「规范先行、人类决策、AI 执行、人类兜底」。与本概念「制品提交链驱动闭环」「人守闸门」同向，是 SDD 这一更聚焦规范与执行的落地形态，见 [[spec-driven-development]]。

- 2026-11-21 — 新增淘海外 AI Native 信源（第 12 信源）`raw/sources/enterprise/2026-11-20-taobao-ai-native-rd.md`，以真实团队数据印证「瓶颈转移到编码两侧」与「单点提速≠端到端提速」：AI Coding 占比 5%→85%，但编码时间只占需求全周期约 20%，编码 200% 提效仅带来约 10% 真实提效，瓶颈在「需求→PRD→实现→验收」串行流转；第二阶段转向 Agent 驱动（钉群统一工作界面、AI 执行+人决策、按复杂度双流程），供给域小需求研发估时降低 50%（团队自报口径）。衡量口径从「AI 生码率」转向「端到端交付周期」。

- 2026-11-23 — 新增软件工厂信源（第 13 信源）`raw/sources/ai/2026-11-23-coding-agent-software-factory.md`，提供 AI 原生 SDLC 在**执行基础设施层**的实现路径：用现有 Coding Agent + 持久任务库 + 执行器 + 仓库现成 CI，把"提交后检查/修复/PR 跟进"由后台执行器持续跟完，人只决定最后合并。其"人守闸门"（合并/部署/凭据/费用留人）、按提交验收（检查与批准绑定具体 commit，新提交后重核）、机制与策略分离（执行程序与提示词/模型/审查规则分版本管理）与本概念制品链闭环、人守闸门、配置享受代码同等待遇同向；是六阶段"构建→测试→部署"各环节的执行层落地，概念页见 [[software-factory]]。

- 2026-11-25 — 新增 AI-Native Engineering 信源（第 14 信源）`raw/sources/ai/2026-11-25-ai-native-engineering.md`，从**研发体系与资产层**印证本概念：六个 First 原则中，Verifiable First（AI 产出须自动化验证体系校验、需求-实现-测试不得同一 AI 自我闭环）直接呼应"瓶颈转移到验证"与"人守闸门"；Executable First（Spec 驱动生成代码/测试/部署）与 Spec-Driven 印证制品链"规范驱动执行"；Git First（需求/ADR/DSL/测试规格纳入版本管理）为"制品提交链即审计轨迹"提供基础设施表述。概念页见 [[ai-native-engineering]]。

- 2026-11-26 — 新增业务需求专家 Agent 信源（第 15 信源）`raw/sources/ai/2026-11-26-end-to-end-business-requirement-agent.md`，提供**完整八阶段需求研发闭环**的一手实践样本：需求进入→澄清（门 1）→方案（门 2）→实现与内部质量（门 3，TDD+pre-push hook 硬卡）→CR 协同→独立环境验收→发布观察→结项蒸馏。其制品链（requirements→plan→diff+测试→CR→验收证据→结项沉淀）、人只在关键节点确认的闸门分布、「上线不是终点、观察期无异常才结项」的收尾纪律与本概念同向；双层记忆（项目记忆 feature 分支 + 长期 wiki master、结项蒸馏回写）是"知识当缓存、受控写回"的工程实例。概念页见 [[business-requirement-agent]]。

## Open Questions（开放问题）

- 各打法的先行/滞后指标只有口径、无公开前后对照数据，实际成效待第三方验证。
- 打法与 Anthropic 产品栈（托管设置、Claude Security/Tag 等 beta 能力）深度绑定，向其他 Agent 栈的迁移路径尚无信源确立。
- 意图存活率、闸门等待时长等指标的合理阈值：当前信源未确立。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-anthropic-ai-native-sdlc-handbook.md`
- Source: `raw/sources/ai/2026-10-17-ai-coding-delivery-evolution.md`（印证：制品链↔交付状态机、人守闸门↔on the loop；补充交付质量指标与证据链五要素）
- Source: `raw/sources/enterprise/2026-10-20-huolala-ai-coding-workflow.md`（印证：千人规模 SDD 产线/spec 治理/FPY 度量/主从双 Agent 评审，国内大厂一手案例）
- Source: `raw/sources/architecture/2026-10-31-ai-coding-eight-stage-workflow.md`（第 4 信源：孔明八阶段验收工作流——验收项原子化、规范装配自检、验证快照、脚本核对完成、评分算法；国内自研平台执行流程实例）
- Source: `raw/sources/ai/2026-10-30-alibaba-ai-native-dev-handbook.md`（第 5 信源：阿里多团队 AI Native 实践——「主战场在验证与环境」核心论断、三案例演进路径、约束 vs 假设 Spec 新写法、阿姆达尔定律实证；国内大厂一手案例）
- Source: `raw/sources/ai/2026-10-31-coding-agent-ai-native-workflow.md`（第 6 信源：个体开发者视角的 AI 原生研发工作流——架构先行、规约工程+上下文工程、五要素模型、Assistant→Agent、验证护城河、人类责任铁律）
- Source: `raw/sources/enterprise/2026-11-04-ai-native-team-org-reconstruction.md`（第 7 信源：Spec 为唯一真实来源、MCP 连接层、业务决策变更自动同步所有依赖方含 Agent；组织层重述）
- Source: `raw/sources/ai/2026-11-20-acceptance-agent-opt.md`（第 8 信源：OPT 平台后端验收 Agent——编码后的接口级验收回路、多层证据链、硬阻塞/软失败；验证环节瓶颈的工程实例，数字为作者自报）
- Source: `raw/sources/ai/2026-11-20-deepseek-harness-loopforge-voice.md`（第 9 信源：LoopForge SOP 编排——Agent/Script/Human gate 节点、DAG 主干、门禁打回、复盘评分）
- Source: `raw/sources/ai/2026-11-20-gaode-ad-linglingqi.md`（第 10 信源：高德 Dev Loop 契约驱动、自主执行≠自主授权）
- Source: `raw/sources/ai/2026-11-20-sdd-spec-driven-dev.md`（第 11 信源：SDD 规范驱动开发——三大基线、实例化五步骤、PLAN/CODE 两模式、规范先行人兜底；见 [[spec-driven-development]]）
- Source: `raw/sources/enterprise/2026-11-20-taobao-ai-native-rd.md`（第 12 信源：淘海外 AI Native——编码提效≠端到端提效的国内大厂实证、Agent 驱动双流程、估时降低 50% 团队自报口径）
- Source: `raw/sources/ai/2026-11-23-coding-agent-software-factory.md`（第 13 信源：软件工厂——Coding Agent 交付流水线的执行基础设施实现、按提交验收、机制与策略分离；AI 原生 SDLC 在执行层的具体落地，见 [[software-factory]]）
- Source: `raw/sources/ai/2026-11-25-ai-native-engineering.md`（第 14 信源：AI-Native Engineering 六个 First 原则——Verifiable First 印证瓶颈转移到验证、Executable First/Git First 印证规范驱动执行与制品链可追溯；见 [[ai-native-engineering]]）
- Source: `raw/sources/ai/2026-11-26-end-to-end-business-requirement-agent.md`（第 15 信源：业务需求专家 Agent 八阶段闭环——三道质量门、TDD+pre-push hook 硬门禁、双层记忆与结项蒸馏、独立环境验收与发布后观察；见 [[business-requirement-agent]]）

## Related Knowledge（相关知识）

- [[ai-native-sdlc-playbook|Anthropic AI 原生 SDLC 实施手册（信源页）]]
- [[ai-coding-delivery-evolution|AI 写代码越来越快，研发交付系统该怎么演进？（信源页）]]
- [[huolala-ai-coding-workflow|货拉拉 AI Coding 流程化落地（信源页）]]
- [[ai-native-organization|AI 原生研发组织]]
- [[alibaba-ai-native-dev-handbook|阿里巴巴 AI Native 研发实践手册（信源页）]]
- [[acceptance-agent|验收 Agent（AI 生成代码的验收）]]
- [[opt-platform|OPT 平台（One Person Team）]]
- [[spec-driven-development|规范驱动开发（SDD）]]
- [[2026-11-20-sdd-spec-driven-dev|代码都被AI写了，那规范是AI写，还是人来写？（信源页）]]
- [[2026-11-20-taobao-ai-native-rd|淘宝天猫海外技术的AI Native研发范式升级实践与思考（信源页）]]
- [[software-factory|软件工厂（概念页）]]
