---
id: wiki-source-agent-loop-context-management
type: source
title: Agent - agent loop 与上下文管理（3）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - ai-agent
  - harness
  - context-management
sources:
  - raw/sources/ai/2026-10-28-agent-loop-context-management.md
---
# Agent - agent loop 与上下文管理（3）

## Overview（概览）

知乎专栏《Agent》系列第 3 篇（核心篇）：把 agent loop 拆成五阶段数据流，定义 harness = loop 内核 + 六件套外围基础设施，系统讲透上下文窗口的 token 预算与裁剪/压缩/隔离三手段，并给出四类终止条件；附不接真模型的 15 行最小 loop 骨架（桩函数实测跑通，含死循环熔断演示）。

## Key Facts（关键事实）

- **五阶段**：① 获取输入 → ② 调 LLM（全量 messages）→ ③ 解析 finish_reason → ④ 执行工具（唯一改变世界的步骤）→ ⑤ 追加回填；其中四个阶段是纯确定性代码，智能全关在阶段②那一次模型调用里；messages 是唯一跨轮存活的内部状态（§1.2）。
- **三套官方拆法同构**：本篇数据流五阶段 ↔ OpenClaw 六步（intake / context assembly / model inference / tool execution / streaming / persistence）↔ Claude Code 三相位（gather context / take action / verify results），映射到同一个 while 循环（§1.4，2026-10-15 实测两家官方文档）。
- **harness 官方定义**（Claude Code 文档原文）：环绕模型、提供工具并管理模型所见上下文的那一层就是 agentic harness；六件套 = 调度（同会话串行防互踩）/ 工具注册 / 事件流（防黑屏等待）/ 权限（Claude Code 四档 permission modes）/ 持久化（JSONL 落盘可回退续跑分叉）/ 可观测（§2）。
- **harness 本身可以是插件**（OpenClaw README 原文："Models and agent harnesses … are plugins you can swap"）——模型可换、harness 可换、应用形态可换，三层彻底解耦（§2.4）。
- **上下文管理三手段**：裁剪（零成本但永久丢失）/ 压缩（有损，Claude Code 先清旧工具输出再总结）/ 隔离（subagent 独立窗口）；两条工程细节：工具调用与结果必须成对保留（OpenClaw 压缩切分点规则）；磁盘全量、窗口有损（压缩只改模型下一轮所见）（§3.4-3.5）。
- **四类终止条件**：模型自判（读 finish_reason 结构化信号，不读内容）/ 最大迭代数硬熔断（经验 10-20 轮，唯一不依赖模型自觉）/ 工具单步超时 / 用户确认与打断（"You're part of this loop too"）；OpenClaw 内置「连续三次完全相同工具错误必停」护栏（§4）。
- 压缩本身也要有终止条件：单文件大到「压缩完立刻又满」时 Claude Code 报 thrashing error 而非无限循环（§3.5）。

## Important Claims（重要论断）

### loop 是骨架，模型调用是心脏的每一次跳动

五阶段里只有阶段②涉及模型；「模型只声明、宿主才执行」在代码里就是 `TOOLS[name](**args)` 那一行的分离。回填是循环能继续的原因——不回填，下一轮模型就失忆。

### 模型的「我好了」是最不可信的停止方式

任务完成判定（finish_reason）只是四类终止条件之一；harness 的价值就在于其余三种（最大迭代数、工具超时、用户打断）都不依赖模型自觉——工程上永远假设模型自判会失效。

### 忘事不是玄学

「agent 忘事」= 上下文放不下 / 被裁掉了 / 太贵了；上下文管理第一原则不是技巧，是「只留这次任务接下来还能用到的」，确定性规则放 CLAUDE.md 等持久文件而非依赖对话历史。

## Concepts Introduced（引入的概念）

- [[context-management|上下文管理（Context Management）]]
- [[harness-engineering|Harness Engineering]]（六件套与三层图）
- [[agent-loop|Agent Loop]]（五阶段数据流拆解）

## Entities Mentioned（提及的实体）

- Claude Code（agentic loop 三相位、permission modes 四档、JSONL 落盘、/compact 与 /context、thrashing error）
- OpenClaw（agent loop 六步定义、per-session 串行、连续三次相同工具错误必停、harness 即插件）

## Implications（影响／启示）

「harness 之于 agent 如 Gin 之于 HTTP 服务」给出框架选型的心智锚点；四类终止条件表可直接抄作自建 harness 的安全网清单；15 行桩函数骨架证明 loop 内核只依赖「LLM 输出形状 + 工具注册表」两个接口。

## Limitations（局限）

动手实践用桩 LLM 不接真模型（设计如此）；最大迭代数 10-20 轮为经验值非官方标准；OpenClaw star 数等页面数值为当日快照。

## Related Knowledge（相关知识）

- [[context-management|上下文管理（Context Management）]]
- [[agent-loop|Agent Loop]]
- [[harness-engineering|Harness Engineering]]
- [[agent-panorama-roadmap|Agent - 全景与学习路线地图（系列第 1 篇信源页）]]
- [[agent-minimal-handwritten|Agent - 手写最小 agent（系列第 7 篇信源页）]]

## Source（信源）

- `raw/sources/ai/2026-10-28-agent-loop-context-management.md`
