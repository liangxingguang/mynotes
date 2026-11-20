---
id: wiki-entity-loopforge
type: entity
title: LoopForge
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: medium
tags:
  - entity
  - ai-coding
  - orchestration
  - delivery
sources:
  - raw/sources/ai/2026-11-20-deepseek-harness-loopforge-voice.md
related:
  - wiki/entities/deepseek-harness.md
  - wiki/concepts/ai-native-sdlc.md
  - wiki/topics/ai-voice-platform-architecture.md
  - wiki/sources/2026-11-20-deepseek-harness-loopforge-voice.md
---
# LoopForge

## Overview（概览）

腾讯开源的自托管**团队研发工作台**，用 SOP（Agent 节点 + Script 节点 + 人工门禁）把需求变成可追溯、可复现、可验收的交付。核心思路"DAG 管主干，Agent 管节点，人管签字"。与 DeepSeek Harness 等编码执行器解耦组合，构成 AI 原生研发流水线的编排层。单信源，置信度中。

## Identity（身份）

- **性质**：腾讯开源的自托管团队研发工作台（团队交付编排平台）。
- **仓库**：https://github.com/tencent/loopforge
- **定位**：编排/门禁/追溯层——负责流程顺序、依赖、回退、人工审批，不负责节点内的编码执行。
- **运行形态**：Main Bot 在 Docker 沙箱中检出仓库、调度项目角色并提交 PR；另有本地轻量模式 LoopForge Local。

## Important Facts（重要事实）

- **SOP 节点类型**：Agent（节点内分析与编码）、Script（确定性构建/测试/lint，"不需要 AI 的地方不用 AI"）、Human gate（人工审批或打回）、Sub-SOP、Preview build。
- **执行器支持**：支持 10 种编码 Agent CLI 作为执行器，其中包括 DeepSeek Harness，且 DeepSeek Harness 已内置在 Docker 镜像中，使用个人密钥；LoopForge 允许每个角色独立选择执行器、模型、规则、Skills 和 MCP 工具。
- **核心分工**：LoopForge SOP 管确定性 DAG、不让 Agent 自由跳步；节点内分析与编码由执行器（如 dsh）按角色 Prompt + Skills 执行；构建/测试/lint/SIPp 压测由 Script 节点完成；关键决策与验收由人（Human gate）签字。
- **腾讯内部实践数据**：合入 836 个 MR，一次通过率 54.8%，经门禁打回返工后终态成功率 95.4%（InfoQ）。
- **复盘引擎**：每次 SOP 运行结束后，回溯全链路轨迹，给出 0~100 健康度评分和改进处方（腾讯云开发者社区）。
- **门禁可打回**：门禁失败可打回到指定上游步骤，也可从任意节点重试或重跑。
- **LoopForge Local**：本地轻量模式，DeepSeek Harness 经 Portable Edition 支持；安装 `npx -y loopforge-cli@latest skills install dsh`，入口 `/devflow "<request>"`；本地运行产物位于 `artifacts/{task_slug}/`。
- **部署安全**：Docker socket 访问权限的默认部署模式，官方说明面向可信团队而非不可信多租户；建议独立主机部署、内网访问、HTTPS 反代、关闭公开注册。
- **运维闭环**：可用 AI 定时任务做每日巡检——读 Prometheus 指标与日志 → 聚类异常 → 自动建需求单 → 触发 Bug-fix SOP → 人工确认合入。

## Products / Projects（产品／项目）

- LoopForge（自托管团队工作台）
- LoopForge Local（本地轻量模式，Portable Edition）

## Relationships（关系）

- **与 DeepSeek Harness 的分工**：LoopForge 是编排/门禁层，DeepSeek Harness 是编码执行器；二者解耦，执行器可替换、任务体系不被锁定在某个产品中。见 [[deepseek-harness|DeepSeek Harness]]。
- **与 AI 原生 SDLC 的印证**：SOP 编排 + 人工门禁 + 复盘评分，是 [[ai-native-sdlc|AI 原生 SDLC]] 中"制品提交链 + 人守闸门"的一种工程化实现。
- **在 VoxForge 方案中的角色**：作为团队级交付编排平台，见 [[ai-voice-platform-architecture|AI 语音平台架构]] 与 [[2026-11-20-deepseek-harness-loopforge-voice|信源页]]。

## Timeline（时间线）

- 2026-11-17：VoxForge 方案文（版本 v1.0）将 LoopForge 定位为团队级交付编排平台，引用其 SOP 节点、执行器支持与腾讯实践数据。
- 2026-11-21：首次立页（基于上述信源）。

## Current Understanding（当前理解）

LoopForge 的价值在于把"AI 研发"从单点编码提升为**可编排、可追溯、可验收的团队交付流水线**：用确定性 DAG 锁流程、用 Script 节点承担确定性环节、用人工门禁守关键决策与验收、用复盘引擎沉淀改进。它与执行器解耦，是面对快速演化的编码执行器时降低被锁定的编排层。**解读**：其 95.4% 终态成功率依赖门禁打回返工机制，说明"一次通过率低"在严格门禁下可转化为高终态成功率，而非单纯的效率损失。

## Evidence（证据）

- 信源：`raw/sources/ai/2026-11-20-deepseek-harness-loopforge-voice.md`（第 2.2 节 LoopForge 定位、节点类型、腾讯实践数据、LoopForge Local；第 5.4 节角色定义；第 5.5 节 SOP 设计；第 6.3 节门禁；第 8.5 节运维闭环；第 12.2 节命令速查）。
