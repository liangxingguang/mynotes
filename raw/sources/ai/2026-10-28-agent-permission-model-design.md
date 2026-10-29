---
title: Agent架构设计15：Agent 权限模型设计——工具权限、指令权限、租户隔离、MCP 工具调用鉴权落地
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/8UvaemNt_bE1_Fy76DyaBQ
source_type: article
platform: 微信公众号
captured: 2026-10-28
registered_at: 2026-10-30
inbox_ref: Inbox/2026-10-28-agent-permission-model-design.md
asset_ref: Assets/2026/10/agent-permission-model-design.md
---

# Agent架构设计15：Agent 权限模型设计——工具权限、指令权限、租户隔离、MCP 工具调用鉴权落地

## 一、Agent 权限和传统后台权限有什么不一样？

传统 RBAC 核心主体是「用户」：用户→角色→资源权限。Agent 场景主体变复杂，有三层：

1. **租户（Tenant）**：顶层隔离单元，多租户 SaaS 的第一道防线；
2. **Agent 实例（AgentCode）**：一类 Agent 本身的基础权限；
3. **单次指令/会话（Instruction / Session）**：本次任务临时授予的权限。

最大差异：

- 传统权限：静态绑定在账号上，长期有效
- **Agent 权限 = 基础静态权限 + 本次指令的临时授权 + 调用时动态校验**

同一个 Agent，处理 A 任务允许查询订单，处理 B 任务就不允许，固定角色满足不了。另外 MCP 工具是独立服务，工具本身也需要鉴权——Agent 只是 MCP 的一个调用客户端，不能完全放开。

**核心思路：租户隔离打底，Agent 基础权限做基线，指令临时授权做收缩，MCP 侧二次鉴权做兜底。**

## 二、限界上下文与权限分层模型

权限体系单独作为一个限界上下文，与 Agent 会话上下文解耦；向外只提供校验接口，不侵入 Session、Instruction、Tool 的内部逻辑。

**四层权限防线，从上到下逐层校验，任意一层不通过直接拦截：**

1. **租户隔离层（全局第一层）**：所有数据、工具、权限策略顶层绑定 tenantId。租户 A 的 Agent 永远看不到租户 B 的工具、数据、会话记录。多租户场景不可突破的底线。
2. **Agent 基线权限层（Agent 维度，长期静态）**：给每类 Agent（agentCode）分配固定权限包，定义默认可访问哪些工具。例如报表 Worker Agent 基线只有只读查询工具。**基线是上限，指令授权只能缩小、不能越界放大。**
3. **Instruction 指令临时授权层（任务维度，短期生效）**：Agent 权限最核心、最独特的一层。即使 Agent 有一堆工具权限，单次指令可再裁剪。例：报表 Agent 基线可查订单/用户/支付三表，本次指令只是"统计今日订单量"，临时授权只放行订单查询。权限生命周期与 Instruction 绑定，指令完成/取消后自动失效。
4. **MCP 网关鉴权层（工具侧兜底）**：Agent 不直连 MCP 服务，先走权限网关。网关校验：当前 session + 本次 tool 调用是否在授权清单内。上层逻辑被绕过，网关还能拦住。

> 一句话规则：**租户划边界、Agent 定上限、指令收范围、MCP 做兜底。**

## 三、权限领域实体设计（DDD 风格）

**实体 1：AgentPolicy（Agent 基线权限策略）**

| 字段 | 说明 |
|---|---|
| policyId | 策略 ID |
| tenantId | 租户 ID |
| agentCode | 绑定的 Agent 编码 |
| allowedToolCodes | 允许的工具编码列表（基线最大范围） |
| denyToolCodes | 黑名单工具，基线内强制禁用 |
| permissionMode | 模式：ALLOW_LIST（白名单优先） |
| createdAt、updatedAt | 更新时间 |
| creator | 配置人 |

业务约束：基线策略绑定后，所有该类型 Agent 会话的可用工具不能超出 allowedToolCodes。

**实体 2：InstructionGrant（指令临时授权记录，聚合依附 Instruction）**

| 字段 | 说明 |
|---|---|
| grantId | 授权 ID |
| instructionId | 归属指令 ID |
| sessionId | 归属会话 |
| allowedToolCodes | 本次实际放行的工具子集，是基线的子集 |
| expireAt | 授权过期时间，默认跟随指令生命周期 |
| grantSource | 授权来源：AUTO（自动裁剪）/ MANUAL（人工审批） |
| auditRemark | 备注，用于审计 |

重点：**allowedToolCodes ⊆ AgentPolicy.allowedToolCodes**，不允许超出基线。

**值对象：ToolPermissionClaim（权限凭证）**——Agent 每次发起工具调用时携带，序列化后传给 MCP 网关：

- tenantId / sessionId / instructionId / agentCode / toolCode / grantId
- claimSign：签名，防止凭证篡改

**枚举**

- GrantStatus：EFFECTIVE / EXPIRED / REVOKED
- AuthResult：PASS / DENY_TENANT / DENY_AGENT_POLICY / DENY_INSTRUCTION_GRANT / DENY_MCP_AUTH

## 四、完整权限校验链路（Agent 调用 MCP 工具时）

1. 创建 Session、Instruction，选定 agentCode；
2. 读取该租户下这个 Agent 的 AgentPolicy 基线权限；
3. 根据指令内容自动裁剪工具列表，生成 InstructionGrant 临时授权（拿不准时进入人工审批，确认后才生效）；
4. Agent 思考、选择工具阶段，框架侧先做第一层过滤：LLM 输出的 toolCode 不在本次 grant 清单里，直接拦截，不发起调用；
5. 放行的请求组装 ToolPermissionClaim 并签名；
6. 转发到 MCP 网关，校验签名，二次核对 grant 授权记录；
7. MCP 服务内部再做数据行级权限（如只查本租户数据）；
8. 结果返回，生成权限审计日志，绑定 ToolCallRecord；
9. Instruction 完成，自动撤销本次 InstructionGrant。

> **非常关键**：在 LLM 输出 tool_call 之后、真正发起 MCP 请求之前加权限拦截器。校验放 MCP 后端的方案里，LLM 依然生成越权调用请求，只是最后被挡住——浪费 token、易报错。**前置拦截，直接不允许模型选择未授权工具。**

**A2A 委派场景的权限传递**（主管 Agent → Worker Agent）：

1. 主管本身有一套基线权限；
2. 下发子 Instruction 时同步生成子 InstructionGrant；
3. 传给 Worker 的授权只能是主管当前 grant 的子集；
4. Worker 拿子授权清单执行 MCP 调用；
5. 主管可随时主动撤销子任务授权，Worker 后续调用直接被拦截。

避免权限沿委派链无限放大。

## 五、MCP 侧的鉴权实现方案

MCP 协议标准没有内置复杂权限，要在接入层补齐，两种主流落地方式：

**方案 A：MCP 网关（推荐，生产首选）**

所有 Agent 访问 MCP Server 统一经过网关，网关承担：校验 ToolPermissionClaim 签名、查询 InstructionGrant 授权记录、租户隔离校验、限流、审计日志。通过后再转发到真实 MCP 服务。优势：MCP 原生服务不用改代码，多 Agent、多 MCP 服务统一收口。

**方案 B：MCP 服务内置鉴权中间件**

权限校验写进 MCP 服务 transport 层（SSE/stdio），收到请求先解析 claim、校验授权。适合自建、数量少的内部工具，简单快速；缺点是每个 MCP 服务重复开发鉴权逻辑。

> **不推荐**：直接用静态 Token 给 Agent。静态 Token 长期有效，泄露风险巨大，且无法绑定 session、指令做细粒度回收。

## 六、工程落地避坑清单

1. **权限只在前端/上层校验，MCP 底层没兜底**：上层代码 bug 或被绕过拦截器就直接裸奔。必须双层校验：Agent 侧拦截 + MCP 网关兜底。
2. **临时授权范围大于 Agent 基线权限**：基线只许查订单、指令授权却开放删除工具=权限逃逸。代码里强制校验子集关系。
3. **授权不会自动回收**：指令完成/取消/会话终止时主动把 InstructionGrant 标 REVOKED，同时设 expireAt 兜底防漏回收。
4. **权限日志缺失无法审计**：每次工具调用无论放行/拒绝都生成审计日志，关联 tenantId、sessionId、instructionId、agentCode、toolCode、校验结果、操作人，绑定 ToolCallRecord。
5. **A2A 委派全量下放权限**：Worker 失控风险极高。委派必须权限收缩，子授权是父授权的子集。
6. **权限策略热更新**：修改基线策略后，推荐已存在的 Instruction 沿用授权快照，新指令才读新策略，避免长任务中途权限被切断。

## 七、两种典型业务场景

**场景 1：内部报表 Agent（自动授权）**：基线允许 order_query、user_query、payment_query；指令"统计本周订单金额"→ 自动裁剪，仅放行 order_query，Agent 无法访问用户、支付数据。

**场景 2：数据变更 Agent（人工审批授权）**：基线含 order_update；指令"修改订单状态"→ 识别为写操作不自动授权，进人工审批队列，通过后 InstructionGrant 才生效，驳回直接拒绝。

> 读写分离权限策略：**只读工具自动授权，变更类工具强制人工审批。**

## 八、本篇小结

Agent 权限体系的核心难点不在"能不能拦接口"，而在适配 Agent 自主决策的特性。照搬传统 RBAC 控制不住模型自主选工具的风险。四层模型：**租户隔离打底、Agent 基线定上限、指令临时授权动态收缩、MCP 网关兜底鉴权**，支持 A2A 委派链路的权限传递与收缩。

权限与 Session、Instruction、Checkpoint 快照完全打通：权限跟指令走，指令结束权限回收；任务暂停恢复读取同一授权凭证继续校验；随时可撤销授权，立刻阻断后续所有工具调用。

下一篇预告：Agent架构设计16——解决大流量下 LLM、MCP 工具抖动、并发打爆资源的问题。
