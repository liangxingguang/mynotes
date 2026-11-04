---
id: wiki-concept-tracking-system-design
type: concept
title: B端埋点系统设计
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - concept
  - b端
  - 埋点
  - 数据资产
  - prd
sources:
  - raw/sources/products/2026-11-03-weixin-bend-tracking-system-23.md
related:
  - wiki/sources/bend-tracking-system-23.md
  - wiki/concepts/bend-prd-writing-framework.md
  - wiki/concepts/dashboard-metric-tree.md
  - wiki/concepts/operation-log-design.md
  - wiki/concepts/ticket-system-design.md
  - wiki/concepts/ai-ticket-system.md
---
# B端埋点系统设计

## Definition（定义）

B 端埋点系统：以"业务发生了什么"而非"用户看了什么"为核心，由「4 类事件 + 2 层参数 + 5 步设计法 + 质量校验」构成的埋点落地框架（信源）。B 端数据常用于业务审计与绩效核算，准确性要求高于 C 端，不能只依赖前端埋点（信源）。核心主张（信源）：埋点不是给开发看的文档，是给业务留下的数据资产。

## Why It Matters（为什么重要）

- 功能上线后业务方问"谁用过""流程卡在哪一步"，系统里没有数据能回答；埋点缺失不是技术能力不够，而是缺少从业务目标到数据落地的标准框架（信源）。
- B 端与 C 端四点差异决定了不能照搬 C 端埋点：业务链路长、角色权限复杂（须携带租户/组织/角色）、数据准确性要求高（审计/绩效）、异常与状态变更比交互更重要（信源）。
- （解读）埋点是指标体系的源头：[[dashboard-metric-tree]] 的指标树依赖埋点事件与参数作为数据上游。

## Core Characteristics（核心特征）

1. **业务中心而非页面中心**：核心问题是"业务发生了什么"——流程是否中断、状态是否扭转、接口是否失败（信源）。
2. **4 类事件**：页面浏览（page_view）、元素交互（button_submit）、业务事件（业务对象创建/修改/状态流转）、异常事件（权限拒绝/接口失败/规则未命中）（信源）。
3. **2 层参数**：10 个公共参数每次必带（tenant_id/user_id/role_id/org_id/page_url/module_code/app_version/device_type/timestamp/session_id）+ 各事件业务参数（信源）。
4. **命名规范**：事件按"模块_动作_对象"命名（如 approval_task_approve、purchase_order_create）（信源）。
5. **5 步设计法闭环**：定目标→拆指标→建事件→写参数→验数据（上线前校验+上线后质量监控）（信源）。
6. **质量校验 4 必查**：非空/枚举/范围/逻辑（同一流程事件顺序合理性）（信源）。
7. **PRD 六模块**：文档信息/埋点目标/事件清单/参数字典/上报策略（实时/批量/离线补报）/验收标准（准确率/漏报率/异常处理）（信源）。

## Structure（结构）

事件分类与参数体系（信源）：

| 层 | 内容 | 作用 |
|---|---|---|
| 事件层（4 类） | page_view / button_submit / 业务事件 / 异常事件 | 记录业务发生什么 |
| 公共参数层（10 个） | 租户/用户/角色/组织/页面/模块/版本/设备/时间/会话 | 数据归属与环境识别 |
| 业务参数层 | 各事件专属（如 order_id/total_amount/action） | 支撑具体分析 |

9 个业务系统案例提供事件+参数模板：ERP 采买、OA 审批时效、财务对账、权限拒绝、CRM 跟进、车贷进件、物流轨迹、规则命中、中台接口（信源，详见信源页）。

## How It Works（运作方式）

- 设计链路（信源）：先问业务方"要回答什么问题"（定目标）→ 拆成可量化指标 → 按命名规范建事件 → 定义参数（类型/必填/枚举）→ 上线前校验+上线后监控。
- 权限语义（信源）：公共参数携带租户/组织/角色是业务边界要求，"权限不是限制，是边界"。
- 质量保障（信源）：4 必查项在上线前拦截数据问题（如 total_amount 为负报警、permission_denied 的 user_id 为空属上游未透传）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[bend-prd-writing-framework|B端PRD写作框架]]：PRD 自检清单含"埋点"项，本框架是其展开；埋点 PRD 六模块可并入"一份清单"（解读）。
- [[dashboard-metric-tree|指标树与看板设计]]：埋点事件是指标树的数据上游（解读）。
- [[operation-log-design|B端操作日志设计]]：操作日志偏审计留痕，埋点偏业务分析；两者可互补（日志供审计、埋点供分析）（解读）。
- [[ticket-system-design|工单系统设计]] / [[ai-ticket-system|AI 工单系统]]：工单埋点 5 核心事件（创建成功/接单成功/申请关闭/确认关闭/提交评价）是本框架业务事件的实例（解读+信源）。

### Dependencies（依赖项）

- 组织/角色/租户主数据（公共参数依赖，信源）。
- 上报通道（实时/批量/离线补报策略，信源）。

### Distinctions（区分）

- 与 C 端埋点：C 端围绕用户路径/转化漏斗/留存，页面浏览与触发行为为核心；B 端围绕业务发生，异常与状态变更更重要（信源）。
- 与 [[operation-log-design]]：操作日志回答"谁在何时对什么做了什么"（审计），埋点回答"业务发生了什么、可量化分析"（解读）。

## Evolution（演进）

- 2026-11-04：建页。首信源：专辑第 23 篇（B 端埋点落地框架），单信源，置信度中。

## Open Questions（开放问题）

- 上报策略（实时/批量/离线补报）的选型标准信源未给。
- 埋点数据与数据仓库 ETL/离线分析的衔接信源未覆盖。
- 《B端埋点PRD模板》与《质量校验检查清单》原文称在配套资料包，未收录。

## Evidence（证据）

- 核心命题、4 类事件、10 公共参数、5 步法、9 案例参数字典、4 必查项、PRD 六模块：`raw/sources/products/2026-11-03-weixin-bend-tracking-system-23.md`（公众号《B端产品经理》专辑第 23 篇，2026-11-03 采集）
- 与指标树/操作日志/工单埋点的衔接：本 wiki 编译者解读。

## Related Knowledge（相关知识）

- [[bend-tracking-system-23|信源页：B端埋点体系怎么搭（专辑第23篇）]]
- [[bend-prd-writing-framework|B端PRD写作框架（概念页）]]
- [[dashboard-metric-tree|指标树与看板设计（概念页）]]
- [[operation-log-design|B端操作日志设计（概念页）]]
