---
id: wiki-concept-personal-dev
type: concept
title: 个人研发环境（Personal Dev）
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: medium
tags:
  - concept
  - ai-coding
  - environment
  - harness
sources:
  - raw/sources/ai/2026-11-20-gaode-ad-linglingqi.md
related:
  - wiki/entities/gaode-ad-linglingqi.md
  - wiki/concepts/harness-engineering.md
  - wiki/sources/2026-11-20-gaode-ad-linglingqi.md
---
# 个人研发环境（Personal Dev）

## Definition（定义）

一种让**逻辑研发环境尽量独立于具体计算实例**的工作环境模式：为研发任务提供稳定环境身份、持久卷、受控换代与基础恢复，避免因计算实例结束而导致工作现场丢失。由高德广告凌凌漆团队在 AI 持续执行研发任务的场景下提出。

## Why It Matters（为什么重要）

复杂代码开发不是一次提示词调用，而是反复搜索仓库、阅读源码、修改文件、执行命令、分析失败、继续修复的过程，需要稳定的工作环境。工程师本机依赖个人在线状态和本地配置；一次性沙箱隔离性好，但计算实例结束后工作现场可能随之丢失。Personal Dev 让研发现场不随机器替换而丢失，是 Agent 持续执行研发任务的基础设施。

## Core Characteristics（核心特征）

- **稳定环境身份**：逻辑环境有稳定标识，不绑定具体计算实例。
- **持久卷保存关键状态**：工作区状态持久保存，不必额外保存。
- **受控换代与基础恢复**：支持计算实例的受控替换与基础恢复。
- **单 Writer 原则**：多读、多分析、受控写入；同一正式研发任务主工作区，同一时刻只允许一个受控主执行者持有正式写入权。
- **安全靠 lease/fencing 而非代际标识**：环境代际（Generation/Epoch）标识新旧实例，但代际标识本身不是锁。

## Structure（结构）

当前环境骨架包括：稳定环境标识、持久卷、计算与存储分离、环境代际管理、任务路由恢复、执行日志。

## How It Works（如何运作）

**与两种基线的对比**：

| 维度 | 工程师本机 | 一次性沙箱 | Personal Dev |
|---|---|---|---|
| 环境依赖 | 绑定个人设备 | 依赖临时实例 | 稳定环境身份 |
| 工作区 | 本地持久 | 需额外保存 | 持久卷保存关键状态 |
| 实例替换 | 依赖本机环境 | 需恢复现场 | 支持受控换代与基础恢复 |
| 写入安全 | 依赖个人操作 | 需额外控制 | 单 Writer 原则 |

**单 Writer 的边界**：不是整个仓库或整个团队全局串行——其他 Agent 仍可在隔离分支、`worktree` 或明确文件范围内并行分析与评审；单 Writer 只约束"同一正式研发任务主工作区"的正式写入权。

**安全接管机制**：环境代际标识新旧实例，但安全接管依赖 `lease`、`fencing` 和旧执行器停止；只有正式写入路径验证当前写入权并拒绝失效执行器，才能形成有效隔离。

## Relationships（关系）

- **与可替换 Harness**：Personal Dev 为 Harness 提供稳定执行现场，Harness 负责节点内编码执行；二者共同支撑 Agent 持续研发。见 [[harness-engineering|Harness 工程]]。
- **与广告凌凌漆**：Personal Dev 是凌凌漆复杂研发路径的工作环境支撑。见 [[gaode-ad-linglingqi|广告凌凌漆]]。
- **与一次性沙箱/本机**：对比关系——本机绑个人设备、沙箱依赖临时实例，Personal Dev 介于二者之间，兼顾持久与隔离。

## Evolution（演进）

- 2026-11-20：信源文（高德广告凌凌漆）首次系统提出 Personal Dev，给出对比表、单 Writer、代际与 lease/fencing 机制。
- 2026-11-21：首次立概念页。

## Open Questions（开放问题）

- 作者明示：现有公开证据还不足以证明"新实例接管后，所有旧实例写入均已被稳定拒绝"。
- 计划外故障、活跃任务中途切换、写入过程中换代、多人规模下的资源竞争仍需继续验证。
- 持久化、环境绑定、受控换代、基础恢复已形成主体骨架，但完整可靠性待验证。

## Evidence（证据）

- 信源：`raw/sources/ai/2026-11-20-gaode-ad-linglingqi.md`（第 3.2 节 Personal Dev：对比表、环境骨架、单 Writer 原则、代际与 lease/fencing、待验证事项）。

## Related Knowledge（相关知识）

- [[gaode-ad-linglingqi|广告凌凌漆]]（提出并落地该概念的实体）
- [[harness-engineering|Harness 工程]]（可替换执行器与稳定执行现场的共同关切）
- [[2026-11-20-gaode-ad-linglingqi|信源页]]（概念出处）
