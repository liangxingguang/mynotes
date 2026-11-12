---
id: wiki-entity-agentscope
type: entity
title: AgentScope
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: high
tags:
  - entity
  - ai-agent
  - framework
sources:
  - raw/sources/ai/2026-11-12-durable-agent-cloud-long-running.md
related:
  - wiki/concepts/durable-execution.md
  - wiki/entities/agentcore.md
---
# AgentScope

## Overview（概览）

Agent 开发框架，提供 HarnessAgent 持久执行内核，将模型推理、上下文、工具和会话管理组织在一起，通过 Durable 执行内核管理整个运行过程。模型生成、工具调用和业务流程都是持久任务，由任务状态驱动 Agent 循环，进程重启后从已保存的阶段继续。其持久执行协议与具体框架无关，同样适用于其他 Agent 框架。

## Identity（身份信息）

- Type（类型）: Agent 开发框架（含持久执行内核 HarnessAgent）
- Organization（所属组织）: 开源框架
- Role（角色）: Agent 运行时与持久执行内核
- Status（状态）: 活跃

## Important Facts（重要事实）

- **HarnessAgent**：将模型推理、上下文、工具和会话管理组织在一起，通过 Durable 执行内核管理整个运行过程。HarnessAgent 管理模型与工具协作，Session 管理持久状态与提交顺序，任务调度器推进可运行阶段，Storage 保存执行数据。
- **Session 六类对象**：Conversation（对话记录及上下文范围）、Entry（不可变会话记录）、Document（带类型和版本的结构化业务状态）、Task（带阶段/检查点/终态的持久状态机）、Submission（应用提交及处理结果）、Commit（一组关联变化的原子提交）。
- **Task 六态状态机**：pending（已持久创建待运行）/ running（正在执行某阶段）/ waiting（等待指定任务结束）/ sleeping（等待时间点）/ completing（结果已决定、子任务未收尾）/ terminal（已结束）。
- **原子提交协议**：取得 Session 提交顺序 → 事务草稿准备关联变化 → 校验并冻结写集合 → Storage 原子保存 → 采纳已持久化新状态 → 更新视图通知等待者调度后续任务。串行化同一 Session 内的状态提交，模型请求和工具执行在提交事务之外推进。
- **工具恢复两阶段**：call 阶段（解析工具、校验参数、保存最终参数/重放策略/执行意图）与 execute 阶段（意图已保存、结果未确认的恢复入口）。只有调用时与恢复时的工具策略均为 safe 才重放，否则记录 interrupted。
- **自定义任务**：通过注册 Document 和 Task 把工具内部业务阶段纳入持久执行机制；提供 allSettled（等待全部子任务结束汇总）和 failFast（子任务失败时请求其他子任务停止）两种汇合策略。
- **恢复流程**：重新打开同一 Storage → 恢复 Conversation/Entry/Document/Task/Submission → 检查任务类型/版本/阶段处理器 → 启动任务调度器（按状态分别处理 pending/running/waiting/sleeping/completing/terminal）→ 每次状态变化通过同一条原子提交序列。
- **Storage 与唤醒**：Storage 接口原子保存和读取执行记录，存储实现与任务语义分离（本地持久存储或远程后端）；resume() 启动任务调度器，onWake 接收变化、持久安排下一次唤醒。
- **Registry**：注册任务、工具和扩展定义；存储中保存状态、身份和定义版本，重新打开时内核核对任务类型和版本，定义缺失或无法迁移时保留原状态并报告阻塞原因。

## Products / Projects（产品／项目）

- [[agentcore|AgentCore]]（阿里云云托管平台，与 AgentScope 框架层协作）

## Relationships（关系）

- [[durable-execution|持久执行（Durable Execution）]]：AgentScope 的 HarnessAgent 是持久执行内核的实现载体（第 11 信源）
- [[agentcore|AgentCore]]：平台层，AgentScope 框架负责"从哪里继续、怎样继续"，AgentCore 负责"状态保存在哪、由哪个实例继续"

## Timeline（时间线）

- 2026-11-12 — 经知乎专栏信源收录，记录 HarnessAgent 持久执行内核的 Session/Task/Commit 设计与工具恢复协议。

## Current Understanding（当前认知）

AgentScope 的 HarnessAgent 提供了一套与框架无关的持久执行协议：Session 统一管理六类持久对象，Task 状态机把调用栈中的进度变成显式阶段，原子 Commit 让记录、文档与任务一起生效。其核心设计原则是"模型和工具调用发生在提交事务之外"——调度器根据已提交状态选择可执行任务，任务处理器运行阶段后再提交结果。该协议同样适用于其他 Agent 框架，是 Durable Execution 概念的具体实现之一。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-12-durable-agent-cloud-long-running.md`（HarnessAgent 持久执行内核、Session 六类对象、Task 状态机、原子提交顺序、工具 call/execute 两阶段、自定义任务汇合策略、恢复流程与 Registry）
