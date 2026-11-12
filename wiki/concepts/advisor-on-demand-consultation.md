---
id: wiki-concept-advisor-on-demand-consultation
type: concept
title: Advisor（按需咨询）
status: active
created: 2026-11-05
updated: 2026-11-12
confidence: medium
tags:
  - concept
  - ai-agent
  - architecture
  - multi-agent
sources:
  - raw/sources/ai/2026-11-05-multi-agent-control-shift.md
  - raw/sources/ai/2026-11-12-multi-agent-task-board-architecture.md
related:
  - wiki/topics/multi-agent-collaboration-architecture.md
  - wiki/concepts/task-board-coordination.md
  - wiki/concepts/router-worker-architecture.md
  - wiki/concepts/context-management.md
  - wiki/concepts/agent-permission-model.md
  - wiki/sources/2026-11-12-multi-agent-task-board-architecture.md
---
# Advisor（按需咨询）

## Definition（定义）

一种轻量多 Agent 协作关系：主流程由执行 Agent 自主推进，只在遇到高风险判断、专业盲区或方案分歧时，主动向另一个 Agent（Advisor）征求第二意见。Advisor 提供安全评估、架构审查、领域知识补充或对当前计划的反驳，不接管任务、不替执行 Agent 调用工具；最终是否采纳建议由执行 Agent 决定。这是控制权从共享状态向当前执行者继续下沉的一步——与 Master Agent 方向正好相反。

## Why It Matters（为什么重要）

并非每次协作都值得建模成一项任务。当执行 Agent 已经知道该做什么、只是在关键判断上需要另一个视角时，编排成固定流程是过度设计。Advisor 以一次局部咨询换额外认知，把"下一步做什么"的决定留在执行者手里，责任边界清晰：执行 Agent 保持完整上下文和主流程，Advisor 只在局部决策上提供额外认知。

## Core Characteristics（核心特征）

1. **方向与 Master Agent 相反**：Master Agent 是中心节点调用 Worker；Advisor 是执行节点调用咨询者。
2. **第二意见而非接管**：Advisor 不负责接管任务，也不负责替执行 Agent 调用工具；是否采纳由执行 Agent 结合测试结果决定。
3. **责任边界清晰**：执行 Agent 保持完整上下文与主流程；Advisor 不需要知道项目全部历史，也不需要直接改代码的权限（支付模块案例，信源 §3.3）。
4. **适用场景**：不确定性高但不值得预先编排的任务——代码审查、安全评估、产品方案比较、领域咨询。
5. **咨询有成本**：什么时候问、问什么、提供多少上下文、如何判断建议是否值得采纳，都需成为执行 Agent 的一部分能力。
6. **超时兜底**：Advisor 超时或失败时，仍输出已有证据支持的基础结论；能自行解释的问题直接成稿，控制咨询成本（巡检案例 RCA Advisor，信源 §5）。

## Structure（结构）

一次咨询交互的最小要素（信源 §3.3、§5）：

- 提交物：当前设计/证据 + 具体疑问（如异常对象、峰值、持续情况、关联指标）
- Advisor 返回：可能原因 + 验证方向（可含"当前证据不足以确认根因"的不确定性表述）
- 执行 Agent：核对与采纳建议，在产出中保留"可能""待验证"等不确定性

## How It Works（运作方式）

巡检案例中的 RCA Advisor（信源 §5）：Inspector Agent 汇总证据后先自判是否仍有待解释的问题——短时越线已恢复且证据充分的直接成稿；关联指标难解释、可能原因有分歧或需额外领域知识时，才向 RCA Advisor 提交具体疑问；Advisor 返回"时间上接近，建议结合对应时段运行日志进一步验证，当前证据不足以确认具体根因"式的可能原因与验证方向；Inspector 负责核对采纳，报告中保留不确定性。

## Relationships（关系）

### Related Concepts（相关概念）

- [[multi-agent-collaboration-architecture]]：本概念是该主题页三种协作架构之一
- [[task-board-coordination]]：看板建模"可领取的工作"，Advisor 建模"值得征求意见的判断"；两者互补
- [[router-worker-architecture]]：Router 层只处理任务间高层关联；Advisor 连任务间协调都不介入，仅在局部决策上提供认知
- [[context-management]]：Advisor 不需要知道项目全部历史——低上下文负担是其成本优势的前提
- [[agent-permission-model]]：Advisor 不拥有直接改代码权限，是"咨询者无执行权"的权限边界实例

### Dependencies（依赖项）

- 执行 Agent 的自判能力（何时值得问）
- 咨询成本控制（上下文供给量、采纳判断）

### Distinctions（区分）

- **Advisor vs Master Agent**：后者集中决策并指派任务，前者把决策留在执行者、只在局部引入第二意见；调用方向相反。
- **Advisor vs 任务看板**：看板解决"工作怎样被领取"，Advisor 解决"关键判断缺第二意见"；Advisor 协作不需要把问题建模成任务项。
- **Advisor vs 子 Agent 委派**：子 Agent 承接一部分工作并产出交付物；Advisor 不承接工作、只产出意见。

## Evolution（演进）

- 2026-11-05 — 新建，信源为得物技术《多 Agent 架构的三次反转》（Advisor 一节 + 巡检案例 RCA Advisor）。
- 2026-11-12 — 第二信源（知乎专栏《多 Agent 架构—任务看板》）重申 Advisor 方向与 Master Agent 相反（执行节点调用咨询者）、责任边界清晰（执行 Agent 保持完整上下文与主流程，Advisor 只在局部决策提供额外认知），但该信源作者明确表示"**Advisor 模式感觉用处不大，不如 Claude Code 提出的生成器-验证器架构实用**"，未做展开论述。这是信源间对 Advisor 适用性判断的一处分歧（第 1 信源给出巡检案例正面落地，第 2 信源持保留态度），需更多信源验证。

## Open Questions（开放问题）

- "高风险判断"的客观判据缺失，信源只给场景清单（代码审查、安全评估等），未给阈值或规则。
- 多 Advisor 意见冲突时的采纳机制，信源未涉及。
- 咨询成本（上下文供给量）与收益的量化权衡，信源仅定性。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-05-multi-agent-control-shift.md`（§3.3 Advisor：方向相反、责任边界、支付模块案例、咨询成本；§5 RCA Advisor：自判提问、可能原因+验证方向、超时兜底）
- Source: `raw/sources/ai/2026-11-12-multi-agent-task-board-architecture.md`（第 2 信源：重申方向相反与责任边界，作者认为 Advisor 用处不大、不如生成器-验证器架构实用，未展开）

## Related Knowledge（相关知识）

- [[2026-11-05-weixin-multi-agent-control-shift|多 Agent 架构的三次反转：从中心调度到自驱协作（信源页）]]
- [[2026-11-12-multi-agent-task-board-architecture|多 Agent 架构—任务看板（Team Agent）架构（信源页）]]
- [[multi-agent-collaboration-architecture|多 Agent 协作架构与控制权下沉（主题页）]]
- [[task-board-coordination|任务看板（共享状态协作）]]
