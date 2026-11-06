---
id: wiki-concept-saas-multi-tenancy
type: concept
title: SaaS 多租户（Multi-Tenancy）
status: active
created: 2026-11-04
updated: 2026-11-06
confidence: medium
tags:
  - concept
  - b-end
  - saas
  - multi-tenancy
  - 产品
sources:
  - raw/sources/products/2026-11-03-weixin-bend-saas-multitenant-05.md
  - raw/sources/architecture/2026-11-06-permission-rbac-abac-engineering.md
related:
  - wiki/concepts/rbac-permission-system.md
  - wiki/concepts/rule-engine.md
  - wiki/concepts/dynamic-form-engine.md
  - wiki/concepts/multi-agent-saas-refactoring.md
  - wiki/concepts/pbac-policy-engine.md
  - wiki/sources/bend-saas-multitenant-05.md
---
# SaaS 多租户（Multi-Tenancy）

## Definition（定义）

SaaS 多租户系统指一套软件实例同时服务多个租户（客户组织），各租户数据逻辑隔离、可独立配置计费与生命周期，并让租户"感觉"自己拥有一整套系统。其产品底座是数据隔离架构，向上叠出权限模型、计费配额、租户生命周期、配置化扩展四条主线。

## Why It Matters（为什么重要）

多租户是 SaaS 规模化的前提：一套代码服务多客户才能摊薄边际成本。但多租户把"数据边界、权限范围、计费口径、运维动作"四个问题同时放大——串数据、越权、配额失控、发布炸全量都是多租户特有事故。B 端 PM 的核心价值是把四条线串成可执行方案，而不是画一个租户管理页面。

## Core Characteristics（核心特征）

1. **数据隔离三模式**（原文框架）：独立数据库（隔离性强、开销高，适合大客户/合规行业）→ 共享数据库独立 Schema（中等，跨租户统计与迁移麻烦）→ 共享数据库共享表+tenant_id（利用率高、迭代快，对索引/权限过滤/恢复要求高）。选型看客户规模、客单价、数据规模与合规要求，可做混合模式按租户等级路由。
2. **租户识别后端强制**：从登录态 token 解析租户 ID 放入上下文 Holder，服务/SQL 拦截器/数据权限统一读取；前端传 tenant_id 仅作展示，不能作为后端过滤依据；共享表在数据访问层强制拦截、漏条件直接报错，避免串数据。
3. **权限双轨拆分**：功能权限用 RBAC（用户/角色/菜单/按钮/接口），数据权限用"租户+组织+资源 Owner+数据规则"组合，共享表每条数据带 tenant_id/org_id/owner_id；复杂场景引入 ABAC 属性规则引擎。
4. **计费配额中心化**：配额维度（用户数/角色数/存储/API 次数/消息数/报表任务数/导出行数）落到配额中心，定义默认值、升级规则、超额策略（提醒→连续 3 天超额限制新建）；计费展示口径清晰，避免模糊表达。
5. **租户生命周期状态机**：尝试使用中→正式开通→续费/升配→欠费冻结→恢复→注销；每状态切换明确数据保留策略/登录限制/通知方式/数据导出窗口；冻结后只允许登录和导出；注销后 15 天软删除、30 天物理清理。
6. **配置化三层扩展**：租户级（品牌/域名/语言/时区）、业务级（字段/流程/审批）、个性化扩展（自定义字段/对象/API/Webhook）；能用配置处理的不改代码，配置项支持导入导出、版本管理与回滚。
7. **性能/安防/运维基线**：共享表对 tenant_id 建联合索引、大租户慢查询识别隔离、越权用例与审计日志必覆盖、租户级发布开关灰度。

8. **数据隔离三方案成本/强度对比**（第二信源 §11.1/§17.3）：独立数据库（隔离最强、成本最高、大客户/强合规）→ 共享库独立 schema（中等）→ 共享表 + `tenant_id`（隔离最弱、靠代码保证、成本最低、小租户量大）——与第一条模式框架互证，补充「灵活性」维度（共享表方案迁移最灵活、独立库迁移最难）。
9. **共享表方案：拦截器自动注入 + 跨租户返 404**（§11.2/§11.3）：MyBatis 拦截器（`StatementHandler.prepare` 阶段）用 JSqlParser 解析 SQL 自动追加 `AND tenant_id = ?`，业务代码不手写查询条件；用户-角色、角色-权限关联表全程带 `tenant_id`。租户越权是 SaaS 最严重事故类型，防护 = 拦截器统一注入 + 关键接口专门测试（用租户 A 身份访问租户 B 资源必须返 404 而非 200/403，避免泄露资源存在性）+ 定期扫描裸 SQL。
10. **超管平台与租户后台物理分离**（§11.4）：超管需跨租户操作、不能用 `tenant_id` 隔离——独立「平台管理后台」、接口显式 `@IgnoreTenant` 跳过租户拦截、全程审计。这也是「租户内角色继承、租户间完全隔离」规则（§13.3）的必然推论。

## Structure（结构）

B 端 PM 落地 SOP 六步（原文）：

| 步骤 | 内容 | 产出 |
|---|---|---|
| 1 调研 | 目标客户、部署要求、合规级别、计费模式 | 调研结论 |
| 2 架构评审 | 隔离模式、租户识别方式、数据权限方案 | 架构决策 |
| 3 原型与 PRD | 租户管理、角色权限、配额中心、租户生命周期四模块 | PRD |
| 4 验收 | 共享表 tenant_id、越权用例、配额超额、冻结恢复 | 验收报告 |
| 5 上线与灰度 | 租户白名单放量，收集性能指标与反馈 | 灰度数据 |
| 6 复盘 | 沉淀可复用产品框架 | 复盘文档 |

## How It Works（运作方式）

请求链路：登录 → token 解析租户 ID → 上下文 Holder → SQL 拦截器/数据权限统一拼装 tenant_id → 数据访问层强制拦截（漏条件报错）→ 配额与计费按租户维度核算 → 审计日志记录租户数据查看/导出。租户状态机驱动登录限制与数据保留：冻结态只读+导出，注销态进入 15 天软删除窗口。

## Relationships（关系）

### Related Concepts（相关概念）

- [[rbac-permission-system|RBAC 权限系统]]——功能权限基座；数据权限组合与 ABAC 扩展见该页第四信源
- [[rule-engine|规则引擎]]——ABAC 属性规则与复杂数据规则引擎的实现载体
- [[dynamic-form-engine|动态表单引擎]]——业务级配置（字段启用/隐藏/校验规则）的落地形态
- [[multi-agent-saas-refactoring|多智能体重构 SaaS 业务流]]——同属 SaaS 主题，聚焦业务流程 Agent 化而非租户隔离

### Dependencies（依赖项）

- 数据隔离依赖统一租户上下文工具（所有读写必须经该工具拼 tenant_id）
- 配额中心依赖计费模式定义（按量/订阅/阶梯的口径）

### Distinctions（区分）

- 多租户 vs 多实例部署：多租户是同一套实例内的逻辑隔离（共享表/Schema），多实例是物理隔离；混合模式按租户等级在两者间路由。
- 租户数据权限 vs 组织内数据权限：前者按 tenant_id 划边界（隔离底线），后者按 org/owner/规则划范围（RBAC 数据权限），层级不可混用。

## Evolution（演进）

- 2026-11-04：由信源《SaaS多租户系统实战》（大皮不皮专辑第 5 篇）首次编译为本概念页。

- 2026-11-06：据第二信源（《权限模型与 RBAC-ABAC 全解析（下篇）》§11–§16 多租户隔离与测试）补充隔离三方案对比维度、TenantInterceptor 自动注入实现、跨租户返 404 原则、超管物理分离与租户隔离单元测试形态；与第一信源（租户识别后端强制 + SOP）互证。

## Open Questions（开放问题）

- 三模式选型的具体分界标准（客户规模/数据量阈值）原文未给数值，需结合行业案例补充。
- 混合模式下跨存储策略的租户路由与迁移机制未展开。
- 配额超额策略的时间阈值（连续 3 天）为原文举例，不同计费模式的阈值适配未定义。

## Evidence（证据）

- Source: `raw/sources/products/2026-11-03-weixin-bend-saas-multitenant-05.md`
- Source: `raw/sources/architecture/2026-11-06-permission-rbac-abac-engineering.md`（§11 三方案对比/TenantInterceptor/跨租户 404/超管分离、§15.5 租户隔离测试）

## Related Knowledge（相关知识）

- [[bend-saas-multitenant-05|信源：SaaS多租户系统实战全指南]]
- [[rbac-permission-system|RBAC 权限系统]]
- [[pbac-policy-engine|PBAC 策略引擎（复杂合规场景可映射为本页环境属性）]]
- [[multi-agent-saas-refactoring|多智能体重构 SaaS 业务流]]
