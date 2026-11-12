---
id: wiki-source-2026-11-12-multi-agent-task-board-architecture
type: source
title: 多 Agent 架构—任务看板（Team Agent）架构
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: high
tags:
  - ai-agent
  - architecture
  - multi-agent
sources:
  - raw/sources/ai/2026-11-12-multi-agent-task-board-architecture.md
related:
  - wiki/topics/multi-agent-collaboration-architecture.md
  - wiki/concepts/task-board-coordination.md
  - wiki/concepts/advisor-on-demand-consultation.md
  - wiki/concepts/router-worker-architecture.md
---
# 多 Agent 架构—任务看板（Team Agent）架构

## Overview（概览）

系统梳理多智能体架构的落地设计：单 Agent 的上下文污染与上下文长度两大瓶颈催生多智能体；拆分原则不按角色贴标签，而按上下文边界与信息压缩边界切分，并以"大模型+小模型"混合（小模型负责快、大模型负责深）组织协作；对比三种架构——调度者-执行者（Orchestrator-Workers）、任务看板（Team Agent，对应 Claude Code 提出的 Agent team 架构）、Advisor，核心主线是控制权逐步下沉，结论是任务看板架构已成为工业落地的核心架构之一。附三种架构的 LangGraph 可运行代码与双 Master 架构实现。

## Key Facts（关键事实）

- 单 Agent 两大瓶颈：上下文污染（混杂历史让模型分不清主次）与上下文长度限制（中间结果塞满上下文，强行压缩丢信息）。
- 拆分原则：不是按职业角色（前端/后端/数据库 Agent）贴标签，而是**划分上下文边界和信息压缩边界**——模型知道什么取决于它拿到什么上下文。
- "大模型+小模型"混合：小模型负责"快"（扫描、提取、发现异常、压缩成结构化线索），大模型负责"深"（补足上下文、权衡裁决）；需配套输出协议、证据引用与失败回退。
- 三种架构：①调度者-执行者（Orchestrator-Workers）：Master 拆解并路由，但 Master 易退化成"超级 Agent"；②任务看板（Team Agent）：任务分配从 Master 内部推理中拿出，放到共享看板，Worker 主动领取，配任务状态机（PENDING→CLAIMED→RUNNING→SUCCEEDED/FAILED/RETRYING）+ 租约锁；③Advisor：执行 Agent 主动向咨询者要第二意见，不接管任务。
- 任务看板优点：高度解耦、Master 轻量化、可观测可审计、天然弹性扩缩容；缺点：抢领竞态、轮询开销、贪心调度难全局最优。
- 双 Master 架构：Planner Master 只拆解（禁止回收租约/改状态/判结束）+ Scheduler Master 只调度巡检（租约超时回收、依赖校验、重试熔断、全局进度判断、优先级排序，禁止创建新任务）。
- 案例落地：Master Agent 只做组件级路由；任务看板实现并行与自愈（租约到期回收、幂等补做、未完成范围写入报告限制，避免"没有数据=一切正常"误判）；Advisor 按需咨询（RCA Advisor），超时失败仍输出基础结论。
- 参考文献：得物技术《多 Agent 架构的三次反转》。

## Important Claims（重要论断）

### Claim 1：核心架构正从 Orchestrator-Workers 过渡到任务看板

主目标：减轻 Master Agent 的压力。把"分配任务"从 Master 内部推理中拿出，放到所有 Agent 都能看到的共享看板上，子 Agent 主动领取而非等待点名。

### Claim 2：双 Master 架构本质是任务看板的改进

Planner Master 与 Scheduler Master 的分工，本质仍是任务看板架构的改进：把"拆解"与"调度巡检"分离，各司其职，进一步减轻单一 Master 的负担。

### Claim 3：任务看板的难点在于协作协议而非看板本身

两个 Agent 同时看到同一任务时谁能领取、领取后崩溃怎样回收、完成怎样解除下游依赖、重复执行怎样保持幂等——这些协作协议才是真正难点，看板只是承载这些协议的介质。

### Claim 4：Advisor 模式方向与 Master Agent 相反

Master Agent 是中心节点调用 Worker；Advisor 是执行节点调用咨询者。这改变了系统责任边界：执行 Agent 保持完整上下文和主流程，Advisor 只在局部决策上提供额外认知。作者认为 Advisor 用处不大，不如生成器-验证器架构实用。

### Claim 5：任务看板解决"工作怎样被领取"，但并非每次协作都值得建模成任务

有些时候执行 Agent 已经知道该做什么，只是在关键判断上需要另一个视角——这引出了更轻量的 Advisor 协作关系。

## Concepts Introduced（引入的概念）

- [[task-board-coordination|任务看板（共享状态协作）]]
- [[advisor-on-demand-consultation|Advisor（按需咨询）]]
- [[router-worker-architecture|Router/Worker 双层架构]]
- [[multi-agent-collaboration-architecture|多 Agent 协作架构与控制权下沉]]

## Entities Mentioned（提及的实体）

- Claude Code（Agent team 架构提出者）
- 得物技术（参考文献来源）
- LangGraph（代码实现框架）

## Implications（影响／启示）

- 多 Agent 架构的核心不是"调用更多模型"，而是控制权放在哪里——任务看板把控制权从中心节点下沉到共享状态，是工业落地的主流方向。
- 智能体拆分应围绕上下文边界而非职业标签，这一原则对多 Agent 系统设计具有普遍指导意义。
- 双 Master 架构为任务看板提供了一种可操作的工程改进路径：拆解与调度分离，各 Master 职责单一、禁止越界。

## Limitations（局限）

- 全文为单信源（知乎专栏），三种架构的 LangGraph 代码为参考实现，未提供生产环境验证记录。
- Advisor 一节论述较少，作者明确表示"用处不大，不做过多论述"，该架构的适用性判断为作者主观观点。
- 双 Master 架构代码中 writer_worker 存在重复的 `if not claimed` 判断，为原文代码瑕疵。

## Related Knowledge（相关知识）

- [[task-board-coordination|任务看板（共享状态协作）]]（第 2 信源）
- [[advisor-on-demand-consultation|Advisor（按需咨询）]]（第 2 信源）
- [[multi-agent-collaboration-architecture|多 Agent 协作架构与控制权下沉]]（第 4 信源）
- [[router-worker-architecture|Router/Worker 双层架构]]
- [[2026-11-05-weixin-multi-agent-control-shift|多 Agent 架构的三次反转（信源页）]]

## Source（信源）

- `raw/sources/ai/2026-11-12-multi-agent-task-board-architecture.md`
