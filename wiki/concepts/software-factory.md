---
id: wiki-concept-software-factory
type: concept
title: 软件工厂（Software Factory）
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - concept
  - coding-agent
  - architecture
  - ai-native
sources:
  - raw/sources/ai/2026-11-23-coding-agent-software-factory.md
  - raw/sources/ai/2026-11-26-ai-code-review-fallback.md
related:
  - wiki/concepts/durable-execution.md
  - wiki/concepts/ai-native-sdlc.md
  - wiki/concepts/task-run-step-event-model.md
  - wiki/concepts/retry-governance.md
  - wiki/concepts/agent-state-separation.md
  - wiki/concepts/acceptance-agent.md
  - wiki/concepts/spec-driven-development.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/quality-fallback-strategy.md
---
# 软件工厂（Software Factory）

## Definition（定义）

软件工厂是把 Coding Agent 的研发流程工程化为**可持续运转的交付流水线**的架构实践：一项任务在提交代码之后，仍由后台执行器持续跟进检查、修复、PR 跟进，直到交出可供人合并的交付物。它把"已经提交"变成一项**持久待办**，前台会话关闭后工作不丢，失败能继续，需要人时能明确停下。

## Why It Matters（为什么重要）

Coding Agent 写代码的环节已成熟，但"提交之后"的工作——读 CI 日志、处理审查意见、修复后重检、遇到产品问题停下等人——若仍靠人一趟趟转交，Agent 写得越快，待跟进的工作越多，生产力增益会被后续人工跟进吃掉。软件工厂的核心命题是：**让任务在会话结束后仍有人跟进，在失败后能继续，在需要人时能明确停下**，从而把 Agent 的生产力从"写代码"延伸到"提交后全链路"。

## Core Characteristics（核心特征）

1. **最小起步，复用现成组件**：一个现有 Coding Agent + 持久任务库 + 执行器 + 仓库现成 CI，先跑通"检查失败→自动修复"一轮，再逐步扩展，不要求一开始就建完整平台。
2. **三角色分工**：Overseer（终端内理解目标、拆任务、协调 Worker）→ Worker（独立 Git worktree 实现）→ Daemon（后台接手提交后的检查/修复/PR 跟进）。交接点是把提交变成绑定精确 Commit SHA 的持久化 Job。
3. **四类记录支撑恢复与追踪**：Task（目标/验收/依赖/进度）、Job（提交 SHA/流程配置版本）、一次运行（执行者/起止/退出原因/日志）、检查结果（SHA/基线/规则版本/结果）。同一份代码可重跑，修复后是新提交，恢复时系统知道接哪项任务、检查哪版代码。
4. **领取原子性与租约**：选中 Job、改状态、登记运行编号放在同一事务；多执行器用租约+续租，回写核对运行编号，拒绝旧执行覆盖新结果。
5. **外部动作必须可重复**：创建 PR 中途退出会重复，重试前按分支名查已有 PR；远端操作核对任务归属与当前版本，租约过期不等于旧进程已停。
6. **按提交验收**：检查与批准绑定具体 commit，新提交后重新核对，不留一个永远有效的"测试通过"；用 `gh pr merge --match-head-commit` 约束合并。
7. **机制与策略分离**：执行程序（机制）相对稳定，提示词/模型/审查规则（策略）进版本管理，可用历史 PR 样本沙箱回放，对比换模型、改提示词的代价。

## Structure（结构）

最小架构收在四个组件：**现有 Coding Agent**（提供实现能力，经非交互入口调用）、**持久任务库**（记录 Task/Job/运行/检查结果四类记录）、**执行器**（准备目录、调用 Agent、运行检查、跟进 PR）、**仓库现成 CI**（承接检查）。输入目标和验收条件，输出对应提交、检查结果与待合并 PR，由人决定最后合并。

搭建按三阶段往前接：① 先让执行器在一个工作目录调用 Agent、运行检查、把失败交回去，完成一轮修复；② 保存每次执行，处理中断重启、重复触发和外部动作重试；③ 接上 PR 反馈与人工回答，让任务能在等待后继续。

**各 Agent CLI 的非交互入口**（无交互≠全权限，CLI 返回成功不能代替测试结果）：

| Coding Agent | 非交互入口 | 接入要点 |
| --- | --- | --- |
| Gemini CLI | `gemini -p "任务说明" --output-format json` | JSON 含回答与用量；`stream-json` 可逐行输出工具调用 |
| OpenCode | `opencode run "任务说明"` | 默认连接/启动共享后台服务，需区分命令退出与服务生命周期 |
| Cursor Agent | `agent -p "任务说明" --output-format json` | Print 模式按权限配置执行，需批准未获允许的动作会被拒绝 |
| GitHub Copilot CLI | `copilot -p "任务说明"` | 可用 `--allow-tool`/`--deny-tool` 配置权限，任务结束退出便于按次登记 |

## How It Works（运作方式）

**持久执行**：Worker 推到本机 bare 仓库，每次 push 在 SQLite 生成绑定精确 Commit SHA 的持久化 Job，Daemon 在临时 worktree 取出该版本、执行仓库配置的流程、推 GitHub 并跟进 CI/审查。独立 Daemon 非唯一选择，CI/托管工作流亦可承接持续执行（[[harness-engineering|Harness Engineering]] 官方文章即含自审→审查→修改→响应反馈直至合并的循环）。

**检查与修复流程**：领取任务→调用 Agent 实现并登记提交 SHA→执行仓库检查保存结果→① 代码检查失败则保存证据、修复后检查新提交；② 执行受阻则记录原因、按类型重试或等待处理；③ 检查满足条件则创建/更新 PR、跟进远端 CI 与审查。修复须有停止条件（单次超时/最大轮数/任务总预算）；基础设施类故障（依赖下载失败、测试环境超时）重试而非改代码，重试用指数退避+抖动，服务返回 `Retry-After` 时按其等待（见 [[retry-governance|重试治理]]）。

**领取与恢复**：状态机 `queued → running → passed/failed`，另有 `retry_wait`（临时故障）、`superseded`（旧 Job 被新版本替代）、`waiting_human`（人工等待）。每类子进程配 Supervisor 管重启与回收，停止时清理整个进程组。worktree 只隔离 Git 目录，端口/数据库/凭证需另行隔离。多执行器用租约限制归属，**租约过期只说明系统允许接手，旧进程可能仍在运行**，远端操作前须核对任务归属与当前版本。

**按提交验收**：检查记录关联提交 SHA、基线和规则版本，旧结果保留、新提交进入检查后当前交付状态随之更新；CI 未跑完继续等待，必要检查未实际执行按仓库规定判断，不能只数绿色标记。`continue_on_error: true` 让 lint/测试失败后仍继续到审查和修复，但能否最终交付需另核全部必要条件。GitHub 分支保护可撤销过期批准、要求最近可审查推送由他人批准，merge queue 验证最新基线。

**策略回放**：仓库 `archdev.json` 决定事件对应流水线与提示词/模型，每个 Job 固定实际采用的配置版本，避免排队期间改配置导致前后步骤规则不一。规则升级另审查再用于后续任务，不直接用改后规则判断它自己。保存历史 PR 的问题、PR head 与参考修复，沙箱重放后由独立评分器检查是否修好、有无回归。

**人工介入三步**：① 问题先持久化再通知人（Calvin 曾 67 次暂停未通知人）；② 答案关联到具体问题，以评论写回；③ 恢复时把答案带进下一轮输入。合并/部署/凭据/费用等留给人；Calvin 留给自己的六类是凭据、费用、线上基础设施（含合并）、不可逆操作、产品决策、任务明确要求本人批准的事项；Runway 按 PR 风险分流，迁移/认证/密钥/CI/部署配置等关键区域仍需负责人批准。

## Relationships（关系）

### Related Concepts（相关概念）

- [[durable-execution|持久执行]]：软件工厂的持久执行机制（提交绑定 SHA 的 Job、四类记录、领取与恢复）是 [[durable-execution]] 这一通用崩溃恢复框架在 Coding Agent 交付场景的具体落地；本页的 Job/运行记录对应其"先写存储、后可见"与 fencing 不变量。
- [[ai-native-sdlc|AI 原生 SDLC]]：软件工厂是 AI 原生 SDLC 在**执行基础设施层**的实现路径——它不重述制品链与治理，而是解决"提交后谁跟进"的执行问题，与制品链驱动闭环（[[ai-native-sdlc]]）互为表里。
- [[task-run-step-event-model|Task/Run/Step/Event 领域模型]]：本页的 Task/Job/运行/检查四类记录与该四元分离模型同构，均要求任务、执行尝试、检查结果各有身份与生命周期，避免共用一个 ID 导致状态错乱。
- [[retry-governance|重试治理]]：本页的修复重试（指数退避+抖动、Retry-After、停止条件、基础设施故障分类重试）是重试治理在软件工厂执行器场景的实例。
- [[agent-state-separation|Agent 状态分离]]：本页的状态机（queued/running/passed/failed/retry_wait/superseded/waiting_human）与领取原子性、拒绝旧执行覆盖，是状态分离在交付流水线的体现。
- [[acceptance-agent|验收 Agent]]：按提交验收、多层证据核对与 [[acceptance-agent]] 的接口级验收回路同向，均强调"变绿≠解决"、验收绑定具体版本。
- [[spec-driven-development|规范驱动开发（SDD）]]：软件工厂的任务边界（目标/预期/保持不变/验证/交付）与 SDD 的规范先行人兜底呼应，验收条件进入目标。
- [[harness-engineering|Harness Engineering]]：软件工厂的执行器/Daemon 是 Agent Harness 在持续交付场景的延伸，复用其自审→审查→修改→合并的循环。

### Dependencies（依赖项）

- 持久任务库（[[durable-execution|持久执行]]）：没有持久化与恢复机制，提交后工作无法在前台关闭后继续。
- 仓库现成 CI：检查与验收依赖 CI 提供的检查结果与远端约束。
- Coding Agent 的非交互入口：执行器需能程序化调用 Agent 实现修复。

### Distinctions（区分）

- 与**交互式 Coding Agent**（如 Claude Code 单会话写码）不同：软件工厂的关键不在"写代码"，而在"提交后的持续跟进"，把交互进程拆为 Overseer/Worker/Daemon，前台关闭后由 Daemon 接力。
- 与**CI/CD 流水线**不同：传统 CI/CD 处理已提交代码的检查与部署，软件工厂把"提交"本身变成持久待办，Agent 提交后仍持续处理 CI/审查反馈、修复、再提交，是带 Agent 自适应能力的持续交付循环。
- 与**通用任务调度系统**（如 [[async-task-system-design|异步任务系统]]）不同：软件工厂的 Job 绑定精确 Commit SHA、按提交验收、外部动作须可重复，是面向代码交付语义的特化，而非通用异步任务。

## Evolution（演进）

- 2026-11-23：据 Calvin Grunewald 公开的 archdev 软件工厂设计与 Runway 软件工厂工程复盘，整理用现有 Coding Agent 搭建软件工厂的最小架构。核心机制：`archdev push` 把提交变成绑定 SHA 的持久 Job；四类记录支撑恢复追踪；领取原子性+租约防旧执行覆盖；按提交验收防"批准后代码又变"；机制与策略分离支持回放比较。Runway 量化：11 月上半月抽查 100 个已合并 PR 中 78 个无人工提交，首次批准等待中位从 9 月 2.3 小时降至 11 月中旬约 5 分钟，10 月合并 PR 中 38% 由云端 Agent 推进（官方自报口径，未经第三方验证）。Kun Chen 合批实践使每日 PR 从约 200 降至约 30，交付反而更多（个人实践口径）。当前为单信源综述，confidence: medium。

- 2026-11-26 — 新增《不审代码，靠什么兜底》信源（第 2 信源）`raw/sources/ai/2026-11-26-ai-code-review-fallback.md`，补入**工厂式质量控制三招**：N-sigma 统计抽检（资深工程师当质检员校准流水线健康度、察觉智能体系统性偷懒或漂移）、安灯拉绳停线（线上事故时按影响范围停掉相关智能体合码、稳住现场锁状态）、蟑螂法则（单点 bug 触发全库同类扫描，沉淀为编译器规则/Linter/性能回归测试）。三招与本页「机制与策略分离」「按提交验收」互补，属流水线质量管理层，概念层见 [[quality-fallback-strategy]]。

## Open Questions（开放问题）

- 多执行器下租约续租的完整协议与远端操作去重机制：Calvin 提到云端任务租约但未展开，需自行补齐。
- 策略回放的样本规模与评分器可信度：Calvin 披露的一轮比较仅 19 个案例，反例需谨慎外推。
- 软件工厂的端到端提效数据：Runway/Kun 的量化均为自报口径，缺乏第三方独立验证与前后对照。
- 自动合并接入后核对与执行之间的时间差：执行器核对 head 与请求发出之间 PR 可能已更新，需更严格的条件约束。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-23-coding-agent-software-factory.md`（全文：最小架构、三角色分工、四类记录、领取与恢复、按提交验收、策略回放、人工介入、并发扩容；综合 archdev 与 Runway 两份实践）
- Source: `raw/sources/ai/2026-11-26-ai-code-review-fallback.md`（第 2 信源：工厂质量控制三招——N-sigma 统计抽检、安灯拉绳停线、蟑螂法则沉淀为 Linter/回归测试；质量管理层补充）

## Related Knowledge（相关知识）

- [[2026-11-23-coding-agent-software-factory|如何用 Coding Agent 构建自己的软件工厂？（信源页）]]
- [[durable-execution|持久执行（概念页）]]
- [[ai-native-sdlc|AI 原生 SDLC（概念页）]]
- [[task-run-step-event-model|Task/Run/Step/Event 领域模型（概念页）]]
- [[retry-governance|重试治理（概念页）]]
- [[agent-state-separation|Agent 状态分离（概念页）]]
- [[acceptance-agent|验收 Agent（概念页）]]
- [[spec-driven-development|规范驱动开发（概念页）]]
- [[harness-engineering|Harness Engineering（概念页）]]
