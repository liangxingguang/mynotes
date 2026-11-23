---
id: wiki-concept-watchdog-control-loop
type: concept
title: Watchdog 外部控制回路
status: active
created: 2026-11-02
updated: 2026-11-23
confidence: medium
tags:
  - concept
  - ai-agent
  - reliability
sources:
  - raw/sources/ai/2026-11-02-superagent-design.md
  - raw/sources/ai/2026-11-23-pi-minimal-superagent.md
related:
  - wiki/concepts/super-agent.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/agent-loop.md
  - wiki/entities/pi.md
---
# Watchdog 外部控制回路

## Definition（定义）

主系统外部的独立 Control Loop，用定时消息驱动，同时监控基础设施存活与任务实质进展，发现异常时介入修复。Watchdog 本身是一个具备完整工具能力的 Agent Session。

## Why It Matters（为什么重要）

持久在线的分布式系统很难仅靠主系统内部逻辑保证长期可靠运行。Agent 系统的异常不仅是进程崩溃，还有模型陷入无效循环或偏离目标——传统进程存活探测不够，需要监控任务本身的进展。

## Core Characteristics（核心特征）

1. **外部独立**：在主系统之外，不与主系统共享内部状态
2. **双重监控**：基础设施存活（接口报错、状态恢复失败）+ 任务实质进展（模型判断 Worker 是否有进展、方向是否偏离目标）
3. **定时驱动**：用定时消息驱动 Watchdog Session
4. **可介入修复**：发现异常及时介入；遇外部偶发故障持续复查直至恢复
5. **自然语言交互**：维护者可用自然语言询问故障原因，或让它在线修正主系统行为（增删提示词、调整触发规则）

## Structure（结构）

Watchdog Session = 独立 Agent Session + 完整工具能力 + 定时消息驱动，构成外部 Control Loop。

极简实现（2026-11-23 信源）：用 cron 每 20 分钟执行检查脚本——记录 tmux 状态快照、确认 Pi 是否正在处理请求，再通过 Gateway Webhook 向 Pi 注入一条检查提醒；Pi 收到提醒后逐个核对 Worker、判断任务是否异常，必要时重新派发并更新每日任务记录。属依赖模型判断的轻量级监督。

## How It Works（运作方式）

- 基础设施故障：处理接口报错、状态恢复失败等
- 任务进展监控：由模型判断各 Worker 是否有实质进展、方向是否偏离整体目标
- 异常介入：发现异常及时修复；外部偶发故障持续复查

## Relationships（关系）

### Related Concepts（相关概念）

- [[super-agent]]：Watchdog 保障持久与自愈
- [[durable-execution]]：外部控制回路与持久执行的异常恢复相关
- [[agent-loop]]：Watchdog 本身是 Agent Loop 实例

### Dependencies（依赖项）

- 主系统的可观测接口（任务状态、基础设施健康）

### Distinctions（区分）

- **Watchdog vs 进程监控脚本**：后者只看进程存活，Watchdog 还监控任务实质进展
- **Watchdog vs 主系统内部自检**：前者在主系统外部，后者依赖主系统内部逻辑

## Evolution（演进）

- 2026-11-02 — 新建，信源为 DeepSeek Harness 团队架构探索文。
- 2026-11-23 — 新增知乎专栏「用 Pi 实现极简 Super Agent」信源（第 2 信源）：给出可运行的轻量 Watchdog 实现——cron 20 分钟触发检查脚本（tmux 快照 + Gateway Webhook 注入提醒），Pi 收到后逐个核对 Worker、必要时重新派发；属依赖模型判断的轻量级监督，距离独立、确定性任务监控仍有距离。并给出确定性检查前置的演进方向：先由脚本做确定性检查（Session 存在/进程退出/超时/日志更新/退出码异常），只把异常交 Pi 做语义判断与恢复决策，减少无效模型调用并降低 Pi 忙碌时错过 Worker 异常的概率。见 Structure 增补。

## Open Questions（开放问题）

- Watchdog 自身的可靠性与防误介入机制（信源未展开）
- Watchdog 与主系统的权限边界

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-02-superagent-design.md`
- Source: `raw/sources/ai/2026-11-23-pi-minimal-superagent.md`（极简实现：cron 20 分钟 + Webhook 注入 + 确定性检查前置演进方向）

## Related Knowledge（相关知识）

- [[superagent-design|Super-agent 设计探索（信源页）]]
- [[2026-11-23-pi-minimal-superagent|用 Pi 实现极简 Super Agent（信源页）]]
- [[super-agent]]
