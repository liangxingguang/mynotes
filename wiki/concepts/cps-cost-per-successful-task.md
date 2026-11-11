---
id: wiki-concept-cps-cost-per-successful-task
type: concept
title: CPS（Cost per Successful Task）
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: medium
tags:
  - concept
  - ai
  - llm
sources:
  - raw/sources/ai/2026-11-11-llm-inference-cost-cps-governance.md
related:
  - wiki/concepts/llm-inference-cost-governance.md
  - wiki/concepts/agent-evaluation.md
---
# CPS（Cost per Successful Task）

## Definition（定义）

CPS（Cost per Successful Task，每个合格交付的成本）＝ 每成功交付一次任务的成本。固定在同一任务队列上的三个公式（信源 §7）：

```
CPS = 队列内所有可归属净成本 / 通过同版验收的任务数
成功率 = 通过同版验收的任务数 / 队列内提交的合格任务数
平均任务成本 = 队列内所有可归属净成本 / 队列内提交的合格任务数
```

「成功」必须是可观测、可复核的业务定义（在冻结的验收版本与截止时间内通过交付合同），而非模型自评。成功数为零时 CPS 记 NULL，同时显示成本、样本数与失败原因。

## Why It Matters（为什么重要）

单次调用平均成本可以下降而 CPS 上升：信源示例中同一批 1,000 个任务，大模型直达花费 90 美元、成功 900 个（CPS 0.100），小模型优先花费 76 美元、成功 700 个——平均任务成本从 0.090 降至 0.076 美元，CPS 却从 0.100 升至约 0.109 美元，成功率下降 20 个百分点。成本只有固定在「合格交付」上才与业务价值对应，否则调用报表显示降本、业务却为每个合格结果支付更多。

## Core Characteristics（核心特征）

1. **四固定**：分子固定（可归属净成本）、分母固定（通过同版验收的任务数）、时间窗口固定（cohort）、估算状态固定（provisional / final）。
2. **失败成本留在分子**：准入后被预算拒绝、超时、取消或到观察截止仍未完成的任务保留在成功率分母；失败、重复尝试与提前取消已发生的费用保留在 CPS 分子。
3. **cohort 机制**：按任务创建时间划 cohort，等待统一结果观察期与账单回补期；回补与退款进入原 cohort 但另记入账时间；成熟 cohort 才能作正式发布结论，未结算用量与暂估比例超阈值只能出预览报表。
4. **跨租户汇总不平均**：用总成本 / 总成功数，不得平均各租户的 CPS。
5. **P95 按提交任务计**：成本分布基于全部提交任务，而非仅成功任务。

## Structure（结构）

cohort 查询骨架（信源 §7）：先把账本聚合为每任务一行（cost_scope='direct_delivery'、estimate_state ∈ {ACTUAL, APPROVED_ESTIMATE}），再与 task_outcome 关联，按 policy_id + complexity 分组，输出 submitted / successes / net_cost_usd / success_rate / cps_usd / p95_task_cost_usd。

## How It Works（运作方式）

- 成本归因粒度：tenant_id / task_id / attempt_id / operation_id 四层标识贯穿计量、预留与结算；缓存命中、路由分类、重排、复核与失败重试的成本全部留在原任务，不得只将最终模型调用记入 CPS。
- 直接交付 CPS 与全成本 CPS 可同时公布，但必须使用同一任务队列与同一验收版本，不能以不同分母制造「降本」。
- 策略比较按任务首次分配的 policy_id 分组；小模型失败后升级产生的全部成本仍留在原策略组，一个成功任务不得记给两个模型后再汇总。

## Relationships（关系）

### Related Concepts（相关概念）

- [[llm-inference-cost-governance|LLM 推理成本治理]]（CPS 是整个治理框架的核心指标）
- [[agent-evaluation|业务 Agent 全生命周期评测]]（CPS 分母 = 验收定义，与发布非劣门禁同源）

### Distinctions（区分）

- **CPS vs 平均任务成本**：分母为「成功任务」vs「全部提交任务」；平均成本可降而 CPS 升。
- **CPS vs Token 单价**：Token 单价是供应商计费单位，CPS 是业务交付单位，中间隔着工具、重试、升级、校验等成本。

## Evolution（演进）

- 2026-11-12 — 新建，信源为微信公众号《LLM 推理成本治理》，单信源。

## Open Questions（开放问题）

- 不同任务类型（代码审查 / 对话 / 生成）的验收定义需按业务校准；信源只给出代码审查示例。
- 阈值数值（94% / 90% 质量门禁、暂估比例上限）为合成示例，生产阈值需以自身数据校准。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-11-llm-inference-cost-cps-governance.md`

## Related Knowledge（相关知识）

- [[llm-inference-cost-cps-governance|LLM 推理成本治理：从 Token 单价到每个合格交付的真实成本（信源页）]]
