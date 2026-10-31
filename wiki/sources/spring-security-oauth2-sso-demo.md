---
id: wiki-source-spring-security-oauth2-sso-demo
type: source
title: 使用 Spring Security OAuth2 实现简单的单点登录
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags: []
sources:
  - raw/sources/enterprise/2026-10-28-spring-security-oauth2-sso-demo.md
---
# 使用 Spring Security OAuth2 实现简单的单点登录

## Overview（概览）

用 Spring Boot 3.2 + Spring Authorization Server 三个应用（auth-server:9000 / blog-client:8081 / admin-client:8082）跑出可体验的 SSO Demo，不装 Keycloak、不用 Docker。讲清 SSO 本质（多个客户端共享认证服务器 Session）、OAuth2 Authorization Code + OIDC 标准协议组合、认证服务器两条安全链+OIDC Discovery+注册客户端、客户端一行 issuer-uri 自动配置、同域 Cookie 隔离、作者判断（生产优先 Keycloak）。完整源码在 Gitee。

## Key Facts（关键事实）

- SSO 核心秘密：两个客户端共享同一个认证服务器的 Session，认证服务器认识你则其他应用不用再登录。
- 认证服务器三条关键配置：`issuer` 开启 OIDC Discovery、`oidc(withDefaults())` 才有 ID Token、`oauth2ResourceServer(jwt())` 支撑 `/userinfo`。
- 两条安全链：协议端点（允许 Basic 认证、忽略 CSRF）vs 登录页（防 CSRF、渲染表单）规则冲突，必须分 @Order(1) 和 @Order(2)。
- 客户端一行 `issuer-uri` 自动拉 discovery 配好全部端点，无需写 SecurityConfig。
- `redirect-uri` 的 `{baseUrl}` 和 `{registrationId}` 展开后必须与认证服务器注册值一字不差。
- 同域多应用必须各自改 `session.cookie.name`。
- 四个易错点：redirectUri 精确匹配、scope(openid) 才拿 ID Token、postLogoutRedirectUri 精确匹配、生产开 PKCE。

## Important Claims（重要论断）

### Claim 1：SSO 的本质是共享认证服务器 Session

不是"协议"或"中间件"，而是多个客户端共享同一个认证服务器的 HTTP Session + Cookie。第二步没有输入密码但就是登录了——因为浏览器带着认证服务器的 Session Cookie。

### Claim 2：生产优先 Keycloak，自建仅适合两种场景

自建要处理密码策略、MFA、社交登录、自注册、密码重置、Session 管理、Token 轮换，每个都是坑。自建仅适合：对认证流程有高度定制需求、或团队不想引入额外基础设施。

### Claim 3：OAuth2 SSO 的解耦优势

两个客户端互不知道对方存在，只知道"有一个认证服务器去验证身份"。可以随时加第三、第四个客户端，在认证服务器注册即可。应用之间零耦合，全靠认证服务器做桥梁。

## Concepts Introduced（引入的概念）

- [[sso-oauth2-oidc|单点登录 SSO（OAuth2 Authorization Code + OIDC）]]

## Entities Mentioned（提及的实体）

- Spring 生态：Spring Boot 3.2、Spring Security 6.2、Spring Authorization Server 1.2。
- IAM 工具：Keycloak、Auth0、Casdoor。
- 协议：OAuth2、OIDC（OpenID Connect）、PKCE、JWT。

## Implications（影响／启示）

- SSO 的最小可运行架构是"认证服务器 + N 客户端"，不需要 Gateway 或外部 IAM。
- OIDC Discovery（`/.well-known/openid-configuration`）是消除手写端点 URL 的关键。
- 两条安全链的设计是 Spring Authorization Server 的易错点——协议端点与登录页规则冲突必须分开。
- 客户端间零耦合是 OAuth2 SSO 的核心架构优势。

## Limitations（局限）

- Demo 定位是理解原理，非生产直接搬用（作者明确说明）。
- 单点登出（Back/Front-Channel Logout）未涉及。
- 生产环境 Token 轮换、Session 管理、多租户隔离的工程实践未覆盖。
- 无 Keycloak 与 Spring Authorization Server 的性能/运维对比数据。

## Related Knowledge（相关知识）

- [[sso-oauth2-oidc|单点登录 SSO（OAuth2 Authorization Code + OIDC）]]

## Source（信源）

- `raw/sources/enterprise/2026-10-28-spring-security-oauth2-sso-demo.md`
