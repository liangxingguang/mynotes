---
id: wiki-entity-ant-toolgw
type: entity
title: ToolGW（蚂蚁 AI 工具网关）
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: high
tags:
  - entity
  - ai
  - agent
  - 网关
sources:
  - raw/sources/ai/2026-11-24-ant-toolgw-agent-tool-gateway.md
related:
  - wiki/concepts/agent-tool-gateway.md
  - wiki/concepts/mcp.md
  - wiki/concepts/agent-permission-model.md
---
# ToolGW（蚂蚁 AI 工具网关）

## Overview（概览）

蚂蚁集团面向 Agent 时代的全站统一安全工具流量入口。以 MCP/CLI 双协议门面统一承接全站 RPC、HTTP 工具流量，将身份核验、Tool 粒度权限、零代码上翻、限流、Mock/录制回放等治理能力内置于网关链路。定位为"唯一入口"而非"又一个网关"。

## Identity（身份信息）

- Type（类型）: 企业级基础设施产品（AI 工具网关 / 数据面 + 管控面系统）
- Organization（所属组织）: 蚂蚁集团（超算中间件团队）
- Role（角色）: Agent 调用线上工具的统一流量与安全底座
- Status（状态）: 已全站落地运行（发文 2026-11-24 时点）

## Important Facts（重要事实）

- 三层架构：产品平台 **ATC**（Ant Tool Center，蚂蚁 AI 工具中心：注册/编排/上架/授权/可观测/评测/治理）→ **网关管控面**（配置统一管控，面向 ATC 开放管控 API）→ **数据面 ToolGw**（协议接入、路由、鉴权、限流、协议转换、Session 粘连、Mock、录制）。
- 数据面流水线：协议适配层（解包 MCP SSE / Streamable / CLI REST）→ ToolEngine（协议无关调用引擎，MCP 与 CLI 共享同一实例）→ 协议转换层（翻译成 RPC/HTTP 后端调用或原生 MCP Server 代理转发）。
- 技术栈：纯 Go 自研数据面；SOFA 体系（RPC 泛化调用、SOFA Registry 多机房服务发现、配置中心、SOFAMQ、向量数据库）+ 统一权限平台、异步安全审核、加密服务。
- 部署：每租户独立部署网关单元、出口互连，跨租户访问对调用方透明；社区公网工具与 C 端流量用独立部署单元（同一应用物理拆分）隔离托管，API Key 平台托管不暴露。
- 规模（2026-11 发文口径）：MCP 接入 10000+；上翻 MCP Server 4000+（MCP Tool 20000+）；CLI Tool 60000+；峰值 QPM 25w+。
- 双协议门面：MCP（tools/list 翻菜单 + tools/call 下单）与 CLI（/api/v1 REST 直接点餐）共用一个门面、一套底座；三种寻址（serverCode / CLI URL / 注册中心服务发现，经 MOSN 直接寻址）。
- 安全体系：双身份（员工/Agent）向统一 AgentToken 演进，落实 A-R + H-R 核验；Tool 粒度两层鉴权 + 血缘自动管理；跨站点身份互通换签；敏感参数"可信值"由网关注入、模型不可篡改；异步内容审核 + 响应脱敏。
- 零代码上翻：虚拟 Server 集群（配置热更新免重启）+ 协议转换（tools/list 动态生成、tools/call 参数翻译）+ 响应模板；同一 AI Tool 可上架多个 MCP Server 与 CLI，场景化分组缓解 MCP 上下文膨胀。
- 流量治理：集群异步限流（单机本地计数 + 定期扣减全局额度）；Mock（JSONPath + 13 种操作符三类匹配、五种响应模式，拦截点在鉴权路由之后后端调用之前，精确到 Tool 粒度）；录制回放（录/改/放闭环，录制数据持久化到向量数据库，支持 strict / json-path 对比与回放报告）；可观测（五类标准日志、全链路 Trace、三级监控告警）。
- CLI 研发流水线：基于已注册 AI Tool 自动初始化 CLI 工程，统一 CLI SDK 默认集成可信身份。

## Products / Projects（产品／项目）

- [[agent-tool-gateway|Agent 工具网关]]（所属概念类别）

## Relationships（关系）

- 实现 [[agent-tool-gateway|Agent 工具网关]] 这一架构模式的蚂蚁实例（part-of 关系：ATC/ToolGw 是该模式的落地）
- 以 [[mcp|MCP]] 与 CLI 双协议承接工具流量，对 MCP 的协议边界做网关侧治理补充（见 [[agent-permission-model|Agent 权限模型]]：MCP 协议不内置权限，由接入层网关补齐）
- 零代码上翻是 [[agent-legacy-system-integration|Agent 对接旧系统]] 中"中间件/消息网关"模式的大规模生产实例

## Timeline（时间线）

- 2026-11-24 — 「金融级分布式架构」公众号发布 ToolGW 能力全景与技术架构详解（作者：董振兴/单延，ToolGW 负责人），披露上述规模与架构。此前更早的建设沿革当前信源未确立。

## Current Understanding（当前认知）

ToolGW 是目前公开资料中规模最大、体系最完整的"Agent 工具流量统一入口"生产实践之一：把协议适配、路由、安全、治理收敛进单一网关，并以零代码上翻解决存量服务供给问题。所有规模数字与设计细节均来自蚂蚁团队一手自述，方向可信、具体数字未经独立验证。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-24-ant-toolgw-agent-tool-gateway.md`
