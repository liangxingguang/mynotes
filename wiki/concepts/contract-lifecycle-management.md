---
id: wiki-concept-contract-lifecycle-management
type: concept
title: 合同全生命周期管理（Contract Lifecycle Management, B端）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - concept
  - enterprise
  - b-end
  - contract-management
sources:
  - raw/sources/products/2026-11-03-weixin-bend-contract-management-17.md
related:
  - wiki/concepts/approval-workflow-engine.md
  - wiki/concepts/rbac-permission-system.md
  - wiki/concepts/crm-system-design.md
  - wiki/concepts/complex-system-breakdown.md
  - wiki/sources/bend-contract-management-17.md
---
# 合同全生命周期管理（Contract Lifecycle Management, B端）

## Definition（定义）

B 端合同管理系统的设计方法论：把合同从起草、审批、签署、履约到归档视为一条全生命周期链路，而非单一审批流。核心立场：**只做审批流会漏掉起草、履约、归档等关键价值**。系统特点：涉及角色多（业务/法务/财务/管理层/外部客户/供应商）、状态复杂（状态可能超过 10 种）、跨系统协同强（CRM/ERP/财务/电子签/档案）、审计合规要求高（任何改动留痕）。

## Why It Matters（为什么重要）

合同是 B 端企业资金与合规的载体：起草质量决定法务成本，审批效率决定成交速度，履约跟踪决定回款与风险，归档质量决定审计与争议处理能力。把合同系统降格为"审批流"会导致起草无模板沉淀、履约靠人工台账、归档后不可检索——这三个缺口恰是系统价值最高的部分。

## Core Characteristics（核心特征）

1. **五阶段链路**：起草→审批→签署→履约→归档，每阶段有独立的功能要点与价值主张。
2. **起草阶段**：模板库（合同类型模板字段）、条款库、相对方管理、智能填充（从业务对象带出数据减少手工填写）、版本管理。
3. **审批阶段**：审批流配置、会签/或签/加签/转审/授权、移动审批、留痕；按合同金额、类型、风险等级动态路由（与 [[approval-workflow-engine]] 条件分支同构）。
4. **签署阶段**：电子签章集成、用印申请、签署顺序、实名认证、签署状态回传；线下用印与线上电子签统一管理。
5. **履约阶段（易忽略、价值高）**：计划、里程碑、提醒、变更、风险预警、收付款关联。
6. **归档阶段（不是终点）**：自动归档、全文检索、权限、审计日志、到期提醒、借阅；支持后续查询、争议处理和数据分析。
7. **状态机先行**：草稿、审批中、签署中、履约中、变更中、归档、失效等状态及触发条件要先定义再画页面（与 [[complex-system-breakdown]] 一致）。

## Structure（结构）

五阶段设计要点与关键能力：

| 阶段 | 关键能力 | 常见坑 |
|---|---|---|
| 起草 | 模板库、条款库、相对方管理、智能填充、版本管理 | 模板字段不统一，重复填写 |
| 审批 | 动态路由、会签/或签/加签/转审/授权、移动审批、留痕 | 只做固定流程，不按金额/类型/风险分级 |
| 签署 | 电子签集成、用印申请、实名认证、状态回传 | 线下用印与线上电子签割裂管理 |
| 履约 | 计划、里程碑、提醒、变更、风险预警、收付款关联 | 被当作"审批完就结束"，靠人工台账跟踪 |
| 归档 | 自动归档、全文检索、权限、审计日志、到期提醒、借阅 | 归档即终点，后续查询/争议/分析无支撑 |

PM 六步 SOP：①梳理角色与业务目标（业务/法务/财务/管理层分别要什么）②定义合同状态机 ③拆分功能模块并定优先级 ④绘制核心流程（主流程/异常流程/逆向流程）⑤设计权限与审计（角色/数据范围/动作权限，审计覆盖关键动作）⑥制定里程碑与指标（评审周期、履约逾期率、归档完整率、审计准备时长）。

## How It Works（运作方式）

以某装备制造企业案例（年合同量约 1.2 万份）为例：14 类合同模板统一字段、相对方库与 CRM 同步（起草）；按金额/类型/风险等级多级审批、法务会签、授权审批自动提醒（审批）；对接电子签平台、用印线上化、签署状态自动回传（签署）；里程碑自动生成、回款/付款提醒、逾期风险预警（履约）；自动归档+全文检索+完整审计日志（归档）。效果：评审周期 7 天→2 天，审计抽检准备 3 天→0.5 天。

## Relationships（关系）

### Related Concepts（相关概念）

- [[approval-workflow-engine]]：合同审批是审批流引擎的典型实例（动态路由+会签/加签）。
- [[rbac-permission-system]]：合同系统的权限与审计设计依据（角色/数据范围/动作权限）。
- [[crm-system-design]]：CRM 成交阶段含合同管理；相对方库与 CRM 同步是两系统关键接口。
- [[complex-system-breakdown]]：状态机先行的方法论同源。

### Dependencies（依赖项）

- 电子签平台（签署阶段外部依赖）、CRM/ERP/财务/档案系统（跨系统协同）。

### Distinctions（区分）

- 与"审批流系统"的区分：审批流只是五阶段之一；合同系统必须覆盖起草（价值前置）、履约（价值高点）、归档（价值延续）。
- 与 CLM 商业软件（如合同管理套件）的区分：本文是 PM 设计框架而非产品评测。

## Evolution（演进）

AI 提效五场景（2026-11-03 信源）：①智能起草（业务字段自动生成初稿）②智能风险识别（条款扫描提示异常表述）③智能审批（规则引擎+AI 辅助意见，减少简单审批人工量）④智能履约（从合同文本提取履约节点自动生成计划）⑤智能归档（OCR+关键词抽取提升检索）。与 [[bend-ai-approval-flow]] 的审批智能化整体方案互补。

## Open Questions（开放问题）

- 履约节点的自动提取准确率未量化（需 OCR/NLP 能力的工程验证）。
- 电子签与线下用印并存时的法律效力与审计一致性，本文未覆盖法务合规细则。
- AI 风险识别的误报/漏报率无数据，落地需灰度与人工复核闭环。

## Evidence（证据）

- Source: `raw/sources/products/2026-11-03-weixin-bend-contract-management-17.md`（微信公众号 · 大皮不皮《B端产品经理》专辑第 17 篇，单信源，案例数字为作者自述）

## Related Knowledge（相关知识）

- [[bend-contract-management-17|信源页：合同管理系统从起草到归档的SOP]]
- [[approval-workflow-engine|审批流引擎]]
- [[rbac-permission-system|RBAC 权限系统]]
- [[crm-system-design|CRM 系统设计框架]]
