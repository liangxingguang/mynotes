---
id: wiki-entity-deepseek-harness
type: entity
title: DeepSeek Harness
status: active
created: 2026-10-20
updated: 2026-10-29
confidence: medium
tags:
  - entity
  - ai-agent
  - desktop-client
  - deepseek
sources:
  - raw/sources/products/2026-10-14-deepseek-harness-7day-day1.md
  - raw/sources/ai/2026-10-28-agent-harness-framework-selection.md
  - raw/sources/ai/2026-10-28-pi-dsh-agent-complexity.md
related:
  - wiki/decisions/harness-selection-deepagents.md
  - wiki/entities/deepagents.md
---
# DeepSeek Harness

## Overview（概览）

DeepSeek Harness 是调用 DeepSeek 模型的桌面 Agent 客户端（作者称"工位"），提供 macOS 与 Windows 安装包；模型按量计费，需在 DeepSeek 开放平台申请 API key 后使用。

## Identity（身份信息）

- Type（类型）: 桌面 Agent 客户端（macOS / Windows）
- Organization（所属组织）: DeepSeek（2026-10-29 选型信源引其官方仓库声明，官方出品基本确立）
- Role（角色）: 为 DeepSeek 模型提供带文件、Shell、搜索、子 Agent、工作流等能力的桌面工作环境
- Status（状态）: v0.2 预览版（2026-09-29 发布）；官方仓库明示 developer preview，"THERE WILL BE COMPATIBILITY-BREAKING CHANGES"

## Important Facts（重要事实）

- v0.2 预览版 2026-09-29 发布，提供开箱即用的 macOS/Windows 桌面端。
- 模型分 Flash / Pro 两档；推理等级控制思考深度（越深越耗 token 越慢）。
- 四种模式为四套出厂预设模板：标准（全能力，新手默认）、PTC（工具调用打包成程序一次执行，省 token、调试难）、极简（仅命令行+文件编辑，用于裸测模型）、创造（自检并自造插件/模式）。
- 支持子 Agent、工作流与插件扩展（标准模式即含；插件机制为系列教程第 5 天主题）。
- 计费：模型 API 按量付费，key 在 DeepSeek 开放平台创建且只显示一次。
- 在 harness 选型对比中，其"多模式（标准/PTC/极简/创造）+ 插件化"为 deepagents / MAF / DSH 三家中最全；但因 developer preview（官方明示将有破坏性变更），生产场景暂作架构参考/POC（2026-10-28 选型信源）。
- **基于 Cordis 的插件架构**（2026-10-29 信源）：模型适配器、工具注册表、会话日志、Agent Loop 全部是可装卸插件；各项注册是可卸载的副作用，系统能力随插件装载和卸载而变化。Agent 接口刻意不依赖某一种具体循环实现，调度逻辑本身可以被替换。
- **可逆组合是核心机制**：能力既能加入也能退出，使同一个 Harness 可以承载多种 Agent。`tool-cordis` 扩展允许 Agent 在沙箱中临时定义并挂载工具（进程内生效，重启消失，不写入配置）。
- **运行时自我改装**（非"自我进化"）：当前临时插件只完成了"发现缺口→生成并挂载"的第一步；版本管理、长期持久化、回归测试、权限审计、能力淘汰均未解决。

## Products / Projects（产品／项目）

- DeepSeek 开放平台（API key 管理与按量计费充值入口）。

## Relationships（关系）

- 同类竞品（解读，当前信源未直接对比）：Claude Code、[[pi]] 等 Agent CLI/客户端；Harness 的差异点是桌面端 + 模式预设 + 与 DeepSeek 模型深度绑定。
- [[deepagents|deepagents]]：harness 库形态的同场选型竞争候选（deepagents 胜出，DSH 因 developer preview 暂缓，见 [[harness-selection-deepagents|选型决策]]）。

## Timeline（时间线）

- 2026-09-29 — v0.2 预览版发布，提供 macOS/Windows 桌面端
- 2026-10-14 — 7 天系列实操手册 Day 1 发布（本信源）
- 2026-10-28 — 知乎《Agent》系列第 5 篇 harness 选型文将其列为三家候选之一，因 developer preview 暂缓生产采用
- 2026-10-31 — Pi 与 DSH 复杂度之争采集入库，补充 Cordis 插件架构、可逆组合机制与运行时自我改装视角

## Current Understanding（当前认知）

Harness 把 Agent 能力组织为"模式预设"，降低新手配置门槛；PTC 模式体现了"以程序代替多轮工具往返"的省 token 思路（解读：与业界 programmatic tool calling 趋势一致）。2026-10-29 新增选型信源：引官方仓库声明基本确立"DeepSeek 官方出品"，此前"是否官方出品"的存疑解除；但其处 developer preview（官方明示将有兼容性破坏变更），生产采用须等稳定版。

## Evidence（证据）

- `raw/sources/products/2026-10-14-deepseek-harness-7day-day1.md`
- `raw/sources/ai/2026-10-28-agent-harness-framework-selection.md`（官方仓库 developer preview 声明；三家中多模式+插件化最全）
- `raw/sources/ai/2026-10-28-pi-dsh-agent-complexity.md`（Cordis 插件架构、可逆组合、运行时自我改装视角）
