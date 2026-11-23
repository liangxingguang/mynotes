---
id: wiki-source-2026-11-23-pi-minimal-superagent
type: source
title: 用 Pi 实现极简 Super Agent
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - source
  - ai-agent
  - architecture
sources:
  - raw/sources/ai/2026-11-23-pi-minimal-superagent.md
related:
  - wiki/concepts/super-agent.md
  - wiki/concepts/router-worker-architecture.md
  - wiki/concepts/watchdog-control-loop.md
  - wiki/entities/pi.md
---

# 用 Pi 实现极简 Super Agent

## Overview（概览）

一篇面向工程实现的知乎专栏文章：用 Pi、tmux、Telegram、cron、VM 五个通用组件，搭出 DeepSeek SuperAgent「Router 调度 + Worker 执行 + 异步监督」核心协作的极简可运行实现。不追求复刻全部机制，只为跑通核心协作并留出扩展空间。与已有的 Super-agent 设计探索、原型拆解信源互补——本文是具体实现方案，而非设计论证或架构拆解。

## Key Facts（关键事实）

- **六组件分工**：Pi 常驻为 Router（收指令、理解任务、调度）；tmux 提供持久 Session 承载 Pi、Gateway 与各 Coding CLI Worker；Telegram 为远程入口（任务从 Bot 提交、结果从 Bot 返回）；Coding CLI（pi-coding-agent / Opencode CLI）执行开发任务；cron 周期检查提醒 Pi 核对 Worker；整套跑在 VM 中、Workspace 映射宿主机共享目录（存算分离）。
- **Router 轻量化**：Pi 不亲自做编码，任务派发到独立 tmux Session 后台运行；长耗时工具调用不阻塞交互，任务上下文互不污染。
- **tmux 的角色边界**：只借 Session 与日志作为可观察执行载体，不提供任务语义、状态管理或依赖关系。
- **远程链路**：Telegram Bot API → Gateway（WebSocket）→ Pi Router，结果沿原路同步回 Telegram；Gateway 管通信转发、Pi 管任务理解与调度，职责分离。
- **Watchdog 实现**：cron 每 20 分钟执行检查脚本（tmux 快照 + Gateway Webhook 注入提醒），Pi 逐个核对 Worker、必要时重新派发并更新每日任务记录；属依赖模型判断的轻量监督。
- **VM 隔离边界**：VM 隔离运行环境而非文件；共享 Workspace 下 Worker 读写直接作用于宿主机，需谨慎配置权限；多 Worker 并发改同一目录有文件冲突风险。
- **五个扩展方向**：引入 SQLite 建 Task Registry；用 Git Worktree 做工作区隔离；脚本确定性检查前置、异常再交 Pi 判断；统一任务结果协议（task_id/status/summary/changed_files/tests/exit_code）；引入并发数、优先级与事件路由。

## Important Claims（重要论断）

- SuperAgent 的价值在于把持续交互与具体执行解耦：一个常驻 Router 管理多个独立 Worker，通过事件和监督机制推动任务持续运行。
- 从最小可运行系统出发、按实际使用中的瓶颈逐步扩展，是探索 SuperAgent 架构最直接的方式。
- 五个扩展方向指向同一件事：把目前依赖模型判断和文件推断的部分，逐步换成结构化、确定性的机制，而 Router 与 Worker 的分工保持不变。

## Concepts Introduced（引入的概念）

- [[super-agent|Super-agent]]：本文是其极简可运行实现
- [[router-worker-architecture|Router/Worker 双层架构]]：Pi 作 Router、Coding CLI 作 Worker 的具体落地
- [[watchdog-control-loop|Watchdog 外部控制回路]]：cron 定时检查的轻量级监督实现
- [[durable-execution|持久执行]]：Task Registry、任务结果协议等扩展方向与之相关

## Entities Mentioned（提及的实体）

- [[pi|Pi]]：作为常驻 Router 的控制入口
- pi-coding-agent：作为 Worker 之一的 Coding CLI
- Opencode CLI：作为 Worker 之一的 Coding CLI
- tmux：任务运行时载体（Session 与日志）
- Telegram：远程交互入口
- DeepSeek SuperAgent：被极简实现的参考架构

## Implications（启示）

- Super-agent 的落地不必等完整框架：五个通用组件即可跑通核心协作，降低了实践门槛。
- tmux 等通用工具可充当任务运行时，但需明确其只提供可观察性、不提供任务语义——任务语义需上层（Router + 扩展方向）补齐。
- 轻量级 Watchdog 依赖模型判断，距离独立确定性监控有距离；确定性检查前置是明确的演进路径。

## Limitations（局限）

- 单信源（知乎专栏），属二手工程实践文，无官方或多源交叉验证。
- 未覆盖完整任务注册表、Thread 关联机制、精细化事件路由与独立任务状态管理（作者明确标注为缺位）。
- VM 隔离的是运行环境而非文件，共享 Workspace 的并发冲突风险未在本文内解决。
- 4 张配图为知乎图床外链，采集时已确认为原文配图。

## Related Knowledge（相关知识）

- [[super-agent|Super-agent（概念页）]]
- [[router-worker-architecture|Router/Worker 双层架构（概念页）]]
- [[watchdog-control-loop|Watchdog 外部控制回路（概念页）]]
- [[pi|Pi（实体页）]]

## Source（信源）

- 原文：https://zhuanlan.zhihu.com/p/2104976960610906741
- raw 信源：`raw/sources/ai/2026-11-23-pi-minimal-superagent.md`
- 采集稿：`Assets/2026/11/pi-minimal-superagent.md`
- 抓取方式：jina reader（知乎反爬壳，HTTP/浏览器级均失败后兜底）
- 抓取时间：2026-11-23
