---
id: wiki-concept-ticket-task-persistence
type: concept
title: Ticket 任务持久化模型
status: active
created: 2026-11-02
updated: 2026-11-02
confidence: medium
tags:
  - concept
  - ai-agent
  - architecture
sources:
  - raw/sources/ai/2026-11-02-weixin-superagent-architecture-teardown.md
related:
  - wiki/concepts/super-agent.md
  - wiki/concepts/router-worker-architecture.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/event-driven-agent.md
  - wiki/entities/deepseek-harness.md
---
# Ticket 任务持久化模型

## Definition（定义）

Super-agent 原型中把"一项工作"抽象为 Ticket 持久对象的模型：跨多轮执行、跨多个入口（群聊话题 Thread + PR Thread）的同一项任务挂在同一个 Ticket 下，Ticket 保存输入与派工记录，并跟踪任务何时才算结束。执行可以停，Ticket 还在。

## Why It Matters（为什么重要）

Agent 任务常跨多轮、跨渠道（群聊追加需求、GitHub 评审、CI 通知）。若无持久任务对象，执行停止后上下文与"这件事还没完"的状态都丢失。Ticket 把"执行会话"与"工作项"解耦：Worker 会话可释放、可重启，Ticket 与订阅保留，任务状态不丢。这是 Super-agent 持久性特征（任务中途停了，联系还得保留）的落地载体。

## Core Characteristics（核心特征）

1. **Ticket 关联多 Thread**：群聊话题与 PR 是两个 Thread，Ticket 把它们与同一项修复关联，保存输入和派工记录（拆解文第三节）。
2. **Assignment / Executor Session / Mandate 三件套**：Assignment 记录这轮由谁执行；Executor Session 承载模型与工具调用；Mandate 留下接单的依据和范围。几轮执行挂同一 Ticket（拆解文第三节）。
3. **`ready` 释放名额、保留状态**：代码写好、PR 已提交，执行器报告 `ready`，先释放执行名额等评审；Ticket 与订阅仍保留，原型跟踪关联 PR，按关闭/合并及后续跟进规则判断任务何时结束（拆解文第三节）。
4. **Mandate 定范围，订阅不扩范围**：修复任务关注整个群聊话题可读新消息，但订阅本身不扩大工作范围（拆解文第四节）。
5. **恢复提示**：运行中断的任务给新 Assignment 加恢复提示，先检查目录、Git 历史和 GitHub，再决定是否重做外部操作（拆解文第三节）。

## Structure（结构）

Ticket 内部三件套（信源第三节）：

| 组件 | 职责 |
| --- | --- |
| Assignment | 本轮由谁执行（执行器指派） |
| Executor Session | 承载模型与工具调用的 DSH 会话 |
| Mandate | 接单依据与范围（凭什么接、做到哪） |

底层存储：`Store` 用 SQLite 保存事件、任务关系、接单决定、待执行动作和消息发送状态；`Engine` 先事务写任务再启动执行器（见 [[durable-execution]]）。

## How It Works（运作方式）

修复任务跨多轮执行：Router 分派 → Worker 执行（Assignment + Executor Session + Mandate 挂 Ticket）→ 提交 PR 报告 `ready` → 释放名额等评审 → 评审/CI 意见沿 Thread 订阅送达 → 同一 Ticket 下继续。任务结束判据不是"Worker 忙完"，而是关联 PR 按规则关闭/合并及后续跟进。

## Relationships（关系）

### Related Concepts（相关概念）

- [[super-agent]]：Ticket 模型是 Super-agent 持久性特征的落地载体
- [[router-worker-architecture]]：Router 分派、Worker 执行，Ticket 挂接两层
- [[event-driven-agent]]：Thread 订阅把后续消息送达同一 Ticket 的执行会话
- [[durable-execution]]：Engine 事务先行 + SQLite Store 是持久执行的 Super-agent 实现

### Dependencies（依赖项）

- 持久存储（SQLite Store）
- Thread 订阅机制（[[event-driven-agent]]）

### Distinctions（区分）

- **Ticket vs Session**：Session 是执行载体（会结束、可释放）；Ticket 是工作项（跨 Session 持久）。"Worker 这轮忙完了，修复这件事还没完"（拆解文第三节）。
- **Ticket vs 普通任务记录**：Ticket 绑定订阅与 PR 跟踪规则，任务结束由外部事件（PR 合并/关闭）驱动，而非仅内部状态机。

## Evolution（演进）

- 2026-11-02 — 新建，信源为「架构师」公众号对 DeepSeek Super-agent 原型 `dsh-superagent-prototype`（6337fc8）的机制级拆解。

## Open Questions（开放问题）

- Ticket 与 Watchdog（[[watchdog-control-loop]]）的交互：Watchdog 介入时如何写 Mandate 变更，拆解文未展开。
- 多 Worker 订阅同一 Ticket 时的写入冲突协调，拆解文仅提"共享文件、分支和写入顺序要另外协调"。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-02-weixin-superagent-architecture-teardown.md`（第三节：Ticket/Assignment/Executor Session/Mandate/ready/PR 跟踪）

## Related Knowledge（相关知识）

- [[weixin-superagent-architecture-teardown|架构拆解：DeepSeek 刚发布的 Super-agent（信源页）]]
- [[super-agent]]
- [[durable-execution]]
