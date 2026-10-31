---
id: wiki-concept-sso-oauth2-oidc
type: concept
title: 单点登录 SSO（OAuth2 Authorization Code + OIDC）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - concept
  - security
  - oauth2
  - spring
sources:
  - raw/sources/enterprise/2026-10-28-spring-security-oauth2-sso-demo.md
related:
  - wiki/sources/spring-security-oauth2-sso-demo.md
---
# 单点登录 SSO（OAuth2 Authorization Code + OIDC）

## Definition（定义）

单点登录（Single Sign-On）：多个客户端共享同一个认证服务器的 Session，用户在一个应用登录后访问其他应用时不再弹登录页。标准协议组合是 OAuth2 Authorization Code（授权码模式）+ OIDC（OpenID Connect，在 OAuth2 之上加 ID Token 层）。核心秘密一句话：只要认证服务器认识你（Session Cookie 还在），其他应用都不用再登录。

## Why It Matters（为什么重要）

企业内部系统（前台+后台）或生态产品矩阵，每次重新登录是高频摩擦。SSO 让认证状态跨应用传递，是微服务/多前端架构的标配。OAuth2+OIDC 是当前主流标准组合，Spring Authorization Server 让开发者不依赖外部 IAM（如 Keycloak）就能搭一个认证服务器跑通 Demo。应用间零耦合（只知道"有一个认证服务器去验证身份"），加新客户端只需在认证服务器注册。

## Core Characteristics（核心特征）

1. **SSO 本质 = 共享 Session**：认证服务器登录成功后给浏览器种 Session Cookie；第二个应用跳转认证服务器时浏览器自动带 Cookie，认证服务器识别已登录直接发授权码、不再弹登录页。
2. **OAuth2 Authorization Code + OIDC 是标准组合**：Authorization Code 流程负责换 Token，OIDC 在其之上加 ID Token（含用户信息的 JWT），`scope(openid)` 有它才是 OIDC、才能拿到 `OidcUser`。
3. **认证服务器三条关键配置**：① `issuer` 开启 OIDC Discovery（客户端请求 `/.well-known/openid-configuration` 一次拿到全部端点，免手写 URL）；② `oidc(withDefaults())` 才有 ID Token；③ `oauth2ResourceServer(jwt())` 支撑 `/userinfo`（不开则登录卡在拉用户信息）。
4. **两条安全链**：协议端点（`/oauth2/authorize`、`/oauth2/token`）要允许客户端 Basic 认证、忽略 CSRF；登录页要防 CSRF、渲染表单。规则完全不同，必须分两条 `SecurityFilterChain`（@Order(1) 协议端点、@Order(2) 登录页），混在一起互相干扰。
5. **客户端极简**：一行 `issuer-uri` 自动拉 discovery 配好全部端点；无需写 `SecurityConfig`（Spring Boot 自动配置已配好"所有请求都要登录 + 走 OAuth2 登录"）；`redirect-uri` 的 `{baseUrl}` 和 `{registrationId}` 展开后必须与认证服务器注册值一字不差（含端口、结尾斜杠）。
6. **同域多应用 Cookie 隔离**：同域多应用必须各自改 `session.cookie.name`（如 `BLOG_SESSION`、`ADMIN_SESSION`），否则 Cookie 串用导致 SSO 行为异常。
7. **生产优先 Keycloak**：自建认证服务器要处理密码策略、MFA、社交登录、自注册、密码重置、Session 管理、Token 轮换……每个都是坑；大部分生产场景用 Keycloak（或 Auth0、Casdoor）。自建仅适合高度定制需求或不想引入基础设施的场景。
8. **单点登出是另一个话题**：Demo 里登出只清当前应用 Session，认证服务器 Session 还在则其他应用仍免登；真正的单点登出需 OIDC Back-Channel Logout 或 Front-Channel Logout，本文未涉及。

## Structure（结构）

三个独立 Spring Boot 应用：auth-server（:9000，Spring Authorization Server）+ blog-client（:8081）+ admin-client（:8082）。认证服务器持有 `RegisteredClientRepository`（注册客户端：clientId/secret/授权类型/redirectUri/scope/PKCE 设置）+ JWT 签名密钥 + 内存用户。客户端仅需 `application.yml` 配 `issuer-uri` + `client-registration`，无 Java 安全配置。

## How It Works（运作方式）

- **首次访问**：客户端 → 302 跳认证服务器 → 用户登录 → 认证服务器种 Session Cookie + 发授权码 → 客户端用授权码换 Token + 建本地 Session。
- **二次访问**：另一客户端 → 302 跳认证服务器 → 浏览器带 Session Cookie → 认证服务器识别已登录 → 直接发授权码（不再弹登录页）→ 客户端换 Token + 建 Session。
- **Discovery**：客户端启动时拉 `/.well-known/openid-configuration` → 拿到授权/Token/JWKS/userinfo/登出端点 → 自动配置全部 OAuth2 客户端端点。
- **ID Token 链路**：`oidc(withDefaults())` 开启 → 授权码换 Token 时附带 ID Token（JWT 含用户信息）→ 客户端 `@AuthenticationPrincipal OidcUser` 直接拿用户名和 claims。

## Relationships（关系）

### Related Concepts（相关概念）

- 无现有 SSO/OAuth2/OIDC 概念页（本页为首条）。

### Dependencies（依赖项）

- Spring Boot 3.2 + Spring Security 6.2 + Spring Authorization Server 1.2（信源技术栈）。

### Distinctions（区分）

- 与 Session-Cookie 共享（如 CAS 协议）的不同之处：本文走标准 OAuth2 Authorization Code + OIDC，不依赖特定厂商协议；客户端间零耦合、只需知道认证服务器 issuer。

## Evolution（演进）

- 2026-10-28 原始方案：Spring Boot 3.2 + Spring Authorization Server 三应用 SSO Demo；认证服务器两条安全链+OIDC Discovery+客户端注册，客户端一行 `issuer-uri` 自动配置。完整可运行源码在 Gitee。

## Open Questions（开放问题）

- 单点登出（Back/Front-Channel Logout）的具体实现信源未涉及。
- 生产环境 Token 轮换、Session 管理、多租户隔离的工程实践信源未覆盖。
- Spring Authorization Server 与 Keycloak 的性能/运维对比数据信源未提供。

## Evidence（证据）

- Source: `raw/sources/enterprise/2026-10-28-spring-security-oauth2-sso-demo.md`（SSO 原理与两次访问时序、三应用架构、认证服务器依赖/issuer/两条安全链/oidc/注册客户端四易错点、客户端 issuer-uri 自动发现/控制器/无 SecurityConfig、同域 Cookie 隔离、作者判断 Keycloak vs 自建、Session 问题与单点登出、客户端零耦合；微信公众号，265 行采集稿，完整源码 https://gitee.com/potterCoding/sso-demo）

## Related Knowledge（相关知识）

- [[spring-security-oauth2-sso-demo|Spring Security OAuth2 单点登录（信源页）]]
