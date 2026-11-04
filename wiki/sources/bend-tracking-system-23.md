---
id: wiki-source-bend-tracking-system-23
type: source
title: B端埋点体系怎么搭？建议收藏的落地框架（大皮不皮 · B端产品经理 第23篇）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - source
  - b端
  - 埋点
  - 数据
sources:
  - raw/sources/products/2026-11-03-weixin-bend-tracking-system-23.md
related:
  - wiki/concepts/tracking-system-design.md
  - wiki/concepts/bend-prd-writing-framework.md
  - wiki/concepts/dashboard-metric-tree.md
  - wiki/concepts/operation-log-design.md
---

# B端埋点体系怎么搭？建议收藏的落地框架（大皮不皮 · B端产品经理 第23篇）

## Overview（概览）

公众号《B端产品经理》专辑第 23 篇（据采集文件名序号；作者 大皮不皮，专辑共 32 篇）。给出 B 端埋点体系的落地框架：核心命题"不是用户看了什么，而是业务发生了什么"；4 类事件（页面浏览/元素交互/业务/异常）+ 2 层参数（10 公共参数+业务参数）；埋点设计 5 步法；9 个业务系统案例（事件名+触发时机+业务参数+分析价值）；质量校验 4 必查项；埋点 PRD 六模块。概念本体见 [[tracking-system-design|B端埋点系统设计]]。

## Key Facts（关键事实）

- B 端与 C 端埋点的四点差异（信源）：业务链路长（单看页面浏览无法还原业务）、角色权限复杂（埋点必须携带租户/组织/角色信息）、数据准确性要求高（用于业务审计/绩效核算，不能只依赖前端埋点）、异常与状态变更比交互更重要（关心流程是否中断/状态是否扭转/接口是否失败）。
- 核心命题（信源）：B 端埋点体系的核心不是"用户看了什么"，而是"业务发生了什么"。缺失原因不是技术能力不够，而是缺少从业务目标到数据落地的标准框架。
- 4 类事件（信源）：页面浏览事件（进入/离开/停留时长，page_view）、元素交互事件（按钮/表单/菜单，button_submit）、业务事件（业务对象创建/修改/状态流转，purchase_order_create）、异常事件（权限拒绝/接口失败/规则未命中，permission_denied）。
- 公共参数 10 个（信源）：tenant_id、user_id、role_id、org_id、page_url、module_code、app_version、device_type、timestamp、session_id；每次上报必须携带，用于数据归属和环境识别。
- 参数原则（信源）："权限不是限制，是边界"；参数不是越全越好，而是在业务边界内采集足够支撑分析的数据。
- 埋点设计 5 步法（信源）：定目标（先问业务方要回答什么问题）→拆指标（可量化，如审批平均耗时/各节点达成率/转化率）→建事件（"模块_动作_对象"命名，如 approval_task_submit/approval_task_approve/purchase_order_create）→写参数（公共+业务参数，注明类型/必填/枚举值）→验数据（上线前校验+上线后质量监控）。
- 9 个业务系统案例（信源）：ERP 采买（purchase_order_create：order_id/supplier_id/total_amount/items_count/source(manual/import/api)/department_id）、OA 审批时效（approval_task_approve：process_id/task_id/node_id/approver_id/duration/action）、财务对账（reconciliation_job_complete：job_id/recon_date/match_count/unmatch_count/amount_diff/rule_id）、权限拒绝（permission_denied：user_id/resource_id/required_permission/actual_permission/org_id）、CRM 跟进（crm_follow_up_record：customer_id/follow_up_type(email/visit/phone)/duration/result_code/opportunity_id）、车贷进件（loan_application_submit：application_id/channel(dealer/direct/online)/vehicle_price/loan_amount/term_months/credit_level）、物流轨迹（logistics_status_change：shipment_id/from_status/to_status/operator_id/location_code/event_type(pickup/transit/delivered)）、规则命中（rule_hit：rule_id/rule_type(price/risk/approval)/input_params(json 快照)/output_result/hit_time）、中台接口（api_call：api_code/caller_service/response_time(毫秒)/status_code/is_success）。
- 质量校验 4 必查（信源）：非空校验、枚举校验、范围校验、逻辑校验（同一流程事件顺序是否合理）。示例：total_amount 为负需报警；approval duration 超 30 天需人工确认；permission_denied 的 user_id 为空属上游未透传需修复。
- 埋点 PRD 六模块（信源）：文档信息（版本/修订/涉及系统）、埋点目标、事件清单（事件名/触发时机/类型）、参数字典（公共/业务/类型/必填/枚举）、上报策略（实时/批量/离线补报）、验收标准（准确率/漏报率/异常处理机制）。
- 结论（信源）：埋点不是给开发看的文档，是给业务留下的数据资产。

## Important Claims（重要论断）

### B 端埋点的核心是业务事件而非用户行为

埋点要回答的不是"谁用过这个功能"，而是"业务发生了什么"——流程是否中断、状态是否扭转、接口是否失败（信源）。

### 权限不是限制，是边界

参数采集范围由业务边界决定，不是越全越好（信源）。

### 埋点是数据资产而非开发文档

埋点 PRD 是"给业务留下的数据资产"，验收标准用准确率/漏报率/异常处理机制衡量（信源）。

## Concepts Introduced（引入的概念）

- [[tracking-system-design]]（B端埋点系统设计）
- 4 类事件分类（page_view/button_submit/业务事件/异常事件）
- 2 层参数体系（公共参数+业务参数）
- 埋点设计 5 步法
- 埋点质量校验 4 必查

## Entities Mentioned（提及的实体）

- 业务系统实体（埋点案例所属）：ERP、OA、财务中台、用户中心、CRM、车贷进件、物流、规则引擎、业务中台——系统口径见 [[enterprise-systems-map|B端企业系统全景地图]]（解读）。

## Implications（影响／启示）

- 与 [[bend-prd-writing-framework]] 衔接（解读）：PRD 自检清单覆盖"埋点"项，本篇给出埋点 PRD 的完整六模块结构，是清单中"埋点"的展开。
- 与 [[dashboard-metric-tree]] 衔接（解读）：埋点事件与参数是指标树的数据上游（定目标→拆指标→建事件是同一链条）。
- 与 [[ai-ticket-system]] / [[ticket-system-design]] 衔接（解读）：工单系统"埋点 5 核心事件"（创建成功/接单成功/申请关闭/确认关闭/提交评价）是本篇"业务事件"分类的实例。
- 与 [[operation-log-design]] 区分（解读）：操作日志偏审计留痕（谁在何时对什么做了什么），埋点偏业务分析与指标支撑（业务发生了什么、可量化分析）。

## Limitations（局限）

- 原文称回复关键词【B端埋点】可获取《B端埋点PRD模板》和《B端埋点质量校验检查清单》，模板与清单全文未收录。
- 9 个案例均为单一业务系统视角，跨系统事件关联（如 OMS→WMS→TMS 全链路埋点）未覆盖。
- 上报策略（实时/批量/离线补报）只给分类，无选型标准与技术实现细节。

## Related Knowledge（相关知识）

- [[tracking-system-design|B端埋点系统设计（概念页）]]
- [[bend-prd-writing-framework|B端PRD写作框架（概念页）]]
- [[dashboard-metric-tree|指标树与看板设计（概念页）]]
- [[operation-log-design|B端操作日志设计（概念页）]]

## Source（信源）

- `raw/sources/products/2026-11-03-weixin-bend-tracking-system-23.md`（正文自 Assets 采集稿逐字收录，1px 占位图剔除）
