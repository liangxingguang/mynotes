---
id: wiki-topic-enterprise-systems-map
type: topic
title: B端企业系统全景地图（10 大系统）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - topic
  - enterprise
  - b-end
  - enterprise-systems
sources:
  - raw/sources/products/2026-11-03-weixin-bend-enterprise-systems-07.md
related:
  - wiki/sources/bend-enterprise-systems-07.md
  - wiki/topics/erp-architecture-design.md
  - wiki/concepts/crm-system-design.md
---
# B端企业系统全景地图（10 大系统）

## Scope（范围）

覆盖 B 端产品经理需要掌握的 10 大企业系统（ERP/CRM/OA/WMS/TMS/HRM/FMS/MES/SRM/ITSM），统一按「定位 → 核心模块 → 关键指标 → PM 注意点」四段式给出速查口径。本页是导航型页面：单信源概览口径，各系统的设计深水区由对应专辑分篇信源逐步补充。

## Current Understanding（当前认知）

10 大系统的四段式速查（来源：`raw/sources/products/2026-11-03-weixin-bend-enterprise-systems-07.md`）：

| 系统 | 定位 | 核心模块 | 关键指标 | PM 注意点 |
|---|---|---|---|---|
| ERP | 企业内部资源"总调度中心"，打通采购/生产/销售/库存/财务 | 采购、库存、生产计划、销售、财务 | 库存周转率、订单准时交付率、账实一致率 | 跨部门协同难，用全局流程视角做取舍 |
| CRM | 客户全生命周期，线索→成交→售后 | 线索、客户、商机、报价、服务 | 线索转化率、客户留存率、销售周期长度 | 销售团队使用意愿比功能更重要，减少录入负担 |
| OA | 内部协同与审批流转基础设施 | 流程审批、公文、会议、知识文档、任务 | 审批平均时长、流程驳回率、活跃用户数 | 避免"流程堆积"，审批节点符合权责 |
| WMS | 仓库入库/出库/库内作业 | 收货、上架、拣货、盘点、库存调整 | 拣货准确率、库存准确率、库位利用率 | 强依赖条码/RFID 硬件，考虑现场"低抬头"场景 |
| TMS | 运输订单/车辆调度/在途跟踪/运费结算 | 运单、调度配载、在途跟踪、签收、运费核算 | 车辆满载率、准时到达率、运输开销占比 | 对接 GPS/电子围栏，异常处理是重点，先做实数据质量 |
| HRM | 员工全生命周期+组织架构/薪酬绩效 | 组织人事、考勤、薪酬、绩效、招聘 | 招聘漏斗转化率、月度考勤异常率、薪酬计算准确率 | 规则性强，不用"灵活配置"掩盖业务规则不清晰 |
| FMS | 总账/应收应付/固定资产/费用报销 | 总账、应收、应付、固定资产、费用报销 | 账务处理及时率、费用报销周期、资产负债准确率 | 数据准确性与审计追溯要求极高，保留完整凭证链路 |
| MES | 连接计划层（ERP）与控制层（设备） | 工单管理、生产排程、质量检验、设备管理、生产追溯 | 设备综合效率、生产直通率、计划达成率 | 对接 PLC/SCADA，深入车间理解生产节拍 |
| SRM | 供应商准入/采购寻源/合同协同/绩效评估 | 供应商准入、询报价、采购合同、供货协同、供应商绩效 | 供应商准时交付率、采购降本率、供应商合格率 | 双边协同，外部用户没耐心，操作路径尽量短 |
| ITSM | IT 服务请求/故障处理/变更发布/知识库 | 事件管理、问题管理、变更管理、资产管理、知识库 | 平均响应时间、服务台解决率、用户满意度 | 分类与流程标准化是难点，SLA 拆解到每个环节 |

框架逻辑（信源论断）：10 个系统覆盖"从内部管理到外部协同"的全局场景——ERP/HRM/FMS 管内部资源与人力财务，OA 管内部协同，WMS/TMS/MES 管现场作业，CRM/SRM 管外部客户与供应商双边协同，ITSM 管企业 IT 服务。

## Key Concepts（关键概念）

- [[erp-architecture-design|ERP 架构设计]]（ERP 深水区主题，本文给 PM 速查口径）
- [[crm-system-design|CRM 系统设计框架]]（CRM 设计细节概念页，与本文互证）
- 四段式速查口径（定位/模块/指标/注意点）——本文贡献的答题模板

## Key Entities（关键实体）

- ERP、CRM、OA、WMS、TMS、HRM、FMS、MES、SRM、ITSM（10 个系统实体，单信源概览口径；除 ERP/CRM 外暂无独立页面，细节待采集后补充）

## Important Decisions（重要决策）

- 当前信源未记载具体架构决策；仅给出 PM 选型/设计注意点（见表格"PM 注意点"列）。

## Major Developments（重大进展）

- 无时间线型进展；本文是快照式速查地图。

## Disagreements（分歧）

- 无直接矛盾。模块口径注意：本文 CRM 核心模块为"线索/客户/商机/报价/服务"，[[crm-system-design]] 为"客户/商机/订单/服务/看板"——两者是不同抽象层级（产品地图 vs 系统设计），非冲突，引用时注明口径。

## Open Questions（开放问题）

- 各系统的实施细节、集成关系（ERP↔MES、CRM↔ERP 数据流）待专辑分篇采集后补充。
- WMS 入库流程、TMS 调度算法等面试深问点仅给方向，无落地细节。

## Related Topics（相关主题）

- [[erp-architecture-design|大型 ERP 产品架构设计]]（ERP 深水区）
- [[bend-enterprise-systems-07|信源页：B端产品经理必懂的10个企业系统]]
- [[crm-system-design|CRM 系统设计框架]]（概念页，CRM 互证）
