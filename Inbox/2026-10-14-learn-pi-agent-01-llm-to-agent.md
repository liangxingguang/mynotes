---
id: 2026-10-14-learn-pi-agent-01-llm-to-agent
title: Learn Pi Agent 01｜大模型如何一步步变成 Agent
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/wwl8q1LAguHp2GP_lQAINQ
source_type: article
platform: 微信公众号
created: 2026-10-14
category: 学习
tags: [AI, 课程, Pi]
wiki_status: pending
---

# Learn Pi Agent 01｜大模型如何一步步变成 Agent

> learn-pi-agent 系列第一章，回答"会答题的大模型怎样变成能完成任务的 Agent"。增加的不是新模型，而是一套围绕模型持续运行的程序：模型负责判断，宿主（Runtime）负责执行被允许的动作并把结果喂回下一轮。文章用一次天气查询走完整条链路，厘清 Message/Context/State/Session 四个概念，给出 Pi 核心 Agent Loop 的教学版代码，并区分 Runtime 与 Harness。

## 核心要点

1. **模型与宿主的边界**：模型只生成文本或结构化请求，文件、网络、命令、数据库等外部能力全在宿主环境；"模型生成请求 → 宿主检查请求 → 工具执行动作"，模型提供判断，宿主让动作真正发生。
2. **Agent Loop**：Runtime 推动"准备本轮输入 → 调模型 → 模型直答或请求工具 → 宿主执行并保存结果 → 带新结果进入下一轮"，直到完成或终止。模型返回的结构化请求叫 Tool Call（含 name/arguments/id），宿主写回的结果叫 Tool Result（用同一 toolCallId 关联，不靠数组顺序猜）。
3. **天气查询五步**：Runtime 组 Context（问题+规则+工具说明）→ 模型返 Tool Call（stopReason: toolUse）→ Runtime 校验工具存在、参数合法、权限/取消/限制后执行 → 包装 Tool Result 写回 → 第二轮模型据结果作答。
4. **四个易混概念**：Message=一条有来源的内容记录（"这条是什么"）；Context=本轮模型实际收到的输入快照，每轮重新准备（"模型这次看到什么"，宿主存了≠模型看得到）；State=当前运行状态，含消息、在执行的工具调用、取消信号等控制信息，`Context_t = prepare(State_t)`（"进行到哪了"）；Session=可持久化、可恢复的会话记录，但不是模型永久记忆（"怎样保存恢复"）。
5. **Loop 推进规则**：响应无 Tool Call 则返回文本结束；有则执行工具、写回 State 再开下一轮；一次响应可含多个 Tool Call，不能只看 stopReason 判断结束（代码从整条响应 filter toolCall）。stopReason 为 error/aborted 立即结束；length 截断时参数不执行、生成失败结果；工具阶段可要求 terminate。
6. **双消息视角**：Pi 教学代码同时维护 currentContext.messages（下一轮完整工作集）与 newMessages（本次运行的增量，供 UI/持久化）；同一新消息写两处但 newMessages 不会再追加回 Context，不会造成重复。
7. **停止处理是 Runtime 职责**：正常完成、工具续轮、长度上限、错误中止、用户取消/超时/资源上限、工具拒绝/失败——要把来自模型、用户、工具、限制的信号转成"继续/完成/失败/取消"明确状态；五条边界：宿主执行动作、Call/Result 用 id 关联、每轮重备 Context、完成失败取消未完整分开记录、外部操作受宿主控制。
8. **Harness = 装起完整运行环境**：Harness = 模型连接 + Runtime + Context 准备 + 工具 + Session + 运行规则 + 执行环境与界面；Runtime 是控制核心。对应 Pi 三包：pi-ai 统一模型/消息/工具协议、pi-agent-core 维护 Loop 与 State、pi-coding-agent 装配 Session/工具/CLI；核心循环保持小，定制走扩展入口而非改 Loop。

## 正文

### 从一次模型调用到 Agent

一次调用只有"宿主准备输入 → 模型生成 → 宿主接收响应"三步，模型本身不执行任何外部动作——即使它输出"读取 README.md"，也只是文本，只有宿主真正调工具才会发生。要完成查实时天气、改项目这类多步任务，需要 Runtime 把单次调用连成 Agent Loop，并定义 Agent：由 Runtime 组织的运行系统，模型根据当前输入提出下一步，Runtime 执行被允许的动作并把结果带入下一轮。

### 天气查询全链路

用户问题 → 模型 Tool Call(get_weather, {city:北京}, id=call_1, stopReason=toolUse) → Runtime 四项校验（工具存在/参数格式/当前运行允许/未取消未超限）后访问天气服务 → Tool Result（toolCallId=call_1 关联，isError 标记）进入下一轮 Context → 模型输出最终文本，无新 Tool Call，运行结束。一句话：用户问题 → Tool Call → 宿主执行 → Tool Result → 模型回答。

### Agent Loop 教学代码（基于 Pi 类型名改写）

runAgentLoop 把新 prompt 拼入 currentContext，runLoop while(true)：①streamAssistantResponse 调模型并把完整响应写入 messages；②stopReason 为 error/aborted 直接 return；③从响应 content 过滤全部 toolCall；④无 Tool Call 则 return；⑤stopReason=length 走 failToolCallsFromTruncatedMessage（截断参数不执行），否则 executeToolCalls；⑥Tool Result 同时 push 进 currentContext.messages 与 newMessages；⑦batch.terminate 时结束，否则继续下一轮。

### Runtime 与 Harness

Runtime 负责备 Context、调模型存响应、识别校验分发 Tool Call、写回结果、处理取消/错误/限制、决定续轮或返回。Harness 是工程意义上的完整运行层（不是消息协议）：Pi 官方即自称 Pi Agent Harness，pi-ai 接多家模型、pi-agent-core 跑 Loop、pi-coding-agent 做最终装配，新工具/命令/UI/钩子接入 Harness 即可。

### 系列位置

下一章比较 OpenAI Chat Completions、OpenAI Responses、Anthropic Messages 三种消息格式，以及 Pi 如何用统一消息类型与 Provider Adapter 接入不同模型。

相关笔记：[[2026-10-14-pi-secondary-dev-5-layers]]（薄内核与五层定制）、[[2026-10-14-pi-school-agent-course]]（Pi 入门课程）。

## 来源

- 微信公众号：[Learn Pi Agent 01｜大模型如何一步步变成 Agent](https://mp.weixin.qq.com/s/wwl8q1LAguHp2GP_lQAINQ)

## 附件

无
