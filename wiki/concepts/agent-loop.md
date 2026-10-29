---
id: wiki-concept-agent-loop
type: concept
title: Agent Loop
status: active
created: 2026-10-22
updated: 2026-10-29
confidence: high
tags:
  - concept
  - ai-agent
sources:
  - raw/sources/ai/2026-10-14-learn-pi-agent-01-llm-to-agent.md
  - raw/sources/ai/2026-10-15-agent-loop-production-boundaries.md
  - raw/sources/ai/2026-10-21-agent-2026-midyear-architecture-review.md
  - raw/sources/ai/2026-10-23-agent-software-architecture-task-run-step-event.md
  - raw/sources/ai/2026-10-26-agent-context-tutorial.md
  - raw/sources/ai/2026-10-27-harness-engineering-11-agents-study.md
  - raw/sources/ai/2026-10-28-agent-minimal-handwritten.md
  - raw/sources/ai/2026-10-28-agent-classic-agent-theory.md
  - raw/sources/ai/2026-10-28-agent-llm-call-patterns.md
related:
  - wiki/concepts/harness-engineering.md
  - wiki/entities/pi.md
  - wiki/concepts/mcp.md
  - wiki/concepts/next-token-prediction.md
  - wiki/concepts/task-run-step-event-model.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/tool-schema-as-prompt.md
  - wiki/concepts/llm-call-protocol.md
  - wiki/concepts/aima-agent-taxonomy.md
  - wiki/concepts/pmta-framework.md
---
# Agent Loop

## Definition（定义）

Agent Loop 是 Runtime 把单次模型调用连成多步任务执行的重复过程：准备本轮输入（Context）→ 调用模型 → 模型直接回答或返回 Tool Call → 宿主校验并执行工具、把 Tool Result 写回 State → 带着新结果进入下一轮，直到任务完成或运行被终止。

由此得到 Agent 的定义（引自信源）："Agent 是一个由 Runtime 组织的运行系统：模型根据当前输入提出下一步，Runtime 执行被允许的动作，并把结果带入下一轮，直到任务完成或运行被终止。"

## Why It Matters（为什么重要）

大模型本身只生成文本或结构化请求，不能执行任何外部动作。从"会答题的模型"到"能完成任务的 Agent"，增加的不是新模型，而是这套围绕模型持续运行的程序。Agent Loop 是理解工具系统、MCP、Skill、插件等上层机制的统一框架——它们分别扩展模型边界、Runtime 能力或 Harness 装配方式。

## Core Characteristics（核心特征）

1. **模型/宿主边界**：模型提供判断（生成文本或结构化请求）；宿主决定提供哪些工具、校验请求、执行被允许的动作；文件、网络、命令、数据库等外部能力全在宿主环境。
2. **Tool Call / Tool Result**：Tool Call 是模型返回的结构化工具请求（name/arguments/id）；Tool Result 用同一 `toolCallId` 关联，不依赖数组顺序猜测对应关系。
3. **每轮重备 Context**：Context 是本轮模型实际收到的输入快照，`Context_t = prepare(State_t)`；宿主存了某条记录 ≠ 模型本轮看得到它。
4. **停止信号的多源性**：停止信号可来自模型、用户、工具或运行限制；把它们转换成"继续、完成、失败或取消"等明确状态是 Runtime 的职责。
5. **响应完整性检查**：一次响应可同时含文本与多个 Tool Call；Runtime 须检查完整响应，不能只凭 `stopReason` 判断整段运行是否结束。

## Structure（结构）

四个容易混淆的概念（信源第 4 节）：

- **Message**：一条有来源的内容记录（用户问题、Tool Call、Tool Result、模型回答都是 Message）——"这一条内容是什么"。
- **Context**：本轮模型调用的输入快照（行为规则、选中的历史 Message、工具说明等），每轮重新准备——"模型这一次看到了什么"。
- **State**：Runtime 推进任务的当前状态，含已产生的 Message、在执行的工具调用、错误、取消信号、停止原因等控制信息——"当前运行进行到了哪里"。
- **Session**：可持久化、可恢复的会话记录，跨回合延续；不等于模型永久记忆——"这段会话怎样保存和恢复"。

方向关系：Session 保存可恢复记录 → Runtime 在 State 上推进当前运行 → 每次调用模型前从 State 准备本轮 Context。

## How It Works（运作方式）

以一次天气查询为例（信源第 3 节）：

1. Runtime 组 Context（用户问题 + 规则 + 工具说明 `get_weather{city: string}`）；
2. 模型返回 Tool Call（`get_weather, {city: "北京"}, id=call_1`，`stopReason: "toolUse"`）；
3. Runtime 四项校验（工具存在、参数格式合法、当前运行允许、未取消未超限）后由宿主访问天气服务；
4. Tool Result（`toolCallId=call_1`，isError 标记）写入 State，进入下一轮 Context；
5. 第二轮模型据结果作答，无新 Tool Call，运行结束。

压缩链路：`用户问题 → Tool Call → 宿主执行 → Tool Result → 模型回答`。

Loop 推进规则（信源第 5、6 节的教学代码与停止处理）：

- 响应无 Tool Call → 返回文本，运行完成；有 Tool Call → 执行工具、写回 State 再开下一轮；
- `stopReason` 为 error/aborted → 立即结束；length 截断 → 不执行可能被截断的参数、生成失败结果；
- 工具阶段可要求 terminate；用户取消、超时或资源上限 → 阻止新调用并结束运行；
- 工程上同时维护 `currentContext.messages`（下一轮完整工作集）与 `newMessages`（本次运行增量，供 UI/持久化），同一新消息写两处但 newMessages 不再追加回 Context。

可靠 Agent Loop 至少要守住的五条边界：① 模型提出工具请求、宿主执行动作；② Call/Result 用标识关联；③ 每轮根据最新 State 重备 Context；④ 完成、失败、取消、未完整输出分开记录；⑤ 文件/网络/命令/数据库操作受宿主环境控制。

## Relationships（关系）

### Related Concepts（相关概念）

- [[mcp|MCP]]：模型↔工具/数据的纵向协议，属于扩展 Runtime 工具能力的机制。
- [[agent-evaluation|业务 Agent 全生命周期评测]]：对 Agent Loop 运行质量的评测框架（解读：评测对象正是 Loop 各轮的行为与结果）。
- [[next-token-prediction|下一 token 预测]]：模型侧视角——工具调用本质是模型写结构化文本、外部执行后拼回上下文，Agent Loop 是该机制的多轮工程化。

### Dependencies（依赖项）

- 模型 API 的消息格式（OpenAI Chat Completions / Responses、Anthropic Messages 等）——Tool Call/Result 的序列化载体。

### Distinctions（区分）

- **Runtime vs Harness**：Runtime 是宿主程序中推动 Agent Loop 的控制核心（备 Context、调模型、校验分发 Tool Call、写回结果、处理取消/错误/限制、决定续轮或返回）；Harness 是工程上的完整运行层 = 模型连接 + Runtime + Context 准备 + 工具 + Session + 运行规则 + 执行环境与界面。Harness 不是消息协议。
- **Message vs Context vs State vs Session**：见 Structure 一节。
- **`stopReason` vs 运行结束**：`stopReason` 只说明本次模型生成为何停止；整段 Agent 运行的结束由 Runtime 结合响应内容与运行规则判定。

## Evolution（演进）

- 2026-10-23 — 新增生产化边界信源 `raw/sources/ai/2026-10-15-agent-loop-production-boundaries.md`（Aegis W01 原型）。它把本页"停止信号多源性""响应完整性检查""宿主校验"落到具体工程形态：任务状态机（终态不可覆盖、取消先在仓储落终态的并发排序点）、有限预算（步数/工具调用/三级超时各有独立错误码）、服务端授权（模型输出不是授权凭据，rollback 建议同样走 ToolExecutor → TOOL_DENIED）、证据引用校验（evidence_ids 必须真实存在，且证据 ≠ 因果）。同时印证"Runtime vs Harness"区分：该原型把 Provider/ToolExecutor/Runtime 拆为三个可替换契约，W02 接 MCP 只换工具适配器。

- 2026-10-23 — 新增综述信源 `raw/sources/ai/2026-10-21-agent-2026-midyear-architecture-review.md`（叶小钗 2026 Agent 年中总结）。再次印证 Runtime/Harness 二分（Harness=上下文装配+工具调用+循环控制+暂停恢复+权限检查+运行记录；Runtime 回答资源位置），并补充三条 Loop 层判据：① 场景适配四条件——信息能否取得、工具能否使用、结果能否验证、失败能否恢复；② "Agent Loop 是推进任务的循环，验收机制决定循环什么时候有资格结束"——停止资格由业务证据而非模型的"完成了"判定；③ 工具设计四环节检查——选得对、调得动、读得懂结果、失败后知道如何处理，且 Agent 决策基于状态快照、执行时要校验快照是否仍有效（STALE_CONTEXT 模式）。

- 2026-10-23 — 新增教学信源 `raw/sources/ai/2026-10-23-agent-software-architecture-task-run-step-event.md`（agent-from-scratch 第 5 章）。它承接第 4 章 AgentKernel（即本页 Loop 的教学实现），指出单次阻塞 `run()` 调用缺少任务身份、运行身份、持久化状态、审批状态与并发版本，由此引出 [[task-run-step-event-model|Task/Run/Step/Event 领域模型]] 作为 Loop 的控制平面化；其"模型建议与工具执行分离""停止信号转明确状态"等原则与本页模型/宿主边界、停止信号多源性互证。

- 2026-10-27 — 新增源码研究解读信源 `raw/sources/ai/2026-10-27-harness-engineering-11-agents-study.md`（《Harness Engineering》论文解读）。其 `Agent ≈ Model + Harness` 与"执行循环"观察面印证本页 Runtime/Harness 二分；"极简循环有价值但不代表完整产品成本"（Mini-SWE-Agent 百行核心 vs 生产复杂度，类比 TCP Echo vs 生产服务）印证本页"可靠 Loop 五条边界"之外还有故障/权限/资源/交互维度的复杂度。由此新建概念页 [[harness-engineering|Harness Engineering]]。

- 2026-10-27 — 新增教学资源信源 `raw/sources/ai/2026-10-26-agent-context-tutorial.md`（nano-ai.tech/agent/ 可交互教程的微博推荐帖）。其"Agent 就是一个 while 循环：调模型、执行工具、把结果写回上下文，再调模型"是本页定义的通俗化印证；教程以"逐步观察上下文每轮增长与出问题点"为教学主线，可视作本页 Context/State 机制的入门演示材料（教程站点本身未经抓取核验）。

- 2026-10-29 — 新增教学实现信源 `raw/sources/ai/2026-10-28-agent-minimal-handwritten.md`（手写最小 agent 第 7 篇，Python + DeepSeek 可运行代码）。把本页抽象原则落到逐行实现：① 终止判定读结构化信号 `tool_calls` 有无（模型嘴上说"完成了"不算数），`finish_reason` 只做次级校验；② `MAX_ITERATIONS` 熔断是"唯一不依赖模型自觉的终止保险"，官方示例的 `while True` 工程上不能省；③ 带 tools 的请求必须完整回传历史 `reasoning_content`（否则 API 400），回填是"loop 的记忆点"；④ 四类工具错误（幻觉调用/坏 JSON/参数不合规/工具异常）统一回喂模型自纠而不抛出——印证本页"停止信号多源性""宿主校验"边界。由此新建概念页 [[tool-schema-as-prompt|Tool Schema as Prompt]]。

- 2026-10-29 — 新增理论溯源信源 `raw/sources/ai/2026-10-28-agent-classic-agent-theory.md`（知乎《Agent》系列经典理论篇）。AIMA 五类 Agent 中，本页 Loop 的"每轮带历史重备 Context"正是 model-based reflex agent 的内部状态机制；其环境四属性（可观测/确定/静态/离散）可作为 Loop 场景适配四条件的理论前身。由此新建概念页 [[aima-agent-taxonomy|AIMA Agent 分类]] 与 [[pmta-framework|PMTA 框架]]。

- 2026-10-29 — 新增协议层信源 `raw/sources/ai/2026-10-28-agent-llm-call-patterns.md`（知乎《Agent》系列第 6 篇）。把本页"停止信号多源性"落到 wire 层：Loop 续轮的结构化判据是响应的 `finish_reason: "tool_calls"`，Tool Result 回填靠 `tool_call_id` 配对。由此新建概念页 [[llm-call-protocol|OpenAI 兼容 Chat Completions 调用协议]]。

## Open Questions（开放问题）

- 不同框架（LangGraph、AutoGen、各厂商 Agent SDK）对 Runtime/Harness 的划分与本文是否一致？
- 多 Agent 场景下 Loop 之间的状态与消息如何组织（待 A2A 等相关信源补充）？

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-learn-pi-agent-01-llm-to-agent.md`
- Source: `raw/sources/ai/2026-10-15-agent-loop-production-boundaries.md`
- Source: `raw/sources/ai/2026-10-21-agent-2026-midyear-architecture-review.md`（综述印证：Harness/Runtime 职责、四条件、验收机制、状态快照校验）
- Source: `raw/sources/ai/2026-10-23-agent-software-architecture-task-run-step-event.md`（教学互证：模型建议与工具执行分离、控制状态显式化、单次阻塞 run() 的局限）
- Source: `raw/sources/ai/2026-10-26-agent-context-tutorial.md`（通俗印证：Agent = while 循环；可交互教程资源）
- Source: `raw/sources/ai/2026-10-27-harness-engineering-11-agents-study.md`（印证：Agent ≈ Model + Harness；极简循环 vs 生产复杂度）
- Source: `raw/sources/ai/2026-10-28-agent-minimal-handwritten.md`（教学实现：tool_calls 终止判定、MAX_ITERATIONS 熔断、reasoning_content 回传、四类错误回喂）
- Source: `raw/sources/ai/2026-10-28-agent-classic-agent-theory.md`（理论溯源：AIMA 五类 Agent、PMTA 框架）
- Source: `raw/sources/ai/2026-10-28-agent-llm-call-patterns.md`（协议层印证：finish_reason 续轮判据、tool_call_id 配对回填）

## Related Knowledge（相关知识）

- [[learn-pi-agent-01-llm-to-agent|Learn Pi Agent 01｜大模型如何一步步变成 Agent]]
- [[agent-loop-production-boundaries|从 Chatbot 到 AI Agent：为什么一个 while 循环撑不起生产系统]]
- [[agent-2026-midyear-architecture-review|2026 Agent 年中总结（信源页）]]
- [[pi|Pi]]（其三包结构 pi-ai / pi-agent-core / pi-coding-agent 是本概念的工程实现）
- [[agent-minimal-handwritten|Agent - 手写最小 agent（7）（信源页）]]（最小可运行实现）
- [[tool-schema-as-prompt|Tool Schema as Prompt]]
- [[llm-call-protocol|OpenAI 兼容 Chat Completions 调用协议]]
- [[aima-agent-taxonomy|AIMA Agent 分类]]
- [[pmta-framework|PMTA 框架]]
