---
id: 2026-11-06-permission-rbac-abac-part2
title: 权限模型与 RBAC-ABAC 全解析（下篇）：RBAC 工程实现、多租户隔离与场景选型
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/tzqNby5ujNjfBtIvN1DgZQ
source_type: article
platform: 微信公众号
created: 2026-11-06
category: 技术
tags: [java]
asset_ref: Assets/2026-11/permission-rbac-abac-part2.md
wiki_status: pending
---

# 权限模型与 RBAC-ABAC 全解析（下篇）：RBAC 工程实现、多租户隔离与场景选型

> 权限专题下篇，聚焦工程落地：RBAC 标准五表结构、注解+AOP 校验、按钮级/接口级/菜单级双端配合、多租户三种隔离方案、PBAC 策略引擎与分场景选型，附源码分析、单测要点与最佳实践速查。

## 核心要点

1. RBAC 标准表：sys_user/sys_role/sys_permission + user_role/role_permission 多对多关联；role.parent_id 实现 RBAC1 继承；sys_role_conflict 表承载 RBAC2 职责分离
2. 权限编码用"模块:资源:动作"三段式（如 user:delete），可通配匹配、按模块分配
3. 权限加载：Redisson 缓存 + 递归展开父角色；角色权限变更不能只清单个用户，要清该角色下所有用户缓存
4. 前端按钮隐藏只是体验优化，后端接口必须独立校验——攻击者可直接构造请求绕过前端
5. 多租户三方案：独立库（最强）/ 独立 schema（中）/ 共享表 + tenant_id（弱但成本低）；共享表方案用 MyBatis 拦截器自动注入 tenant_id 防越权
6. 跨租户访问应返回 404 而非 403：404 不泄露"资源存在"
7. PBAC 把规则集中到策略引擎（OPA Rego），规则与代码解耦、变的无需发版；复杂合规场景才上，不替代 RBAC/ABAC
8. 分场景选型口诀：简单后台 RBAC0 → 中型 RBAC3+数据级 ABAC → SaaS 加租户隔离 → 金融政企上 PBAC → 开放平台 RBAC+OAuth2 scope+ABAC
9. 缓存热点：角色被大规模持有时批量清缓存有 Redis 峰值风险，可用版本号机制（key 带版本、变更即失效）或短 TTL 缓解
10. Spring Security 走 AuthorizationManager/AuthorityAuthorizationManager 校验链；Sa-Token 实现 StpInterface 提供权限列表，checkPermission 校验

## 正文

承接上篇模型理论，本篇解决"怎么落地"：

**RBAC 工程化**：五张标准表 + 互斥表；权限编码三段式；PermissionService 加载权限时先查缓存、递归合并父角色（RBAC1）；注解 @RequiresPermission + AOP 环绕校验，未登录抛 Unauthorized、无权限抛 Forbidden；缓存失效矩阵：用户角色变更清单个用户，角色权限变更批量清所有持有者。

**按钮/接口/菜单三层权限**：前端 v-if 控制按钮显示；后端每个接口注解独立校验；菜单按权限过滤后返回树。铁律：前端管显示、后端管安全，以后端为准。

**多租户隔离**：共享表方案最易出的 bug 是漏带 tenant_id 导致跨租户越权；用 TenantInterceptor 拦截 SQL 自动注入条件，配合测试（A 租户 token 访问 B 租户资源必须 404）；超管走独立的平台后台 + @IgnoreTenant + 全程审计。

**PBAC**：四个痛点（规则复杂、散落各处、频繁变更、多系统不一致）驱动；OPA Rego 三段示例（本部门订单、工作时间、密级匹配）；简单后台注解足够，金融政企审计严才上引擎。

**其他干货**：Spring Security 新版 AuthorizationManager/旧版 FilterSecurityInterceptor 的校验链；Sa-Token StpInterface 接口；角色权限批量失效热点优化（版本号 mechanism/MQ 异步清/短 TTL）；五类单测模板（继承、静态/动态 SoD、数据范围、租户隔离）；五个常见误区（前端隐藏即安全、角色越细越好、缓存不失效、跨租户返 403、权限点硬编码）；ACL/RBAC/ABAC/PBAC 四模型对比表。

## 来源

- 原文：https://mp.weixin.qq.com/s/tzqNby5ujNjfBtIvN1DgZQ

## 附件

- [[Assets/2026-11/permission-rbac-abac-part2.md]]
