---
id: wiki-concept-agent-legacy-system-integration
type: concept
title: Agent 对接旧系统（Legacy System Integration）
status: active
created: 2026-11-03
updated: 2026-11-03
confidence: medium
tags:
  - concept
  - ai-agent
  - legacy-integration
  - b-end
sources:
  - raw/sources/ai/2026-11-03-weixin-bend-ai-agent-legacy-21.md
related:
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/retry-governance.md
  - wiki/concepts/agent-permission-model.md
  - wiki/sources/bend-ai-agent-legacy-integration.md
---
# Agent 对接旧系统（Legacy System Integration）

## Definition（定义）

AI Agent 落地 B 端业务时，把 Agent 连接到运行多年、技术栈老、接口能力参差不齐的既有系统（旧 CRM、旧工单系统等）的工程方法。核心主张（自信源）：旧系统对接是 Agent 落地的首要关卡——Agent 要产生业务价值必须连接真实业务数据与流程，而旧系统无标准接口、文档缺失、权限申请周期长是常见现状；对接不是纯技术执行，而是产品经理主导的落地工程。

## Why It Matters（为什么重要）

- 不提前做系统盘点的典型后果（信源）：技术方案反复改、灰度范围失控、上线后数据质量不达标。
- （解读）B 端 Agent 项目的价值瓶颈常不在模型而在"连得上、写得回、不出事故"，本框架把这一隐性工程显式化为五步 SOP。

## Core Characteristics（核心特征）

1. **先盘点后方案**：拉业务、研发、运维共同完成系统盘点（九字段盘点表），产出《旧系统对接盘点表》，避免拍脑袋选方案。
2. **按系统能力选型**：依据"有无 API、有无库权限、调用频率"在四类对接模式中选择或混合，而非一刀切。
3. **字段映射先行**：把 Agent 需要的字段、动作与旧系统能力对齐，明确数据字典、状态流转、异常码、幂等键。
4. **灰度渐进开放写权限**：先只读后写；白名单、限流、人工确认开关；从少量门店/单据起步。
5. **写动作设安全边界**：Agent 不直接写核心表，只写中间表由人工确认后同步。
6. **以数据复盘驱动扩量**：对照上线前指标输出效果数据与遗留问题，决定是否扩量。

## Structure（结构）

四类对接模式（信源，按系统能力分层）：

| 模式 | 适用条件 | 优点 | 局限 |
|---|---|---|---|
| API 对接 | 旧系统具备标准接口（REST/SOAP/WebService） | 稳定、可维护，适合高频读写 | 依赖系统已有接口能力 |
| 数据库只读+事件表 | 无 API 但可申请数据库只读权限 | 事件表/时间戳捕获增量；只读降写坏数据风险 | 需数据库权限；仍不解决写回 |
| RPA/UI 自动化 | 无 API、无库权限，只能界面交互 | 模拟人工查看/输入/提交 | 适合低频、规则固定的写动作；不适合高频实时场景 |
| 中间件/消息网关 | 多个系统互相调用 | Agent 只对接网关，网关适配旧系统差异 | 需新建统一对接层 |

选型五维度打分（信源）：实时性、安全、开发投入、稳定性、可维护性。

## How It Works（运作方式）

落地 SOP 五步（信源）：

1. **系统盘点**：输出系统清单、接口能力、限制条件（九字段）。
2. **方案选型**：标出每个系统走哪种对接模式，估算开发投入。
3. **字段映射**：数据字典、状态流转、异常码、幂等键四件套。
4. **灰度验证**：先跑只读任务再开放写动作；白名单/限流/人工确认开关；少量门店/单据起步。
5. **复盘总结**：对照上线指标输出效果数据与遗留问题清单，决定扩量。

PM 三个核心动作（信源）：把业务目标翻译成系统能力要求；用风险预案（降级/人工接管/回滚）替代技术理想主义；用灰度数据说服业务方，不一上线全量。

实例（某连锁零售旧 CRM + 智能工单 Agent，信源案例）：数据读取=只读账户+事件表捕获增量；写回=RPA 按固定规则模拟人工+失败重试+人工接管；安全边界=Agent 只写中间表、人工确认后同步。效果：工单录入人力降约 40%、T+1→准实时、RPA 写回成功率 95%+（作者自述，未经独立验证）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[idempotency-design|幂等设计]]：跨系统一致性的支点——幂等键+重试避免重复写单。
- [[retry-governance|重试治理]]：RPA 写回"失败重试+人工接管"是重试治理的 B 端实例。
- [[agent-permission-model|Agent 权限模型]]：只读权限申请、读写分离、变更类强制审批，与本框架安全边界互补（解读）。
- [[event-driven-agent|事件驱动 Agent]]：事件表捕获增量的读侧机制（本页未展开，待补信源）。

### Dependencies（依赖项）

- 数据库只读权限 / API 接口能力 / RPA 可界面化操作（信源：按系统能力选择模式）。

### Distinctions（区分）

- 与 [[table-sharding-migration|分表迁移]]、[[framework-first-migration|框架先行迁移]] 不同：本页关注 Agent 与**仍在运行的旧系统**共存对接（读旧库、经 UI 写回），而非系统自身的迁移改造（解读）。

## Evolution（演进）

- 2026-11-03：建页。首信源：B 端 PM 视角的旧系统对接五步框架（盘点/选型/映射/灰度/复盘）+ 四类对接模式 + 连锁零售旧 CRM 工单 Agent 案例。单信源，置信度中。

## Open Questions（开放问题）

- 四类模式的量化选型标准（五维度如何打分、权重如何）信源未给。
- 混合模式（只读+事件表+RPA 写回）的长期维护成本与故障面未见数据。
- 旧系统无事件表时如何捕获增量（CDC/日志解析）信源未覆盖。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-03-weixin-bend-ai-agent-legacy-21.md`（公众号「B端产品经理」第 21 篇，2026-11-03 采集）

## Related Knowledge（相关知识）

- [[bend-ai-agent-legacy-integration|B端产品经理实操：AI Agent落地旧系统对接的完整框架（信源页）]]
- [[bend-rbac-permission-system-design|B端RBAC权限系统完整产品设计]]（同专辑，权限设计）
