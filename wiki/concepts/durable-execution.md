---
id: wiki-concept-durable-execution
type: concept
title: 持久执行（Durable Execution）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - concept
  - ai-agent
  - architecture
sources:
  - raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md
related:
  - wiki/entities/pi.md
---
# 持久执行（Durable Execution）

## Definition（定义）

持久执行指 Agent（或长时任务系统）在进程崩溃后能从断点**精确**继续运行的能力：不需人工再输入"继续"，工具结果与流式输出不丢失，应用状态被持久化并可可靠恢复。核心要求是"先写存储、后可见"——只有已提交的状态才可观察，没有旁路内存通道。

## Why It Matters（为什么重要）

任何长时间运行、脱离人实时监控的 Agent 都必须具备这种能力；模型本身已足够不可预测，外层任务编排与故障恢复至少应稳定、可理解。过去每个 Agent 应用都在重复实现对话记录、任务持久化、故障恢复与会话分叉，通用持久执行框架可直接替代这部分外围代码（有开发者估计可替代一半）。

## Core Characteristics（核心特征）

1. **崩溃点无关恢复**：进程死在被执行操作（"效应"）开始前、执行中或结束后，重启后都能到达一致终态。
2. **幂等处理执行中崩溃**：执行前先拿到外部系统的 key/ID 并落库，重启用同一 ID 查询/启动，避免重复副作用（如重复扣款）。
3. **全量历史可保留**：对话转录、工具执行、任务状态不全部进内存，可支撑长驻多年的 Bot。
4. **可部署性广**：同一套原语可跑在 Vercel、Cloudflare Durable Objects、E2B、笔记本乃至手机上（Pi Durable 个案）。

## Structure（结构）

Pi Durable 的两个基本原语（当前唯一详细信源）：

1. **效应三明治任务**：执行前写入意图记录（输入已求值验证）→ 执行效应（支持幂等键）→ 存储结果；任务可嵌套派生并等待子任务结束。
2. **版本化文档存储**：类 MongoDB 的 JSON 文档，通过 Proxy 把变更自动记录为类 JSON Patch 操作（RFC JSON Patch 的 Agent 场景优化变体）；文档可与转录记录任意位置关联，支持"回到过去看旧版本"与"只看最新版"两种时间回溯。

## How It Works（运作方式）

Harness 里发生的每件事都是一个任务（效应三明治）：生成 LLM 回复=创建任务（保存"即将调用"记录→调用→持久化回答）；工具调用同理。重启后扫描存储，发现等待执行的操作接着运行。不可撤销效应（删文件、刷卡）要求效应本身能与持久性系统组合。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-loop|Agent Loop]]：持久执行是 Agent Loop 跨进程存活的运行层保障。

### Distinctions（区分）

- 与**事件溯源**不同：Pi Durable 明确不采用事件溯源（认为其带来很多问题），而是用"意图→执行→结果"三明治 + 版本化文档。
- 与简单会话快照（如复制会话 JSON 换机重启）不同：后者无任务级恢复与幂等保证。

## Evolution（演进）

- 2026-10：Pi Durable 随 Pi 1.0 发布，架构历经八轮迭代，约 1.2 万行代码；此前 Hermes、OpenClaw、AMP（orb）等各有专用持久化方案，但无通用可复用框架（受访者观点）。

## Open Questions（开放问题）

- 性能开销（Proxy 记录被作者自称"很慢的 hack"）与大规模生产验证：当前信源未确立。
- 与事件溯源路线的系统性对比：仅有受访者定性判断。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md`

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[pi-1-0-durable-mcp-update|Pi 1.0 与 Pi Durable（信源页）]]
