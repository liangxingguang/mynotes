---
id: wiki-source-weixin-superagent-architecture-teardown
type: source
title: 架构拆解：DeepSeek 刚发布的 Super-agent
status: active
created: 2026-11-02
updated: 2026-11-02
confidence: medium
tags:
  - ai-agent
  - architecture
sources:
  - raw/sources/ai/2026-11-02-weixin-superagent-architecture-teardown.md
---
# 架构拆解：DeepSeek 刚发布的 Super-agent

## Overview（概览）

「架构师」公众号对 DeepSeek Super-agent 设计（详见 [[superagent-design|库内已采集的 DeepSeek 原文]]）的独立拆解，结合公开原型 `dsh-superagent-prototype`（6337fc8）源码逐层解读：以"导出文件打不开"修复为贯穿案例，讲透 Router/Worker 两层职责、Trigger/Thread 订阅直通与批处理、Ticket/Assignment/Mandate 持久化、SQLite Store 事务先行启动、WorkerSlots 人跟进优先、observe/auto 接单模式、Inline & Spill 链式召回、Watchdog 停滞检测，以及实验数据的再解读（直通省约 27% 缓存 token，完成时间不变因 Router 未到吞吐瓶颈）。

## Key Facts（关键事实）

- 核心命题：上下文需要连贯，执行需要分开；任务中途停了，两者的联系还得保留（DSH 负责执行接得上，Super-agent 记录这次执行属于哪项工作、与哪些讨论有关）
- 消息归口：Trigger=单条环境事件，Thread=同话题/同 PR 的连续事件；首次分派由 Router 判断，Worker 订阅后同 Thread 后续消息程序直送、不再每次过模型
- Router 批处理：积压事件合并到下一轮一起判断；压测 1→40 条/分钟时批次 1.0→2.8、单请求 2.5s→3.9s，Prefill 并行让多读几条耗时不同比增加；单 Router 在这组负载够用，更大规模分片原文无定论
- Ticket 持久化：Assignment（谁执行）/ Executor Session（模型+工具）/ Mandate（接单依据范围）挂同一 Ticket；`ready` 后释放名额、Ticket 与订阅保留，跟踪 PR 关闭/合并判断任务结束
- 工程细节：Engine 先事务写任务再启动执行器；Effects 队列失败退避重试、Outbox 记发送状态；注意平台已收到而本地未记成功时重试会重复发送；恢复前先查目录/Git/GitHub 再决定是否重做外部操作
- 等待与接单：WorkerSlots 给人跟进留并发外额外名额且唤醒优先；observe 模式（推断任务先记录不执行）/auto（按规则评估）/人的明确请求三路径；Mandate 定范围，订阅不扩大工作范围
- 环境配合：计算/状态/执行环境三分，引用 Anthropic Managed Agents；系统在线、任务记得住、执行环境可用需分别成立；Watchdog 检测"正在输出却无实质进展"的停滞
- 实验再解读：p50 12.4min/p95 15.7min vs 基线 p95 29.5min（基线模型一次都没调 Subagent，改提示后才委派）；去直通 Router 决定数 +30%、缓存 token +37%（开直通省约 27%）；完成时间不变是 Router 未到吞吐瓶颈，省在推理开销

## Important Claims（重要论断）

### DSH 负责执行接得上，Super-agent 记录这次执行属于哪项工作

评审者在 PR 里说"还要补一个测试"，系统据此找到原来的修复任务，再交给执行会话。对方不必先找到 Agent 的聊天窗口。两层职责的分工落点在此：DSH 保证执行可恢复，Super-agent 保证工作项与讨论的关联不丢。

### 模型判断出的关系，变成了程序可以持续使用的投递依据

订阅直通把 Router 的语义判断固化为投递规则：Worker 订阅 Thread 后，后续消息由程序直送，Router 不必每次重新理解。这是 Fast/Slow Path 思想在消息路由层的落地。

### 数据库能保存进度，已经发生在外部的事还得核实

Engine 事务先行解决了"决定接单后退出"的持久化；但平台已收到消息而本地未记成功时，重试会重复发送。外部副作用无法用数据库事务覆盖，恢复前必须先查目录、Git 历史和 GitHub。

### 完成时间不变，省在推理开销

去掉直通后任务完成时间基本一致，Router 决定次数 +30%、缓存 token +37%。结合 Router 压测，团队解释这组负载还没把 Router 推到吞吐瓶颈，少做的重复判断先省在推理开销上。判断单 Router 何时需要拆分，要看过滤订阅后剩余必须判断的工作量，不能只数入口消息。

## Concepts Introduced（引入的概念）

- [[ticket-task-persistence]]

## Entities Mentioned（提及的实体）

- [[deepseek-harness]]
- [[super-agent]]

## Implications（影响／启示）

- 任务持久化对象（Ticket）与执行会话（Executor Session）解耦，是跨轮跨渠道 Agent 任务的关键抽象
- 订阅直通把模型判断固化为程序投递规则，是降低协调开销的通用手法
- 外部副作用的重复发送风险无法用数据库事务消除，恢复前必须核实外部状态
- 批处理收益来自 Prefill 并行分摊，而非单条更快；判断拆分时机要看剩余判断工作量

## Limitations（局限）

- 拆解基于公开原型 6337fc8，仓库明确说明与内部版本、设计文章不完全一致，部分方向尚未实现
- 压测与实验为初步数据（每轮约 300 条消息、约 20 条工作请求、每方案 5 次），编码工作用只消耗时间的工具代替，测的是调度与协作而非真实编码
- 基线方案在中性提示下一次都没调用 Subagent，完成时间对比的有效性依赖提示改造后的委派行为
- 更大规模下 Router 如何分片、怎样维持共享记忆，原文无定论

## Related Knowledge（相关知识）

- [[superagent-design|Super-agent 设计探索（DeepSeek 原文）]]
- [[super-agent]]
- [[router-worker-architecture]]
- [[event-driven-agent]]
- [[watchdog-control-loop]]
- [[context-management]]
- [[durable-execution]]

## Source（信源）

- `raw/sources/ai/2026-11-02-weixin-superagent-architecture-teardown.md`
