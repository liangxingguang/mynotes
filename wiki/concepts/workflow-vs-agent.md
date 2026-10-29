---
id: wiki-concept-workflow-vs-agent
type: concept
title: Workflow vs Agent（控制流分界）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - concept
  - ai-agent
sources:
  - raw/sources/ai/2026-10-28-agent-panorama-roadmap.md
related:
  - wiki/concepts/agent-loop.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/pmta-framework.md
---
# Workflow vs Agent（控制流分界）

## Definition（定义）

Anthropic《Building Effective Agents》的开篇定调（信源 §1.2 引用并核验）：**Workflow** 是 LLM 与工具通过预先写死的代码路径编排（predefined code paths）；**Agent** 是模型在运行时动态决定自己的流程与工具使用（dynamically direct their own processes and tool usage）。一句话：路径写死在代码里 = workflow；路径由模型当场决定 = agent。

## Why It Matters（为什么重要）

这是「接了大模型就叫 agent」泛滥语境下的判据：分界不在模型聪不聪明、不在有没有调工具，而在**控制流（control flow）由谁掌握**。它同时是选型纪律——「自主」意味着不确定、更贵、更难调，能用 workflow 解决的就别上 agent（Anthropic 反复强调）。

## Core Characteristics（核心特征）

1. **三级能力阶梯**：普通聊天（人决定下一步）→ function calling（模型只「声明」调用意图，宿主执行，仍一问一答）→ 自主 agent（模型在 loop 内自己决定行动序列直到终止）。
2. **「自主」三把尺子**：能自己决定下一步动作；一个任务在 loop 里多步完成；有明确的终止/放手条件。
3. **正交于人机协同**：「是否每步都问人」与「路径谁定」是两件事——agent 可以每步停下来等确认，workflow 也可以全自动跑完。

## Structure（结构）

| 维度 | Workflow | Agent |
| --- | --- | --- |
| 路径由谁定 | 开发者，写在代码里 | 模型，运行时决定 |
| 适合任务 | 步骤固定、可预测 | 步骤数无法预判、开放式 |
| 可预测性 | 高 | 低 |
| 成本 / 延迟 | 低 | 高，多一步多一次模型调用 |
| 调试 | 容易，失败定位到某一步 | 难，需要 trace 和护栏 |

## How It Works（运作方式）

判定流程（信源 §1.3）：先问「任务路径能不能预先写死」——能（如「查用户 → 展示」固定流程）用 workflow；不能（如「你自己决定要不要登录、先查谁、要不要改角色」）才轮到 agent。Agent 形态下，传统编排里人写的 if/else 决策被换成模型输出，宿主代码退居「执行器 + 回传结果」。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-loop|Agent Loop]]：agent 形态下控制流的载体——loop 的第②③步（调模型、解析决策）就是「模型当场决定路径」的发生点。
- [[harness-engineering|Harness Engineering]]：agent 比 workflow 多出的不可预测性，由 harness（权限/可观测/终止条件）兜底。
- [[pmta-framework|PMTA 框架]]：agent 形态的能力坐标系。

### Distinctions（区分）

- **function calling ≠ agent**：单次工具调用仍是一问一答，「下一步」由人发起；把「调 → 看结果 → 再问」连成循环才升级为 agent。
- **自主 ≠ 无人监管**：自主仅指行动序列由模型决定，不包含「不需要人介入」。

## Evolution（演进）

- 2026-10-29 — 新建，信源为知乎《Agent》系列第 1 篇（全景与路线图），workflow/agent 定义引自 Anthropic 原文并经作者 2026-10-15 在线核验。

## Open Questions（开放问题）

- 混合形态（workflow 骨架内嵌 agent 子任务）的工程归类待更多信源补充。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-panorama-roadmap.md`

## Related Knowledge（相关知识）

- [[agent-panorama-roadmap|Agent - 全景与学习路线地图（1）（信源页）]]
- [[agent-classic-agent-theory|Agent - 经典 Agent 理论（信源页）]]
