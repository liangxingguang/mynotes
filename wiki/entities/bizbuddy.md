---
id: wiki-entity-bizbuddy
type: entity
title: BizBuddy
status: active
created: 2026-11-11
updated: 2026-11-11
confidence: medium
tags:
  - entity
  - agent-platform
  - open-source
sources:
  - raw/sources/ai/2026-11-11-spring-boot-4-agent-platform-migration.md
related:
  - wiki/concepts/spring-boot-major-upgrade.md
  - wiki/concepts/jackson-3-migration.md
---

# BizBuddy

## Overview（概览）

全量开源（MIT）的企业级智能体平台，由 BizBuddy 团队发布。技术栈：Spring Boot 4.1.1 + AgentScope Java Harness，前端 RuoYi-Vue-Plus，PostgreSQL 14 与 MySQL 8.0 双栈交付。仓库：https://gitee.com/zl3624/biz-buddy。

## Identity（身份信息）

- Type（类型）: 开源项目 / 企业级 Agent 平台
- Organization（所属组织）: BizBuddy 团队（发布渠道：微信公众号）
- Role（角色）: Agent 平台（业务管理 + 智能体编排 + 渠道接入）
- Status（状态）: 活跃开源（据信源时点）

## Important Facts（重要事实）

- 项目规模：40 张 ai\_\* 表、34 个功能页、98 个按钮权限（原文自述）。
- 测试资产：20 层 HTTP e2e（登录、权限、对话、HITL 确认、渠道回调、MCP 出口、无人值守写入等；L12 结构化决策闸门需本地桩）+ 18 条 Playwright UI 用例；PG/MySQL 双栈均 20/0/0、UI 18/18。
- 完成 Spring Boot 3.5 → 4.1.1 迁移（2026-11-11 发布经验）：代码改动约三成、验证约七成。
- 关键依赖：AgentScope 2.0.4（compile 依赖 Jackson 2，平台保留 Jackson 2/3 并存）、LiteFlow 2.16.2.1（升级中遇启动失败，关指标端点解决）、Redisson（4.x 换 `TypedJsonJackson3Codec`）、Flyway（PG14 + MySQL8 双方言，`{vendor}` 自动选）。
- 许可：MIT。

## Products / Projects（产品／项目）

- BizBuddy Agent 平台本体（开源仓库 gitee.com/zl3624/biz-buddy）
- AgentScope 集成：平台以 AgentScope Java Harness 为智能体底座，边界处保留 Jackson 2（见 [[jackson-3-migration]]）

## Relationships（关系）

- [[spring-boot-major-upgrade]] — 该平台的迁移实践产出本实体的经验信源
- [[jackson-3-migration]] — 平台的 Jackson 3 迁移细节
- AgentScope — Wiki 尚无独立页面（仅本信源提及）

## Timeline（时间线）

- 2026-11-11 — BizBuddy 团队发布《40 张表、20 层 e2e：把一个开源 Agent 平台迁到 Spring Boot 4.1》（微信公众号），为本页唯一信源。

## Current Understanding（当前认知）

目前仅由单一信源（团队自述经验文章）支撑，无第三方独立验证；项目规模、测试资产数字均为团队自述，故置信度中。平台「全量开源（MIT）」为作者自述，未独立核实仓库状态。

## Evidence（证据）

- `raw/sources/ai/2026-11-11-spring-boot-4-agent-platform-migration.md`
