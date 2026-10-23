---
id: 2026-10-17-pi-durable-architecture
title: 开源 Pi-durable：把持久化做进协议的 Agent 应用框架
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/x1G9t7b8M1hrR370f4DW4Q
source_type: link
platform: 微信
created: 2026-10-17
category: 技术
tags: [Pi, Harness, 工程实践]
asset_ref: Assets/2026/10/pi-durable-architecture.md
wiki_status: ingested
---

# 开源 Pi-durable：把持久化做进协议的 Agent 应用框架

> pi-durable 是构建"随处运行、可崩溃恢复、多端协同、无限长"Agent 应用的框架（library，不带 UI）。核心公理：Session 原子提交不可变条目、任务和文档，只有已提交状态可观察——先落盘后可见，进程任意时刻死掉都能从上个检查点继续。五层架构（Storage/Session/Documents/Tasks/Harness）各司其职，一次 run 是一条 generation 持久任务链。与 Pi coding agent 共享 pi-ai 模型层，但定位是天级长程运行、多端在场的 Agent 应用底座，等于把 Temporal 的 durable execution 搬进 agent 框架。

## 核心要点

- **原子提交公理**：对话转录、模型调用、工具执行、业务状态全部先写存储后可见，无内存旁路；四张表（conversations/entries/tasks/submissions）+ 五个 pi.\* 文档（agent/live/inbox/usage/provider）
- **五层架构**：Storage（极简接口 + 四个后端 Memory/SQLite/JSONL/DO，带一致性测试）→ Session（批量原子提交）→ Documents（底稿+增量）→ Tasks（持久状态机 + 所有权树，1950 行调度器）→ Harness（内置 generation/tool/compaction 三任务）
- **崩溃恢复语义**：流式中断转 aborted 重发；工具副作用 replay safe 重跑否则合成 interrupted；审批 memo 首写胜出不二次弹窗；扩展丢失任务阻塞不终止，装回即复活
- **热重载**：正在跑的阶段用旧代码跑完，下一阶段自动换新代码；pi.agent 只存扩展名不存代码
- **工具平台化**：工具可嵌套、结构化输出、deferred 由 tool_search 按 BM25 按需加载；code mode 让模型写脚本编排工具，脚本本身是持久任务可确定性重放
- **二次开发六方向**：IM 常驻机器人（频道=对话、thread=fork）、长程业务编排（failFast+abort 清理）、前后台子代理、人机审批（beforeTool 钩子）、云端部署（一个 DO 一个分片）、观测审计（taskGraph/usage 台账）

## 正文

见 [[Assets/2026/10/pi-durable-architecture.md|抓取正文]]。

## 来源

- [开源 Pi-durable，把持久化做进协议，看看架构是如何支持的](https://mp.weixin.qq.com/s/x1G9t7b8M1hrR370f4DW4Q)

## 附件

- [[Assets/2026/10/pi-durable-architecture.md]]
