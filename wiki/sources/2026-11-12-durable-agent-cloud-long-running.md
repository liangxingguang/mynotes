---
id: wiki-source-2026-11-12-durable-agent-cloud-long-running
type: source
title: Durable Agent 详解：如何让 Agent 在云端长期稳定运行
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: high
tags:
  - ai-agent
  - architecture
  - durable-execution
sources:
  - raw/sources/ai/2026-11-12-durable-agent-cloud-long-running.md
related:
  - wiki/concepts/durable-execution.md
  - wiki/entities/agentscope.md
  - wiki/entities/agentcore.md
---
# Durable Agent 详解：如何让 Agent 在云端长期稳定运行

## Overview（概览）

以"向五位客户发送通知邮件"为例，系统阐述 Agent 在云端长期运行所需的 Durable（持久可恢复执行）能力：会话恢复只保证对话连续，Durable 进一步保证任务执行连续——把任务进度、调用意图和执行结果可靠地保存在进程之外，在模型调用、工具执行等关键环节建立恢复边界。以 AgentScope 的 HarnessAgent 持久执行内核与阿里云 AgentCore 平台层为例，讲透任务状态机、原子提交、工具恢复协议与 Brain–Hands 分离设计。

## Key Facts（关键事实）

- 作者刘军，知乎专栏，2026-11-12 采集。
- Durable 四项保证：①已受理任务有稳定身份；②已确认工作可复用；③未完成工作有明确去向；④执行过程可被断线后重新观察。
- AgentScope Session 管理六类对象：Conversation（对话）、Entry（不可变记录）、Document（结构化业务状态）、Task（带检查点持久状态机）、Submission（应用提交）、Commit（原子提交）。
- Task 六态：pending / running / waiting / sleeping / completing / terminal。
- 原子提交顺序：取得提交顺序 → 事务草稿准备 → 校验冻结写集合 → Storage 原子保存 → 采纳 → 更新视图通知。
- 普通工具分 call（保存意图）与 execute（恢复入口）两阶段；只有工具声明 safe 才能重放，否则记录 interrupted。
- 自定义任务用 allSettled / failFast 汇合策略；每封邮件操作标识在外部调用前保存，绑定固定收件人与正文。
- 阿里云 AgentCore 状态层次表：Harness 原生状态 / 平台执行事实 / 工具执行事实 / 工作区与产物 / 用户可见视图，五层分别存储、通过身份与版本建立关系。
- Brain–Hands 分离：Brain 管推理与上下文，Hands 管工具实际执行，通过已保存的调用身份、状态与结果协作。

## Important Claims（重要论断）

### Claim 1：会话恢复 ≠ 任务恢复

会话记录只能说明模型提出过什么，无法证明工具内部完成了什么。"第四封邮件已被服务接受但结果未保存"时，无法判断应重发、跳过还是重做。Durable 以已提交的逻辑边界为恢复点，先读取已提交进度再决定复用、等待、核实或启动。

### Claim 2：原子提交覆盖 Harness 管理的数据，不覆盖外部动作

Commit 同时支持追加 Entry、修改 Document、创建或推进 Task、更新 Submission。但发邮件、访问外部数据库、执行 shell 命令仍是外部动作，需要业务系统提供幂等标识、原操作查询或补偿路径。框架不会自动让发送邮件变得幂等。

### Claim 3：恢复从已保存阶段的入口重新执行，不跳回崩溃前某一行

Task 保存任务类型与版本、输入、所属会话或父任务、当前状态和 checkpoint。恢复程序用任务类型找处理代码、用 checkpoint 确定从哪个阶段开始。一个阶段含多个不可重复外部动作时应继续拆分，单纯加 await 不增加持久恢复边界。

### Claim 4：框架与平台各司其职

框架负责"从哪里继续、怎样继续"（AgentScope 的 Session/Task/Commit），平台负责"状态长期保存在哪里、由哪个实例继续"（AgentCore 的 Session Store、调度、Environment）。两者通过存储与唤醒契约连接。

### Claim 5：Brain–Hands 分离提供独立接续条件，恢复粒度取决于业务检查点与外部确认能力

分离架构让推理实例在工具执行期间退出不影响已交接的工作。前三封回执可复用、第四封按原操作身份核实、第五封从尚未执行阶段继续。但工具不支持查询原操作或识别重复请求时，分离架构也不能自动消除"动作已发生、结果未确认"的窗口。

## Concepts Introduced（引入的概念）

- [[durable-execution|持久执行（Durable Execution）]]
- [[task-run-step-event-model|任务-运行-步骤-事件模型]]

## Entities Mentioned（提及的实体）

- [[agentscope|AgentScope]]
- [[agentcore|AgentCore]]

## Implications（影响／启示）

- Agent 框架的 Durable 能力正在从"会话持久化"向"任务级持久状态机"演进，进程崩溃后恢复的精度取决于任务拆分粒度与外部动作的确认能力。
- 平台层（AgentCore）与框架层（AgentScope）的分工清晰化：框架管执行协议，平台管状态托管与调度，为 Agent as a Service 提供了分层架构基础。
- 外部动作的幂等与可查询是业务系统的责任，持久机制无法凭空创造——任何 Durable 方案都需明确这一边界。

## Limitations（局限）

- 全文为单信源（知乎专栏），框架与平台的具体实现细节未提供代码级或测试级佐证。
- "AgentCore 已有 Harness 托管与节点恢复能力"的具体机制未展开，仅给出架构设计层面的讨论。
- 五封邮件故障恢复推演基于"邮件服务支持幂等受理与原操作查询"这一明确前提，未讨论不支持该前提时的替代方案。

## Related Knowledge（相关知识）

- [[durable-execution|持久执行（Durable Execution）]]（第 11 信源）
- [[agentscope|AgentScope]]
- [[agentcore|AgentCore]]
- [[task-board-coordination|任务看板（共享状态协作）]]

## Source（信源）

- `raw/sources/ai/2026-11-12-durable-agent-cloud-long-running.md`
