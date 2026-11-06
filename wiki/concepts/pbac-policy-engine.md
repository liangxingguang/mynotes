---
id: wiki-concept-pbac-policy-engine
type: concept
title: PBAC 策略引擎（Policy-Based Access Control）
status: active
created: 2026-11-06
updated: 2026-11-06
confidence: medium
tags:
  - concept
  - security
  - authorization
sources:
  - raw/sources/architecture/2026-11-06-permission-rbac-abac-engineering.md
related:
  - wiki/concepts/rbac-permission-system.md
  - wiki/concepts/permission-refactoring.md
  - wiki/concepts/authn-authz-selection-framework.md
  - wiki/concepts/saas-multi-tenancy.md
  - wiki/concepts/rule-engine.md
  - wiki/concepts/agent-permission-model.md
---
# PBAC 策略引擎（Policy-Based Access Control）

## Definition（定义）

把授权规则从业务代码集中到独立策略引擎（如 OPA、Drools、Cedar）做决策：请求时构造「主体 / 客体 / 动作 / 环境」上下文交由引擎按策略集计算「允许 / 拒绝」，业务系统只负责执行。PBAC 不是 RBAC/ABAC 的替代——RBAC 的角色-权限映射与 ABAC 的属性判断都可表达为策略规则，策略引擎是与「注解 + 拦截器」并列的第三种承载层。

## Why It Matters（为什么重要）

- **注解式权限的天花板**：规则一旦需要多维组合（时间、地点、密级、审批流、上下文），注解 + 散落代码的写法维护与审计成本高。
- **变更成本**：规则频繁变更若必须重新发版，会拖慢业务节奏——引擎化后规则与业务代码解耦，变更不重新发版。
- **多系统统一**：各系统权限规则各写各的、口径不一，PBAC 用同一套策略集拉平审计。
- **代价**：每次请求调引擎计算，性能低于注解查表（模型对比：ACL/RBAC/ABAC 性能高/高/中，PBAC 低）。

## Core Characteristics（核心特征）

1. **四大痛点驱动**（信源 §12.1）：权限规则极复杂（时间/地点/密级/审批流/上下文组合）；规则散落各处（注解+代码+配置难维护审计）；规则频繁变更（改规则要重新发版）；多系统权限不统一。
2. **决策流四步**（§12.2）：业务请求 → 构造上下文（subject/object/action/environment）→ 调策略引擎按策略集计算 → 返回允许/拒绝 → 业务系统执行或拒绝。
3. **OPA Rego 策略示例三则**（§12.3）：本部门订单（`subject.dept == resource.dept`）；工作时间访问（`environment.hour` 在 9–18 之间）；密级匹配（`subject.clearance >= resource.level`）——属性即上下文字段，规则即谓词。
4. **何时上 PBAC 的判断表**（§12.4）：简单后台 ❌（注解 + AOP 够）；中型 + 数据级权限 ❌（RBAC + ABAC 注解够）；复杂合规、多系统统一 ✅；金融、政企、审计严 ✅。核心立场（解读）：PBAC 不是替代 RBAC/ABAC，是用策略引擎统一承载这些模型。
5. **五档场景中的复杂合规档**（§13.4）：金融/政企场景规则极复杂（时间、地点、密级、审批流），方案是把权限规则抽到独立策略服务（OPA/Drools），业务系统调策略引擎，规则与业务代码彻底解耦；另向（§13.5 开放平台）则用 RBAC + OAuth2 scope + ABAC 组合，不必然上 PBAC。
6. **策略引擎 ≈ 规则引擎的授权面**（解读）：与 [[rule-engine]] 的 Fact/Condition/Rule 组件同构（上下文=Fact、策略=Rule、决策=输出）；授权域工具链生态为 OPA/Cedar/Drools（信源 §参考资料，单信源口径，未独立验证）。
7. **Java 侧接入点**（§14）：Spring Security 新版校验链核心是 `AuthorizationManager`（旧版 `FilterSecurityInterceptor`）；Sa-Token 通过 `StpInterface` 提供权限列表接口——上策略引擎本质是在校验链上把「查表判断」换成「调引擎决策」。

## How It Works（运作方式）

请求处理流：

```
业务请求 → 构造上下文(subject/object/action/env) → 策略引擎(OPA/Drools)
         → 按策略集计算 → 允许/拒绝 → 业务系统执行或拒绝
```

引擎对接形态（解读）：策略与业务代码解耦——OPA 通常以独立决策服务形态部署（策略 bundle + 输入上下文的 JSON 决策 API），或运行时嵌入（Drools 等）；业务侧每请求构造一次上下文并调用决策，规则变更走策略仓库发布而非应用发版。

## Relationships（关系）

### Related Concepts（相关概念）

- [[rbac-permission-system|RBAC 权限系统]]——RBAC0–3 模型可由策略引擎承载；本页与其互证「简单场景注解/RBAC 够、复杂合规才上 PBAC」。
- [[authn-authz-selection-framework|认证与授权选型决策框架]]——授权选型框架的「过度设计」反模式正对应本文「简单系统勿上 PBAC」结论；五档场景选型总表经该页信源篇深化。
- [[saas-multi-tenancy|SaaS 多租户]]——租户隔离三方案（独立库/独立 schema/共享表 + tenant_id）是策略引擎「环境」属性的典型接入点（解读）。
- [[rule-engine|规则引擎]]——通用规则引擎面向触发/通知，本页策略引擎面向 allow/deny 决策，二者同构但领域不同。
- [[agent-permission-model|Agent 权限模型]]——权限模型演进的另一条方向（动态基线 + 指令授权）。

### Dependencies（依赖项）

- 决策质量依赖上下文字段采集（主体/客体/动作/环境四维都要有数据可填）。
- 性能依赖引擎部署形态与缓存策略（引擎调用在请求路径上，热点结果缓存与失效机制需纳入设计，与 [[rbac-permission-system]] 的缓存失效矩阵互证）。

### Distinctions（区分）

- **PBAC vs RBAC/ABAC**：不是模型替代，是承载层选择——RBAC 答「谁能做什么」（静态映射），PBAC 答「此刻这个请求应允许吗」（动态计算）。
- **策略引擎 vs 通用规则引擎**：通用规则引擎不假设二元决策语义（触发动作、通知、告警等），授权策略引擎面向 allow/deny 决策点，规则语言（Rego/Cedar）与审计模型专用。

## Evolution（演进）

- **模型谱系**（§17.1 五模型对比：核心思想/适合/灵活性/实现复杂度/维护成本/性能）：ACL（资源清单，灵活性低）→ RBAC（角色映射，中）→ ABAC（属性动态判断，高）→ PBAC（策略引擎决策，最高但性能最低）。
- **引擎生态**（§参考资料）：OPA（Open Policy Agent，CNCF 项目）、Cedar（亚马逊）、Drools（JVM 规则引擎）为常见三载体（单信源口径）。
- **Java 框架演进**（§14.1）：Spring Security 校验核心从 `FilterSecurityInterceptor`（旧版）演进到 `AuthorizationManager` / `AuthorityAuthorizationManager` 决策器接口——策略引擎可沿该接口挂接。
- 未来方向：策略与业务代码彻底解耦的边界（开放 API 伙伴的接口级授权）与监控可观测性未在信源覆盖（开放问题）。

## Open Questions（开放问题）

- 「性能=调引擎」的量化代价（延迟/吞吐）信源未给数据，落地前需压测。
- Rego vs Cedar 的切换成本与审计要求差异未展开（无第二信源）。
- 策略集版本与结果缓存失效的协同机制未讨论。
- 多策略引擎并存（如 OPA + Drools 混合）时的策略权威源未定义。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-06-permission-rbac-abac-engineering.md`（§12.1–12.4 四大痛点/决策流/OPA Rego 三示例/何时上 PBAC；§13.4 复杂合规档；§14 校验链与 StpInterface；§17.1 ACL/RBAC/ABAC/PBAC 五模型对比；§参考资料 6 策略引擎生态）

## Related Knowledge（相关知识）

- [[rbac-permission-system|RBAC 权限系统（概念页）]]
- [[rule-engine|规则引擎（概念页）]]
- [[authn-authz-selection-framework|认证与授权选型决策框架（概念页）]]
- [[saas-multi-tenancy|SaaS 多租户（概念页）]]
- [[permission-refactoring|B端权限重构方法论（概念页）]]
- [[agent-permission-model|Agent 权限模型（概念页）]]
