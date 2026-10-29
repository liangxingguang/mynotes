---
id: wiki-concept-agent-permission-model
type: concept
title: Agent 权限模型（四层防线）
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: medium
tags:
  - concept
  - ai-agent
  - security
sources:
  - raw/sources/ai/2026-10-28-agent-permission-model-design.md
related:
  - wiki/concepts/mcp.md
  - wiki/concepts/a2a-protocol.md
  - wiki/concepts/agent-sandboxing.md
---
# Agent 权限模型（四层防线）

## Definition（定义）

面向多租户 Agent 平台的权限模型：权限 = 静态基线 + 本次指令的临时授权 + 调用时动态校验，而非传统 RBAC 的「用户→角色→资源」静态绑定。权限主体分三层——租户（Tenant）、Agent 实例（agentCode）、单次指令/会话（Instruction/Session）。

## Why It Matters（为什么重要）

固定角色控制不住模型自主选工具：同一 Agent 处理任务 A 允许查订单、处理任务 B 就不允许。且 MCP 工具是独立服务，Agent 只是其调用客户端之一，工具本身也需要鉴权。照搬传统 RBAC 会把「模型自主决策」这一新风险面暴露在权限体系之外。

## Core Characteristics（核心特征）

1. **四层防线逐层校验**：①租户隔离（tenantId 绑一切数据/工具/策略）②AgentPolicy 基线（allowedToolCodes 上限，只缩不放）③InstructionGrant 指令临时授权（基线子集，随指令生命周期自动失效）④MCP 网关二次鉴权兜底。任一层不通过直接拦截。
2. **基线是上限**：InstructionGrant.allowedToolCodes ⊆ AgentPolicy.allowedToolCodes，代码强制校验子集关系，指令授权只能缩小不能放大。
3. **前置拦截**：权限拦截器放在 LLM 输出 tool_call 之后、发起 MCP 请求之前——直接不允许模型选择未授权工具，避免模型生成越权调用浪费 token。
4. **凭证签名**：ToolPermissionClaim 携带 tenantId/sessionId/instructionId/agentCode/toolCode/grantId + claimSign，防篡改，序列化后传 MCP 网关。
5. **读写分离**：只读工具自动授权（grantSource=AUTO），变更类工具强制人工审批（MANUAL）。

## How It Works（运作方式）

九步校验链路：建 Session/Instruction 定 agentCode → 读 AgentPolicy 基线 → 按指令内容自动裁剪生成 InstructionGrant（拿不准进人工审批）→ LLM 输出 tool_call 后框架侧先过滤（不在 grant 清单直接拦）→ 放行请求组装 ToolPermissionClaim 并签名 → MCP 网关验签 + 二次核对 grant → MCP 服务内做数据行级权限 → 结果返回并写审计日志（绑定 ToolCallRecord）→ Instruction 完成自动撤销 grant（REVOKED + expireAt 兜底）。

A2A 委派：主管下发子 Instruction 时生成子 InstructionGrant，只能是主管当前 grant 的子集；主管可随时撤销，防止权限沿委派链放大。

## Relationships（关系）

### Related Concepts（相关概念）

- [[mcp|MCP]]：协议标准无内置复杂权限，网关鉴权是接入层补齐的推荐落地（生产首选方案 A，原生服务零改动）。
- [[a2a-protocol|A2A 协议]]：委派链路的权限收缩是本模型在多 Agent 场景的延伸。
- [[agent-sandboxing|Agent 沙箱隔离]]：权限是「授权收窄」（能做哪些操作），沙箱是「能力收窄」（碰得到什么），互补两层。

### Distinctions（区分）

- 与**传统 RBAC**：主体从单一用户扩为三层；授权从静态长期变为「基线 + 指令级临时授权 + 动态校验」。
- 与**参数层校验**（[[tool-parameter-whitelist|参数层白名单]]）：权限模型管「这个会话能不能调这个工具」，白名单管「这次调用的参数值可不可信」，两道独立防线。

## Evolution（演进）

- 2026-10-30 — 由信源 `raw/sources/ai/2026-10-28-agent-permission-model-design.md`（Agent架构设计15）建立。

## Open Questions（开放问题）

- 该模型的生产实证（性能开销、审批吞吐、误拦率）：当前信源为设计稿，无实现与数据。
- 行级数据权限与四层防线的组合细节：信源仅一句带过。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-permission-model-design.md`

## Related Knowledge（相关知识）

- [[agent-permission-model-design|Agent架构设计15：Agent 权限模型设计（信源页）]]
