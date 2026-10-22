---
id: wiki-entity-agent-lightning
type: entity
title: Agent Lightning
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - entity
  - ai
  - agent
  - rl
sources:
  - raw/sources/products/2026-10-14-ms-agent-lightning-rl-framework.md
related:
  - wiki/concepts/agent-loop.md
  - wiki/concepts/agent-evaluation.md
---
# Agent Lightning

## Overview（概览）

微软研究院开源的轻量级强化学习框架（约 3500 行代码），专门训练 AI Agent：让 Agent 直接在真实工具链、真实代码环境、真实浏览器中执行，用真实交互数据训练，而非在模拟器里训练。

## Identity（身份信息）

- Type（类型）: 开源强化学习框架（Agent 训练）
- Organization（所属组织）: 微软研究院（Microsoft Research）
- Role（角色）: 为现有 Agent 系统提供真实环境 RL 训练能力
- Status（状态）: 已开源（具体开源时间、仓库地址、license：未知，信源未给出）

## Important Facts（重要事实）

- 全框架约 3500 行代码，三个核心组件：Trainer、API Gateway、Rollout Controller。
- 现有 Agent 代码（LangChain、AutoGen、手写）零改动接入。
- 官方 Coding Agent 案例：6K 训练样本在 Qwen3.5-9B 上跑通端到端流程，SWE-bench Verified 从 41.8% 升至 56.4%（+14.6 个百分点）。

（以上均转述自知乎想法，未经一手信源核实，故 confidence 为 medium。）

## Products / Projects（产品／项目）

- 官方 Coding Agent 训练案例（SWE-bench Verified 基准）。

## Relationships（关系）

- [[agent-loop|Agent Loop]]：解读——Agent Lightning 训练的对象正是 Loop 中「提出下一步」的模型，训练数据来自 Loop 各轮的真实工具交互。
- [[agent-evaluation|业务 Agent 全生命周期评测]]：SWE-bench Verified 这类可自动判分基准既做训练奖励也做效果度量。

## Timeline（时间线）

- 2026-10-14 — 知乎想法推荐该框架并给出训练案例数字（采集日期；开源具体时间未知）。

## Current Understanding（当前认知）

单一三次信源（知乎想法），框架定位清晰但关键数字未核实；「从模拟器转向真实世界训练」的趋势判断值得跟踪，待一手信源（项目仓库/论文）确认后升级置信度。

## Evidence（证据）

- `raw/sources/products/2026-10-14-ms-agent-lightning-rl-framework.md`
