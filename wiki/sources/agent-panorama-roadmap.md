---
id: wiki-source-agent-panorama-roadmap
type: source
title: Agent - 全景与学习路线地图（1）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - ai-agent
  - tutorial
sources:
  - raw/sources/ai/2026-10-28-agent-panorama-roadmap.md
---
# Agent - 全景与学习路线地图（1）

## Overview（概览）

知乎专栏《Agent》系列第 1 篇（全系列总纲）：用「控制流由谁掌握」划清普通聊天 / function calling / 自主 agent 三级台阶，逐帧拆解一次 tool call 的完整时序，论证为什么模型与工具之间必须垫一层编排层（harness），并给出 21 篇 / 8 个 Part 的学习路线图与自测方法，附最小 tool_use 验证脚本。

## Key Facts（关键事实）

- 三级能力阶梯的分水岭是**控制流归谁**，不是模型聪不聪明：第 0、1 级下一步写死在代码里，第 2 级由模型运行时自己决定（§1.1）。
- workflow vs agent 的原始定义出自 Anthropic《Building Effective Agents》：路径预先写死在代码里 = workflow；模型动态决定流程与工具使用 = agent（§1.2）。
- 「是否每步都问人」（人机协同）与「路径谁定」是两件独立的事——agent 可以每步停下来等确认，仍是 agent（§1.3）。
- 一次 tool call 六步：组装请求 → 模型返回 tool_calls 声明 → 宿主校验并真执行 → 结果回填 tool_result → 再问模型 → 输出答复；模型永不碰 HTTP/数据库，副作用全发生在编排层（§2）。
- OpenAI 最小定义：agent 四构件 = Instruction / Model / Tools / Loop——Tools 与 Loop 正是「聊天」与「agent」的分水岭（§3，引 OpenAI《A Practical Guide to Building Agents》）。
- 学习路线：21 篇 / 8 个 Part 围绕一个 demo（Go 后台 + RBAC + 多租户管理助手）演进，M1 手写最小 agent → M2 接真实后台 → … → P8 毕业（§4）。
- 自测三门槛：能讲清楚、能指出取舍（「什么时候不用它」）、能跑起来（§4.3）。

## Important Claims（重要论断）

### 模型只声明、宿主才执行

模型输出的是「意图」而非「执行」：它只产出结构化的 tool_calls 声明，所有真实世界副作用（HTTP、数据库、文件）都发生在编排层。文末动手脚本实测触发一条 `tool_use`，证明模型没有发出任何网络请求。

### agent 是一层亲手写的编排代码

模型有判断力没手脚，代码有手脚没判断力；agent 就是补这个缺口的编排层——像把 if/else 换成模型输出的 Controller。「agent 不是玄学」是本篇立场。

### 能上 workflow 就别上 agent

「自主」不免费：路径由模型决定意味着不确定、更贵、更难调。分界线不是「越自主越高级」，而是「任务路径能不能预先写死」（Anthropic 反复强调的选型原则）。

## Concepts Introduced（引入的概念）

- [[workflow-vs-agent|Workflow vs Agent（控制流分界）]]
- [[agent-loop|Agent Loop]]（感知→思考→行动→再感知的最简形态）
- [[harness-engineering|Harness Engineering]]（词表级定义，第 3 篇展开）
- [[pmta-framework|PMTA 框架]]（导航引用，第 2 篇正式定义）

## Entities Mentioned（提及的实体）

- Anthropic（《Building Effective Agents》workflow/agent 定义出处）
- OpenAI（《A Practical Guide to Building Agents》四构件定义）
- DeepSeek（本系列默认模型供应商，OpenAI 兼容端点）
- Claude Code / OpenHands / OpenClaw（harness 工程实例）

## Implications（影响／启示）

为全库 agent 主题提供术语地基：「自主 = 控制流归模型」「声明/执行分离」「编排层必然性」三条论断是后续所有 agent loop / harness / 工具协议讨论的前提。学习路线图（21 篇目录）可作为该系列信源的导航索引。

## Limitations（局限）

动手脚本未经作者环境实测（诚实声明，接口细节以官方 docs 为准）；词表中 MCP/subagent 等词仅导航引用。通义等部分参考条目作者未能逐字核验。

## Related Knowledge（相关知识）

- [[workflow-vs-agent|Workflow vs Agent（控制流分界）]]
- [[agent-loop|Agent Loop]]
- [[agent-classic-agent-theory|Agent - 经典 Agent 理论（系列第 2 篇信源页）]]
- [[agent-loop-context-management|Agent - agent loop 与上下文管理（系列第 3 篇信源页）]]
- [[agent-model-selection-reasoning|Agent - 模型选型与推理能力（系列第 4 篇信源页）]]

## Source（信源）

- `raw/sources/ai/2026-10-28-agent-panorama-roadmap.md`
