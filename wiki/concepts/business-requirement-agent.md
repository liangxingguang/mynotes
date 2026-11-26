---
id: wiki-concept-business-requirement-agent
type: concept
title: 业务需求专家 Agent（端到端需求研发闭环）
status: active
created: 2026-11-26
updated: 2026-11-26
confidence: medium
tags:
  - concept
  - AI
  - Agent
  - 研发体系
  - 系统设计
sources:
  - raw/sources/ai/2026-11-26-end-to-end-business-requirement-agent.md
related:
  - wiki/concepts/ai-native-sdlc.md
  - wiki/concepts/acceptance-agent.md
  - wiki/concepts/spec-driven-development.md
  - wiki/concepts/agent-memory-system.md
  - wiki/concepts/coding-agent-knowledge-base.md
  - wiki/sources/2026-11-26-end-to-end-business-requirement-agent.md
---
# 业务需求专家 Agent（端到端需求研发闭环）

## Definition（定义）

业务需求专家 Agent 不是「更聪明的代码生成器」，而是一套把需求研发过程中的上下文组织、工具调用、人工确认、验收证据与反馈沉淀组织成闭环的 Agent 系统：让 Agent 能基于组织好的上下文自主推进需求从进入、澄清、方案、实现、CR、验收、发布到结项沉淀的完整流程，人只在关键节点确认。其立论基础是：AI 写代码已不再是主要瓶颈，真正贵的是代码之外的串联成本（上下文切换、平台编排、取证与经验回收的人工投入）。

## Why It Matters（为什么重要）

需求从 PRD 到上线要经过澄清、方案、实现、CR、验收、发布观察、结项沉淀等环节，代码生成只是其中最标准化的一段。若各环节的 AI 能力散落在不同对话、工具与命令里，最终负责串起来的还是人，人工介入频次越高，链路越容易被上下文切换、经验差异与时间占用拖住。本概念把「串联」本身系统化：上下文按阶段组织、工具按阶段调用、反馈留痕回收，结项蒸馏使每个需求成为下一次交付的知识积累，形成自我成长的复利回路。

## Core Characteristics（核心特征）

1. **三个工程化问题为设计起点**：上下文要能组织（需求材料 + 长期业务知识）、工具要能串联（Aone/CR/SLS/HSF/监控/钉钉文档等平台能力）、反馈要产生复利（不留在聊天里）。
2. **四层架构**：上下文输入层（按阶段拉取，不一次塞 prompt）→ 业务专家编排层（判断当前阶段、下一步动作与人工确认点）→ 工具执行层（按阶段调用平台能力）→ 反馈学习层（结项沉淀稳定知识、skill 改进候选、归档一次性材料）。四层是「事实输入→阶段判断→工具落地→反馈回收」的闭环，不是并列模块。
3. **三道质量门**：需求澄清门（结构化 requirements，人确认整体表述而非零散回答）、技术方案门（方案阶段定清验收方式/测试策略/配置 schema）、内部质量门（TDD 驱动 + pre-push hook 硬卡 diff-to-test 映射、PMD、内部 review）。
4. **质量门禁工程化硬卡**：门禁不靠提示词自觉，而是通过 git pre-push hook 注入检查，不通过直接拒绝 push——从「Agent 应该做」变成「不做就推不上去」。
5. **双层记忆结构**：项目记忆仓（按需求拉 feature 分支，积累 requirements/plan/progress/CR 评论/验收证据）+ 长期 wiki 仓（恒在 master）；过程事实先留项目记忆，经结项审视与人工确认才选择性蒸馏回长期 wiki，避免噪声污染。
6. **反馈留痕**：CR 评论、milestone 回刷带 commit/CR link 与验证证据，让反馈成为结项素材；评论协作最密集的阶段是澄清与方案，而非写代码。
7. **真实证据验收 + 上线后观察**：独立项目环境用 HSF 泛化调用、SLS 日志、监控核对正例/反例/回归，验收证据可回读；发布后持续回读日志与指标，观察期无异常才结项，主预发部署与线上发布始终由人工确认。

## Structure（结构）

**横向四层架构**：

| 层 | 回答的问题 | 职责 |
|---|---|---|
| 上下文输入层 | Agent 靠什么理解业务 | 按阶段拉取组织长期业务知识、当前需求材料、代码事实与运行证据 |
| 业务专家编排层 | 下一步该做什么 | 判断需求处于澄清/方案/实现哪一阶段、哪些点必须停等人确认、证据不足时回退补上下文还是请求人工介入 |
| 工具执行层 | 具体动作怎么落地 | Aone、Code/CR、配置平台、SLS/HSF、监控、钉钉文档按阶段作为可调用能力 |
| 反馈学习层 | 下次能不能更好 | 结项时把稳定知识沉淀到长期 wiki/codemap、流程问题变 skill/prompt 改进候选、一次性材料归档 |

**纵向八阶段闭环**（每阶段按需调用横向各层）：

| 阶段 | 关键动作 | 产出/门禁 |
|---|---|---|
| 需求进入 | 组织上下文快照（Aone 工作项、钉钉 PRD、issue 评论 + 长期业务知识） | 上下文快照；仅事实源缺失或材料冲突时人工介入 |
| 需求澄清（门 1） | superai-clarify 生成结构化 requirements（目标行为/非目标边界/验收标准/风险/待确认问题），写项目记忆 feature 分支、push 建 CR | 人确认 requirements 整体表述；确认前不进方案与实现 |
| 技术方案（门 2） | superai-plan 编写技术方案；方案阶段定清验收方式、测试策略、配置 schema（tjx-cli/工作台 CLI 取证校验）；走 CR | 人确认 plan（人工确认最密集处）；未确认方案不进编码 |
| 实现与内部质量（门 3） | superai-execute TDD 驱动编码；pre-push hook 硬卡 diff-to-test 映射、PMD/lint、覆盖率；superai-code-review 结构化 review | 门禁自动执行，不通过拒绝 push |
| CR/Issue 协同 | Agent 读 unresolved 评论→修改→新 commit→回复 resolve；语义/范围变更回到 requirements/plan 重新确认；Aone milestone 回刷带证据 | 反馈留在平台可追溯，成为结项素材 |
| 验收验证 | 独立项目环境部署 feature 分支，HSF 泛化调用 + SLS 查询 + 监控/Sunfire 核对正例/反例/回归 | 验收证据写入 progress/verification 文件可回读 |
| 发布与观察 | Agent 协助准备变更材料/风险评估/回滚预案；发布动作人工确认执行；发布后回读日志与指标 | 观察期无异常才结项 |
| 结项沉淀 | superai-finish 编排 closeout：稳定知识→长期 wiki/codemap（CR 确认）、流程问题→skill/prompt 候选、一次性材料→closeout raw log | feature 分支合并回主干，长期 wiki 变更独立 CR 审阅 |

## How It Works（运作方式）

- **上下文不一次塞满**：需求进入时先组装「需求材料 + 长期业务知识」的初始快照，后续 requirements、plan、progress、验收证据在流程推进中逐步产生，不需要进入阶段就备齐；起点歪了，后面每一步都在放大偏差。
- **requirements 是生成物而非读取物**：它由 Agent 基于需求材料与业务知识在澄清阶段生成，是项目记忆的第一份文件；plan、progress、验收记录沿同样模式：每阶段在已有上下文之上产出新过程产物，再反过来成为下一阶段的基础。
- **TDD 的正确用法**：先按 plan 中已定的验收标准与业务行为写测试，让测试定义「什么是对的」，再让实现满足测试；反对先写代码再补只验证「代码能跑通」的覆盖率装饰测试。
- **硬门禁的实现方式**：PMD 校验与单元测试覆盖率检查通过 git pre-push hook 绑定到 push 流程，Agent 执行 `git push` 时 hook 自动触发检查——质量门禁从建议性约束变为不可绕过的工程卡口。
- **反馈的双用途**：CR 评论与 issue 对话既服务当次需求推进，又作为结项时系统性回看分析的素材（哪些澄清反复出现、哪些代码模式被反复指出、哪些人工介入本可自动化）。
- **验收证据化**：验收从「人肉点一下」变为「Agent 用可回读的证据证明结果」；证据写入 progress/verification 文件，CR 审阅与结项时可引用。
- **结项三问**：哪些知识稳定（业务规则/系统边界/验收规范/排障经验，进长期 wiki）、哪些流程可改进（skill/prompt 迭代候选）、哪些材料只需归档（一次性实现细节/临时调试记录，留 closeout raw log 作审计底稿）；每类都需人工确认才写入。

## Relationships（关系）

### Related Concepts（相关概念）

- [[ai-native-sdlc|AI 原生 SDLC]]：本概念是 AI 原生 SDLC 在「业务需求承接」这一完整链路上的实例——制品链（requirements→plan→diff+测试→CR→验收记录→结项沉淀）、人守闸门、闭环自我供给均同向；本信源为其第 15 信源。
- [[acceptance-agent|验收 Agent（AI 生成代码的验收）]]：本系统的「验收验证」阶段即验收 Agent 的落地形态——独立环境真实调接口、多层证据（HSF 调用/SLS 日志/监控指标）确认结果，并保留人工确认发布边界。
- [[spec-driven-development|规范驱动开发（SDD）]]：requirements 与 plan 作为机器可执行的 Spec，确认后成为实现、测试、验收的共同基准，与 SDD「规范先行、人兜底」同构。
- [[agent-memory-system|Agent 记忆系统]]：双层记忆结构（项目记忆仓 feature 分支 + 长期 wiki master）是记忆系统的工程实例——过程事实与稳定知识分流、结项蒸馏控制写回。
- [[coding-agent-knowledge-base|Coding Agent 知识库（域—场景—知识建模方法）]]：长期 wiki 承担「域—场景—知识」建模后的稳定知识层，项目记忆承担场景内过程事实，两者生命周期分开管理。

### Dependencies（依赖项）

- 平台工具链：Aone（需求/CR/milestone）、Code/CR、配置平台（天机星 tjx-cli、工作台 CLI）、SLS、HSF、监控/Sunfire、钉钉文档——工具按阶段可被 Agent 调用是闭环成立的前提。
- 运行平台：Multica（独立 issue 工作区上下文隔离、Agent-skill 绑定、多运行时与沙箱），使需求可持续推进而不依赖本地开发机在线。
- 质量基础设施：git pre-push hook 注入 PMD 与覆盖率检查，是内部质量门成为硬卡口的机制前提。

### Distinctions（区分）

- 与[[ai-assisted-requirements-analysis|AI 辅助需求分析]]的区分：后者是 AI 当副驾驶辅助人做需求分析（拆解/查漏/变更影响），人仍是主操作者；本概念是 Agent 端到端承接需求研发全流程，人只在关键节点确认。
- 与单点 Coding Agent 的区分：不追求编码速度，目标是把代码之外的串联成本系统化；编码只是八阶段中最标准化的一段。

## Evolution（演进）

- 2026-11-26 — 自立。单一信源（微信公号 · 森叶，淘天集团-用户&内容技术团队，团队自述已在真实业务需求跑通澄清→方案→实现→验收→结项沉淀）：四层架构、三道质量门、三仓库上下文设计、TDD+pre-push hook、反馈留痕、独立环境验收、结项蒸馏，以及接入成本/度量体系/Agent Team 三项后续规划。置信度 medium，机制细节与「已跑通」为作者自述，待其他信源印证。

**规划方向（信源自述，尚未落地验证）**：

- **降低接入成本**：当前首次接入成本偏高，卡在鉴权与运行时初始化——不少集团内平台只支持网页授权登录，未适配 Agent 的命令行沙箱环境；随各平台补齐 CLI/API 鉴权会自然缓解。
- **Agent 效果度量**：需要可观测的度量基线判断每轮 skill/prompt 迭代是改进还是退化——人力投入（人工介入次数/评论轮次/修正比例是否下降）、需求质量（方案返工率/验收一次通过率）、线上稳定性（问题数/回滚次数）、协作效率（Aone 与 Multica 双事实源同步成本、跨平台信息丢失率）。
- **从单 Agent 到 Agent Team**：单 Agent 对纯后端需求已够用；前后端协同的复杂需求需要前端/后端/测试多 Agent + 队长角色，上游还可加 PD Agent 生成 PRD——把人工介入最密集的需求澄清变为 Agent 间对齐、人只在关键歧义处裁决。关键设计约束是**共享长期 wiki、各自维护视角**。该框架已在数据方向试点（数据专家 Agent 采用相同方法论做离线数据开发/报表/分析）。拆分原则：不按流程步骤机械切分，而看是否真存在独立判断、独立产物、并行执行和责任隔离的需要，验证不足不急于提前铺设。

## Open Questions（开放问题）

- 「已在真实业务跑通」的覆盖范围与量化收益：信源未给需求数量、提效数字或对照基线，实际成效待第三方验证。
- 三道质量门的人工确认点选择逻辑（哪些判断必须人、哪些可全自主）在信源中只有示例，无系统化判定规则。
- 项目记忆向长期 wiki 蒸馏的「稳定知识」判定标准与人工确认流程细节未展开。
- Agent Team 的队长角色职责边界、多 Agent 冲突裁决机制尚无落地细节。
- 平台强绑定阿里系内部工具链（Aone/Multica/HSF/SLS），跨技术栈可迁移性未讨论。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-26-end-to-end-business-requirement-agent.md`（全文：三个工程化问题、四层架构、纵向八阶段闭环 3.1–3.8、现有问题与后续规划 4.1–4.3；微信公号团队自述单信源，正文自 Assets 采集稿逐字收录）

## Related Knowledge（相关知识）

- [[2026-11-26-end-to-end-business-requirement-agent|如何搭建一个端到端业务需求专家 Agent（信源页）]]
- [[2026-11-20-acceptance-agent-opt|AI 10分钟写完代码，你2小时还在验？用验收Agent补上最后一公里（信源页）]]
- [[2026-11-20-taobao-ai-native-rd|淘宝天猫海外技术的AI Native研发范式升级实践与思考（信源页）]]
- [[2026-11-24-weixin-fcd-full-cycle-developer|半年用AI写需求，我终于不用给AI当测试了（信源页）]]
