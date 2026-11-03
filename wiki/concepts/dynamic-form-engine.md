---
id: wiki-concept-dynamic-form-engine
type: concept
title: 动态表单引擎（B端表单配置引擎）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - concept
  - b端
  - 动态表单
sources:
  - raw/sources/products/2026-11-03-weixin-bend-dynamic-form-13.md
related:
  - wiki/sources/bend-dynamic-form-13.md
  - wiki/concepts/approval-workflow-engine.md
  - wiki/concepts/control-plane-design.md
  - wiki/comparisons/dynamic-form-vs-workflow-vs-rule-engine.md
---

# 动态表单引擎（B端表单配置引擎）

## Definition（定义）

B 端系统（ERP/CRM/OA）中把页面结构抽象为 JSON Schema、以配置化方式生成字段、校验、联动与版本管理的引擎能力。它不只是拖拽生成字段，而是将校验、字段联动、版本管理融合成一套可复用的规则系统。

## Why It Matters（为什么重要）

- B 端采购、报销、入库、客户信息收集等场景都依赖表单，不同企业字段与流程差异极大；每个表单都写死代码会使开发与维护投入持续上升。
- 配置化把业务人员从重复开发中释放出来：ERP 采购申请表单案例交付周期从 5 个工作日缩短到 1 个工作日，开发投入下降约 60%。

## Core Characteristics（核心特征）

1. 四层能力：动态表单（字段/布局/展示类型可配置）、校验（前后端分离）、联动（显隐/赋值/选项变更）、版本管理（发布/回滚/存量兼容）。
2. Schema 描述一切：页面结构抽象为 JSON Schema，字段配置含 key/label/type/required/validations/events/defaultValue。
3. 校验引擎六类规则：必填、格式（email/联络号/身份号）、范围（数字区间/日期区间）、正则、远程（接口判重）、自定义函数；触发时机：字段失焦、值变化、提交前统一校验。
4. 字段联动五种类型：显隐、只读、赋值（选供应商带出税率/账期）、选项变化（省份→城市）、校验变化；防循环机制：联动层级上限 5 层。
5. 版本管理策略：每次发布生成不可变版本号（v1.0/v1.1）；旧数据保存 schema_version 按对应版本渲染；字段删除只停用不物理删除；版本差异对比；回滚直接切换上一版本。

## Structure（结构）

| 层 | 能力 | 要点 |
|---|---|---|
| 动态表单 | 字段/布局/展示类型可配置 | Schema 驱动：key/label/type/required/validations/events/defaultValue |
| 校验 | 前后端校验分离 | 六类规则 + 三种触发时机（失焦/值变化/提交前统一） |
| 联动 | 字段间显隐/赋值/选项变更 | 五种类型；层级上限 5 层防 A→B→A 死循环 |
| 版本管理 | 发布/回滚/存量兼容 | 不可变版本号；schema_version 渲染；删除只停用；回滚切版本 |

## How It Works（运作方式）

1. 把表单页面抽象为 JSON Schema，字段不写死，通过配置生成（含联动触发事件 events）。
2. 校验引擎按规则类型与触发时机执行：失焦校验格式、值变化校验联动、提交前统一校验（含远程校验预算余额、金额阈值触发审批）。
3. 联动引擎按配置驱动字段显隐/赋值/选项变化，并受层级上限约束防死循环。
4. 版本管理回答三个问题：新表单发布后旧数据如何展示（按 schema_version 渲染）、字段调整后是否迁移（只停用不删除）、配置错误如何回滚（切上一版本）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[approval-workflow-engine|审批流引擎]]——表单校验可触发审批流（金额>5000 触发特殊审批）
- [[control-plane-design|规则控制面]]——校验/联动规则属业务规则控制面范畴
- [[expand-migrate-contract|Expand/Migrate/Contract]]——schema_version 渲染与字段停用是 Schema 跨版本演进的表单侧实例

### Dependencies（依赖项）

- 依赖后端校验接口（远程校验预算余额）与版本渲染机制（解读）

### Distinctions（区分）

- 与拖拽表单生成器的区别：本引擎强调校验/联动/版本管理的规则系统属性，不只是拖拽生成字段。

## Evolution（演进）

- 2026-11-04：首建，单信源（公众号《B端产品经理》专辑第 13 篇，ERP 采购案例有量化结果：5→1 工作日、开发投入降约 60%）。

## Open Questions（开放问题）

- Schema 标准字段配置仅列出 7 项，未给出完整 JSON Schema 规范与扩展机制。
- 联动防循环 5 层上限的依据与可调性未说明。
- 版本管理与表单数据迁移（Migrate 阶段）的衔接未展开（本篇只讲渲染与停用）。

## Evidence（证据）

- Source: `raw/sources/products/2026-11-03-weixin-bend-dynamic-form-13.md`（微信公众号 · 大皮不皮《B端产品经理》专辑第 13 篇，单信源，含 ERP 案例量化数据）

## Related Knowledge（相关知识）

- [[bend-dynamic-form-13|动态表单引擎从设计到落地（信源页）]]
- [[bend-engine-comparison-14|规则引擎、流程引擎、动态表单选型（同专辑第 14 篇）]]
- [[bend-crm-manual-06|CRM产品经理实战手册（同专辑第 6 篇）]]
- [[bend-complex-system-breakdown-20|复杂B端系统拆解方法论（同专辑第 20 篇）]]
