---
id: wiki-concept-rbac-permission-system
type: concept
title: RBAC 权限系统（传统 B 端角色访问控制）
status: active
created: 2026-11-03
updated: 2026-11-03
confidence: medium
tags:
  - concept
  - security
  - product
sources:
  - raw/sources/architecture/2026-11-03-bend-rbac-permission-system-design.md
  - raw/sources/architecture/2026-11-03-weixin-bend-complex-system-breakdown-20.md
related:
  - wiki/concepts/agent-permission-model.md
  - wiki/concepts/complex-system-breakdown.md
  - wiki/sources/bend-rbac-permission-system-design.md
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
4. **数据权限维度**：本人/本部门及下级/全部/自定义，维度可含部门、项目、区域、产品线。
5. **前后端一致**：前端控菜单按钮显示，后端校验权限标识防越权，数据权限在查询层拼接条件。
6. **权限矩阵表落地**：拆解阶段建议输出角色×功能/数据矩阵（横轴角色、纵轴功能/数据，逐项标注可执行/可查看/禁止），如车贷系统客户经理（创建申请单、看本人客户）/风控岗（审批）/财务岗（放款）/管理员（配置角色）的四角色示例（第二信源印证）。

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
- 未来方向：ABAC（属性访问控制）、多租户权限隔离。

## Open Questions（开放问题）

- 多角色数据权限并集 vs 交集的策略选择需结合业务定义，无统一标准。
- 权限点爆炸的控制边界（按模块分组控量的具体阈值）需按产品实际定。
- 从 RBAC 向 ABAC 演进的触发条件与迁移路径尚不明确。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-03-bend-rbac-permission-system-design.md`
- Source: `raw/sources/architecture/2026-11-03-weixin-bend-complex-system-breakdown-20.md`（印证功能/数据权限二分与权限矩阵表实践）

## Related Knowledge（相关知识）

- [[agent-permission-model|Agent 权限模型]]
- [[bend-rbac-permission-system-design|B端RBAC权限系统完整产品设计]]
- [[complex-system-breakdown|复杂B端系统拆解方法论（五件套）]]（五件套中的权限件）
