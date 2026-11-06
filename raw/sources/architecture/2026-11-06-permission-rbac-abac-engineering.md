---
title: 权限模型与 RBAC-ABAC 全解析（下篇）：RBAC 工程实现、多租户隔离与场景选型
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/tzqNby5ujNjfBtIvN1DgZQ
source_type: article
platform: 微信公众号
captured: 2026-11-06
registered_at: 2026-11-06
inbox_ref: Inbox/2026-11-06-permission-rbac-abac-part2.md
asset_ref: Assets/2026-11/permission-rbac-abac-engineering-part2.md
---

## 九、核心四：RBAC 工程实现

### 9.1 标准表结构

经典 RBAC 五张表：

```sql
-- 用户表
CREATE TABLE sys_user (
    id BIGINT PRIMARY KEY,
    username VARCHAR(64),
    dept_id BIGINT COMMENT '部门，用于数据权限',
    tenant_id BIGINT COMMENT '租户，多租户隔离'
);

-- 角色表
CREATE TABLE sys_role (
    id BIGINT PRIMARY KEY,
    role_code VARCHAR(64) COMMENT '角色编码，如 admin/operator',
    role_name VARCHAR(64),
    parent_id BIGINT COMMENT '父角色，支持继承(RBAC1)',
    status TINYINT COMMENT '0禁用 1启用',
    tenant_id BIGINT COMMENT '租户'
);

-- 权限表
CREATE TABLE sys_permission (
    id BIGINT PRIMARY KEY,
    permission_code VARCHAR(128) COMMENT '权限编码，如 user:delete',
    permission_name VARCHAR(64),
    type TINYINT COMMENT '1菜单 2按钮 3接口',
    parent_id BIGINT COMMENT '父权限，菜单树结构'
);

-- 用户-角色关联（多对多）
CREATE TABLE sys_user_role (
    user_id BIGINT,
    role_id BIGINT,
    PRIMARY KEY (user_id, role_id)
);

-- 角色-权限关联（多对多）
CREATE TABLE sys_role_permission (
    role_id BIGINT,
    permission_id BIGINT,
    PRIMARY KEY (role_id, permission_id)
);

-- 角色互斥表（RBAC2 职责分离）
CREATE TABLE sys_role_conflict (
    role_id BIGINT,
    conflict_role_id BIGINT,
    PRIMARY KEY (role_id, conflict_role_id)
);
```

**关键设计**：

1. 用户-角色、角色-权限都是多对多：一个用户可多角色，一个角色可多权限
2. 角色 `parent_id` 支持 RBAC1 继承：子角色自动继承父角色权限
3. 权限 `type` 区分菜单/按钮/接口：统一表管理，便于前端菜单和后端接口共用
4. `tenant_id` 多租户隔离：每条数据带租户标识
5. `sys_role_conflict` 角色互斥：RBAC2 职责分离

### 9.2 权限编码规范

权限编码建议用 `模块:资源:动作` 三段式：

```
user:view       — 查看用户
user:create     — 创建用户
user:delete     — 删除用户
order:approve   — 审批订单
finance:report  — 财务报表
```

**规范的好处**：

- 可读性强，一眼看出权限含义
- 便于通配匹配（如 `user:*` 表示所有用户操作）
- 便于按模块分配

### 9.3 权限加载服务

```java
@Service
public class PermissionService {
    @Autowired
    private UserRoleMapper userRoleMapper;
    @Autowired
    private RolePermissionMapper rolePermissionMapper;
    @Autowired
    private PermissionMapper permissionMapper;
    @Autowired
    private RoleMapper roleMapper;
    @Autowired
    private RedissonClient redisson;
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    /** 加载用户所有权限编码（含继承的父角色权限） */
    public Set<String> loadPermissions(Long userId) {
        // 1. 先查缓存
        RBucket<Set<String>> bucket = redisson.getBucket("perm:user:" + userId);
        Set<String> cached = bucket.get();
        if (cached != null) return cached;
        // 2. 查用户所有角色
        List<Long> roleIds = userRoleMapper.findRoleIdsByUserId(userId);
        if (roleIds.isEmpty()) return Set.of();
        // 3. 含继承：递归把父角色也加进来（RBAC1）
        Set<Long> allRoleIds = expandWithParents(roleIds);
        // 4. 查角色对应的所有权限
        List<Long> permissionIds = rolePermissionMapper.findPermissionIdsByRoleIds(allRoleIds);
        if (permissionIds.isEmpty()) return Set.of();
        // 5. 返回权限编码集合
        Set<String> perms = permissionMapper.findCodesByIds(permissionIds);
        bucket.set(perms, CACHE_TTL);
        return perms;
    }

    /** 递归展开父角色（RBAC1 继承） */
    private Set<Long> expandWithParents(List<Long> roleIds) {
        Set<Long> all = new HashSet<>(roleIds);
        for (Long roleId : roleIds) {
            Long parentId = roleMapper.findParentId(roleId);
            while (parentId != null && all.add(parentId)) {
                parentId = roleMapper.findParentId(parentId);
            }
        }
        return all;
    }

    /** 权限变更时清除该用户缓存 */
    public void evict(Long userId) {
        redisson.getBucket("perm:user:" + userId).delete();
    }

    /** 角色权限变更时，清除所有持有该角色的用户缓存 */
    public void evictByRole(Long roleId) {
        List<Long> userIds = userRoleMapper.findUserIdsByRoleId(roleId);
        for (Long uid : userIds) evict(uid);
    }
}
```

### 9.4 权限校验：注解 + AOP

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresPermission {
    String value();               // 权限编码
    Logical logical() default Logical.AND;
}

public enum Logical { AND, OR }
```

```java
@Aspect
@Component
public class PermissionAspect {
    @Autowired
    private PermissionService permissionService;

    @Around("@annotation(requiresPermission)")
    public Object check(ProceedingJoinPoint pjp, RequiresPermission rp) throws Throwable {
        SessionInfo user = UserContext.get();
        if (user == null) throw new UnauthorizedException("未登录");
        Set<String> perms = permissionService.loadPermissions(user.getUid());
        if (!perms.contains(rp.value())) {
            throw new ForbiddenException("无权限：" + rp.value());
        }
        return pjp.proceed();
    }
}
```

业务接口使用：

```java
@RequiresPermission("user:delete")
@DeleteMapping("/user/{id}")
public void delete(@PathVariable Long id) {
    userService.delete(id);
}
```

### 9.5 权限缓存失效策略

| 变更场景         | 失效操作                         |
| ---------------- | -------------------------------- |
| 用户角色变更     | 清该用户缓存                     |
| 角色权限变更     | 清所有持有该角色的用户缓存       |
| 用户登录/登出    | 重新加载                         |

**最易漏的**：角色权限变更时，不能只清单个用户——要找到所有持有该角色的用户，全部失效。改了角色权限却没清缓存，导致权限变更不生效，这是常见 bug。

---

## 十、核心五：按钮级与接口级权限

前端"按钮可见性"和后端"接口可达性"是两层，缺一不可。

### 10.1 前端按钮级

前端根据用户权限编码控制按钮显示：

```js
// 用户登录后，后端返回权限编码列表
userPermissions = ["user:view", "user:edit"]; // 没有 user:delete
// 按钮上声明所需权限
<button v-if="hasPermission('user:delete')">删除</button> // 不显示
```

### 10.2 后端接口级

```java
@RequiresPermission("user:delete")
@DeleteMapping("/user/{id}")
public void delete(@PathVariable Long id) { ... }
```

**关键**：前端按钮隐藏只是体验优化（不让用户点无效按钮），**后端接口必须独立校验**。只隐藏前端按钮、不校验后端接口，攻击者直接构造请求就能绕过。

**铁律**：前端权限管"显示"，后端权限管"安全"，两者都要做，以后端为准。

### 10.3 菜单级权限

菜单权限是按钮权限的延伸——根据用户权限决定显示哪些菜单项。后端通常返回菜单树（已按权限过滤），前端直接渲染：

```java
/** 返回当前用户的菜单树（已过滤无权限项） */
@GetMapping("/menus")
public List<Menu> myMenus() {
    SessionInfo user = UserContext.get();
    Set<String> perms = permissionService.loadPermissions(user.getUid());
    return menuService.buildMenuTree(perms); // 只返回有权限的菜单
}
```

---

## 十一、核心六：多租户权限隔离

SaaS 场景下，多租户权限隔离是硬需求——租户 A 的用户绝不能看到租户 B 的数据。

### 11.1 三种隔离方案

| 方案                 | 做法               | 隔离强度            | 成本 | 适用          |
| -------------------- | ------------------ | ------------------- | ---- | ------------- |
| 独立数据库           | 每租户一个库       | 最强                | 最高 | 大客户、强合规 |
| 共享库独立 schema    | 每租户一个 schema  | 中                  | 中   | 中型租户      |
| 共享库共享表 + tenant_id | 所有数据加 tenant_id | 弱（靠代码保证） | 最低 | 小租户、量大  |

### 11.2 共享表方案的权限设计

最常用的是共享表 + `tenant_id`，权限模型要全程带 tenant_id：

```sql
-- 所有表加 tenant_id
CREATE TABLE sys_user (
    id BIGINT,
    tenant_id BIGINT, -- 关键
    username VARCHAR(64)
);

-- 所有查询必须带 tenant_id 条件
SELECT * FROM sys_user WHERE tenant_id = ? AND ...;
```

用 MyBatis 拦截器自动注入 `tenant_id`：

```java
@Intercepts(@Signature(type = StatementHandler.class, method = "prepare",
            args = {Connection.class, Integer.class}))
public class TenantInterceptor implements Interceptor {
    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        // 拦截所有 SQL，自动加 "AND tenant_id = #{currentTenantId}"
        Long tenantId = TenantContext.get();
        if (tenantId == null) return invocation.proceed();
        // 注入 tenant_id 条件（用 JSqlParser 解析 SQL）
        ...
    }
}
```

**权限规则**：

1. 用户-角色、角色-权限关联表都带 `tenant_id`
2. 角色、权限在租户内定义，租户间不通用
3. 查询时全程带 `tenant_id`，拦截器统一注入

### 11.3 最易出的 bug

**租户越权**：查询时漏带 `tenant_id` 条件，导致租户 A 查到租户 B 的数据。这是 SaaS 最严重的安全事故。

**防护**：

- 用拦截器统一注入 `tenant_id`，业务代码不手写
- 关键接口加测试：用租户 A 的 token 访问租户 B 的资源 id，必须返回 404 而非 200
- 定期扫描代码，确保没有裸 SQL 漏带 `tenant_id`

### 11.4 超级管理员的特殊处理

超级管理员（平台运维）需要跨租户操作，不能用 `tenant_id` 隔离。通常做法：

- 超管走单独的"平台管理后台"，与租户后台物理分离
- 超管接口显式声明 `@IgnoreTenant`，跳过租户隔离
- 超管操作全程审计，避免滥用

---

## 十二、核心七：PBAC 策略引擎

复杂合规场景，RBAC + ABAC 仍不够，需要 PBAC 把规则集中到策略引擎。

### 12.1 为什么需要 PBAC

| 场景             | 痛点                         |
| ---------------- | ---------------------------- |
| 权限规则极复杂   | 时间、地点、密级、审批流、上下文组合 |
| 规则散落各处     | 注解 + 代码 + 配置，难维护审计 |
| 规则频繁变更     | 改规则要重新发版             |
| 多系统权限统一   | 各系统权限规则不一致         |

### 12.2 PBAC 架构

流程：

1. 业务系统收到请求，构造"主体/客体/动作/环境"上下文
2. 调用策略引擎（如 OPA）做决策
3. 策略引擎按策略集计算，返回允许/拒绝
4. 业务系统根据决策执行或拒绝

### 12.3 策略示例（OPA Rego 语法）

```rego
# 允许查看本部门订单
allow {
    input.action == "view"
    input.resource.type == "order"
    input.subject.dept == input.resource.dept
}

# 工作时间才能访问
allow {
    input.environment.hour >= 9
    input.environment.hour <= 18
}

# 密级匹配
allow {
    input.subject.clearance >= input.resource.level
}
```

**优势**：规则与业务代码解耦，规则变更不重新发版，集中审计。

### 12.4 何时上 PBAC

| 场景                   | 用 PBAC？         |
| ---------------------- | ----------------- |
| 简单后台               | ❌ 用注解 + AOP 够 |
| 中型 + 数据级权限      | ❌ RBAC + ABAC 注解够 |
| 复杂合规、多系统统一   | ✅ 上 PBAC         |
| 金融、政企、审计严     | ✅ 上 PBAC         |

PBAC 不是替代 RBAC/ABAC，是用策略引擎统一承载这些模型。简单系统用 RBAC/ABAC 够了，复杂合规场景才上 PBAC。

---

## 十三、分场景讨论

### 13.1 简单后台

**场景**：用户少、角色固定（管理员/普通用户）。

**方案**：RBAC0 基础三层，甚至简化到"用户-角色"两表（角色对应固定权限点）。不必上继承、约束、ABAC。

### 13.2 中型企业系统

**场景**：部门多、角色多、有数据权限需求。

**方案**：RBAC3（继承 + 职责分离）+ 数据级 ABAC（`@DataScope`）。权限缓存 + 角色权限变更失效。

### 13.3 SaaS 多租户

**场景**：多租户，每租户独立角色体系。

**方案**：RBAC3 + 租户隔离（`tenant_id` 全程贯穿）+ 数据级 ABAC。租户内角色继承，租户间完全隔离。

### 13.4 复杂合规场景

**场景**：金融、政企，权限规则极复杂（时间、地点、密级、审批流）。

**方案**：PBAC 策略引擎——把权限规则抽到独立策略服务（如 OPA、Drools），用规则引擎统一决策，业务系统调策略引擎。权限规则与业务代码彻底解耦。

### 13.5 开放平台

**场景**：对外开放 API，合作伙伴接入。

**方案**：RBAC（应用维度角色）+ OAuth2 scope（接口级授权）+ ABAC（数据级）。详见《API接口安全与签名防重放全解析》。

---

## 十四、源码分析

### 14.1 Spring Security 的权限校验链

Spring Security 的权限校验核心是 `FilterSecurityInterceptor`（旧版）或 `AuthorizationManager`（新版）：

```
请求 → Filter Chain
  ├─ AuthenticationFilter（认证）
  ├─ AuthorizationFilter（授权）
  │    └─ AuthorizationManager.check(authentication, request)
  │         └─ AuthorityAuthorizationManager
  │              └─ 校验 authentication.getAuthorities() 是否包含所需权限
  └─ Controller
```

**关键类**：

| 类                  | 职责                              |
| ------------------- | --------------------------------- |
| `Authentication`    | 认证对象，含 `authorities`（权限集合） |
| `GrantedAuthority`  | 权限抽象，如 `SimpleGrantedAuthority("user:delete")` |
| `AuthorizationManager` | 授权决策器                       |
| `AuthorizationFilter`  | 授权过滤器                       |

### 14.2 Sa-Token 的权限校验

Sa-Token 的权限校验更轻量：

```java
// Sa-Token 权限校验核心
StpUtil.checkPermission("user:delete");
//  └─ getLoginId() → 查 session 里的权限列表
//  └─ 列表.contains("user:delete") → 不含则抛 NotPermissionException
```

**核心接口 `StpInterface`**：

```java
public interface StpInterface {
    List<String> getPermissionList(Object loginId, String loginType);
    List<String> getRoleList(Object loginId, String loginType);
}
```

业务实现这个接口，返回用户的权限和角色列表，Sa-Token 框架在校验时调用。

### 14.3 权限缓存的热点问题

权限缓存有个隐藏问题——角色权限变更时的"批量失效"：

```
角色权限变更 → 查所有持有该角色的用户 → 逐个清缓存
```

若一个角色被 10 万用户持有，变更一次要清 10 万个缓存 key，可能造成 Redis 压力峰值。

**优化方案**：

1. **版本号机制**：角色带版本号，缓存 key 带版本号（`perm:user:{uid}:{roleVersion}`），角色变更时版本号 +1，老缓存自然过期，无需批量清
2. **消息队列异步清**：把批量清拆成消息，异步消费，避免同步阻塞
3. **短 TTL**：缓存 TTL 设短（如 5 分钟），容忍短暂不一致

```java
// 版本号机制
public Set<String> loadPermissions(Long userId) {
    Long roleVersion = roleVersionService.getVersion(); // 全局角色版本
    String key = "perm:user:" + userId + ":" + roleVersion;
    // ... 缓存 key 带版本，角色变更时 version+1，老缓存自动失效
}
```

---

## 十五、单元测试

### 15.1 权限校验测试

```java
@SpringBootTest
class PermissionServiceTest {
    @Autowired
    private PermissionService permissionService;

    @Test
    void testUserHasPermission() {
        // 用户 1 关联运营角色，运营角色有 order:view
        Set<String> perms = permissionService.loadPermissions(1L);
        assertTrue(perms.contains("order:view"));
        assertFalse(perms.contains("user:delete"));
    }

    @Test
    void testUserWithoutRoleHasNoPermission() {
        // 无角色的用户
        Set<String> perms = permissionService.loadPermissions(999L);
        assertTrue(perms.isEmpty());
    }
}
```

### 15.2 角色继承测试（RBAC1）

```java
@Test
void testRoleInheritance() {
    // 运营组长继承运营专员
    // 运营专员有 order:view, order:edit
    // 运营组长额外有 order:approve
    // 用户 A 是运营组长
    Set<String> perms = permissionService.loadPermissions(userAId);
    // 应包含父角色权限 + 自己的权限
    assertTrue(perms.contains("order:view"));    // 继承自运营专员
    assertTrue(perms.contains("order:edit"));    // 继承自运营专员
    assertTrue(perms.contains("order:approve")); // 运营组长自己的
}
```

### 15.3 职责分离测试（RBAC2）

```java
@Test
void testStaticSoDConflict() {
    // 用户已持有"制单"角色，再分配"审核"角色应被拒
    assignRole(userId, roleMakerId); // 先分配制单角色
    assertThrows(BusinessException.class,
            () -> assignRole(userId, roleCheckerId)); // 审核角色应冲突
}

@Test
void testDynamicSoDInBusiness() {
    // 制单人不能审核自己的单
    Order order = createOrder(userAId); // A 制单
    assertThrows(BusinessException.class,
            () -> approveOrder(order.getId(), userAId)); // A 不能审核自己的
    // B 可以审核
    assertDoesNotThrow(() -> approveOrder(order.getId(), userBId));
}
```

### 15.4 数据级权限测试

```java
@Test
void testDataScopeSelf() {
    // 用户 A 只能看自己创建的订单
    loginAs(userA);
    List<Order> orders = orderService.list();
    assertTrue(orders.stream().allMatch(o -> o.getCreateBy().equals(userA.getUid())));
}

@Test
void testDataScopeDept() {
    // 用户 C 是本部门范围
    loginAs(userC);
    List<Order> orders = orderService.list();
    assertTrue(orders.stream().allMatch(o -> o.getDeptId().equals(userC.getDeptId())));
}
```

### 15.5 多租户隔离测试

```java
@Test
void testTenantIsolation() {
    // 租户 A 的用户不能看到租户 B 的数据
    Order orderB = createOrderInTenant(tenantB);
    loginAsTenant(tenantA, userA);
    // 用租户 A 身份访问租户 B 的订单，应 404
    assertThrows(NotFoundException.class,
            () -> orderService.getById(orderB.getId()));
}

@Test
void testCrossTenantReturns404() {
    // 关键：跨租户访问返回 404 而非 403，不泄露资源存在
    loginAsTenant(tenantA, userA);
    Order orderB = createOrderInTenant(tenantB);
    try {
        orderService.getById(orderB.getId());
        fail("应抛异常");
    } catch (NotFoundException e) {
        // 正确：返回 404
    } catch (ForbiddenException e) {
        fail("应返回 404 而非 403，避免泄露资源存在");
    }
}
```

---

## 十六、常见误区

### 16.1 误区：前端按钮隐藏就够了

**误区**：前端把无权按钮隐藏，用户点不到，安全了。

**正解**：前端隐藏只是体验优化，攻击者可绕过前端直接构造请求。后端接口必须独立校验权限。

### 16.2 误区：角色越细越好

**误区**：每个岗位一个角色，角色越细越灵活。

**正解**：角色太细会导致角色爆炸（几十上百个角色），管理反而困难。角色应对应"岗位或职责"，粒度适中，配合 ABAC 数据权限表达更细的需求。

### 16.3 误区：权限缓存永不失效

**误区**：权限缓存 TTL 设很长，减少查库。

**正解**：权限变更后缓存不失效，会导致权限变更不生效（撤销了权限但用户还能用）。必须有失效机制，角色权限变更要批量清相关用户缓存。

### 16.4 误区：跨租户返回 403

**误区**：租户 A 用户访问租户 B 资源，返回 403（无权限）。

**正解**：应返回 404（不存在）。403 会泄露"资源存在但无权访问"，攻击者据此判断资源 id 是否有效；404 不泄露存在性。

### 16.5 误区：权限点硬编码在代码

**误区**：权限编码散落在各接口的注解里，没有统一管理。

**正解**：权限点应在 `sys_permission` 表统一管理，接口注解引用编码，便于审计和前端动态渲染。

---

## 十七、对比分析

### 17.1 权限模型对比

| 维度         | ACL               | RBAC              | ABAC         | PBAC         |
| ------------ | ----------------- | ----------------- | ------------ | ------------ |
| 核心思想     | 资源列清单         | 用户-角色-权限      | 属性动态判断 | 策略引擎决策 |
| 适合         | 文件系统           | 业务系统           | 数据级权限    | 复杂合规     |
| 灵活性       | 低                | 中                | 高           | 最高         |
| 实现复杂度   | 低                | 中                | 中           | 高           |
| 维护成本     | 高（资源多）      | 中                | 中           | 低（集中）   |
| 性能         | 高                | 高                | 中（动态判断）| 低（调引擎） |

### 17.2 数据级权限方案对比

| 方案         | 实现                                      | 优缺点                       |
| ------------ | ----------------------------------------- | ---------------------------- |
| 手写 SQL 条件 | 每个查询手动加 where                        | 灵活但易漏，维护差           |
| 注解 + 拦截器 | `@DataScope` + MyBatis 拦截器             | 统一，业务无感知             |
| 视图         | 数据库视图过滤                             | 数据库层，难动态             |
| 行级安全（RLS） | PostgreSQL RLS                          | 数据库原生，但锁死数据库     |

### 17.3 多租户隔离方案对比

| 方案             | 隔离强度          | 成本 | 灵活性            |
| ---------------- | ------------------ | ---- | ----------------- |
| 独立库           | 最强               | 最高 | 低（迁移难）      |
| 独立 schema      | 中                 | 中   | 中                |
| 共享表 + tenant_id | 弱（靠代码）   | 最低 | 高                |

---

## 十八、最佳实践

### 18.1 模型选型

1. **默认 RBAC0**：80% 系统够用，简单成熟
2. **角色继承用 RBAC1**：避免重复定义，单继承够用
3. **财务/审批用 RBAC2**：职责分离防舞弊
4. **数据级权限用 ABAC**：注解 + 拦截器
5. **复杂合规才上 PBAC**：策略引擎集中决策

### 18.2 工程实现

1. **统一表结构**：五张标准表 + 互斥表
2. **权限编码规范**：`模块:资源:动作` 三段式
3. **注解 + AOP 校验**：业务无感知
4. **缓存 + 失效机制**：版本号机制优化批量失效
5. **拦截器注入条件**：数据权限、租户隔离自动注入

### 18.3 安全要点

1. **后端必校验**：不信任前端
2. **跨租户返 404**：不泄露资源存在
3. **权限缓存要失效**：变更即清，避免权限不生效
4. **超管分离**：平台管理与租户后台物理分离
5. **审计日志**：权限变更、敏感操作全程审计

---

## 十九、总结——核心要点速查表

| 要点               | 说明                                       |
| ------------------ | ------------------------------------------ |
| 权限三元组         | 主体-客体-动作                               |
| RBAC0 基础三层     | 用户-角色-权限多对多                         |
| RBAC1 角色继承     | parent_id 递归合并父角色权限                 |
| RBAC2 职责分离     | 静态（分配时拒）/动态（执行时拒）           |
| RBAC3 = RBAC1 + RBAC2 | 企业级标配                                |
| ABAC 四属性        | 主体/客体/操作/环境                          |
| 数据级权限         | 注解 + MyBatis 拦截器注入 where             |
| 前后端权限         | 前端管显示，后端管安全，以后端为准           |
| 多租户隔离         | tenant_id 全程贯穿，拦截器注入               |
| 跨租户返 404       | 不泄露资源存在                               |
| 权限缓存           | 角色权限变更批量清，版本号机制优化           |
| PBAC 策略引擎      | 复杂合规场景，规则与代码解耦                 |

---

## 二十、面试自测与答案

| #   | 题目                                                                                 | 对应章节    |
| --- | ------------------------------------------------------------------------------------ | ----------- |
| Q1  | ACL 和 RBAC 的区别？为什么 RBAC 更适合企业系统？                                        | 二、六        |
| Q2  | RBAC0/1/2/3 各是什么？角色继承解决什么问题？                                            | 七           |
| Q3  | 什么是职责分离（SoD）？静态和动态职责分离的区别？                                       | 7.3         |
| Q4  | RBAC 表达不了的什么场景要用 ABAC？举三个例子。                                            | 八           |
| Q5  | 数据级权限怎么实现？同一个接口不同人看不同数据的原理？                                   | 8.4         |
| Q6  | 前端按钮级权限和后端接口级权限为什么要都做？只做前端行不行？                             | 十           |
| Q7  | 权限缓存怎么做？角色权限变更时如何失效？版本号机制是什么？                               | 9.5、14.3   |
| Q8  | 多租户 SaaS 的权限隔离有哪几种方案？共享表方案最易出什么 bug？跨租户应返回什么？          | 十一         |
| Q9  | 为什么"制单"和"审核"角色不能同一人持有？这属于 RBAC 的哪一层？                           | 7.3         |
| Q10 | 复杂合规场景为什么要上 PBAC 策略引擎？与 RBAC/ABAC 的关系？                              | 十二         |
| Q11 | 权限编码为什么用"模块:资源:动作"三段式？有什么好处？                                     | 9.2         |
| Q12 | 角色权限变更时批量清缓存有什么性能问题？如何优化？                                       | 14.3        |

---

## 参考资料

1. NIST RBAC 标准 (INCITS 359-2004) — RBAC 四层模型定义
2. OWASP Access Control Cheat Sheet — 访问控制最佳实践
3. Spring Security 全解析 — Spring Security 权限实现
4. Sa-Token 认证框架全解析 — Sa-Token 权限校验
5. 认证授权架构选型全解析 — 认证与授权的分层
6. OPA (Open Policy Agent) / Cedar / Drools — 策略引擎
7. Apache Shiro — 另一个 Java 权限框架
