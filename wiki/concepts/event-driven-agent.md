---
id: wiki-concept-event-driven-agent
type: concept
title: 事件驱动 Agent
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
  - wiki/concepts/router-worker-architecture.md
  - wiki/concepts/context-management.md
  - wiki/concepts/agent-loop.md
---
# 事件驱动 Agent

## Definition（定义）

驱动 Agent 的主要输入不再是人类逐条键入的提示词，而是环境中的半结构化事件（Trigger）。Agent 监听并响应 Trigger，不必等人类下达指令才被动执行一次。这是 Super-agent 主动性的来源。

## Why It Matters（为什么重要）

环境事件流呈"高噪音、低触发率"特征。事件驱动让 Agent 从被动响应转向主动推进，配合过滤与路由机制在延迟和算力成本可控的前提下介入值得处理的事件。

## Core Characteristics（核心特征）

1. **Trigger 是环境事件**：群聊消息、邮件与日程提醒、代码审查评论、CI 运行结果等。
2. **两级过滤**：程序层策略（Fast Path，确定性代码快速准入）+ 语义层策略（Slow Path，LLM 判断是否需要行动）。
3. **订阅直通**：同一 Thread 后续事件由程序直通已订阅 Worker，不经 Router 转发（Fast Path）；未订阅事件仍由 Router 判断分派（Slow Path）。
4. **Thread 多对多订阅**：一个 Worker 可订阅多个 Thread，一个 Thread 可被多个 Worker 订阅，使多 Worker 在共享工作环境中自行发现冲突。
5. **投机执行**：据环境信号后台提前行动，结果有价值就交付、无价值就丢弃。

## Structure（结构）

Trigger 生命周期四问（信源第 3 节）：

1. **过滤**：两级策略（Fast Path 确定性代码 + Slow Path LLM）筛除噪音
2. **路由**：订阅直通（已订阅 Fast Path / 未订阅 Slow Path）
3. **上下文组织**：Inline & Spill + 链式召回（见 [[context-management]]）
4. **提前行动**：投机执行（Speculative Execution）

## How It Works（运作方式）

Fast/Slow Path 思想：大模型推理是灵活但高成本的 Slow Path，确定性高频判断固化为代码是低延迟低成本的 Fast Path。程序层针对事件来源、群组范围、白名单等直接准入检查，语义层作为自然语言扩展点方便提示词开关或新增策略。

投机执行示例：群内"静默复现并修复"策略——Agent 后台尝试复现并寻找修复方案，确认问题并找到简单修复才交付，否则保持安静。

## Relationships（关系）

### Related Concepts（相关概念）

- [[super-agent]]：事件驱动实现主动性
- [[router-worker-architecture]]：订阅直通依赖双层架构的 Router/Worker 划分
- [[context-management]]：Inline & Spill + 链式召回管理事件注入的上下文
- [[agent-loop]]：事件驱动改变 Loop 的输入驱动方式

### Dependencies（依赖项）

- 环境事件源（IM、邮件、CI、代码平台）
- 双层架构（[[router-worker-architecture]]）的 Router/Worker 划分

### Distinctions（区分）

- **事件驱动 vs 提示词驱动**：前者输入是环境事件，后者输入是人类逐条键入的提示词
- **订阅直通 vs Router 转发**：前者程序直通已订阅 Worker，后者经 Router 层调用工具转发

## Evolution（演进）

- 2026-11-02 — 新建，信源为 DeepSeek Harness 团队架构探索文。

## Open Questions（开放问题）

- 投机执行的边界与误触发风险（信源未展开）
- 事件过滤策略的演进与误判处理

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-02-superagent-design.md`

## Related Knowledge（相关知识）

- [[superagent-design|Super-agent 设计探索（信源页）]]
- [[super-agent]]
