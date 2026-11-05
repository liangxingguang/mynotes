---
id: wiki-source-2026-11-05-weixin-multi-agent-control-shift
type: source
title: 多 Agent 架构的三次反转：从中心调度到自驱协作（得物技术）
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: high
tags:
  - multi-agent
  - architecture
sources:
  - raw/sources/ai/2026-11-05-multi-agent-control-shift.md
related:
  - wiki/topics/multi-agent-collaboration-architecture.md
  - wiki/concepts/task-board-coordination.md
  - wiki/concepts/advisor-on-demand-consultation.md
  - wiki/concepts/router-worker-architecture.md
---
# 多 Agent 架构的三次反转：从中心调度到自驱协作（得物技术）

## Overview（概览）

微信公众号「得物技术」署名微辣帝的文章（每周三更新技术干货）。核心论点：多 Agent 架构要解决的不是"如何调用更多模型"，而是控制权放在哪里——四个组织问题（谁拆解、谁分配、谁判断完成、共享什么信息）都指向控制权归属。文章先划清两个设计边界（上下文边界、模型边界），再比较三种协作架构（Master Agent、任务看板、Advisor），归纳为一条控制权逐步下沉的路径（"三次反转"），最后用组内三个中间件的巡检系统做落地案例。

## Key Facts（关键事实）

- **四个组织问题**：多 Agent 要解决谁拆解任务、谁分配任务、谁判断任务完成、Agent 之间共享什么信息，最终都指向控制权放在哪（§1）
- **上下文边界**：按"看见什么／产出什么"切分 Agent（代码分析 Agent、数据探索 Agent），优于贴职业标签（后端 Agent、数据库 Agent）；模型能否专精首先取决于拿到什么上下文（§2.1）
- **模型边界**：小模型管"快"（批量筛选、结构化提取、早期探索），大模型管"深"（长链路推理、复杂权衡、最终裁决）；配套要求：小模型输出需校验、大模型需知道结论来源、预算与超时设明确上限（§2.2）
- **Master Agent**：中心节点理解目标、拆解、路由、汇总；优势是控制流清楚、权限/预算/超时/失败处理集中管理；风险是任务变复杂后容易膨胀成"超级 Agent"（既要理解业务，又要维护调度器、状态机和异常处理）（§3.1）
- **任务看板**：调度 = 共享状态暴露机会；看板记录待处理任务、负责人、依赖关系、执行状态、产出物；任务状态机 PENDING→CLAIMED→RUNNING→SUCCEEDED/FAILED/RETRYING；领取需锁或租约，状态变化留历史，产出经稳定引用传递（§3.2）
- **Advisor**：执行 Agent 自主推进主流程，仅在高风险判断、专业盲区、方案分歧时主动征求第二意见；Advisor 不接管任务、不替执行 Agent 调用工具；与 Master Agent 方向相反——执行节点调用咨询者（§3.3）
- **三次反转**：决策权从中心节点 → 共享状态 → 当前执行者逐步下沉；三种组织哲学对应三句话："我告诉你做什么"／"你看看现在什么任务可以做"／"你自己推进，需要时我给你建议"（§4）
- **巡检案例**：入口 Master 只做组件级路由（能力描述、输入要求、调用入口）；组件内 Inspector 拆"指标＋目标批次＋时间窗口"任务上看板，Worker 并行领取；崩溃 Worker 的任务租约到期后由其他 Worker 接管，只补做未完成批次（有限重试＋幂等提交）；RCA Advisor 按需解释根因，超时/失败时仍输出基础结论；报告区分当前异常、窗口内已恢复、数据不足，"没有数据"明确标注避免"没发现异常=一切正常"误判（§5）
- **选型原则**：控制权与问题匹配——需统一顺序用编排、可并行用共享状态、专业疑问用按需咨询（§6）
- **出处信息**：作者微辣帝，得物技术公众号，每周三更新（文末署名）

## Important Claims（重要论断）

### 按职业标签切分 Agent 是提示词放大的职业想象

同一基础模型上仅换角色提示词不足以让 Agent 专精；"代码分析 Agent""数据探索 Agent"之所以更实用，是因为前者描述了上下文和产出的边界。承重论断，单信源未独立核验。

### 任务看板的可靠性难点在协作协议，不在"写进数据库"

"只是把任务写进数据库再让 Agent 定时读取，系统并不会自动变得可靠"——领取竞争、崩溃回收、依赖解除、幂等四点才是难点。与 [[ticket-task-persistence|Ticket 持久化模型]]（Engine 事务先行、Store 落 SQLite）互证：持久化只是底座，协议才是可靠性来源。

### Advisor 改变的是系统的责任边界而非调用方向

表面看只是一次工具调用，实际改变责任边界：执行 Agent 保持完整上下文和主流程，Advisor 只在局部决策上提供额外认知，且不需要知道项目全部历史、不需要直接改代码权限。

### 咨询有成本，采纳与兜底也是执行 Agent 的能力

什么时候问、问什么、提供多少上下文、如何判断建议值得采纳，都需成为 Agent 的一部分能力；Advisor 超时或失败时仍输出已有证据支持的基础结论，能自行解释的问题直接成稿。

## Concepts Introduced（引入的概念）

- [[multi-agent-collaboration-architecture|多 Agent 协作架构与控制权下沉（主题页）]]
- [[task-board-coordination|任务看板（共享状态协作）]]
- [[advisor-on-demand-consultation|Advisor（按需咨询）]]
- 上下文边界设计原则（更新进 [[context-management|上下文管理]]）
- 模型边界（大小模型协作，见信源 Overview 与 Key Facts；本页不单独立页，随主题页承载）

## Entities Mentioned（提及的实体）

- 得物技术（微信公众号，技术内容发布方，每周三更新）
- 微辣帝（本文作者署名）

（均为出处信息，未达实体页标准，不建页）

## Implications（影响／启示）

- 多 Agent 选型的第一问题是"控制权放在哪里"，而非模型数量或角色数量；可作为评估既有多 Agent 方案（如 [[super-agent|Super-agent]]、Router/Worker 双层架构）的统一视角。
- 中心节点膨胀风险有具体缓解手段：把中心职责限定在组件级路由，组件内部规划/证据汇总/完整性检查下放（巡检案例）。
- 巡检类批量分析任务是"看板＋租约自愈"的天然适用场景：任务多、并行高、执行长、需断点恢复。

## Limitations（局限）

- 单一信源（公众号评论性文章），无第三方核验；论断多为经验性总结。
- 巡检案例为作者团队内部实践，无公开的规模、耗时或量化效果数据。
- 模型边界一节未给出大小模型分工的具体判定规则（如按何种任务特征路由），只给原则。

## Related Knowledge（相关知识）

- [[multi-agent-collaboration-architecture|多 Agent 协作架构与控制权下沉（主题页）]]
- [[task-board-coordination|任务看板（共享状态协作）]]
- [[advisor-on-demand-consultation|Advisor（按需咨询）]]
- [[router-worker-architecture|Router/Worker 双层架构]]
- [[super-agent|Super-agent]]（术语差异见该页 Distinctions）
- [[context-management|上下文管理]]（上下文边界）
- [[ticket-task-persistence|Ticket 任务持久化模型]]

## Source（信源）

- `raw/sources/ai/2026-11-05-multi-agent-control-shift.md`
