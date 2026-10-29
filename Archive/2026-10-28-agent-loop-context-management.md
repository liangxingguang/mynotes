---
id: 2026-10-28-agent-loop-context-management
title: Agent - agent loop 与上下文管理（3）
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2094456858648100884
source_type: link
platform: zhihu
created: 2026-10-28
category: 技术
tags: [AI, Harness, 工程实践]
asset_ref: Assets/2026/10/agent-loop-context-management.md
wiki_status: ingested
---

# Agent - agent loop 与上下文管理（3）

> Agent 系列第 3 篇（核心篇）：agent loop 五阶段拆解、harness 六件套、上下文窗口的 token 预算与裁剪/压缩/隔离三手段、四类终止条件——附不接真模型的最小 loop 骨架实践。

## 核心要点

- **五阶段**：获取输入 → 调 LLM（全量 messages）→ 解析 finish_reason → 执行工具（唯一改变世界的步骤）→ 回填；四个阶段是纯确定性代码，智能全关在模型调用里；messages 是唯一跨轮存活的内部状态。
- **三套官方拆法同构**：Claude Code 三相位（gather context/take action/verify）与 OpenClaw 六步，映射到同一个 while 循环。
- **harness = loop + 六件套**：调度（同会话串行防互踩）、工具注册、事件流（防黑屏等待）、权限闸门（Claude Code 四档 permission modes）、持久化（JSONL 落盘可回退续跑）、可观测；harness 之于 agent 如 Gin 之于 HTTP 服务，且 harness 本身也可以是插件。
- **上下文管理**：每轮全量重发 messages 是预算烧穿的根因；三手段——裁剪（零成本但永久丢失）、压缩（有损，Claude Code 先清旧工具输出再总结）、隔离（subagent 独立窗口）；工具调用与结果必须成对保留；磁盘全量、窗口有损；压缩也要有终止条件（thrashing error）。
- **四类终止条件**：模型自判（读 finish_reason 结构化信号，不读内容）、最大迭代数硬熔断（10-20 轮，唯一不依赖模型自觉）、工具单步超时、用户打断；工程上永远假设模型自判会失效。

## 正文

见 [[Assets/2026/10/agent-loop-context-management.md]]（全文约 2.4 万字符，含分层图、桩函数 loop 骨架与死循环熔断实验）。

## 来源

- [Agent - agent loop与上下文管理（3）· 知乎专栏](https://zhuanlan.zhihu.com/p/2094456858648100884)

## 附件

- [[Assets/2026/10/agent-loop-context-management.md]]
