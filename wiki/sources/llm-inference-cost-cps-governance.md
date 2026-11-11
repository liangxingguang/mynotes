---
id: wiki-source-llm-inference-cost-cps-governance
type: source
title: LLM 推理成本治理：从 Token 单价到每个合格交付的真实成本
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: medium
tags:
  - ai
  - llm
  - engineering
sources:
  - raw/sources/ai/2026-11-11-llm-inference-cost-cps-governance.md
---
# LLM 推理成本治理：从 Token 单价到每个合格交付的真实成本

## Overview（概览）

微信公众号方法论文章，面向多租户 LLM Gateway、Agent Runtime 与 AI 平台工程团队。核心论点：成本治理不应优化「每次调用多少钱」，而应在既定的质量、时延、安全与交付合同下，优化**每个合格交付的成本**（CPS，Cost per Successful Task）。文章以代码审查为贯穿示例，给出从供应商计量 → 账本归因 → 预算状态机 → 缓存净收益经济学 → 路由期望成本 → 对照实验发布门禁的完整闭环。作者明示：除明确标注的官方文档外，文中的价格、实验结果和阈值均为合成示例。

## Key Facts（关键事实）

- CPS 示例：同一批 1,000 个任务，大模型直达花费 90 美元、成功 900 个（CPS 0.100），小模型优先花费 76 美元、成功 700 个——平均提交任务成本从 0.090 美元降至 0.076 美元，但 CPS 从 0.100 美元升至约 0.109 美元，成功率还下降 20 个百分点。
- CPS 三公式：CPS = 队列内所有可归属净成本 / 通过同版验收的任务数；成功率 = 通过同版验收的任务数 / 队列内提交的合格任务数；平均任务成本 = 队列内所有可归属净成本 / 队列内提交的合格任务数。成功数为零时 CPS 记 NULL。
- 成本全景五类：托管模型推理（usage × 价目表）、托管与外部工具（调用/页数/检索量/时长）、自托管推理（边际成本服务路由、分摊成本服务租户报表、整池支出服务容量决策、闲置单列）、网关与运行时（固定分摊规则）、生产校验与人工复核（交付必需校验计入、离线评测预算单列）。
- 价目表至少以 provider、计费账户或合同、模型及版本、区域、服务档位、生效时间为键；每个计费操作保存实际 price_version，账单到达后用独立差额事件回补而非重写历史事件。
- 缓存盈亏平衡：cache_cost = P×(w + n×r) vs normal_cost = P×(1 + n)，严格省钱条件 n > (w-1)/(1-r)（r<1）；w=1.25、r=0.1 一次命中即回本，w=2 至少两次命中。
- 账本幂等：以 (source, source_event_id) 去重，金额用「币种 + 最小货币单位整数」；调整事件带 adjustment_type / reference_event_id / 金额符号 / 原因码，报表给 gross_cost / credits / net_cost；策略比较按首次分配 policy_id 分组，升级全部成本留在原组。
- 预算状态机：RESERVED → DISPATCHING → SETTLED / PENDING_USAGE / RELEASED / ADJUSTED；事务固定先锁租户预算行再锁任务预算行；只有上游能强制时才有事前执行硬上限，否则只有事后财务上限、不能承诺零超支。
- 路由期望成本：E[cost] = route_cost + small_cost + q × E[escalation_cost | escalation]，CPS ≈ E[cost] / P(task_success)；升级概率 q 必须来自全链路生产样本，校验器未发现的错误仍计为潜在失败。
- 对照实验五组（A 大模型直达 / B 小模型直达 / C 分层路由 / D C+受控升级与生产校验 / E D+前缀缓存），100 个合成任务（简单 60/中等 25/复杂 15）：A 95%/$8.50/0.0895，B 80%/$5.20/0.0650，C 92%/$6.45/0.0701，D 95%/$6.95/0.0732，E 95%/$6.34/0.0667。
- 质量门禁阈值示例：总体成功率 ≥94% 且复杂层 ≥90% → 只有 A、D、E 合格；B 的 CPS 最低但复杂层只成功 6/15，不具备上线资格。
- 统计发布门禁四条（须同时满足）：质量非劣（单侧置信下界 ≥ -δ，复杂层单独过）、安全与预算拒绝率达交付合同、P95 延迟不劣、CPS 差值区间支持预期降幅且暂估比例未超阈值。
- 多租户安全边界：tenant_id 从服务端鉴权上下文取得、不信客户端传入值；缓存/工具输出/知识版本默认租户隔离；区域与数据驻留路由前校验；跨租户汇总用总成本/总成功数，不得平均各租户 CPS。

## Important Claims（重要论断）

### 论断一：先守质量，再谈降本

只有在成功定义、验收版本、风险边界与时延目标相同的前提下，CPS 才具有比较意义；成本低但质量不达标的路径不是「更优」，而是不可用。

### 论断二：成本必须归到任务

Token、工具、重试、升级、生产校验和退款调整都应进入同一可审计账本；只看单次模型调用必然失真。

### 论断三：预算不是一个数字，而是一套状态机

预留、发送、结算、用量缺失、超额与退款要有明确的幂等和恢复语义，才不会在并发下失效。

### 论断四：发布以统计门禁为准

候选策略应先证明关键质量指标非劣，再证明 CPS、P95 延迟和安全边界达到预设目标；不能用单个点估计宣布「更便宜」。

## Concepts Introduced（引入的概念）

- [[cps-cost-per-successful-task|CPS（Cost per Successful Task）]]
- [[llm-inference-cost-governance|LLM 推理成本治理]]
- [[context-management|上下文管理（Context Management）]]（缓存净收益经济学印证）
- [[agent-evaluation|业务 Agent 全生命周期评测]]（发布非劣门禁相关）

## Entities Mentioned（提及的实体）

- OpenAI API Pricing / OpenAI Prompt Caching（计价与缓存官方参考，文章仅指向未引内容）
- Claude Prompt Caching（缓存官方实现参考）

## Implications（影响／启示）

- LLM 成本优化的指标应从「单次调用价 / 平均任务成本」升级为 CPS，验收与成本共用同一套分子/分母契约；调用报表显示降本，可能实际为每个合格交付支付更多。
- 缓存决策看净节省而非命中率；预算管理必须有事务与恢复语义，货币预留不能放 Redis。
- 小模型优先 + 升级策略必须以全链路样本评估期望成本；升级率与复杂层质量是发布硬指标。

## Limitations（局限）

- 文中价格、实验数据与阈值均为作者合成示例，非生产实测；方法论结构可用，数值不能直接采信。
- 单一信源（微信公众号），无独立印证；作者身份与背景未知。
- 供应商计价与缓存实现细节留给官方文档，文中未核验。

## Related Knowledge（相关知识）

- [[llm-integration-engineering-hard-parts|大模型接进业务系统：工程难点在哪（面试深挖 84）（信源页）]]（成本治理「先计量再设上限」被本信源印证与深化）
- [[thinking-mode|思考模式（Thinking Mode）与模型路由]]（路由期望成本模型为其预算控制/路由评测补方法论）
- [[retry-governance|重试治理（Retry Governance）]]（预算与账本视角）

## Source（信源）

- `raw/sources/ai/2026-11-11-llm-inference-cost-cps-governance.md`
