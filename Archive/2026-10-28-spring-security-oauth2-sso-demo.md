---
id: 2026-10-28-spring-security-oauth2-sso-demo
title: 使用 Spring Security OAuth2 实现简单的单点登录
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/zTLDAj6072ItrqFWWIuZ_Q
source_type: 文章
platform: 微信公众号
created: 2026-10-28
category: 技术
tags: [spring, 工程实践]
asset_ref: Assets/2026/10/spring-security-oauth2-sso-demo.md
wiki_status: ingested
---

# 使用 Spring Security OAuth2 实现简单的单点登录

> 不装 Keycloak、不用 Docker，用 Spring Boot 3.2 + Spring Authorization Server 三个应用跑出可体验的 SSO Demo。讲清 SSO 本质：多个客户端共享认证服务器的 Session，授权码 + OIDC 是标准协议组合。

## 核心要点

- **SSO 原理**：客户端首次访问跳认证服务器登录并种 Session Cookie；访问第二个应用时浏览器带 Cookie，认证服务器直接发授权码不再弹登录页。
- **认证服务器要点**：`issuer` 开启 OIDC Discovery 免手写端点；必须配两条安全链（协议端点 vs 登录页规则冲突）；`oidc(withDefaults())` 才有 ID Token；`oauth2ResourceServer(jwt())` 支撑 `/userinfo`。
- **客户端极简**：一行 `issuer-uri` 自动拉 discovery 配好全部端点；无需写 SecurityConfig；`redirect-uri` 与服务器注册值必须一字不差；同域多应用必须各自改 `session.cookie.name`。
- **易错点**：redirectUri 精确匹配、`scope(openid)` 才拿 ID Token、生产开 PKCE。
- **作者判断**：生产优先 Keycloak 等现成 IAM，自建只适合高度定制或不想引入基础设施的场景；单点登出需 OIDC Back/Front-Channel Logout，本文未涉及；客户端间零耦合，加新客户端只需在认证服务器注册。
- 完整源码：https://gitee.com/potterCoding/sso-demo

## 正文

见 [[Assets/2026/10/spring-security-oauth2-sso-demo.md|抓取正文]]，含完整配置代码、双安全链说明与架构图。

## 来源

- [使用 Spring Security OAuth2 实现简单的单点登录](https://mp.weixin.qq.com/s/zTLDAj6072ItrqFWWIuZ_Q)（微信公众号）

## 附件

- [[Assets/2026/10/spring-security-oauth2-sso-demo.md]]
