---
id: 2026-11-06-auth-authz-selection-part1
title: 认证与授权选型拆解（上篇）：五种候选矩阵——自研 Redis、Sa-Token、Spring Security、Keycloak、JWT
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/gW1ZQfUaKDcXkT1D-z3etw
source_type: article
platform: 微信公众号
created: 2026-11-06
category: 技术
tags: [java]
asset_ref: Assets/2026-11/auth-authz-selection-part1.md
wiki_status: pending
---

# 认证与授权选型拆解（上篇）：五种候选矩阵——自研 Redis、Sa-Token、Spring Security、Keycloak、JWT

> 选 Sa-Token 还是 Keycloak？两派吵一下午没结论。本文结论：这不是"哪个框架更好"，而是"什么场景选什么方案"。小 A 两次翻车（内部后台硬上 Keycloak = 过度设计；对外 SaaS 用私有协议 = 选型过浅）引出一套选型决策框架。

## 核心要点

1. 先分清 AuthN（认证=你是谁）与 AuthZ（授权=你能做什么）：有些方案只做认证（纯 OIDC），选错还得自造授权系统
2. 三层概念：凭证→认证颁发 Token→服务端会话；有状态易踢人但依赖存储，无状态性能好但难吊销，这是核心权衡
3. 五维选型模型：团队规模、系统数量、对外需求、合规要求、运维能力——选型看"团队能否驾驭"，不只看方案能力
4. 时间尺度：短期看开发成本、中期看扩展迁移、长期看标准生态；好选型=当下够用、中期可演进、长期不堵死
5. 五种候选：自研 Redis Session（私有、强定制）、Sa-Token（轻量私有、内置 SSO）、Spring Security+AS（标准 OIDC、精细控制）、Keycloak（成品 IdP、用户联邦）、JWT（无状态、难吊销）
6. 对内可私有协议，**对外必须标准协议**（OIDC/SAML）——私有 token 对接 AD 域/合作伙伴网关处处碰壁
7. 业务代码通过 AuthService 接口隔离框架：迁移只改实现不改业务
8. 授权层不管认证选谁，统一 RBAC/ABAC 注解+拦截器；认证+授权分层，不指望一个框架全包
9. 评分矩阵里 JWT 总分最高但无法踢人——总分只是辅助，场景匹配才是终判

## 正文

**两大代价**：①过度设计（开发/运维/学习/排障四成本）——十几用户后台上 Keycloak，服务器资源比业务还大；②选型过浅（返工/扩展不足/安全风险/技术债）——对外 SaaS 用 Sa-Token 私有协议，半年后对接 AD 域、开放 API、多租户 SSO 全部推倒重来。

**门禁类比**：机械锁=裸 Session；IC 卡=Sa-Token；刷卡+后台=Spring Security；人脸闸机=Keycloak；联邦一卡通=OIDC/SAML federation。越复杂的门禁运维成本越高。

**方案速查**：Keycloak 覆盖身份源到审计（L1-L3+L5）但不深入业务细粒度权限（L4）；Sa-Token 覆盖 L2-L4 但 L1/L5 要自补——选型先想清楚"买哪几层"。

**场景决策清单**：单后台多端→Sa-Token（Redis Token）；SpringBoot 精细控制→Spring Security；多系统对接 Keycloak SSO→Spring Security OAuth2 Client；自建授权中心→Spring Authorization Server（需自写登录页）；企业多系统统一账号→Keycloak；开放 API→Keycloak/SAS 标准 OIDC；M2M→Client Credentials；微服务无状态→JWT；强定制（风控、多租户隔离）→自研 Redis Session。

**四个反模式**：跟风大厂、先简单后返工、框架功能全用上、低估学习成本。

## 来源

- 原文：https://mp.weixin.qq.com/s/gW1ZQfUaKDcXkT1D-z3etw

## 附件

- [[Assets/2026-11/auth-authz-selection-part1.md]]
- 看下篇：[[Inbox/2026-11-06-permission-rbac-abac-engineering-part2.md]]
