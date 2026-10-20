---
id: wiki-entity-deepseek-harness
type: entity
title: DeepSeek Harness
status: active
created: 2026-10-20
updated: 2026-10-20
confidence: medium
tags:
  - entity
  - ai-agent
  - desktop-client
  - deepseek
sources:
  - raw/sources/products/2026-10-14-deepseek-harness-7day-day1.md
---
# DeepSeek Harness

## Overview（概览）

DeepSeek Harness 是调用 DeepSeek 模型的桌面 Agent 客户端（作者称"工位"），提供 macOS 与 Windows 安装包；模型按量计费，需在 DeepSeek 开放平台申请 API key 后使用。

## Identity（身份信息）

- Type（类型）: 桌面 Agent 客户端（macOS / Windows）
- Organization（所属组织）: DeepSeek（当前信源未明确区分官方/第三方，待更多信源确立）
- Role（角色）: 为 DeepSeek 模型提供带文件、Shell、搜索、子 Agent、工作流等能力的桌面工作环境
- Status（状态）: v0.2 预览版（2026-09-29 发布）

## Important Facts（重要事实）

- v0.2 预览版 2026-09-29 发布，提供开箱即用的 macOS/Windows 桌面端。
- 模型分 Flash / Pro 两档；推理等级控制思考深度（越深越耗 token 越慢）。
- 四种模式为四套出厂预设模板：标准（全能力，新手默认）、PTC（工具调用打包成程序一次执行，省 token、调试难）、极简（仅命令行+文件编辑，用于裸测模型）、创造（自检并自造插件/模式）。
- 支持子 Agent、工作流与插件扩展（标准模式即含；插件机制为系列教程第 5 天主题）。
- 计费：模型 API 按量付费，key 在 DeepSeek 开放平台创建且只显示一次。

## Products / Projects（产品／项目）

- DeepSeek 开放平台（API key 管理与按量计费充值入口）。

## Relationships（关系）

- 同类竞品（解读，当前信源未直接对比）：Claude Code、[[pi]] 等 Agent CLI/客户端；Harness 的差异点是桌面端 + 模式预设 + 与 DeepSeek 模型深度绑定。

## Timeline（时间线）

- 2026-09-29 — v0.2 预览版发布，提供 macOS/Windows 桌面端
- 2026-10-14 — 7 天系列实操手册 Day 1 发布（本信源）

## Current Understanding（当前认知）

Harness 把 Agent 能力组织为"模式预设"，降低新手配置门槛；PTC 模式体现了"以程序代替多轮工具往返"的省 token 思路（解读：与业界 programmatic tool calling 趋势一致）。当前仅一篇入门教程信源，"是否 DeepSeek 官方出品"等关键事实未确立，后续信源应优先补全。

## Evidence（证据）

- `raw/sources/products/2026-10-14-deepseek-harness-7day-day1.md`
