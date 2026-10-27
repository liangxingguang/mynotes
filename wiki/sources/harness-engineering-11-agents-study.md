---
id: wiki-source-harness-engineering-11-agents-study
type: source
title: 从 11 款 Agent 的源码研究，看懂 Harness Engineering
status: active
created: 2026-10-27
updated: 2026-10-27
confidence: high
tags:
  - AI
  - Harness
sources:
  - raw/sources/ai/2026-10-27-harness-engineering-11-agents-study.md
related:
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-loop.md
---
# 从 11 款 Agent 的源码研究，看懂 Harness Engineering

## Overview（概览）

基于论文《Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents — A Source-Code Study of Eleven Systems》（分析 11 个 Coding Agent、约 400 万行源码）的架构解读。核心命题：Agent ≈ Model + Harness，Harness 负责把模型决策转化为可靠执行。文章按七个观察面拆解 Harness，辨析 Skills/MCP/ACP 分工，并给出从最小系统走向可靠交付的演进路径与 B0~B5 单变量评测方案。

## Key Facts（关键事实）

- 研究样本统计（历史源码快照口径）：0/11 核心运行时直接用通用 Agent 框架；0/11 内置向量 Embedding 检索源码；9/11 支持 Skills；8/11 支持 MCP；6/11 支持 ACP
- Mini-SWE-Agent 约百行核心 Agent 报告 SWE-bench Verified 超 74%（项目自报成绩，非本文复现）
- Anthropic 2025 年多 Agent 研究系统报告：普通 Agent 成本约为聊天的 4 倍，多 Agent 约为 15 倍（非 Coding Agent 固定倍率）
- OpenAI 2026 年 8 月介绍 Codex app-server：通过客户端协议暴露线程/轮次/事件/审批，让应用复用运行时（Harness 平台化实例）
- Claude Code 官方文档：子 Agent 可继续委派，默认最多主会话下三层，深度与并发限制可配置

## Important Claims（重要论断）

### 把架构观察作为设计假设，把任务评测作为选择依据

源码研究的价值是揭示设计空间而非排名产品；论文未在统一模型/预算/环境下做跨系统性能比较。

### 检索先建可靠基线，向量检索不是对立面

先用关键词/符号/LSP 建立可验证基线；索引新鲜度是所有索引方案的共性问题；更准确的说法是"未发现内置代码向量召回"而非"这些 Agent 不检索增强"。

### 安全与验收必须从第一次执行就进入设计

审批 ≠ 沙箱（审批决定放行与否，沙箱限制执行后可达范围）；四层职责：请求校验→授权决策→执行约束→审计恢复；首版就应有安全基线，而非先跑任意写权限原型再补。

### 记录事件 ≠ 可安全重放事件

外部写入需幂等键/查询确认/人工处理；不能确定是否执行成功的动作进入"结果待核对"状态。

## Concepts Introduced（引入的概念）

- [[harness-engineering|Harness Engineering（Agent 执行系统工程）]]

## Entities Mentioned（提及的实体）

- Mini-SWE-Agent、Aider（repo map）、Claude Code、Codex（app-server）、LangChain Deep Agents、Omnigent（对照对象）

## Implications（影响／启示）

- 为 [[agent-loop|Agent Loop]] 的"Runtime vs Harness"区分提供了系统性注解：Harness = 模型连接 + 执行循环 + 上下文 + 工具 + 权限 + 状态 + 扩展的完整运行层
- B0~B5 单变量评测方案可直接服务 [[agent-evaluation|业务 Agent 评测]] 的实验设计
- 安全四层职责与 [[agent-sandboxing|Agent 沙箱隔离]] 的"能力限制"视角互补

## Limitations（局限）

- 统计数字是论文所检查的历史源码快照，不是市场采用率；Claude Code 部分依赖较早的非官方源码快照
- 约 400 万行含客户端/适配代码，不能全算作 Agent 核心循环
- 文章本身是二次解读（论文+官方文档），非一手研究

## Related Knowledge（相关知识）

- [[learn-harness-engineering-course|Learn Harness Engineering 课程]]
- [[aibox|AiBox]]、[[ep-harness|EP-Harness]]、[[deepseek-harness|DeepSeek Harness]]（Harness 产品实例）
- [[mcp|MCP]]、[[a2a-vs-mcp|A2A vs MCP]]（协议层区分参照）

## Source（信源）

- `raw/sources/ai/2026-10-27-harness-engineering-11-agents-study.md`
