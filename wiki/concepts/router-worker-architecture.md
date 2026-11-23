---
id: wiki-concept-router-worker-architecture
type: concept
title: Router/Worker 双层架构
status: active
created: 2026-11-02
updated: 2026-11-23
confidence: medium
tags:
  - concept
  - ai-agent
  - architecture
sources:
  - raw/sources/ai/2026-11-02-superagent-design.md
  - raw/sources/ai/2026-11-02-weixin-superagent-architecture-teardown.md
  - raw/sources/ai/2026-11-05-multi-agent-control-shift.md
  - raw/sources/ai/2026-11-23-pi-minimal-superagent.md
related:
  - wiki/concepts/super-agent.md
  - wiki/concepts/event-driven-agent.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/context-management.md
  - wiki/concepts/ticket-task-persistence.md
  - wiki/concepts/task-board-coordination.md
  - wiki/concepts/advisor-on-demand-consultation.md
  - wiki/topics/multi-agent-collaboration-architecture.md
  - wiki/entities/pi.md
---
# Router/Worker 双层架构

## Definition（定义）

将"维护全局连续性"与"高并发执行"拆分到两个层级的会话组织方式：常驻的 Router 层统一承接人类交互与全局协调，上下文隔离的 Worker 层并发执行具体任务。这是连续性与吞吐量根本权衡（Trade-off）的解法。

## Why It Matters（为什么重要）

单 Session 上下文连续但串行低吞吐；独立 Session 高吞吐但上下文割裂、交互混乱。双层架构在底层接管上下文管理与并发执行，在用户侧淡化 Session 的存在，使 Session 成为系统实现细节而非用户认知负担。

## Core Characteristics（核心特征）

1. **Router 层常驻全局**：充当全局序点（Sequence Point）、协调点和记忆；不直接执行具体任务，只负责人类交互与任务分派，甚至可不配 Bash 工具。
2. **Worker 层上下文隔离**：挂载完整执行工具，专注单一任务，配能力最强的模型；不直接与人类交互，向 Router 汇报状态。
3. **批处理（Batching）**：Router 上一轮推理期间积压的 Trigger 在下一轮一并处理，Prefill 阶段并行计算，积压越多单个决定分摊推理时间越低。
4. **与 Agent Team 的区别**：Agent Team 的 Team Lead 深入任务细节、高频协调成员；Router 层只处理任务间高层关联，不介入单任务内部拆解。
5. **极简实现可落地**（2026-11-23 信源）：Pi 作 Router、Coding CLI 作 Worker、tmux 作持久 Session 载体即可跑通——Router 不亲自编码、派发独立 Session 后台执行，长耗时工具调用不阻塞交互、不同任务上下文互不污染；tmux 只借 Session 与日志作可观察执行载体，本身不提供任务语义、状态管理或依赖关系。

## Structure（结构）

### Router 层

- 单个常驻 LLM Session 作为核心实现（可内部多层过滤或水平切分）
- 积压 Trigger 合并进一次 LLM API 调用（长输入、短输出）
- 压测：Trigger 速率 1→40 条/分钟，平均 batch 1.0→2.8，单请求 2.5s→3.9s，单个决定分摊推理时间 6.4s→1.6s

### Worker 层

- 各 Worker 上下文隔离、独立推进任务
- 同层 Worker 通常不需直接通信；冲突通过订阅同一 Thread 自行发现解决
- Worker 内部可再创建 Subagent 或本身即 Agent Team，对 Router 透明
- **WorkerSlots 人跟进优先**（原型拆解信源）：人的跟进可使用普通并发上限之外的额外名额，唤醒已有工作的优先级高于启动新工作；额外名额用满后仍需等待（拆解文第四节）
- **observe/auto/明确请求三路径接单**（原型拆解信源）：系统从讨论里自行推断的任务默认 `observe` 模式（记录本来会接下什么，先不启动执行）；启用 `auto` 后按预写规则评估；人的明确请求另有处理路径（拆解文第四节）

## How It Works（运作方式）

连续性与吞吐量权衡：切分粒度越细，Router 并发吞吐越高，但分片间记忆与上下文连续性越低。全局记忆问题解决前这一权衡始终存在。

多任务并发时，Worker 独立推进，共享工作环境（如同一 Pull Request）的冲突通过订阅 Thread 让各 Worker 收到相同事件通知而自行解决，少数跨任务协同由 Router 中转。

## Relationships（关系）

### Related Concepts（相关概念）

- [[super-agent]]：双层架构是 Super-agent 的核心组织方式
- [[event-driven-agent]]：Trigger 的批处理与订阅直通依赖双层架构
- [[agent-loop]]：Router/Worker 各自是 Agent Loop 的实例
- [[context-management]]：Router 全局上下文与 Worker 隔离上下文的管理

### Dependencies（依赖项）

- 事件路由机制（[[event-driven-agent]]）

### Distinctions（区分）

- **双层架构 vs Agent Team**：后者面向单任务内角色协作，前者面向多任务并发协调
- **Router 批处理 vs 普通批量请求**：Router 的批处理是上一轮积压 Trigger 自动合并，非主动攒批

## Evolution（演进）

- 2026-11-02 — 新建，信源为 DeepSeek Harness 团队架构探索文。
- 2026-11-02 — 新增「架构师」公众号原型拆解信源（第 2 信源）：补上 WorkerSlots 人跟进额外名额与唤醒优先、observe/auto/明确请求三路径接单、批处理压测细节（批次 1.0→2.8、单请求 2.5s→3.9s，Prefill 并行分摊）、恢复前先查目录/Git/GitHub 再决定是否重做外部操作。
- 2026-11-05 — 新增得物技术信源（第 3 信源）：印证并补充 Master Agent 模式——中心节点理解目标、拆解、路由、汇总，控制流清楚、权限/预算/超时集中管理；风险是任务变复杂后膨胀成"超级 Agent"（既要理解业务又要维护调度器/状态机/异常处理），且"下一步该叫谁"的判断随并行度上升越来越沉重——这正是双层架构把 Router 层职责限定在任务间高层协调的动机。巡检案例给出规避手段：入口中心只做组件级路由，组件内规划/证据汇总/完整性检查下放 Inspector（详见 [[multi-agent-collaboration-architecture]]）。由此交叉链接 [[task-board-coordination]]、[[advisor-on-demand-consultation]]。
- 2026-11-23 — 新增知乎专栏「用 Pi 实现极简 Super Agent」信源（第 4 信源）：给出双层架构的可运行极简实现——Pi 常驻为 Router（收指令/理解任务/调度，不亲自编码），Coding CLI（pi-coding-agent / Opencode CLI）作 Worker，tmux 提供持久 Session 承载 Router/Gateway/Worker，任务派发到独立 Session 后台运行。补上远程链路（Telegram Bot → Gateway WebSocket → Pi Router）与 VM 隔离边界（隔离运行环境而非文件，共享 Workspace 下 Worker 读写直接作用于宿主机），以及五个结构化扩展方向（Task Registry / Git Worktree / 确定性检查前置 / 任务结果协议 / 并发与事件路由）。见 Core Characteristics 增补。

## Open Questions（开放问题）

- Router 层水平切分的触发条件与粒度（信源第 8.1 节）
- 同层 Worker 何时需要直接通信、采用何种协作拓扑（第 8.1 节）
- 长程记忆作为可扩展性瓶颈（第 8.1 节）

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-02-superagent-design.md`
- Source: `raw/sources/ai/2026-11-02-weixin-superagent-architecture-teardown.md`（WorkerSlots/observe-auto/批处理压测/恢复核实）
- Source: `raw/sources/ai/2026-11-05-multi-agent-control-shift.md`（Master Agent 模式印证：中心膨胀风险与组件级路由规避手段）
- Source: `raw/sources/ai/2026-11-23-pi-minimal-superagent.md`（极简可运行实现：Pi 作 Router / Coding CLI 作 Worker / tmux 作 Session 载体 + 五个扩展方向）

## Related Knowledge（相关知识）

- [[superagent-design|Super-agent 设计探索（信源页）]]
- [[weixin-superagent-architecture-teardown|架构拆解：DeepSeek 刚发布的 Super-agent（信源页）]]
- [[2026-11-05-weixin-multi-agent-control-shift|多 Agent 架构的三次反转（信源页）]]
- [[2026-11-23-pi-minimal-superagent|用 Pi 实现极简 Super Agent（信源页）]]
- [[multi-agent-collaboration-architecture|多 Agent 协作架构与控制权下沉（主题页）]]
- [[task-board-coordination|任务看板（共享状态协作）]]
- [[super-agent]]
