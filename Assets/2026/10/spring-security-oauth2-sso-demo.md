# 使用 Spring Security OAuth2 实现简单的单点登录

## 引子

有读者问：公司有两个内部系统（博客前台 + 管理后台），每次都要登录两次，能不能搞单点登录？看了一圈教程，要么装 Keycloak，要么搞 Spring Cloud Gateway——只是想两个小应用共享登录，至于这么重吗？

大部分 SSO 教程的问题不是讲得不对，而是**把简单的事情搞复杂了**。本文目标：**用最少的代码、最少的依赖，跑一个能直接体验的 SSO Demo**。

技术栈：Spring Boot 3.2 + Spring Authorization Server（Spring 官方认证服务器项目）+ Thymeleaf。不需要 Keycloak，不需要 Docker，`mvn spring-boot:run` 就跑起来。完整可运行源码在 Gitee 仓库（文末）。

## 单点登录到底是怎么回事？

两个应用：**博客前台**（:8081）和**管理后台**（:8082），共用一个**认证服务器**（:9000）。

**第一次访问博客前台：**

```
你 → 访问 :8081
  → 没登录，302 跳转到认证服务器 :9000
  → 你在 :9000 输入用户名密码，登录成功
  → :9000 给浏览器种了一个 Session Cookie
  → 带着授权码（authorization_code）跳回 :8081
  → :8081 用授权码换到 Token，创建自己的 Session
  → 你看到了博客前台页面 ✅
```

**接着访问管理后台：**

```
你 → 访问 :8082
  → 没登录，302 跳转到认证服务器 :9000
  → 浏览器带着 :9000 的 Session Cookie（刚才登录时种的）
  → :9000 一看：你已经登录过了
  → 直接发授权码跳回 :8082（不再弹登录页）
  → :8082 换 Token、建 Session
  → 你看到了管理后台页面 ✅
```

**第二步没有输入密码，但就是登录了。这就是 SSO。**核心秘密一句话：**两个客户端共享同一个认证服务器的 Session。只要认证服务器认识你，其他应用都不用再登录。**

## 架构一览

三个独立的 Spring Boot 应用：

- **auth-server（:9000）**：Spring Authorization Server，负责用户认证、发放 Token
- **blog-client（:8081）**：客户端 1，博客前台
- **admin-client（:8082）**：客户端 2，管理后台

### 一、认证服务器（auth-server）

整个 SSO 的核心。Spring Authorization Server 是 Spring 官方维护的认证服务器实现，替代了已废弃的 Spring Security OAuth 项目。

**依赖：**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-oauth2-authorization-server</artifactId>
</dependency>
```

`spring-boot-starter-web` 不能省——`authorization-server` 只带 `spring-web`，不带 Servlet 容器，少了它应用以非 Web 应用启动，端口不监听。

**application.yml：**

```yaml
server:
  port: 9000
  servlet:
    session:
      cookie:
        name: SSO_SESSION   # 本机多应用同域，必须改名
spring:
  security:
    oauth2:
      authorizationserver:
        issuer: http://localhost:9000
```

`issuer` 是 OIDC Discovery 入口。客户端请求 `/.well-known/openid-configuration`，一次拿到授权、Token、JWKS、用户信息、登出等全部端点，不用手写一堆 URL。

**两条安全链：**

```java
@Configuration
public class AuthServerConfig {
    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerSecurityFilterChain(HttpSecurity http) throws Exception {
        OAuth2AuthorizationServerConfiguration.applyDefaultSecurity(http);
        http.getConfigurer(OAuth2AuthorizationServerConfigurer.class)
                .oidc(Customizer.withDefaults());
        http.exceptionHandling(e -> e.defaultAuthenticationEntryPointFor(
                        new LoginUrlAuthenticationEntryPoint("/login"),
                        new MediaTypeRequestMatcher(MediaType.TEXT_HTML)))
            .oauth2ResourceServer(rs -> rs.jwt(Customizer.withDefaults()));
        return http.build();
    }
    @Bean
    @Order(2)
    public SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(a -> a.anyRequest().authenticated())
            .formLogin(Customizer.withDefaults());
        return http.build();
    }
}
```

**为什么必须两条链？** 协议端点（`/oauth2/authorize`、`/oauth2/token`）要允许客户端 Basic 认证、忽略 CSRF；登录页要防 CSRF、渲染表单。规则完全不同，混在一起互相干扰。

**`oidc(withDefaults())` 不能省。** 有了它才有 ID Token（含用户信息的 JWT），否则只有 Access Token，拿不到 `OidcUser`。

**`oauth2ResourceServer(jwt())` 建议加。** `/userinfo` 需要 Access Token 认证，不开的话登录会卡在拉用户信息这一步。

**注册客户端：**

```java
@Bean
public RegisteredClientRepository registeredClientRepository() {
    RegisteredClient blogClient = RegisteredClient.withId(UUID.randomUUID().toString())
            .clientId("blog-client")
            .clientSecret(passwordEncoder().encode("blog-secret"))
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
            .redirectUri("http://localhost:8081/login/oauth2/code/messages")
            .postLogoutRedirectUri("http://localhost:8081/")
            .scope(OidcScopes.OPENID)
            .scope(OidcScopes.PROFILE)
            .clientSettings(ClientSettings.builder().requireProofKey(false).build())
            .build();
    // admin-client 同理：换 clientId、secret、端口 8082
    return new InMemoryRegisteredClientRepository(blogClient);
}
```

四个容易错的地方：

- `redirectUri` 必须和客户端实际回调地址**完全一致**（含端口、结尾斜杠）
- `scope(openid)` 有它才是 OIDC，才能拿到 ID Token
- `postLogoutRedirectUri` 做全局登出时必须精确匹配
- `requireProofKey(false)` 是 Demo 简化，生产建议开 PKCE

JWT 签名密钥、`AuthorizationServerSettings`、内存用户（`pottercoding/123456`）都是模板代码，完整版见仓库。

## 二、博客前台（blog-client，:8081）

**application.yml：**

```yaml
server:
  port: 8081
  servlet:
    session:
      cookie:
        name: BLOG_SESSION
spring:
  application:
    name: blog-client
  security:
    oauth2:
      client:
        registration:
          messages:                      # 注册 ID，自己取名
            client-id: blog-client
            client-secret: blog-secret
            scope: openid,profile
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
        provider:
          messages:
            issuer-uri: http://localhost:9000
```

**`issuer-uri` 这一行就够了。** Spring Security 启动时自动拉取 discovery 把端点全配好。`{baseUrl}` 展开成 `http://localhost:8081`，`{registrationId}` 展开成 `messages`，最终 `http://localhost:8081/login/oauth2/code/messages`，和认证服务器注册的必须一字不差。

**控制器：**

```java
@Controller
public class BlogController {
    @GetMapping("/")
    public String index(@AuthenticationPrincipal OidcUser user, Model model) {
        model.addAttribute("name", user.getPreferredUsername());
        model.addAttribute("claims", user.getClaims());
        return "index";
    }
}
```

**没有写任何 SecurityConfig。** Spring Boot 自动配置已配好"所有请求都要登录 + 走 OAuth2 登录"。页面是 Thymeleaf 模板，渲染 `name` 和 `claims`。

## 三、管理后台（admin-client，:8082）

和博客前台几乎一样，只改三处：

| 配置项 | blog-client | admin-client |
|---|---|---|
| `server.port` | 8081 | 8082 |
| `session.cookie.name` | `BLOG_SESSION` | `ADMIN_SESSION` |
| `client-id` / `secret` | `blog-client` / `blog-secret` | `admin-client` / `admin-secret` |

**`issuer-uri` 必须指向同一个认证服务器**，这是 SSO 成立的前提。Java 代码直接复制换包名。

## 四、跑起来

```bash
# 三个终端
cd auth-server  && mvn spring-boot:run
cd blog-client  && mvn spring-boot:run
cd admin-client && mvn spring-boot:run
```

1. 访问 `http://localhost:8081` → 自动跳转认证服务器登录页
2. 输入 `pottercoding` / `123456`，登录成功回到博客前台
3. **关键一步**：新标签页访问 `http://localhost:8082`
4. **没有弹登录页，直接进了管理后台**——这就是单点登录

## 我的几个判断

### 1. 什么时候自己搭认证服务器，什么时候用 Keycloak？

**大部分生产场景用 Keycloak（或 Auth0、Casdoor 这类现成的）。** 自己搭要处理密码策略、MFA、社交登录、自注册、密码重置、Session 管理、Token 轮换……每个都是坑，Keycloak 全做好了。

用 Spring Authorization Server 的两种情况：

- 对认证流程有高度定制需求（自定义授权审批页面、嵌入业务逻辑）
- 团队不想引入额外基础设施（不想运维 Keycloak 的数据库和集群）

本文 Demo 定位是**帮你理解 SSO 原理**，不是直接搬生产。

### 2. SSO 的 Session 问题

Demo 里 SSO 靠认证服务器的 **HTTP Session + Cookie**：

- 用户在博客前台退出 → 只清 :8081 的 Session → 认证服务器 Session 还在 → 去管理后台还是不用登录
- 用户在认证服务器退出 → 认证服务器 Session 没了 → 但 :8081/:8082 各自 Session 还在 → 刷新还是登录状态

**真正的"单点登出"（Single Logout）是另一个话题**，需要 OIDC Back-Channel Logout 或 Front-Channel Logout。

### 3. 客户端之间没有感知对方存在

两个客户端互不知道对方，只知道"有一个认证服务器，我去它那验证身份"：

- 可以随时加第三、第四个客户端，在认证服务器注册就行
- **这是 OAuth2 SSO 的解耦优势**：应用之间零耦合，全靠认证服务器做桥梁

## 总结

1. **SSO 的本质**：多个应用共享同一个认证服务器的 Session
2. **OAuth2 Authorization Code + OIDC** 是实现 SSO 的标准协议组合
3. **Spring Authorization Server** 让你不依赖外部服务就能搭一个认证服务器

**完整源码**：https://gitee.com/potterCoding/sso-demo

> 本文代码基于 Spring Boot 3.2.5 + Spring Security 6.2.4 + Spring Authorization Server 1.2.4，Java 17+。
