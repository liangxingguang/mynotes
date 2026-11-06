---
id: wiki-source-auth-authz-selection-part1
type: source
title: 认证与授权选型拆解（上篇）：五种候选矩阵——自研 Redis、Sa-Token、Spring Security、Keycloak、JWT
status: active
created: 2026-11-06
updated: 2026-11-06
confidence: medium
tags:
  - source
  - security
  - authentication
  - authorization
sources:
  - raw/sources/architecture/2026-11-06-auth-authz-selection-part1.md
related:
  - wiki/concepts/authn-authz-selection-framework.md
  - wiki/concepts/sso-oauth2-oidc.md
  - wiki/concepts/rbac-permission-system.md
---

# 认证与授权选型拆解（上篇）：五种候选矩阵——自研 Redis、Sa-Token、Spring Security、Keycloak、JWT

## Overview（概览）

微信公众号认证授权选型系列上篇。以作者小 A 两次选型翻车（十几人后台硬上 Keycloak = 过度设计；对外 SaaS 用 Sa-Token 私有协议 = 选型过浅）为引，给出一套选型决策框架：先分清认证（AuthN）与授权（AuthZ），再用五维度模型（团队规模、系统数量、对外需求、合规要求、运维能力）逐一拆解五种候选（自研 Redis Session、Sa-Token、Spring Security+Spring Authorization Server、Keycloak、JWT），附有状态/无状态权衡、场景决策清单与四类反模式。核心结论：没有"永远正确"的选型，只有"当前阶段最合适"。正文自 Assets 采集稿逐字收录（388 行，含引用了 5 篇同系列下篇链接；决策树原为图片已按逻辑还原），单信源，置信度中。

## Key Facts（关键事实）

- 两种翻车代价：过度设计（开发/运维/学习/排障四成本——十几用户后台上 Keycloak，服务器资源比业务还大）；选型过浅（返工/扩展不足/安全风险/技术债——对外 SaaS 用私有协议半年后的对接 AD 域/开放 API/多租户 SSO 全部推倒重来）。
- 认证 vs 授权本质：认证回答"你是谁"（AuthN、登录、SSO、OIDC），授权回答"你能做什么"（AuthZ、权限校验、RBAC/ABAC）；有些方案只做认证不做授权（纯 OIDC）——核心痛点是细粒度权限时选型后还得自造授权系统。
- 凭证→Token→会话三层：凭证（账号密码/证书/生物特征）认证→颁发 Token（JSESSIONID/JWT/access_token）→服务端建立会话（Servlet Session/Redis Session）。有状态（Redis）易踢人但依赖存储；无状态（JWT）性能好但需黑名单才能吊销。
- L1-L5 分层架构：身份源（DB/LDAP/AD）→认证（自研/Sa-Token/Keycloak）→令牌（OAuth2/OIDC/JWT/自研）→授权（RBAC/ABAC）→审计（日志/SIEM）。Keycloak 覆盖 L1-L3+L5 但不深入 L4；Sa-Token 覆盖 L2-L4 但 L1/L5 需自补。
- 五维选型模型与评分矩阵：对五种方案在"团队要求低/系统少/对外能力/合规支持/运维简单"五维打分（1-5）：自研 Redis 13、Sa-Token 18、Spring Security+AS 15、Keycloak 14、JWT 20；但 JWT 总分最高却无法主动踢人——总分只是辅助，场景匹配才是终判。
- 对外硬通货是标准协议（OIDC/SAML）：对内可私有协议，对外必须标准协议——私有 token 对接 AD 域/合作伙伴网关处处碰壁。
- 五维交叉典型组合：小+单+不对内 → Sa-Token/自研；小+多+不对内 → Sa-Token SSO；中+多+不对内 → Spring Security+自建 AS；中+多+对外 → Keycloak；大+多+对外 → Keycloak+多 Realm。
- 场景决策清单 10 条覆盖典型场景：单后台多端→Sa-Token（Redis Token）；SpringBoot 精细控制→Spring Security；多系统接 Keycloak SSO→Spring Security OAuth2 Client；自建授权中心→Spring Authorization Server（需自写登录页）；企业多系统统一账号→Keycloak；开放 API→Keycloak/SAS 标准 OIDC；M2M→Client Credentials；微服务无状态→JWT；强定制（风控、多租户隔离）→自研 Redis Session。
- 授权层统一选择：无论认证层选谁，业务细粒度权限（按钮、数据）统一用 RBAC/ABAC；Keycloak/Sa-Token 只做认证与粗粒度 scope 授权，认证与授权分层，不指望一个框架全包。
- 业务隔离：AuthService 接口抽象隔离框架，业务代码只依赖接口、框架实现接口，迁移时只改实现不改业务（反例：业务代码散落 StpUtil.hasPermission 调用）。
- 四类反模式：跟风大厂、"先简单后返工"（不预留演进路径）、功能全堆砌（90% 用不上）、低估学习成本。
- 三个时间尺度：短期（0-3 月）看开发成本，中期（3 月-2 年）看扩展迁移，长期（2 年+）看标准生态——好选型=当下够用、中期可演进、长期不堵死。

## Important Claims（重要论断）

### Claim 1：选型没有"最好"，只有"当前阶段最合适"

选型是业务需求、团队能力、成本约束多维度下的系统化决策，本质是在"过度简单（扛不住演进）"与"过度复杂（杀鸡用牛刀）"之间找平衡；好的选型不仅看当下需求，还要看演进路径（平滑升级能力）。

### Claim 2：对内可私有协议，对外必须标准协议

对内系统（无对外、无第三方对接）可用私有协议（Sa-Token/自研 Redis 的私有 token）；对外场景（开放 API、对接企业 AD 域、多租户 SSO）的硬通货是标准协议（OIDC/SAML）——私有协议在对外场景处处碰壁，这是"私有 vs 标准"的核心分界。

### Claim 3：认证与授权分层选型，授权层独立于认证层

认证层选型（自研/Sa-Token/Keycloak/JWT）与授权层选型（RBAC/ABAC）是两个独立决策；Keycloak/Sa-Token 做认证和粗粒度 scope 授权，业务细粒度权限由业务系统用 RBAC/ABAC 实现——不要把二者绑定在一个框架里。

### Claim 4：选型先看"团队能否驾驭"，再看"方案能力"

Keycloak 再强，没人会维护也是灾难；JWT 总分最高但无法踢人。选型维度五项中"团队规模与能力"与"运维能力"列于首位——方案能力要匹配团队驾驭能力与运维投入，否则上线即负资产。

## Concepts Introduced（引入的概念）

- [[authn-authz-selection-framework|认证与授权选型决策框架]]
- [[rbac-permission-system|RBAC 权限系统]]（授权层统一选型印证）
- [[sso-oauth2-oidc|单点登录 SSO]]（认证层标准协议实践印证与更新）

## Entities Mentioned（提及的实体）

- Sa-Token（轻量国产鉴权工具箱，私有协议+内置 SSO 三模式；对内快速开发场景首选）
- Spring Security（Spring 生态官方安全框架，精细控制+标准 OAuth2/OIDC；需自建 AS 时配 Spring Authorization Server）
- Keycloak（开箱即用成品 IdP，完整 OIDC/OAuth2/SAML2+用户联邦，企业多系统统一身份场景；单系统/无运维/小团队不适合）
- JWT（无状态 token，本地验签无网络 IO，微服务/跨域场景；无法/需黑名单踢人）
- Redis（有状态会话存储底座，自研 Session 与 Sa-Token 的共同依赖）

## Implications（影响／启示）

- B 端产品权限设计与认证选型应解耦：认证层选型可独立于授权层（RBAC/ABAC 模型讨论见下篇权限模型篇）。
- 对外/生态型产品选型时标准协议是硬约束，私有协议在早期"快"的省下的开发时间会在中期被对接成本加倍偿还。
- 大厂方案（如 Keycloak）不必然适合小团队——"大厂都用 X"是典型反模式。
- 架构演进同理（本仓库按 LLM Wiki 模式运行）：新方案引入先想"团队能否驾驭、长期是否堵死"。

## Limitations（局限）

- 全部案例均来自作者个人经历（小 A 两次翻车），样本量为 2，结论为经验归纳而非系统研究（单信源）。
- 五种候选的评分矩阵是作者主观打分，且作者自己也强调"总分只是辅助，场景匹配才是终判"。
- 系列下篇（权限模型与 RBAC-ABAC 篇）在本篇时尚未采集，授权层细粒度设计未展开。
- 原文 8.1 决策树为图片，采集稿仅得占位；逻辑经 8.2 场景清单与第六、七节维度矩阵可完整还原。

## Related Knowledge（相关知识）

- [[sso-oauth2-oidc|单点登录 SSO（OAuth2 Authorization Code + OIDC）]]
- [[rbac-permission-system|RBAC 权限系统（传统 B 端角色访问控制）]]
- [[permission-refactoring|B端权限重构方法论]]（存量权限乱局的治理视角）
- [[agent-permission-model|Agent 权限模型]]（权限模型在 Agent 平台的演进）

## Source（信源）

- `raw/sources/architecture/2026-11-06-auth-authz-selection-part1.md`
- `Assets/2026-11/auth-authz-selection-part1.md`（采集稿原件）
