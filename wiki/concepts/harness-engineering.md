---
id: wiki-concept-harness-engineering
type: concept
title: Harness Engineering（Agent 执行系统工程）
status: active
created: 2026-10-27
updated: 2026-10-29
confidence: high
tags:
  - concept
  - ai-agent
  - harness
sources:
  - raw/sources/ai/2026-10-27-harness-engineering-11-agents-study.md
  - raw/sources/ai/2026-10-28-agent-harness-framework-selection.md
  - raw/sources/ai/2026-10-28-agent-loop-context-management.md
related:
  - wiki/concepts/agent-loop.md
  - wiki/concepts/context-management.md
  - wiki/concepts/mcp.md
  - wiki/concepts/agent-sandboxing.md
  - wiki/concepts/agent-evaluation.md
  - wiki/entities/learn-harness-engineering-course.md
  - wiki/decisions/harness-selection-deepagents.md
  - wiki/entities/deepagents.md
---
# Harness Engineering（Agent 执行系统工程）

## Definition（定义）

Harness Engineering 关心的是：如何让模型在真实的软件环境里持续行动、获得反馈、遵守边界、并把结果交付出来。可用 `Agent ≈ Model + Harness` 理解分工（不是性能公式）：模型提出计划和动作；Harness 组织上下文、调用模型、执行工具、控制权限、维护状态，并向用户报告结果。

## Why It Matters（为什么重要）

同一个模型接入不同 Coding Agent，工作体验差异巨大（持续推进 vs 反复搜索、编译失败后能否定位、长对话中是否忘记约束）。这些差异主要来自模型周围的执行系统而非模型本身。Harness Engineering 是连接模型能力与软件工程的学科：一次工具调用是否可靠、一段历史如何压缩、中断后如何继续、一份修改凭什么被判定为完成，都属于它的设计范围。

## Core Characteristics（核心特征）

七个观察面（划清职责用，不必对应七个独立服务）：

1. **执行循环**：如何推进任务、何时停止、异常与取消处理
2. **模型适配**：不同 API、消息格式、模型能力与缓存机制
3. **工具系统**：动作表达、参数校验、可靠返回
4. **上下文与记忆**：哪些信息进模型、哪些状态长期保存
5. **权限与隔离**：任务允许做什么、执行环境实际能做什么
6. **多 Agent 协调**：分工、并发限制、结果合并与冲突处理
7. **扩展机制**：Skills、Hooks、协议与外部服务接入

## Structure（结构）

长程任务信息分三层管理：

| 层次 | 内容 | 管理重点 |
|---|---|---|
| 工作上下文 | 当前消息、相关代码、近期结果 | 控制预算，保留决定下一步所需信息 |
| 任务状态 | 目标、约束、决策、进度、待办 | 可查询、可更新、可恢复 |
| 持久知识 | 稳定项目规范、已确认经验 | 记录来源、版本、适用范围、失效条件 |

安全四层职责：请求校验 → 授权决策 → 执行约束 → 审计恢复。第四项是可追踪/纠错能力，不是阻止越权的强制边界。

## How It Works（运作方式）

从最小系统走向可靠交付的演进路径（信源第十节）：

1. 先建可靠单 Agent 基线（最小循环+模型适配+必要工具+基本权限/隔离/超时/取消/日志/验收）
2. 用真实失败驱动状态与恢复能力（任务状态、压缩、检查点、恢复核对），不为架构完整提前实现全部模块
3. 基线暴露出检索/工具发现/吞吐问题时再评估混合检索、延迟加载、Skills、多 Agent
4. 评测用 B0~B5 单变量实验隔离组件贡献（固定模型版本、任务集、预算、权限、重试规则）

关键纪律：**记录事件 ≠ 可安全重放事件**——外部写入用幂等键、查询确认或人工处理；不确定是否成功的动作进"结果待核对"状态。压缩摘要不许扭曲事实（"计划测试"不能变成"测试通过"）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-loop|Agent Loop]]：Harness 的"执行循环"观察面即 Loop 层；Loop 是 Harness 的控制核心子集。
- [[mcp|MCP]]：扩展机制面的一部分——连接工具与上下文的协议，但不是完整 Agent 运行时或隔离机制。
- [[agent-sandboxing|Agent 沙箱隔离]]：权限与隔离面的实现手段；审批 ≠ 沙箱（审批决定放行，沙箱限制可达范围）。
- [[agent-evaluation|业务 Agent 全生命周期评测]]：B0~B5 单变量评测是可落地到该评测体系的实验设计方法。

### Dependencies（依赖项）

- 模型 API（消息格式/工具调用约定）、执行环境（沙箱/容器）、持久化（状态与审计记录）。

### Distinctions（区分）

- **Harness vs Framework**：Framework 提供构建 Agent 的抽象，Harness 强调实际执行系统；能力可重叠可组合（LangChain 官方把 Deep Agents 定义为 Agent Harness，用 LangGraph 支持持久执行）。"样本中 0/11 直接用通用框架"推不出"真正的 Harness 都不用框架"。
- **Skills vs MCP vs ACP**：Skills=打包任务说明（本身不授权限）；MCP=连接工具/资源/上下文（非运行时）；ACP（Agent Client Protocol）=规范客户端与 Coding Agent 的交互（非 Agent 间协作协议——后者见 [[a2a-protocol|A2A]]）。
- **极简循环 vs 完整产品**：Mini-SWE-Agent 百行核心达 SWE-bench Verified 74%（项目自报），但真实复杂度来自故障、权限、资源与交互——类似 TCP Echo Server vs 生产服务。

## Evolution（演进）

- 2026-10-27 — 新建，信源为《Harness Engineering》论文（11 系统源码研究）的架构解读文章。wiki 此前已有 Harness 产品实例（[[aibox|AiBox]]、[[ep-harness|EP-Harness]]、[[deepseek-harness|DeepSeek Harness]]）与课程实体（[[learn-harness-engineering-course|Learn Harness Engineering]]），本页补上概念层定义。

- 2026-10-29 — 新增组装视角信源 `raw/sources/ai/2026-10-28-agent-loop-context-management.md`（知乎《Agent》系列第 3 篇）。其 harness 六件套（messages 数组、工具注册、模型配置、循环控制与终止条件、上下文管理、事件流）与本页观察面互补：第 3 篇把"上下文与记忆"观察面展开成 [[context-management|上下文管理]] 独立概念页（裁剪/压缩/隔离三手段、两条铁律），并以 Claude Code 官方分层裁剪行为（先清旧工具输出、再总结对话）为该观察面提供落地实例。

- 2026-10-29 — 新增选型信源 `raw/sources/ai/2026-10-28-agent-harness-framework-selection.md`（知乎《Agent》系列第 5 篇）。其"harness 八件套"（loop+终止、工具注册、权限/HITL、持久化、上下文管理、子 agent、MCP、可观测）与本页七个观察面互证且更偏交付清单；"harness 即插件"的 Claude Code 三层图（运行时/插件能力/用户输入）与 2026-10-29 新增第 3 篇的"harness 六件套"（messages、工具、模型配置、循环控制、上下文管理、事件流）互补印证——八件套偏交付清单、六件套偏组装视角，共同收敛到本页观察面。`Model + Harness = Agent` 与 `Agent ≈ Model + Harness` 表述一致；选型结论落成决策页 [[harness-selection-deepagents|Harness 选型决策：首选 deepagents]] 与实体页 [[deepagents|deepagents]]。

## Open Questions（开放问题）

- 论文原始统计口径与当前产品能力的时差（快照为历史版本）？
- 平台化（Codex app-server 模式）下 Skills/Hooks/会话/权限语义跨宿主无损迁移的边界？

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-27-harness-engineering-11-agents-study.md`
- Source: `raw/sources/ai/2026-10-28-agent-harness-framework-selection.md`（印证：harness 八件套 vs 七观察面；选型决策树）
- Source: `raw/sources/ai/2026-10-28-agent-loop-context-management.md`（组装视角：harness 六件套；Claude Code 上下文分层裁剪实例）

## Related Knowledge（相关知识）

- [[harness-engineering-11-agents-study|从 11 款 Agent 的源码研究，看懂 Harness Engineering（信源页）]]
- [[learn-harness-engineering-course|Learn Harness Engineering 课程]]
- [[aibox|AiBox]]、[[ep-harness|EP-Harness]]、[[deepseek-harness|DeepSeek Harness]]
- [[harness-selection-deepagents|Harness 选型决策：首选 deepagents]]
- [[deepagents|deepagents]]
