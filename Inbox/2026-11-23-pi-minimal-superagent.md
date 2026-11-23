---
id: 2026-11-23-pi-minimal-superagent
title: 用 Pi 实现极简 Super Agent
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2104976960610906741
source_type: 网页
platform: 知乎
created: 2026-11-23
category: 技术
tags: [Agent, AI]
asset_ref: Assets/2026/11/pi-minimal-superagent.md
wiki_status: ingesting
ingest_claimed_at: "2026-11-23T00:57:29.350Z"
ingest_claim_id: 32024-1795395449350-0
---

# 用 Pi 实现极简 Super Agent

> 用 Pi、tmux、Telegram、cron、VM 五个通用组件，搭出 DeepSeek SuperAgent「Router 调度 + Worker 执行 + 异步监督」核心协作的极简可运行实现，并给出五个结构化扩展方向。

## 核心要点

1. **架构对照**：DeepSeek SuperAgent 把 Agent 拆为负责沟通调度的 Router 与负责执行的 Worker；本文用普通工程组件对应实现，跑通 Router、Worker、异步执行与 Watchdog 协作，未覆盖任务注册表、Thread 关联、精细事件路由与独立状态管理。
2. **六组件分工**：Pi 常驻为 Router（收指令、理解任务、调度）；tmux 提供持久 Session 承载 Pi、Gateway 与各 Coding CLI Worker；Telegram 为远程入口（任务从 Bot 提交、结果从 Bot 返回）；Coding CLI（pi-coding-agent / Opencode CLI）执行开发任务；cron 周期检查提醒 Pi 核对 Worker；整套跑在 VM 中、Workspace 映射宿主机共享目录（存算分离）。
3. **Router 轻量化**：Pi 不亲自做编码，任务派发到独立 tmux Session 后台运行，长耗时工具调用不阻塞交互，任务上下文互不污染；tmux 只借其 Session 与日志作为可观察执行载体，不提供任务语义。
4. **远程链路**：Telegram Bot API → Gateway（WebSocket）→ Pi Router，结果沿原路同步回 Telegram；Gateway 管通信转发、Pi 管任务理解与调度，职责分离。
5. **外部监督（Watchdog）**：cron 每 20 分钟执行检查脚本（tmux 快照 + Gateway Webhook 注入提醒），Pi 逐个核对 Worker、必要时重新派发并更新每日任务记录；属依赖模型判断的轻量监督。
6. **环境隔离边界**：VM 隔离运行环境而非文件，共享 Workspace 下 Worker 读写直接作用于宿主机，需谨慎配置权限；多 Worker 并发改同一目录有文件冲突风险。
7. **五个扩展方向**：引入 SQLite 建 Task Registry；用 Git Worktree 做工作区隔离；脚本确定性检查前置、异常再交 Pi 判断；统一任务结果协议（task_id/status/summary/changed_files/tests/exit_code）；引入并发数、优先级与事件路由。
8. **结论**：SuperAgent 的价值在于持续交互与具体执行解耦；从最小可运行系统出发、按瓶颈逐步扩展，是探索该架构最直接的方式。

## 正文

详见采集稿 [[Assets/2026/11/pi-minimal-superagent]]。文章以架构对比开篇，随后逐节展开常驻 Router、Worker 运行时、远程交互入口、外部监督与运行环境隔离，最后给出任务状态管理、工作区隔离、确定性检查前置、任务结果协议、并发控制五个扩展方向。

## 来源

- https://zhuanlan.zhihu.com/p/2104976960610906741

## 附件

- [[Assets/2026/11/pi-minimal-superagent]]
