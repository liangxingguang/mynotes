---
id: 2026-10-23-agent-software-architecture-task-run-step-event
title: 第 5 章：Agent 的软件架构设计（Task/Run/Step/Event 领域模型）
source: 知乎专栏《agent-from-scratch》
source_url: https://zhuanlan.zhihu.com/p/2096330283423360903
source_type: 文章
platform: 知乎
created: 2026-10-23
category: 技术
tags:
  - AI
  - Harness
  - 工程实践
asset_ref: Assets/2026/10/agent-software-architecture-task-run-step-event.md
wiki_status: ingested
---

# 第 5 章：Agent 的软件架构设计（Task/Run/Step/Event 领域模型）

> 从可运行的 Agent Loop 走向 Agent 平台时，需要为控制平面建立显式领域模型：Task（业务意图）、Run（执行尝试）、Step（一步活动）、Event（已发生事实）四者分离、各有身份；配合 Run 状态机守卫、纯函数事件投影、乐观并发控制与幂等事件仓库，构成可验证、可回放、可测试的 Agent Runtime 一致性基础。

## 核心要点

- **四元分离**：Task≠Run（一个 Task 可多次重试为多个 Run）、Step≠Tool Call、Event≠Span；messages 列表只是模型上下文，不能替代控制状态、审批状态与副作用证据
- **Run 状态机**：CREATED/RUNNING/WAITING_APPROVAL/COMPLETED/FAILED/CANCELLED，守卫条件与状态图同等重要（单 active Step、终止态不可再进展、暂停只能在 Step 间）；COMPLETED 只表示模型自报完成，不等于业务验证成功
- **Command/Event/State 三语义**：命令可被拒、事件是已记录事实（过去式命名）；apply_event 纯函数投影使状态可 replay 重建——但状态重放 ≠ 重新执行 LLM ≠ Durable Execution
- **并发与幂等**：事件追加携带 expected_version 做乐观并发控制；同 ID 同数据去重、同 ID 不同数据报冲突；事件去重 ≠ 工具副作用 exactly-once（需 Outbox/幂等键/补偿）
- **架构边界**：Run 为聚合根；Domain / Application Service / Ports & Adapters / Infrastructure 四层分离，反对 MegaAgent 反模式；控制流、数据流、事件流三条流分清
- **取舍**：事件溯源不是 Agent 必备，短任务用数据库行+状态字段更经济；长任务恢复/审批/审计/复盘才是引入理由

## 正文

详见附件抓取正文（含完整代码、状态转移图、实验与 12 道练习设计题）。配套仓库：github.com/apsaras-ai/agent-from-scratch。

## 来源

- [第 5 章：Agent 的软件架构设计](https://zhuanlan.zhihu.com/p/2096330283423360903)

## 附件

- [[Assets/2026/10/agent-software-architecture-task-run-step-event.md]]
