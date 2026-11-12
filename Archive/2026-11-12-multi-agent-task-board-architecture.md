---
id: 2026-11-12-multi-agent-task-board-architecture
title: 多Agent 架构—任务看板（Team Agent）架构
source: 知乎
source_url: https://zhuanlan.zhihu.com/p/2103331588243248111
source_type: link
platform: 知乎
created: 2026-11-12
category: 技术
tags: [Agent, AI]
asset_ref: Assets/2026/11/multi-agent-task-board-architecture.md
wiki_status: ingested
---

# 多Agent 架构—任务看板（Team Agent）架构

> 系统梳理多智能体架构的落地设计：单 Agent 的上下文污染与上下文长度两大瓶颈催生多智能体；拆分原则不按角色贴标签，而按上下文边界与信息压缩边界切分，并以"大模型+小模型"混合（小模型负责快、大模型负责深）组织协作；对比三种架构——调度者-执行者（Orchestrator-Workers）、任务看板（Team Agent，对应 Claude Code 提出的 Agent team 架构）、Advisor，核心主线是控制权逐步下沉，结论是任务看板架构已成为工业落地的核心架构之一。

## 核心要点

- **单 Agent 的瓶颈**：上下文污染（混杂历史让模型分不清主次）与上下文长度限制（中间结果塞满上下文，强行压缩又丢信息）；多智能体则带来协作与并行能力。
- **拆分原则**：不是按职业角色（前端/后端/数据库 Agent）贴标签，而是**划分上下文边界和信息压缩边界**——模型知道什么取决于它拿到什么上下文；另可让大小模型同链协作：小模型负责"快"（扫描、提取、发现异常、压缩成结构化线索），大模型负责"深"（补足上下文、权衡裁决），需配套输出协议、证据引用与失败回退。
- **三种架构与控制权下沉**：① 调度者-执行者（Orchestrator-Workers）：Master 拆解并路由，流程清晰、易集中管理，但 Master 易退化成"超级 Agent"、并行度上升后路由沉重；② 任务看板（Team Agent）：把任务分配从 Master 内部推理中拿出，放到共享看板，Worker 主动领取，配任务状态机（PENDING→CLAIMED→RUNNING→SUCCEEDED/FAILED/RETRYING）+ 租约锁，高度解耦、可观测可审计、天然弹性扩缩容，适合任务多、并行高、需断点恢复的场景，缺点是抢领竞态、轮询开销、贪心调度难全局最优；③ Advisor：执行 Agent 主动向咨询者要第二意见，不接管任务，方向与 Master 相反。
- **案例落地**：Master Agent 只做组件级意图路由；任务看板实现并行与自愈（租约到期回收、幂等补做、未完成范围写入报告限制，避免"没有数据=一切正常"误判）；Advisor 按需咨询（RCA Advisor），超时失败仍输出基础结论。
- **结论与演进**：核心架构正从 Orchestrator-Workers 过渡到任务看板（主目标：减轻 Master 压力）；双 Master 架构本质是任务看板的改进（Planner Master 只拆解 + Scheduler Master 只调度巡检）。
- **附完整 LangGraph 代码**：三种架构均有可运行示例，任务看板与双 Master 版含认领、租约、重试熔断等协作协议实现。

## 正文

完整正文见采集稿：[[Assets/2026/11/multi-agent-task-board-architecture.md]]（含三种架构的 LangGraph 实现代码、任务状态机/租约/重试熔断细节与得物技术参考文献）。

## 来源

https://zhuanlan.zhihu.com/p/2103331588243248111

## 附件

[[Assets/2026/11/multi-agent-task-board-architecture.md]]
