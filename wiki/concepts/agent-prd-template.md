---
id: wiki-concept-agent-prd-template
type: concept
title: Agent 化 PRD 模板（Agent-ified PRD Template）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - concept
  - prd
  - b-end
  - ai-agent
sources:
  - raw/sources/products/2026-11-03-weixin-bend-multi-agent-saas-24.md
related:
  - wiki/concepts/multi-agent-saas-refactoring.md
  - wiki/concepts/approval-workflow-engine.md
  - wiki/concepts/ai-ticket-system.md
  - wiki/concepts/demand-review-sop.md
---
# Agent 化 PRD 模板（Agent-ified PRD Template）

## Definition（定义）

多智能体重构业务流后，PRD 模板的改造方案（自信源）：传统 PRD 写页面、字段、流程；Agent 化 PRD 在此基础上新增五个模块——Agent 能力卡片、协作时序、护栏机制、评测集、指标。（解读）核心主张：Agent 化不是在 PRD 里加一段"AI 需求"，而是把 Agent 当作可独立验收的协作单元来定义——五模块与业务流重构五步法一一对应，是五步法的文档化投影。

## Why It Matters（为什么重要）

- 传统 PRD 的对象是"页面/字段/流程"，无法表达多 Agent 协作中的权限边界、评测标准与回滚机制（信源+解读）。
- （解读）五模块与五步法的对应关系：能力卡片↔定义 Agent 角色与边界；协作时序↔设计协作协议；护栏机制↔嵌入权限审计与人工干预；评测集↔建立评测与回滚机制；指标↔效果度量——缺任一模块，Agent 化 PRD 就无法被评审和验收。
- 与 [[demand-review-sop|B端需求评审SOP]] 衔接（解读）：评审三张表前置冲突，Agent 化 PRD 的五模块为"角色权限异常流程"表提供 Agent 角色与权限边界素材。

## Core Characteristics（核心特征）

1. **Agent 能力卡片**：每个 Agent 的名称、目标、输入、输出、工具、权限（信源）。
2. **协作时序**：用状态机/时序图描述多 Agent 交互（信源）。
3. **护栏机制**：不可覆盖规则、人工退出路径、灰度策略（信源）。
4. **评测集**：典型 case、边界 case、预期输出（信源）。
5. **指标**：任务完成率、人工介入率、业务周期、风险拦截率（信源）。

## Structure（结构）

五模块与传统 PRD 的关系（信源）：

```
Agent 化 PRD
├── 传统 PRD 部分：页面、字段、流程（保留）
└── 新增五模块
    ├── Agent 能力卡片（名称/目标/输入/输出/工具/权限）
    ├── 协作时序（状态机/时序图）
    ├── 护栏机制（不可覆盖规则/人工退出路径/灰度策略）
    ├── 评测集（典型 case/边界 case/预期输出）
    └── 指标（任务完成率/人工介入率/业务周期/风险拦截率）
```

## How It Works（如何运作）

五模块与业务流重构五步法的映射（解读，对应关系为编译者归纳）：

| 五步法 | PRD 五模块 | 说明 |
|---|---|---|
| 拆业务事件，找决策点 | 协作时序 | 业务事件链即多 Agent 交互的时序骨架 |
| 定义 Agent 角色与边界 | Agent 能力卡片 | 身份/目标/工具/权限写入卡片 |
| 设计协作协议 | 协作时序 + 能力卡片 | 任务卡片六要素落入时序与卡片 |
| 嵌入权限、审计与人工干预 | 护栏机制 | 不可覆盖规则、人工退出路径、灰度策略 |
| 建立评测与回滚机制 | 评测集 + 指标 | 典型/边界 case 与预期输出、四项指标 |

实例（信源 ERP 案例的 PRD 要点）：预算 Agent 的工具为读预算表、写预算锁定；权限为不可修改历史预算；协作协议为"预算余额不足时，向采买人返回替代方案，不直接终止流程"——这正是能力卡片（工具/权限）与护栏机制（协作协议）的文档化实例。

## Relationships（关系）

### Related Concepts（相关概念）

- [[multi-agent-saas-refactoring|多智能体重构 SaaS 业务流]]：本页是该方法的配套文档化件（解读）。
- [[approval-workflow-engine|审批流引擎（含 AI 改造层）]]：审批流场景下 Agent 化 PRD 的护栏与指标可复用该页的验收清单（解读）。
- [[ai-ticket-system|AI 工单系统]]：该页 PRD 2.0 已有目标指标/六项埋点/验收标准，与本页"指标+评测集"模块互为印证（解读）。
- [[demand-review-sop|B端需求评审SOP]]：评审三张表中的"角色权限异常流程"表可直接消费能力卡片与护栏机制（解读）。

### Dependencies（依赖项）

- 多智能体架构设计（本页是其文档化投影，解读）。
- 业务流重构五步法（信源：五模块与五步法配套）。

### Distinctions（区分）

- 与传统 PRD（页面/字段/流程）：本页是增量改造而非替代，传统部分保留（信源）。
- 与 [[ai-native-sdlc|AI 原生 SDLC]]：本页面向产品需求文档，后者面向研发交付流程（解读）。

## Evolution（演进）

- 2026-11-04：建页。首信源：B 端 PM 视角的 Agent 化 PRD 五模块（能力卡片/协作时序/护栏机制/评测集/指标），单信源，置信度中。

## Open Questions（开放问题）

- 五模块的必备性：哪些场景必须全部五模块、哪些可裁剪（信源未给）。
- 指标口径：人工介入率、风险拦截率等如何统计与归因（信源只列名称）。
- 传统 PRD 模板与 Agent 化 PRD 的合并/迁移策略（存量 PRD 如何渐进改造）信源未覆盖。

## Evidence（证据）

- Agent 能力卡片/协作时序/护栏机制/评测集/指标五模块：`raw/sources/products/2026-11-03-weixin-bend-multi-agent-saas-24.md`（公众号《B端产品经理》专辑第 24 篇，2026-11-03 采集）
- 五模块与五步法的对应关系为本 wiki 编译者的解读（信源只并列列出五模块），案例为作者匿名口述。

## Related Knowledge（相关知识）

- [[bend-multi-agent-saas-24|B端系统多智能体重构SaaS业务流（信源页）]]
- [[multi-agent-saas-refactoring|多智能体重构 SaaS 业务流（概念页）]]
- [[bend-ai-ticket-system-prd-2|B端产品经理实战：AI工单系统PRD 2.0（信源页）]]
- [[demand-review-sop|B端需求评审SOP（概念页）]]
