---
id: wiki-concept-router-worker-architecture
type: concept
title: Router/Worker 双层架构
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
related:
  - wiki/concepts/super-agent.md
  - wiki/concepts/event-driven-agent.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/context-management.md
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

## Structure（结构）

### Router 层

- 单个常驻 LLM Session 作为核心实现（可内部多层过滤或水平切分）
- 积压 Trigger 合并进一次 LLM API 调用（长输入、短输出）
- 压测：Trigger 速率 1→40 条/分钟，平均 batch 1.0→2.8，单请求 2.5s→3.9s，单个决定分摊推理时间 6.4s→1.6s

### Worker 层

- 各 Worker 上下文隔离、独立推进任务
- 同层 Worker 通常不需直接通信；冲突通过订阅同一 Thread 自行发现解决
- Worker 内部可再创建 Subagent 或本身即 Agent Team，对 Router 透明

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

## Open Questions（开放问题）

- Router 层水平切分的触发条件与粒度（信源第 8.1 节）
- 同层 Worker 何时需要直接通信、采用何种协作拓扑（第 8.1 节）
- 长程记忆作为可扩展性瓶颈（第 8.1 节）

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-02-superagent-design.md`

## Related Knowledge（相关知识）

- [[superagent-design|Super-agent 设计探索（信源页）]]
- [[super-agent]]
