---
id: wiki-concept-rbac-permission-system
type: concept
title: RBAC 权限系统（传统 B 端角色访问控制）
status: active
created: 2026-11-03
updated: 2026-11-06
confidence: medium
tags:
  - concept
  - security
  - product
sources:
  - raw/sources/architecture/2026-11-03-bend-rbac-permission-system-design.md
  - raw/sources/architecture/2026-11-03-weixin-bend-complex-system-breakdown-20.md
  - raw/sources/products/2026-11-03-weixin-bend-permission-design-22.md
  - raw/sources/products/2026-11-03-weixin-bend-saas-multitenant-05.md
  - raw/sources/architecture/2026-11-06-auth-authz-selection-part1.md
  - raw/sources/architecture/2026-11-06-permission-rbac-abac-engineering.md
  - raw/sources/misc/2026-11-06-xuqiufenxi-18-xingquanxian.md
related:
  - wiki/concepts/agent-permission-model.md
  - wiki/concepts/complex-system-breakdown.md
  - wiki/concepts/permission-refactoring.md
  - wiki/concepts/saas-multi-tenancy.md
  - wiki/concepts/authn-authz-selection-framework.md
  - wiki/concepts/pbac-policy-engine.md
  - wiki/concepts/row-level-permission.md
  - wiki/sources/bend-rbac-permission-system-design.md
  - wiki/sources/bend-permission-design-22.md
  - wiki/sources/bend-saas-multitenant-05.md
---
# RBAC 权限系统（传统 B 端角色访问控制）

## Definition（定义）

基于角色的访问控制（Role-Based Access Control）模型：在用户与资源之间引入角色作为桥梁，用户通过角色获得权限，权限是对资源（菜单/按钮/接口/数据）的执行能力。传统 B 端软件中最常见的权限模型，核心是静态的「用户→角色→权限→资源」绑定关系。

## Why It Matters（为什么重要）

B 端权限系统是底层能力，直接决定数据合规与使用边界。RBAC 的清晰之处在于角色作为中介解耦了用户与权限：调整组织架构时改角色分配即可，不必逐用户改权限；角色继承与约束机制能覆盖大多数企业权限场景，是 B 端产品权限设计的默认起点。

## Core Characteristics（核心特征）

1. **四核心对象**：用户（使用主体）、角色（用户与权限的桥梁）、权限（对资源的执行能力）、资源（菜单/按钮/接口/数据）。
2. **模型层级递进**：RBAC0（基础三角）→ RBAC1（角色继承）→ RBAC2（约束：互斥/基数/先决条件）→ RBAC3（继承+约束）。多数 B 端产品 RBAC1/2 混合即可。
3. **权限点编码规范**：模块_资源_动作（如 order_view/order_export/order_approve），颗粒度到按钮和接口级，数据级权限单独管理。
4. **数据权限维度**：本人/本部门及下级/全部/自定义，维度可含部门、项目、区域、产品线；多租户场景下租户维度是隔离底线——共享表每条数据带 tenant_id/org_id/owner_id，数据权限按"租户+组织+资源 Owner+数据规则"组合过滤，租户识别从登录态 token 解析（前端传参不可作后端过滤依据）（第四信源补充）。
5. **前后端一致**：前端控菜单按钮显示，后端校验权限标识防越权，数据权限在查询层拼接条件。
6. **权限矩阵表落地**：拆解阶段建议输出角色×功能/数据矩阵（横轴角色、纵轴功能/数据，逐项标注可执行/可查看/禁止），如车贷系统客户经理（创建申请单、看本人客户）/风控岗（审批）/财务岗（放款）/管理员（配置角色）的四角色示例（第二信源印证）。
7. **字段权限（列级控制）**：权限类型分可见、可编辑、加密；薪资、身份证号、手机号、采买价、利润、供应商账户等敏感字段控制到列而非整页隐藏（EHR/车贷/ERP/HIS 案例）；三张表产出物（功能权限矩阵、数据权限规则表、字段权限清单）与 SOP 七步（梳理角色→列功能点→定数据范围→标敏感字段→输出三表→评审越权测试→上线后审计变更）是该层的落地形态（第三信源补充）。

8. **标准 RBAC 六表落地结构**（第六信源 §9.1）：`sys_user`（含 `dept_id` 数据权限、`tenant_id` 多租户）、`sys_role`（`role_code` + `parent_id` 继承 + `status`）、`sys_permission`（`type` 区分菜单/按钮/接口）、`sys_user_role`、`sys_role_permission` 两多对多关联表、`sys_role_conflict` 互斥表（RBAC2 静态职责分离）；用户-角色、角色-权限均多对多。
9. **权限编码三段式与统一管理**（§9.2）：`模块:资源:动作` 三段式编码（`user:delete`/`order:approve`），支持 `user:*` 通配匹配，权限点统一进 `sys_permission` 表管理、接口注解引用编码——编码方向与第五信源「模块_资源_动作」一致，第六信源补充通配匹配与「权限点不得硬编码散落各接口注解」的审计要求。
10. **缓存失效矩阵是落地最易漏点**（§9.5/§14.3）：三场景——用户角色变更清该用户缓存；角色权限变更清**所有持有该角色的用户**缓存（最易漏：只清单个用户导致权限变更不生效）；登录/登出重新加载。大角色（如 10 万用户持同一角色）批量清缓存可能打爆 Redis，优化方案：版本号机制（缓存 key 带 `roleVersion`、变更时 version+1、老缓存自然过期）、MQ 异步清、短 TTL 容忍短暂不一致。
11. **后端独立校验铁律**（§10）：前端按钮隐藏只是体验优化（不让用户点无效按钮），后端接口必须独立校验权限编码（`@RequiresPermission` + AOP，`Logical.AND/OR` 组合）——只隐藏前端按钮会被构造请求直接绕过；与本页既有「前后端一致」原则互证并给出硬约束。

## Structure（结构）

七大功能模块：

1. 用户管理：列表/状态/角色绑定/批量导入导出/扩展字段（部门/岗位/职级）
2. 角色管理：列表/新建/权限配置（资源树+半选+父子联动）/复制/停用启用
3. 权限资源管理：资源目录树/权限点注册/资源类型（目录/菜单/按钮/接口）/权限标识
4. 授权管理：用户分配角色/角色分配权限/批量授权/授权模板/授权记录
5. 数据权限管理：数据范围规则配置/维度维护/与角色用户绑定
6. 审计日志：登录日志/授权变更日志/敏感行为日志/导出
7. 安防策略：密码策略/会话超时/IP限制/验证码/水印/登录失败锁定

## How It Works（运作方式）

**登录鉴权**：用户登录 → 验证账号状态 → 获取角色集合 → 合并权限点 → 生成前端资源树与后端权限标识。

**权限校验**：前端路由守卫控页面、按钮级指令控显示；后端中间件校验接口权限标识；数据权限在查询层追加数据范围条件。

**授权变更**：管理员调整角色权限 → 记录变更日志 → 重新登录或令牌刷新后生效；紧急冻结可实时踢下线。

**异常边界**：角色停用保留绑定但不加载权限；权限点删除前校验引用；多角色数据权限取并集或交集需预先定义；超管不可删除停用。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-permission-model|Agent 权限模型]]——传统 RBAC 的演进方向
- [[complex-system-breakdown|复杂B端系统拆解方法论（五件套）]]——RBAC 作为五件套中的权限件被引用

### Dependencies（依赖项）

- 依赖权限点字典统一维护，禁止硬编码权限标识

### Distinctions（区分）

- 与 [[agent-permission-model|Agent 权限模型]] 的不同之处在于：传统 RBAC 是静态「用户→角色→权限」绑定，权限主体是单一用户；Agent 平台权限模型是「租户基线 + 指令级临时授权 + 动态校验」，权限主体扩为租户/Agent 实例/单次指令三层，授权从静态长期变为动态随指令生命周期失效。

## Evolution（演进）

- RBAC0 → RBAC1 → RBAC2 → RBAC3：从简单三角到继承再到约束，复杂度递增。
- 传统 RBAC → Agent 平台权限模型：从静态角色绑定演进为动态基线+指令授权+调用时校验。
- 2026-11-04：据第三信源（《B端权限设计别只控菜单》）补充字段权限（列级）层，权限模型升级为功能/数据/字段三层交叉，并补三张表产出物与 SOP 七步。
- 未来方向：ABAC（属性访问控制）、多租户权限隔离；从 RBAC 向 ABAC 演进的务实路径（RBAC 打底 + 规则引擎补数据权限 + 灰度双轨迁移）见 [[permission-refactoring]]。ABAC 适用场景示例（第四信源）："仅允许查看本人所在部门且金额大于 10 万的合同"，用属性规则引擎处理；权限表至少含用户、角色、角色菜单关系、角色数据范围、租户、组织、资源类型，并需画出"同一角色在不同租户下看到不同数据范围"的用例。
- 2026-11-04：据第四信源（《SaaS多租户系统实战》）补充多租户场景的租户维度数据权限（tenant_id/org_id/owner_id 组合过滤、token 解析租户识别）与 ABAC 属性规则引擎适用场景示例。
- 2026-11-06：据第五信源（《认证与授权选型拆解（上篇）》认证侧选型框架，[[authn-authz-selection-framework]]）印证 RBAC/ABAC 全任务统一选型结论——授权层不管认证层选谁，业务细粒度权限（按钮、数据）统一用 RBAC/ABAC 注解+拦截器；与 [[permission-refactoring]]「RBAC 打底、ABAC 补数据权限」的演进路径互证：两处结论一致（业务系统实现细粒度授权，认证框架只做认证与粗粒度 scope），第五信源为认证层视角（对内私有/对外标准协议），本文为服务端实现视角，不影响既有 RBAC 结论。

- 2026-11-06：据第六信源（《权限模型与 RBAC-ABAC 全解析（下篇）》工程实现篇）补充 RBAC 落地细节——六表结构（含 RBAC1 `parent_id` 递归继承与 `sys_role_conflict` 静态互斥表）、权限编码三段式通配匹配、权限缓存失效矩阵（角色权限变更需批量清所有持有该角色的用户缓存、版本号机制优化）、后端接口独立校验铁律；场景选型五档与「复杂合规上 PBAC」判断见 [[pbac-policy-engine]]，租户隔离工程细节见 [[saas-multi-tenancy]]。

- 2026-11-06：据第七信源（《需求分析》第 18 篇·行权限案例）印证数据权限层的落地机制——「用户范围+归属字段+匹配规则」三件事是「数据范围维度」在查询层的实际算子；新增判别标准：系统强制过滤（行权限）vs 用户自选可去掉（页面筛选），把行权限做成默认选中的筛选框等于没做；归属口径（行属谁）与指标口径同级、须业务确认。行级专题见 [[row-level-permission]]。

## Open Questions（开放问题）

- 多角色数据权限并集 vs 交集的策略选择需结合业务定义，无统一标准。
- 权限点爆炸的控制边界（按模块分组控量的具体阈值）需按产品实际定。
- 从 RBAC 向 ABAC 演进的触发条件与迁移路径尚不明确。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-03-bend-rbac-permission-system-design.md`
- Source: `raw/sources/architecture/2026-11-03-weixin-bend-complex-system-breakdown-20.md`（印证功能/数据权限二分与权限矩阵表实践）
- Source: `raw/sources/products/2026-11-03-weixin-bend-permission-design-22.md`（补充字段权限层、三张表产出物与 SOP 七步）
- Source: `raw/sources/products/2026-11-03-weixin-bend-saas-multitenant-05.md`（补充多租户租户维度数据权限与 ABAC 适用场景）
- Source: `raw/sources/architecture/2026-11-06-permission-rbac-abac-engineering.md`（第六信源：§9 六表结构/三段式编码/缓存失效矩阵/注解+AOP、§10 前后端铁律、§15 单元测试、§17 模型对比；与 §16 常见误区互证）
- Source: `raw/sources/misc/2026-11-06-xuqiufenxi-18-xingquanxian.md`（第七信源：行权限落地机制与系统强制 vs 用户自选判别标准、归属口径业务确认原则）

## Related Knowledge（相关知识）

- [[agent-permission-model|Agent 权限模型]]
- [[bend-rbac-permission-system-design|B端RBAC权限系统完整产品设计]]
- [[bend-permission-design-22|信源：B端权限设计三层拆解]]
- [[permission-refactoring|B端权限重构方法论]]
- [[complex-system-breakdown|复杂B端系统拆解方法论（五件套）]]（五件套中的权限件）
- [[saas-multi-tenancy|SaaS 多租户]]（租户维度数据权限）
- [[bend-saas-multitenant-05|信源：SaaS多租户系统实战全指南]]
- [[row-level-permission|行权限]]（数据权限层行级过滤的落地算子与判别标准）
