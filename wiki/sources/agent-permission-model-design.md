---
id: wiki-source-agent-permission-model-design
type: source
title: Agent架构设计15：Agent 权限模型设计
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: high
tags:
  - ai-agent
  - security
  - architecture
sources:
  - raw/sources/ai/2026-10-28-agent-permission-model-design.md
---
# Agent架构设计15：Agent 权限模型设计

## Overview（概览）

微信公众号「Agent架构设计」系列第 15 篇：面向多租户 Agent 平台的权限模型设计。核心命题是 Agent 权限不能照搬传统 RBAC——权限 = 静态基线 + 指令临时授权 + 调用时动态校验；给出四层防线（租户隔离 / AgentPolicy 基线 / InstructionGrant 指令授权 / MCP 网关兜底）、DDD 风格实体字段表、九步校验链路、A2A 委派权限收缩与六条落地避坑清单。

## Key Facts（关键事实）

- 三层主体：租户（Tenant）→ Agent 实例（agentCode）→ 单次指令/会话（Instruction/Session）；传统权限静态绑定账号长期有效，Agent 权限是「静态基线 + 临时授权 + 动态校验」。
- 四层防线逐层校验、任一层不过即拦截：①租户隔离（tenantId 绑一切，不可突破底线）②AgentPolicy 基线（allowedToolCodes 是上限，只缩不放）③InstructionGrant（基线子集，随指令生命周期自动失效）④MCP 网关二次鉴权兜底。
- 关键设计：权限拦截器放在 LLM 输出 tool_call 之后、发起 MCP 请求之前——直接不允许模型选择未授权工具，省 token、避免越权请求报错；后置到 MCP 后端的方案里模型仍会生成越权调用。
- 权限凭证 ToolPermissionClaim 携带 tenantId/sessionId/instructionId/agentCode/toolCode/grantId + claimSign 签名防篡改。
- 强约束：InstructionGrant.allowedToolCodes ⊆ AgentPolicy.allowedToolCodes，代码里强制校验子集关系防权限逃逸。
- A2A 委派：主管下发子 Instruction 时生成子 InstructionGrant，只能是主管当前 grant 的子集，主管可随时撤销。
- MCP 侧两种落地：方案 A 网关统一收口（生产首选，原生服务零改动）；方案 B 服务内置鉴权中间件（适合少量自建工具）。明确不推荐静态 Token（无法绑定 session/指令做细粒度回收）。
- 读写分离策略：只读工具自动授权，变更类工具强制人工审批。
- 避坑清单六项：双层校验、强制子集校验、授权自动回收（REVOKED + expireAt 兜底）、全量审计日志绑定 ToolCallRecord、A2A 权限收缩、策略热更新用授权快照。

## Important Claims（重要论断）

### Agent 权限 ≠ 传统 RBAC

固定角色控制不住模型自主选工具：同一个 Agent 处理任务 A 允许查订单、处理任务 B 就不允许。权限体系应作为独立限界上下文，与 Agent 会话上下文解耦，只向外提供校验接口。

### 基线是上限，指令授权只能缩小

AgentPolicy 定义 allowedToolCodes 基线最大范围；InstructionGrant 是基线的子集，生命周期绑定 Instruction，指令完成/取消自动失效（REVOKED + expireAt 双保险）。

### 前置拦截优于后端兜底

校验放在 MCP 后端，LLM 依然生成越权 tool_call，只是最后被挡住——浪费 token 且易报错；在 tool_call 之后、MCP 请求之前拦截，直接不允许模型选择未授权工具。

## Concepts Introduced（引入的概念）

- [[agent-permission-model|Agent 权限模型（平台授权与本地运行）]]

## Entities Mentioned（提及的实体）

- 无独立建页实体（MCP、A2A 作为协议概念引用，见 [[mcp]]、[[a2a-protocol]]）

## Implications（影响／启示）

为「Agent 平台如何做权限」给出可直接落地的参考架构：四层防线 + 授权凭证签名 + 审计绑定 ToolCallRecord。对本 Wiki 的 [[mcp|MCP]] 页面回答了「工具级权限管控不在协议内、需网关/客户端自建」这一开放问题（网关收口方案）。A2A 委派收缩原则可推广到一切多级 Agent 委派链路。

## Limitations（局限）

- 单作者设计方案，无开源实现与生产数据佐证；字段表与枚举为设计稿而非已验证实现。
- 未覆盖工具参数级校验（参数值可不可信）——该维度由 [[tool-parameter-whitelist|参数层白名单]] 补足。
- 行级数据权限仅一句带过（MCP 服务内部再做）。

## Related Knowledge（相关知识）

- [[mcp|MCP]]（网关鉴权是其接入层补齐项）
- [[a2a-protocol|A2A 协议]]（委派链路权限收缩）
- [[agent-sandboxing|Agent 沙箱隔离]]（权限=授权收窄，沙箱=能力收窄，互补）
- [[kiso|Kiso]]（本地运行时权限维度：CLI 五模式、只读证明式放行 Unknown≠Safe；与平台四层防线互补可组合）

## Source（信源）

- `raw/sources/ai/2026-10-28-agent-permission-model-design.md`
- 原文：<https://mp.weixin.qq.com/s/8UvaemNt_bE1_Fy76DyaBQ>
