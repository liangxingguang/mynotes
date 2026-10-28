---
id: 2026-10-28-agent-permission-model-design
title: Agent架构设计15：Agent 权限模型设计（工具权限/指令权限/租户隔离/MCP 鉴权）
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/8UvaemNt_bE1_Fy76DyaBQ
source_type: 文章
platform: 微信公众号
created: 2026-10-28
category: 技术
tags: [AI, 工程实践]
asset_ref: Assets/2026/10/agent-permission-model-design.md
wiki_status: pending
---

# Agent架构设计15：Agent 权限模型设计

> Agent 权限 ≠ 传统 RBAC：权限 = 静态基线 + 指令临时授权 + 调用时动态校验。四层防线——租户划边界、Agent 定上限、指令收范围、MCP 网关做兜底，覆盖 A2A 委派收缩与落地避坑。

## 核心要点

- **三层主体**：租户 → Agent 实例 → 单次指令；Agent 权限是"静态基线 + 临时授权 + 动态校验"，固定角色控制不住模型自主选工具。
- **四层防线**：①租户隔离（tenantId 绑一切）②AgentPolicy 基线（上限只缩不放）③InstructionGrant 指令临时授权（基线子集，随指令生命周期自动失效）④MCP 网关二次鉴权兜底。
- **关键设计**：LLM 输出 tool_call 后、发起 MCP 请求前前置拦截，直接不允许模型选未授权工具（省 token、防异常）；凭证 ToolPermissionClaim 带签名防篡改。
- **A2A 委派**：子授权必须是父授权子集，主管可随时撤销，防止权限沿委派链放大。
- **MCP 落地**：生产首选网关统一收口（原生服务零改动），小场景可内置中间件；禁用静态 Token。
- **避坑**：双层校验防绕过、强制子集校验防逃逸、授权自动回收（REVOKED + expireAt 兜底）、全量审计日志、策略热更新用授权快照。
- **读写分离策略**：只读工具自动授权，变更类工具强制人工审批。

## 正文

见 [[Assets/2026/10/agent-permission-model-design.md|抓取正文]]，含 DDD 实体字段表、九步校验链路与六种避坑详解。

## 来源

- [Agent架构设计15：Agent 权限模型设计](https://mp.weixin.qq.com/s/8UvaemNt_bE1_Fy76DyaBQ)（微信公众号）

## 附件

- [[Assets/2026/10/agent-permission-model-design.md]]
