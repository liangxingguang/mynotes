---
id: wiki-topic-multi-agent-collaboration-architecture
type: topic
title: 多 Agent 协作架构与控制权下沉
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: medium
tags:
  - topic
  - ai-agent
  - architecture
  - multi-agent
sources:
  - raw/sources/ai/2026-11-05-multi-agent-control-shift.md
---
# 多 Agent 协作架构与控制权下沉

## Scope（范围）

多 Agent 系统的组织方式：谁拆解任务、谁分配任务、谁判断任务完成、Agent 之间共享什么信息。本主题页是三种协作架构（Master Agent、任务看板、Advisor）及其背后"控制权下沉"框架的导航与综述页；两个设计前提（上下文边界、模型边界）在此一并收录。

## Current Understanding（当前认知）

多 Agent 架构的核心不是"调用更多模型"，而是**控制权放在哪里**。四种组织问题最终都指向控制权归属。三种协作架构构成一条控制权逐步下沉的路径：

| 架构 | 决策权在谁 | 组织哲学（信源 §4） | 适用场景 |
| --- | --- | --- | --- |
| Master Agent | 中心节点 | "我告诉你做什么" | 流程固定、依赖明确、需统一权限/顺序（§3.1） |
| 任务看板 | 共享状态 | "你看看现在什么任务可以做" | 任务多、并行高、执行长、需断点恢复（§3.2） |
| Advisor | 当前执行者 | "你自己推进，需要时我给你建议" | 不确定性高但不值得固定编排（§3.3） |

选型原则（信源 §6，解读：框架本身是信源论断，适用性待更多信源验证）：控制权与问题匹配——需统一顺序的步骤交给编排，可并行的任务由共享状态协调，执行中的专业疑问通过按需咨询补足。

两个设计前提（信源 §2）：

- **上下文边界**：按"看见什么／产出什么"切分 Agent（代码分析 Agent、数据探索 Agent），而非贴职业标签；核心 Agent 只接收与当前决策最相关的上下文。
- **模型边界**：小模型管"快"（批量筛选、结构化提取、早期探索），大模型管"深"（长链路推理、复杂权衡、最终裁决）；需配套输出校验、证据引用、预算与超时上限。

## Key Concepts（关键概念）

- [[task-board-coordination|任务看板（共享状态协作）]]
- [[advisor-on-demand-consultation|Advisor（按需咨询）]]
- [[router-worker-architecture|Router/Worker 双层架构]]（Master Agent 架构的对应实现形态：常驻 Router 层全局协调）
- [[context-management|上下文管理]]（上下文边界原则）
- [[ticket-task-persistence|Ticket 任务持久化模型]]（看板任务的持久化特化形态）
- [[idempotency-design|幂等设计]]（看板可靠性依赖）
- [[super-agent|Super-agent]]（"超级 Agent"术语差异见该页）

## Key Entities（关键实体）

（本主题暂无达到实体页标准的对象；出处实体：得物技术公众号、作者微辣帝，见信源页）

## Important Decisions（重要决策）

（信源为综述性文章，无显式决策记录；巡检案例中"把入口中心职责限定在组件级路由"可视为该团队的架构决策，其理由与效果见 Major Developments）

## Major Developments（重大进展）

- 2026-11-05 — 得物技术文章提出"三次反转"框架：Master Agent（中心调度）→ 任务看板（共享状态）→ Advisor（自驱+按需咨询），并给出中间件巡检系统的三模式混用落地案例（§5）：
  1. 入口 Master 只做组件级路由：仅知各 Inspector 的能力描述、输入要求、调用入口；指标目录、目标发现、任务拆分由 Inspector 自己管理——把中心职责限定在组件级以规避"超级 Agent"膨胀。
  2. 组件内 Inspector+看板并行分析：拆"指标＋目标批次＋时间窗口"任务，Worker 并行领取；崩溃 Worker 的任务租约到期后被接管，只补做未完成批次（有限重试＋幂等提交）。
  3. RCA Advisor 按需解释根因：Inspector 自判是否提问，Advisor 返回可能原因+验证方向；超时/失败仍输出基础结论；报告区分当前异常/已恢复/数据不足，"没有数据"明确标注。

## Disagreements（分歧）

- **"超级 Agent"术语差异**（非事实矛盾，属同名不同义）：得物信源中"超级 Agent"为贬义——Master Agent 任务变复杂后膨胀成既要理解业务又要维护调度器/状态机/异常处理的臃肿中心；[[super-agent]] 页中为褒义——DeepSeek 提出的跨会话连续、并发推进多任务的 Agent 形态。两用法语境不同，不构成矛盾，但检索"超级 Agent"时需按语境区分。

## Open Questions（开放问题）

- 三种架构是否可量化比较（并行度、故障恢复时间、中心负载）——信源无数据。
- 混用模式（如巡检案例）中三种模式的职责边界如何随任务规模演化，信源只给单例。
- 模型边界（大小模型分工）缺具体路由规则，只有原则。

## Related Topics（相关主题）

（暂无直接相邻主题页；相关概念页见 Key Concepts）
