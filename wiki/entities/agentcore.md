---
id: wiki-entity-agentcore
type: entity
title: AgentCore
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: high
tags:
  - entity
  - ai-agent
  - platform
sources:
  - raw/sources/ai/2026-11-12-durable-agent-cloud-long-running.md
related:
  - wiki/concepts/durable-execution.md
  - wiki/entities/agentscope.md
---
# AgentCore

## Overview（概览）

阿里云面向 AI Agent 的云端托管平台，提供 Harness 托管、会话管理、任务中断续接与节点恢复能力，帮助开发者将智能体应用稳定运行在云上。在已有托管能力基础上，通过共同的 Session Store、Brain–Hands 分离、Environment 与可靠调度，向更完整的 Agent as a Service 演进。与 AgentScope 框架层协作：框架负责"从哪里继续、怎样继续"，平台负责"状态保存在哪、由哪个实例继续"。

## Identity（身份信息）

- Type（类型）: 云端 Agent 托管平台
- Organization（所属组织）: 阿里云（Alibaba Cloud）
- Role（角色）: Agent 平台托管层（Harness 托管、状态托管、调度与恢复）
- Status（状态）: 活跃

## Important Facts（重要事实）

- **已有托管能力**：托管 Harness（OpenHarness）保留底层内核的推理、上下文和工具使用方式，由平台衔接其状态保存与恢复能力；支持任务中断后继续执行、从指定已保存执行节点恢复。
- **Session Store**：平台统一的持久基础，记录状态版本、保留检查点与结果引用、返回可查询的提交回执，恢复时提供一致状态集合；与可靠调度、事件流衔接，使任务既能被接续也能被重新观察。
- **状态层次表**：Harness 原生状态（上下文/消息/原生检查点，由框架适配层解释）/ 平台执行事实（输入受理/执行权/工具授权/等待条件/结果应用/终态，由 AgentCore 执行协调解释）/ 工具执行事实（原执行身份/物理进度/完整结果，由工具提供方或 Hands 衔接）/ 工作区与产物（文件/资源绑定/产物版本，由 Environment 承载）/ 用户可见视图（消息/进度/工具状态/最终结果，由业务应用解释）。五层分别存储，通过身份与版本建立关系。
- **一致性边界延伸**：从指定节点恢复走向细粒度 Durable，关键在于定义哪些事实必须一起保存、保存成功后才允许发生哪些后续动作。以工具调用为例，需保存 Harness 继续位置、固定工具参数、原生调用与平台任务关联、等待结果条件。三个进度分别保存：调用已被受理、工具已经完成、结果已进入 Harness 上下文。
- **Brain–Hands 分离**：Brain 管理推理与上下文，Hands 管理工具实际执行，通过已保存的调用身份、状态和结果协作。Brain 提交调用和等待条件后可释放执行资源，工具由独立机制继续推进，结果具备继续条件时由兼容 Brain 实例读取原状态、应用原结果。
- **Environment**：承担执行条件的描述与绑定——状态说明任务走到哪里，环境定义说明继续运行需要什么，调度机制决定由谁承接。分离架构中 Brain 与 Hands 可使用不同计算资源和生命周期。
- **Agent as a Service**：把连续性扩展到整个服务生命周期——用户离线、连接断开、实例替换，任务仍保有清晰身份、状态和后续安排。执行、观察和业务控制分别管理；长周期服务需共同管理检查点、关联结果、工作区和产物的保留范围。

## Products / Projects（产品／项目）

- [[agentscope|AgentScope]]（框架层，与 AgentCore 平台层协作）

## Relationships（关系）

- [[agentscope|AgentScope]]：框架层负责执行协议（从哪里继续、怎样继续），AgentCore 负责状态托管（保存在哪、由谁继续），两者通过存储与唤醒契约连接
- [[durable-execution|持久执行（Durable Execution）]]：AgentCore 是持久执行向平台层延伸的实现

## Timeline（时间线）

- 2026-11-12 — 经知乎专栏信源收录，记录 AgentCore 的 Harness 托管、Session Store、状态层次表、Brain–Hands 分离与 Agent as a Service 方向。

## Current Understanding（当前认知）

AgentCore 在已有的 Harness 托管与节点恢复基础上，通过共同的 Session Store 连接不同框架的原生状态与平台执行事实，把恢复节点延伸为执行过程中的一致性边界。Brain–Hands 分离让推理与工具拥有各自生命周期，Environment 为已保存状态提供继续执行的条件。其架构目标是从"某次运行可以恢复"走向"任务能够长期托管"——让业务任务持续存在，让计算资源围绕任务实际进度参与执行。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-12-durable-agent-cloud-long-running.md`（AgentCore 平台层设计：Harness 托管、Session Store、状态层次表、一致性边界、Brain–Hands 分离、Environment、Agent as a Service）
