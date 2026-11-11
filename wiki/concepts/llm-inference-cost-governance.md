---
id: wiki-concept-llm-inference-cost-governance
type: concept
title: LLM 推理成本治理
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
  - wiki/concepts/cps-cost-per-successful-task.md
  - wiki/concepts/context-management.md
  - wiki/concepts/thinking-mode.md
  - wiki/concepts/agent-evaluation.md
---
# LLM 推理成本治理

## Definition（定义）

在既定的质量、时延、安全与交付合同下，优化**每个合格交付的成本**（CPS）而非「每次调用多少钱」——把供应商用量、工具、运行时、重试、人工与验收结果放进同一套可审计账本与实验框架的完整方法论体系（信源 §0）。

## Why It Matters（为什么重要）

切到小模型后单次请求账单可能下降，但每个合格交付的成本可能上升（触发补拉上下文、工具重试与大模型复核）；成本治理只有固定在「合格交付」上，模型路由与缓存优化才会带来真实且可持续的业务收益（信源原文结论）。

## Core Characteristics（核心特征）

1. **先守质量，再谈降本**：只有在成功定义、验收版本、风险边界与时延目标相同的前提下，成本比较才有意义。
2. **成本归到任务**：Token、工具、重试、升级、生产校验与退款调整进入同一可审计账本；tenant_id / task_id / attempt_id / operation_id 四层标识贯穿计量、预留与结算。
3. **预算是状态机**：预留/发送/结算/用量缺失/释放/调整有明确幂等与恢复语义，事务固定「先锁租户预算行、再锁任务预算行」。
4. **缓存决策看净收益**：以盈亏平衡公式 n > (w-1)/(1-r) 决策，不以命中率替代节省金额；统计按模型/区域/档位/TTL/前缀版本拆分。
5. **路由看期望成本**：E[cost] = route_cost + small_cost + q × E[escalation_cost | escalation]；升级概率 q 来自全链路生产样本。
6. **发布走统计门禁**：质量非劣先行，再看 CPS / P95 延迟 / 安全边界，四条条件须同时满足。

## Structure（结构）

成本全景四层（信源 §1）：托管模型推理（usage × 价目表）/ 托管与外部工具（调用、页数、检索量、时长）/ 自托管推理（边际成本服务路由、分摊成本服务租户报表、整池支出服务容量决策、闲置单列）/ 网关与运行时 + 生产校验与人工复核（交付必需校验计入、离线评测预算单列）。

预算控制层（信源 §4）：请求 Token Budget（裁剪/限制/拒绝）、单操作成本上限（跳过候选）、单任务上限（停止付费步骤/部分交付）、租户账期上限（拒绝新预留/降级）、RPM / TPM / 并发（限流/排队/退避）。

## How It Works（运作方式）

**账本与调整**：以 (source, source_event_id) 幂等去重，金额用「币种 + 最小货币单位整数」；折扣回溯/退款/纠错/未用量回补以追加式调整事件（adjustment_type / reference_event_id / 金额符号 / 原因码）处理，报表给 gross_cost / credits / net_cost；对账按账户、账单周期、SKU、币种与税费范围对齐，持续跟踪已归属/未归属/暂估/调整/差额。

**预算状态机**：标准路径 = 解析租户与任务 → 选择候选 → 用候选费率估算可控上界 → 同时预留任务与租户额度 → 调用上游 → 依实际用量结算；状态流转 RESERVED → DISPATCHING（条件更新获胜者可发送）→ SETTLED / PENDING_USAGE（响应丢失，占用额度待确认）/ RELEASED（确认未发送）/ ADJUSTED（供应商差额/退款）。预留后崩溃与发送后响应丢失是两种不同故障。硬上限二分：上游能强制 → 事前执行硬上限；否则 → 事后财务上限（照实记账、阻止后续预留、记录超额风险，不能承诺零超支）。Redis 只承担 RPM/TPM/并发，货币预留必须落在具备事务与恢复语义的持久存储。

**缓存经济学**：稳定共享前缀 cache_cost = P×(w + n×r)、normal_cost = P×(1 + n)，严格省钱条件 n > (w-1)/(1-r)（r<1）；w=1.25、r=0.1 一次命中回本，w=2 至少两次。缓存键含租户或授权共享范围、权限指纹、输入、知识版本、Prompt、工具策略与校验版本；命中时仍按当前授权、数据驻留与成功规则检查。

**发布流程**：账本对账先行 → 身份/缓存/驻留边界 → 影子预算校准 → 冻结 cohort 同任务对照（质量非劣先行）→ 路由/升级/缓存逐项灰度，每次变更在同一报表留下质量 / CPS / P95 / 拒绝率 / 安全事件的前后对比。

## Relationships（关系）

### Related Concepts（相关概念）

- [[cps-cost-per-successful-task|CPS（Cost per Successful Task）]]（核心指标）
- [[context-management|上下文管理（Context Management）]]（缓存经济学视角：Kiso 的 break-even 判断被本信源公式量化印证）
- [[thinking-mode|思考模式（Thinking Mode）与模型路由]]（路由期望成本模型为其预算控制/路由评测补方法论）
- [[agent-evaluation|业务 Agent 全生命周期评测]]（非劣门禁与验收契约）
- [[retry-governance|重试治理（Retry Governance）]]（预算/账本视角）

### Dependencies（依赖项）

- 任务级计量与验收体系（CPS 分子/分母数据源）
- 供应商用量与账单对账能力（对账与差额回补）

### Distinctions（区分）

- **vs Token 单价优化**：单价是供应商计费视角，治理是业务交付视角；压低单价不一定降 CPS。
- **vs 传统服务器成本治理**：本方法论固定在「合格交付」，把模型非确定性（升级、重试、校验成本）纳入账本。

## Evolution（演进）

- 2026-11-12 — 新建，信源为微信公众号《LLM 推理成本治理》，单信源。「先计量再设上限」被 [[llm-integration-engineering-hard-parts|面试深挖 84]] 观点六印证；本信源把「计量」推进为账本 + 预算状态机 + 路由期望成本 + 发布门禁的完整治理闭环。

## Open Questions（开放问题）

- 升级率 q 与复杂层质量阈值依赖全链路生产样本，信源示例为合成数据。
- 前缀缓存净节省依赖真实流量复用节奏，信源 E 组结论须在线验证。
- 全成本 CPS 的分摊规则（平台、容量、人工）因组织结构而异，信源只给原则。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-11-llm-inference-cost-cps-governance.md`

## Related Knowledge（相关知识）

- [[llm-inference-cost-cps-governance|LLM 推理成本治理：从 Token 单价到每个合格交付的真实成本（信源页）]]
- [[llm-integration-engineering-hard-parts|大模型接进业务系统：工程难点在哪（面试深挖 84）（信源页）]]
