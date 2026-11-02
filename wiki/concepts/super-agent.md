---
id: wiki-concept-super-agent
type: concept
title: Super-agent
status: active
created: 2026-11-02
updated: 2026-11-02
confidence: medium
tags:
  - concept
  - ai-agent
  - architecture
sources:
  - raw/sources/ai/2026-11-02-superagent-design.md
  - raw/sources/ai/2026-11-02-weixin-superagent-architecture-teardown.md
related:
  - wiki/concepts/router-worker-architecture.md
  - wiki/concepts/event-driven-agent.md
  - wiki/concepts/watchdog-control-loop.md
  - wiki/concepts/ticket-task-persistence.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/context-management.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/harness-engineering.md
  - wiki/entities/deepseek-harness.md
---
# Super-agent

## Definition（定义）

Super-agent 是打破 Agent 与单次手动会话绑定的 Agent 形态及其系统架构：Agent 成为一个能跨会话保持上下文、同时推进多项复杂任务且互不干扰的连续实体。其目标是把人类从 Session 管理中解放，上移到决策与验收。

## Why It Matters（为什么重要）

单任务上限取决于模型能力，多任务上限取决于人的注意力（一个人通常只能同时跟进 3-5 个活跃 Session）。现有 Agent 以单一 Session 为基本单位，并行工作时需手动切换并记住上下文。Super-agent 在底层接管会话管理与上下文同步，使人类摆脱 Session 管理负担。

## Core Characteristics（核心特征）

1. **连续**：用户在 IM、GitHub 等熟悉界面与它交互，感觉始终只存在一个 Agent，无需想"Session X 的上下文中是否有 Y 信息"；跨信道（IM→GitHub）能保持上下文连贯。
2. **高效**：交互响应迅速，并行高质量完成多个复杂任务，无需等上一个任务完成即可接受新指令。
3. **主动**：无需等待逐条指令，持续观察环境事件并主动推进值得处理的事项，不需要介入时保持安静。
4. **持久**：始终在线、直接接入真实工作环境，长期运行中遇异常自动恢复。

## Structure（结构）

五大模块支撑四特征（信源第 1、2-6 节）：

| 模块 | 对应特征 | 核心机制 |
| --- | --- | --- |
| 双层架构 | 连续 + 高效 | [[router-worker-architecture|Router/Worker 双层架构]]：Router 层常驻全局路由，Worker 层上下文隔离并发执行 |
| 事件驱动 | 主动 | [[event-driven-agent|事件驱动 Agent]]：Trigger + 两级过滤 + 订阅直通 + 投机执行 |
| 面向人的交互 | 连续 + 高效 | 异步 [[agent-loop|ReAct Loop]]（start/stop 全双工）+ 多信道适配 |
| 存算分离 | 持久 | 计算与状态分离 + 计算与执行环境分离（BYOM） |
| Watchdog | 持久 | [[watchdog-control-loop|Watchdog 外部控制回路]]：外部 Control Loop 监控基础设施与任务进展 |
| Ticket 持久化 | 持久 | [[ticket-task-persistence|Ticket 任务持久化模型]]：Assignment/Executor Session/Mandate 挂同一 Ticket，`ready` 释放名额、跟踪 PR 判结束 |

## How It Works（运作方式）

内部实例（基于 DeepSeek Harness 运行）：同一开发任务可在 IM 与 GitHub 之间连续推进；实例持续观察公共群聊，在无人 @ 的情况下主动定位根因并提交修复 Pull Request。

核心思想：把计算机系统经典设计（Fast/Slow Path、投机执行、存算分离、局部性）应用到 Agent 构建中，相似设计约束导出相似架构选择。

## Relationships（关系）

### Related Concepts（相关概念）

- [[router-worker-architecture]]：双层架构是 Super-agent 的核心组织方式
- [[event-driven-agent]]：事件驱动实现主动性
- [[watchdog-control-loop]]：外部控制回路保障持久与自愈
- [[agent-loop]]：异步 ReAct Loop 是面向人交互的基础
- [[context-management]]：Inline & Spill + 链式召回管理上下文注入
- [[durable-execution]]：存算分离与持久执行相关
- [[harness-engineering]]：Super-agent 是 Harness Engineering 的实例应用

### Dependencies（依赖项）

- 模型能力（多 Agent 协同、工具调用）
- 环境事件源（IM、邮件、CI、代码平台）

### Distinctions（区分）

- **Super-agent vs 单 Session Agent**：后者以单一 Session 为基本单位，前者跨会话保持上下文、并发执行
- **Super-agent vs Agent Team**：Agent Team 用于单任务内步骤拆解与角色协作，Team Lead 深入任务细节；Super-agent 的 Router 层只处理任务间高层关联与分派，不介入单任务内部拆解

## Evolution（演进）

- 2026-11-02 — 新建，信源为 DeepSeek Harness 团队架构探索文（微信公众号，作者 Yujia Qiao）。
- 2026-11-02 — 新增「架构师」公众号原型拆解信源（第 2 信源）：补上 Ticket 持久化模型（[[ticket-task-persistence]]）、Engine 事务先行 + SQLite Store + Effects/Outbox 工程细节、WorkerSlots 人跟进优先、observe/auto 接单三路径；实验再解读——基线中性提示下模型一次都没调 Subagent（改提示后才委派），去直通 Router 决定数 +30%、缓存 token +37%（开直通省约 27%），完成时间不变因 Router 未到吞吐瓶颈、省在推理开销。

## Open Questions（开放问题）

- Router 层水平切分粒度、Worker 间协作拓扑（信源第 8.1 节）
- 脱离 Session 后的人机协作与项目管理形式（第 8.2 节）
- 上下文边界划分与 A2A 协作（第 8.3 节）
- 安全与隐私：云端被攻破则端侧设备受威胁；凭据不能进入模型上下文（第 8.4 节）

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-02-superagent-design.md`
- Source: `raw/sources/ai/2026-11-02-weixin-superagent-architecture-teardown.md`（原型拆解：Ticket/Engine/WorkerSlots/observe-auto/实验再解读）

## Related Knowledge（相关知识）

- [[superagent-design|Super-agent 设计探索（信源页）]]
- [[weixin-superagent-architecture-teardown|架构拆解：DeepSeek 刚发布的 Super-agent（信源页）]]
- [[ticket-task-persistence|Ticket 任务持久化模型]]
- [[deepseek-harness|DeepSeek Harness]]
