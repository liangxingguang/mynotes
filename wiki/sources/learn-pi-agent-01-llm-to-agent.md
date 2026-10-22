---
id: wiki-source-learn-pi-agent-01-llm-to-agent
type: source
title: Learn Pi Agent 01｜大模型如何一步步变成 Agent
status: active
created: 2026-10-22
updated: 2026-10-22
confidence: high
tags:
  - ai-agent
  - 教程
  - pi
sources:
  - raw/sources/ai/2026-10-14-learn-pi-agent-01-llm-to-agent.md
related:
  - wiki/entities/pi.md
  - wiki/concepts/agent-loop.md
---
# Learn Pi Agent 01｜大模型如何一步步变成 Agent

## Overview（概览）

learn-pi-agent 系列第一章，以 Pi Agent 为主线回答"会答题的大模型怎样变成能完成任务的 Agent"。核心论点：增加的不是新模型，而是一套围绕模型持续运行的程序——模型负责判断，宿主（Runtime）执行被允许的动作并把结果带入下一轮。文章用一次天气查询走完整条链路，厘清 Message/Context/State/Session 四个概念，给出基于 Pi 类型名改写的 Agent Loop 教学代码，并区分 Runtime 与 Harness。

## Key Facts（关键事实）

- 模型与宿主边界：模型只生成文本或结构化请求；文件、网络、命令、数据库等外部能力全在宿主环境。"模型生成请求 → 宿主检查请求 → 工具执行动作"。
- Tool Call 是模型返回的结构化工具请求（含 name/arguments/id）；Tool Result 用同一 `toolCallId` 关联，不依赖数组顺序。
- 一次响应可含多个 Tool Call 与文本；Runtime 须从整条响应 filter toolCall，不能只凭 `stopReason` 判断运行结束。
- `stopReason` 只说明本次生成为何结束：error/aborted 立即结束运行；length 截断时不执行可能被截断的参数、生成失败结果；toolUse 仅表示停在了工具请求处。
- 四概念分工：Message=一条有来源的内容记录；Context=本轮模型实际收到的输入快照（每轮重备）；State=当前运行状态（含控制信息），`Context_t = prepare(State_t)`；Session=可持久化、可恢复的会话记录，但非模型永久记忆。
- 可靠 Agent Loop 五条边界：宿主执行动作；Call/Result 用标识关联；每轮重备 Context；完成/失败/取消/未完整输出分开记录；外部操作受宿主控制。
- Harness = 模型连接 + Runtime + Context 准备 + 工具 + Session + 运行规则 + 执行环境与界面；Runtime 是其控制核心。
- Pi 官方自称 "Pi Agent Harness"，三个核心包：`@earendil-works/pi-ai`（统一模型/消息/工具协议）、`@earendil-works/pi-agent-core`（维护 Loop 与 State）、`@earendil-works/pi-coding-agent`（装配 Session/工具/CLI）。

## Important Claims（重要论断）

### 模型提供判断，宿主让动作真正发生

即使模型输出"读取 README.md"，也只是文本；只有宿主真正调用工具才会发生。这一边界是所有 Agent 安全与权限设计的出发点。

### 停止处理是 Runtime 的职责

停止信号可来自模型、用户、工具或运行限制；把它们转换成"继续、完成、失败或取消"等明确状态，是 Runtime 的职责。`stopReason: "toolUse"` 结束的是一次模型生成，不是整个 Agent Loop。

### 宿主存了 ≠ 模型看得到

宿主保存了某条记录，不等于模型本轮一定能看到它。Runtime 根据任务与输入长度限制选择、转换或补充要发送的内容；Session 可以保存很多历史，模型只能看到被选入本轮 Context 的部分。

## Concepts Introduced（引入的概念）

- [[agent-loop|Agent Loop]]（含 Runtime、Tool Call/Tool Result、Message/Context/State/Session、Harness 的区分）

## Entities Mentioned（提及的实体）

- [[pi|Pi]]（三个核心包与 Harness 定位）

## Implications（影响／启示）

为后续理解模型 API、流式响应、工具系统、MCP、Skill 和插件提供了统一框架：它们分别是在扩展模型边界、Runtime 能力或 Harness 的装配方式。

## Limitations（局限）

- 教学性文章，代码为教学改写（删去流式事件、钩子和部分错误分支），非 Pi 仓库原样源码。
- 单作者系列的第一章，后续章节（模型 API 与消息协议对比）尚未发布，部分论断待后续信源印证。

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[pi-6-extensions|从 Claude Code 搬到 Pi：6 个扩展补回熟悉体验]]

## Source（信源）

- `raw/sources/ai/2026-10-14-learn-pi-agent-01-llm-to-agent.md`
