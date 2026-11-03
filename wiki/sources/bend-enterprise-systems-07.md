---
id: wiki-source-bend-enterprise-systems-07
type: source
title: B端产品经理必懂的10个企业系统：从ERP到ITSM的实战地图（大皮不皮 · B端产品经理 第7篇）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - source
  - enterprise
  - b-end
  - erp
  - crm
  - enterprise-systems
sources:
  - raw/sources/products/2026-11-03-weixin-bend-enterprise-systems-07.md
related:
  - wiki/topics/enterprise-systems-map.md
  - wiki/topics/erp-architecture-design.md
  - wiki/concepts/crm-system-design.md
---
# B端产品经理必懂的10个企业系统：从ERP到ITSM的实战地图（大皮不皮 · B端产品经理 第7篇）

## Overview（概览）

公众号《B端产品经理》专辑第 7 篇（作者 大皮不皮，共 32 篇）。核心论点：B 端 PM 面试高频追问"做过哪些系统、ERP 与 CRM 区别、WMS 入库流程怎么设计"，答不上来即出局；本文以 10 个企业系统搭建从内部资源到外部协同的全局框架，每个系统统一按「定位 → 核心模块 → 关键指标 → PM 注意点」四段式给出速查口径。

## Key Facts（关键事实）

- 10 个系统的四段式速查口径（定位/核心模块/关键指标/PM 注意点），详见 [[enterprise-systems-map]]。
- ERP：定位"企业内部资源总调度中心"，打通采购/生产/销售/库存/财务；关键指标库存周转率、订单准时交付率、账实一致率；PM 注意跨部门协同与全局流程视角。
- CRM：定位"客户全生命周期"，线索→成交→售后；关键指标线索转化率、客户留存率、销售周期长度；PM 注意销售团队使用意愿比功能更重要，减少录入负担。
- OA：定位"内部协同与审批流转基础设施"；PM 注意避免"流程堆积"，审批节点符合权责。
- WMS：定位"仓库入库/出库/库内作业"；强依赖条码/RFID 硬件，考虑现场"低抬头"场景。
- TMS：定位"运输订单/车辆调度/在途跟踪/运费结算"；需对接 GPS/电子围栏，异常处理是重点，先做实数据质量。
- HRM：定位"员工全生命周期+组织架构/薪酬绩效"；规则性强，不用"灵活配置"掩盖业务规则不清晰。
- FMS：定位"总账/应收应付/固定资产/费用报销"；数据准确性与审计追溯要求极高，保留完整凭证链路。
- MES：定位"连接计划层（ERP）与控制层（设备）"；需对接 PLC/SCADA，PM 要深入车间理解生产节拍。
- SRM：定位"供应商准入/采购寻源/合同协同/绩效评估"；核心是双边协同，外部用户没耐心，操作路径尽量短。
- ITSM：定位"IT 服务请求/故障处理/变更发布/知识库"；SLA 拆解到每个环节而非只挂总目标。

## Important Claims（重要论断）

### Claim 1：企业系统知识是 B 端 PM 的面试硬通货

"面试时很多面试官会直接问：你做过哪些系统？ERP 和 CRM 的区别是什么？WMS 的入库流程怎么设计？如果你支支吾吾，基本就结束了。"（全文引言）

### Claim 2：10 个系统覆盖"内部资源 → 外部协同"的全局框架

"以上 10 个系统，基本覆盖了 B 端产品经理从内部管理到外部协同的主要业务场景。面试时，能说清每个系统的定位、核心模块和关键指标，就已经超过大部分人。"（全文结尾）

### Claim 3：每个系统都有统一的"定位-模块-指标-注意点"四段式口径

全文对 10 个系统一律采用「定位 / 核心模块 / 关键指标 / 产品经理注意点」四段结构——这是本文作为速查地图的骨架，也是 PM 回答面试题的答题模板（信源论断）。

## Concepts Introduced（引入的概念）

- [[enterprise-systems-map|B端企业系统全景地图]]（本信源编译的主题页：10 系统四段式速查）
- ERP/CRM/OA/WMS/TMS/HRM/FMS/MES/SRM/ITSM 十个系统实体（单信源概览口径，细节待后续专辑分篇采集）

## Entities Mentioned（提及的实体）

- [[erp-architecture-design|ERP]]（与 [[erp-architecture-design]] 主题互补：本文给 PM 速查口径，该主题给架构设计深水区）
- [[crm-system-design|CRM]]（与 [[crm-system-design]] 互证：定位/指标口径一致）

## Implications（影响／启示）

- 与 [[erp-architecture-design]] 衔接：本文 ERP 段（总调度中心、五大核心模块、库存周转率等指标）是 PM 面试口径；该主题是架构师设计口径，两者可互相引用（解读）。
- 与 [[crm-system-design]] 互证：本文 CRM 段（客户全生命周期、线索转化率/客户留存率/销售周期）与该页定位、指标一致；模块口径差异（本文"线索/客户/商机/报价/服务" vs 该页"客户/商机/订单/服务/看板"）已在主题页标注（解读）。
- 面试答题可直接用四段式：定位一句话 → 核心模块 3-5 个 → 关键指标 2-3 个 → PM 注意点 1 个（解读）。

## Limitations（局限）

- 单一作者经验总结文，每个系统仅一段概要，无实施细节与量化案例；系统间关系（集成/数据流）未展开。
- 覆盖 10 个系统但深度有限；ERP 架构深水区见 [[erp-architecture-design]]，CRM 设计细节见 [[crm-system-design]]。
- "第 7 篇"篇号据采集文件名序号推断，原文未标注篇号。

## Related Knowledge（相关知识）

- [[enterprise-systems-map|B端企业系统全景地图（主题页）]]
- [[erp-architecture-design|大型 ERP 产品架构设计（主题页）]]
- [[crm-system-design|CRM 系统设计框架（概念页）]]

## Source（信源）

- `raw/sources/products/2026-11-03-weixin-bend-enterprise-systems-07.md`
