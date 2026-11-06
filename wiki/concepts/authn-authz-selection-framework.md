---
id: wiki-concept-authn-authz-selection-framework
type: concept
title: 认证与授权选型决策框架（五维模型与 AuthN/AuthZ 分层）
status: active
created: 2026-11-06
updated: 2026-11-06
confidence: medium
tags:
  - concept
  - security
  - authentication
  - authorization
  - selection
sources:
  - raw/sources/architecture/2026-11-06-auth-authz-selection-part1.md
  - raw/sources/architecture/2026-11-06-permission-rbac-abac-engineering.md
related:
  - wiki/concepts/sso-oauth2-oidc.md
  - wiki/concepts/rbac-permission-system.md
  - wiki/concepts/permission-refactoring.md
  - wiki/concepts/agent-permission-model.md
  - wiki/concepts/architecture-tradeoff-methodology.md
  - wiki/concepts/pbac-policy-engine.md
  - wiki/sources/auth-authz-selection-part1.md
---

# 认证与授权选型决策框架（五维模型与 AuthN/AuthZ 分层）

## Definition（定义）

面向认证（Authentication，回答"你是谁"）与授权（Authorization，回答"你能做什么"）两层职责分离的技术选型方法论。核心主张：① 认证与授权是两个独立决策，选型时在每层分别做选择，不指望一个框架全包；② 选型不是"哪个框架更好"，而是"什么场景选什么方案"——以五维度（团队规模、系统数量、对外需求、合规要求、运维能力）与三层时间尺度（短期开发成本、中期扩展迁移、长期标准生态）共同约束；③ 对内可用私有协议，对外必须标准协议（OIDC/SAML）——选型结果的"合适"取决于当下够用、中期可演进、长期不堵死。

## Why It Matters（为什么重要）

选型错误有两档代价，且都随演进放大：**过度设计**（简单需求上重方案——开发/运维/学习/排障四成本，十几人后台硬上 Keycloak，服务器资源比业务还大）与**选型过浅**（快方案扛不住演进——对外 SaaS 用私有协议，半年后对接 AD 域、开放 API、多租户 SSO 全部推倒重来）。选型的本质是在"过度简单（扛不住演进）"与"过度复杂（杀鸡用牛刀）"之间找平衡，方法论的作用是把拍脑袋变成可复用的判断流程。

## Core Characteristics（核心特征）

1. **Layering：认证与授权分层，授权层独立选型**。认证层选谁（自研/Sa-Token/Keycloak/JWT）不决定授权层（RBAC/ABAC）的方案；Keycloak/Sa-Token 做认证与粗粒度 scope 授权，业务细粒度权限（按钮、数据）由业务系统自行实现。
2. **分层架构 L1-L5**：身份源（L1，存用户/密码/组织：DB、LDAP、AD）→认证（L2）→令牌（L3）→授权（L4，RBAC/ABAC）→审计（L5）。Keycloak 覆盖 L1-L3+L5 但不深入 L4；Sa-Token 覆盖 L2-L4 但 L1/L5 需自补——选型先想清楚"买哪几层"。
3. **五维选型模型**：团队规模与能力、系统数量与关系、对外需求、合规要求、运维能力；维度交叉的典型组合：小团队+单系统+不对内→Sa-Token/自研；小团队+多系统→Sa-Token SSO；中型+多系统→Spring Security+自建 AS；中型+多系统+对外→Keycloak；大型+多系统+对外→Keycloak+多 Realm。
4. **三个时间尺度**：短期（0-3 月，快速上线看开发成本）、中期（3 月-2 年，需求演进看扩展性/迁移成本）、长期（2 年+，架构稳定看标准化/生态/合规）；好选型=当下够用、中期可演进、长期不堵死。
5. **有状态 vs 无状态是核心权衡**：凭证→Token→会话三层关系中，有状态（Redis Session）易踢人但依赖存储，无状态（JWT）性能好但需黑名单吊销；这不是"对错"而是场景权衡（微服务→JWT，强会话管理→有状态）。
6. **对外硬通货是标准协议**：对内可私有协议；对外（开放 API、对接 AD/LDAP、多租户 SSO）必须标准协议（OIDC/SAML）——私有 token 在合作伙伴网关与身份联邦对接中处处碰壁。
7. **AuthService 接口隔离**：业务代码依赖 AuthService 接口，框架实现接口——迁移时只改实现不改业务（反例：业务代码散落 StpUtil.hasPermission 调用，换框架要改遍）。
8. **场景决策清单**：决策优先用场景清单逐场景匹配，而非单一评分；评分矩阵仅作辅助（JWT 五维总分最高却无法主动踢人；Keycloak 总分低但企业 SSO 场景不可替代）。
9. **方法论类比工具箱**：门禁类比（机械锁=裸 Session、IC 卡=Sa-Token、刷卡+后台=Spring Security、人脸闸机=Keycloak、联邦一卡通=OIDC/SAML 联邦），越复杂的机制运维成本越高——用于把方案能力翻译为团队可理解的运维成本。

## Structure（结构）

框架的可操作结构（自上而下）：

1. 分清痛点层级：是认证问题（登录/SSO/身份联邦）还是授权问题（权限/数据访问控制）？
2. 五维加权评估：团队规模→系统数量→对外需求→合规要求→运维能力，逐项过场景清单。
3. 分层决策：认证层选方案 + 确认授权层独立选 RBAC/ABAC。
4. 三时间尺度检查：短中期演进路径与长期标准化/生态是否堵死。
5. 接口隔离与渐进演进：AuthService 抽象 + 预留迁移路径（按阶段选型而非一次到位）。

## How It Works（运作方式）

输入：待选型场景（系统现状、团队、对外、合规、运维）→ 逐场景查决策清单（如"单后台多端→Sa-Token（Redis Token）、已有 SpringBoot 需精细安全控制→Spring Security、多系统对接 Keycloak SSO→Spring Security OAuth2 Client、企业多系统统一账号→Keycloak、开放 API→标准 OIDC、微服务无状态→JWT、强定制风控/多租户→自研 Redis Session"）→ 对选型结果做三尺度校验（当下够不够用/中期能否平滑升级/长期会不会堵死标准生态）→ 输出"分层方案 + 演进路径 + 接口隔离"。

## Relationships（关系）

### Related Concepts（相关概念）

- [[sso-oauth2-oidc|单点登录 SSO（OAuth2 Authorization Code + OIDC）]]——认证层标准协议实践
- [[rbac-permission-system|RBAC 权限系统]]——授权层统一选型（无论认证层选谁）
- [[permission-refactoring|B端权限重构方法论]]——存量权限乱局的治理方法论
- [[agent-permission-model|Agent 权限模型]]——权限模型演进自然延伸
- [[architecture-tradeoff-methodology|架构取舍方法论]]——通用取舍方法论在本框架中的领域实例

### Dependencies（依赖项）

- 选型判断依赖团队实际运维能力（无专职运维则避免 Keycloak 等独立服务）
- 认证与授权分层使授权层（RBAC/ABAC）独立于认证层演进

### Distinctions（区分）

- 与 [[architecture-tradeoff-methodology|架构取舍方法论]] 的区分：后者是通用取舍原则，本文是认证授权领域的具体选型框架（五维模型 + 门禁类比 + 场景清单）。
- 与 [[rbac-permission-system|RBAC 权限系统]] 的区分：RBAC 是授权模型本身，本文讨论的是认证层方案的选型与认证/授权的分层决策。

## Evolution（演进）

- 2026-11-06：信源新建概念页。来源为《认证与授权选型拆解（上篇）》（公众号认证授权选型系列）。五维模型、L1-L5 分层、门禁类比、场景清单与反模式均由该序引两例（过度设计 + 选型过浅）实证推导。系列下篇《权限模型与 RBAC-ABAC 全解析（下篇）》已于 2026-11-06 采集并编译为工程落地篇（本文第二信源）：五档场景选型（§13：简单后台 RBAC0 / 中型企业 RBAC3+数据级 ABAC / SaaS 租户隔离 RBAC3+tenant_id / 复杂合规 PBAC / 开放平台 RBAC+OAuth2 scope+ABAC）印证并细化本文「授权层统一 RBAC/ABAC」结论；§18.1 模型选型优先级（默认 RBAC0、角色继承 RBAC1、财务/审批 RBAC2、数据级 ABAC、复杂合规才上 PBAC）与本文「过度设计」反模式在边界上互证——本文给「简单需求勿上重方案」，下篇给「何时才够上策略引擎」；策略引擎独立成 [[pbac-policy-engine]]。

## Open Questions（开放问题）

- 评分矩阵是作者主观打分（1-5），标准化分值权重是否应按团队差异调整未定义。
- 反模式（跟风大厂、先简单后返工、功能堆砌、低估学习成本）的触发条件无量化阈值，如何形式化检测未定义。
- 有状态/无状态之外的中间形态（如带有状态缓存的令牌吊销机制）在本文场景清单中为空白。
- "对内私有协议"边界（纯内部 vs 半开放）的模糊地带如何判定未定义。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-06-auth-authz-selection-part1.md`（微信公众号原文，采集稿 390 行全文逐字收录；含五方案评分矩阵、L1-L5 分层、门禁类比、10 条场景清单、四种反模式；作者小 A 两次翻车案例为全文核心经验来源）
- Source: `raw/sources/architecture/2026-11-06-permission-rbac-abac-engineering.md`（系列第二篇：五档场景选型（§13）、模型选型优先级（§18.1）、PBAC 何时上判断（§12.4）、RBAC/ABAC 注解承载边界（§9/§10）——授权层深水区，与上篇互证）

## Related Knowledge（相关知识）

- [[auth-authz-selection-part1|认证与授权选型拆解（上篇）]]（信源页）
- [[pbac-policy-engine|PBAC 策略引擎（下篇授权层深水区，独立概念页）]]
- [[sso-oauth2-oidc|单点登录 SSO]]
- [[rbac-permission-system|RBAC 权限系统]]
- [[permission-refactoring|B端权限重构方法论]]
