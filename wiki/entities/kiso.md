---
id: wiki-entity-kiso
type: entity
title: Kiso
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - entity
  - ai-agent
  - agent-framework
  - open-source
sources:
  - raw/sources/ai/2026-10-28-kiso-minimal-agent-framework.md
related:
  - wiki/sources/kiso-minimal-agent-framework.md
  - wiki/entities/pi.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/context-management.md
  - wiki/concepts/agent-permission-model.md
  - wiki/concepts/harness-engineering.md
---

# Kiso

## Overview（概览）

开源极简 Agent 框架/Runtime（npm 包 `@vincemakes/kiso-code`），目标是做"比 Pi 更简单、更稳定、更省 token"的 Agent。定位随开发收敛为 Agent Runtime：模型负责扩大问题空间，Runtime 负责限定什么才有资格被称为"事实"。首个落地场景为 Coding Agent。

## Identity（身份信息）

- Type（类型）: 开源 Agent 框架 / Agent Runtime（Coding Agent 方向）
- Organization（所属组织）: 个人开源项目（作者 vincemakes）
- Role（角色）: Agent 执行系统/控制外壳（Harness）——提供 Event Log 执行账本、预算式工具、权限模式、内核驱动
- Status（状态）: 活跃开源（作者自述发布时状态：Kernel 2,192 行、42 篇 ADR、附 Benchmark 代码）

## Important Facts（重要事实）

- 核心主张：Agent 真正难以托付的不是不会调工具、不是缺 Memory/Plan/Multi-Agent 组件，而是"当概率模型开始改变现实以后，系统凭什么知道什么真的发生过"——由此引出五道语义边界（Observed≠Current / Intent≠Effect / Started≠Succeeded / Completion≠Goal / Memory≠Fact）。
- 架构原语：Event Log（只追加账本）+ Turn Commit + Persist Before Effect + uncertain 裁决（Ambiguity Never Auto-Repeats）；恢复是纯函数，磁盘上只有 Event Log，其余皆为 projection；有真实 kill -9（PTY 进程组 SIGKILL）崩溃恢复测试。
- 上下文策略：Soft 400K / Hard 700K / Raw Tail 100K（1M 窗口下封顶）；撤掉固定比例 microcompact（须过 break-even 判断）；In-Band Summary 保 Prompt Cache 前缀。
- 默认工具集六个：read_file（200 行/16K 字符 + revision 守卫）、list_dir、search_text、write_file、edit_file、shell（系统 Shell + 环境变量清洗 + 只读证明式放行）；Subagents/Skills/Ask/Task/MCP 走 Extension 层。
- 运行模式五种：default / accept-edits / plan / dontAsk / bypass（bypass 不关闭灾难底线保护）。
- 内核门禁：packages/core/src 有效代码 ≤ 2,200 行（写作时 2,192），Tripwire 保护决策所有权；作者明确 TCB 远大于内核（Store/进程锁/OS/文件系统/工具层/Provider 均在信任边界内）。
- Benchmark（vs Pi，48 对/96 腿）：跨文件修改 12:12 完成；隐藏随机题双方 22/24、Kiso 成本低约 32%；长会话 Kiso 贵 19%——根因是 edit_file 缺 append 原子操作（360 次编辑 26 次失败 vs 对照 287 次 3 次），read_file 200 行限制未触发（任务最长文件 132 行）。
- 项目口号三愿望：更简单、更稳定、更省 token——作者承认 Benchmark 显示"三个目标并没有全部做到"。

## Products / Projects（产品／项目）

- 仓库与发行：`http://github.com/vincemakes/kiso`；`npm install -g @vincemakes/kiso-code`；`kiso`（首次启动内置模拟轨迹，无需 API Key）；`kiso resume`（崩溃恢复入口）。
- 附带资产：42 篇 ADR、Kiso vs Pi 对照 Benchmark 代码。

## Relationships（关系）

- 对标对象：[[pi|Pi]]（贯穿信源的性能/成本/完成度对照基准）。
- 概念落点：执行账本 → [[durable-execution|持久执行]]；上下文投影与缓存经济学 → [[context-management|上下文管理]]；本地运行模式与只读证明 → [[agent-permission-model|Agent 权限模型]]；内核门禁/评测方法 → [[harness-engineering|Harness Engineering]]。
- AGI 式子：AGI = Weights + Harness + Experience Stream + Update Mechanism（作者对 Coding Agent 作为 Experience Stream 载体的判断）。

## Timeline（时间线）

- 2026-10（信源发布时点）— 项目开发近两个月后发布开源（作者自述）；Kernel 2,192 行、42 篇 ADR。

## Current Understanding（当前认知）

- 单一信源（作者第一人称自述）+ 作者自报 Benchmark，置信度中：架构主张（Event Log/uncertain 裁决/投影观）与信源群中 [[pi]]、[[durable-execution]] 的多条独立信源互证，属于工程共识而非独见；性能数字（省 32%/贵 19%）为自报对照数据，需第三方复核。作者"Trace 验证推翻假说"的方法学（132 行文件之例）本身是可迁移的评测纪律。

## Evidence（证据）

- `raw/sources/ai/2026-10-28-kiso-minimal-agent-framework.md`（知乎专栏作者自述；采集稿 `Assets/2026/10/kiso-minimal-agent-framework.md`）
