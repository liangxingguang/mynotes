---
id: wiki-source-superagent-design
type: source
title: Super-agent 设计探索：迈向更自主的 Agent 系统
status: active
created: 2026-11-02
updated: 2026-11-02
confidence: high
tags:
  - ai-agent
  - architecture
sources:
  - raw/sources/ai/2026-11-02-superagent-design.md
---
# Super-agent 设计探索：迈向更自主的 Agent 系统

## Overview（概览）

DeepSeek Harness 团队（作者 Yujia Qiao）的架构探索文：针对"人只能同时跟进 3-5 个 Session"的瓶颈，提出 Super-agent——以 Router/Worker 双层架构、事件驱动（Trigger + 两级过滤 + 订阅直通）、异步全双工多信道交互、存算分离与端侧 daemon（BYOM）、外部 Watchdog 五大模块，实现连续、高效、主动、持久的 Agent 系统。消融实验显示双层架构完成时间显著优于单 Session + Subagent。核心思想是把计算机系统的经典设计（Fast/Slow Path、投机执行、存算分离）应用到 Agent 构建中。

## Key Facts（关键事实）

- 四特征：连续（跨信道上下文统一）、高效（并行并发）、主动（事件驱动、无需介入时保持安静）、持久（始终在线、异常自愈）
- 双层架构：Router 层常驻全局路由，只承接人类交互与任务分派（可不配 Bash 工具），积压事件批处理——压测 Trigger 速率 1→40 条/分钟，单个决定分摊推理时间 6.4s→1.6s；Worker 层上下文隔离、挂完整工具、配最强模型，不直接与人类交互
- 事件驱动：Trigger（群聊/邮件/CI/评审评论等环境事件）；两级过滤（确定性代码 Fast Path + LLM Slow Path）；订阅直通（同一 Thread 后续事件直接发往 Worker）；上下文用 Inline & Spill + 链式召回管理
- 异步 ReAct Loop：start()/stop() 替代同步 run()，全双工，已在 DeepSeek Harness 实现未默认开启
- 存算分离：计算与状态分离（云端无状态容器 + DB 会话状态）；计算与执行环境分离（端侧轻量 daemon，BYOM），与 Anthropic"脑手分离"思路一致
- Watchdog：主系统外的独立 Control Loop，同时监控基础设施存活与任务实质进展
- 实验：Super-agent p50 12.4min / p95 15.7min，显著优于单 Session+Subagent（中性提示 p95 29.5min）；去掉直通 Router 决定数 +30%、token +37%（2323 万→3177 万）
- 作者 Yujia Qiao（DeepSeek Harness 团队）；原型 dsh-superagent-prototype（非正式产品）

## Important Claims（重要论断）

### Super-agent 是打破 Agent 与单次手动会话绑定的连续实体

单任务上限取决于模型能力，多任务上限取决于人的注意力（3-5 个活跃 Session）。Super-agent 把 Agent 从单次会话中解放，成为跨会话保持上下文、同时推进多项任务的连续实体。

### Session 应当是系统的实现细节，而非用户的认知负担

双层架构在底层接管上下文管理与并发执行，在用户侧淡化 Session 的存在。让用户手动管理 Session 是从底层 LLM API 延续下来的设计惯性。

### 经典计算机系统设计思想适用于 Agent 系统

Fast/Slow Path、投机执行、存算分离、局部性等经典思想被应用到 Agent 构建中，支撑了 Super-agent 的低复杂度运作。

## Concepts Introduced（引入的概念）

- [[super-agent]]
- [[router-worker-architecture]]
- [[event-driven-agent]]
- [[watchdog-control-loop]]

## Entities Mentioned（提及的实体）

- [[deepseek-harness]]

## Implications（影响／启示）

- Agent 系统设计可大量复用计算机系统经典思想，降低架构创新成本
- 双层架构为多任务并发 Agent 提供了可复用的组织范式
- 事件驱动 + 投机执行让 Agent 从被动响应转向主动推进
- 存算分离 + BYOM 让 Agent 跨设备持久在线成为可能

## Limitations（局限）

- 实验基于合成负载与简化环境，部分设置可更严谨，结果仅作初步参考
- 开放问题：Router 水平切分粒度、Worker 协作拓扑、长程记忆、脱离 Session 的交互、A2A、安全与隐私
- 云端被攻破则端侧设备受威胁；凭据不能进入模型上下文

## Related Knowledge（相关知识）

- [[agent-loop]]
- [[context-management]]
- [[durable-execution]]
- [[harness-engineering]]
- [[a2a-protocol]]

## Source（信源）

- `raw/sources/ai/2026-11-02-superagent-design.md`
