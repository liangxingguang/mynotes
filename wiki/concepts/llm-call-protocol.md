---
id: wiki-concept-llm-call-protocol
type: concept
title: OpenAI 兼容 Chat Completions 调用协议
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - concept
  - ai-agent
  - llm-api
sources:
  - raw/sources/ai/2026-10-28-agent-llm-call-patterns.md
  - raw/sources/ai/2026-10-28-agent-model-selection-reasoning.md
related:
  - wiki/concepts/agent-loop.md
  - wiki/concepts/thinking-mode.md
---
# OpenAI 兼容 Chat Completions 调用协议

## Definition（定义）

OpenAI 兼容供应商在各自 `base_url` 后挂载的同一形状端点 `POST /chat/completions`：请求体含 `model` / `messages` / `tools` / `stream` 等字段，响应 `choices[0].message` + `finish_reason` + `usage`。它是「调用 LLM」三种姿势（直连 REST / 官方 SDK / agent SDK）共同的 wire 层——三姿势最终发出同一份 wire JSON（信源实测：请求体语义等价、响应结构零差异）。

## Why It Matters（为什么重要）

它是 [[agent-loop|Agent Loop]] 与模型之间的实际载体：loop 的续轮判定（`finish_reason: "tool_calls"`）、工具结果回填（`tool_call_id` 配对）、上下文增长（每轮全量重发 messages）都发生在这份 JSON 上。看懂协议层，SDK 与框架层的行为都可解释、可下潜排查（`with_raw_response`）。

## Core Characteristics（核心特征）

1. **messages 即全部状态**：四角色 system / user / assistant（带 tool_calls 时 content 为 null）/ tool（带 `tool_call_id` 配对 `assistant.tool_calls[].id` 回填）；每轮请求全量重发整段历史。
2. **tools 只是说明书**：模型不执行任何东西，只产出调用意图；`tool_calls` 是数组（支持并行多调用），`function.arguments` 是 JSON 字符串需自行 `json.loads`（参数校验的守住位置）。
3. **finish_reason 是结构化判据**：tool_calls=执行工具续轮、stop=收尾、length=警惕截断、content_filter=降级、insufficient_system_resource/aborted=异常路径。
4. **四条协议约束**：id 成对回填；assistant(tool_calls) 与 tool 结果成对裁剪；不支持中途插入模型未生成过的 tool call；思考模式带 tools 必须完整回传历史 `reasoning_content` 否则 400。

## Structure（结构）

调用栈三层（信源 §1、§5）：

| 层 | 看得见 | 看不见 | 适用 |
| --- | --- | --- | --- |
| 直连 REST | 协议全貌（字段/全量重发/错误码原文） | 无（全自管） | 学协议、排查 wire 问题、非 Python 环境 |
| 官方 SDK | messages 与响应对象、参数签名 | HTTP 构造/序列化/重试/连接管理 | 日常开发主力、手写 loop 底座 |
| agent SDK | 任务与工具（业务语言） | messages 数组、loop、Schema 生成 | 吃现成 harness 的产品场景 |

SDK 默认工程行为（openai/anthropic 同源）：timeout 默认 10 分钟（agent loop 里须显式收窄到秒/十秒级）、max_retries 默认 2、自动重试连接失败/408/409/429/≥500（4xx 参数错误不重试）、流式不自动重试（已送达内容不可重放）。

## How It Works（运作方式）

一次 tool call 往返四快照：初始请求（system+user）→ 模型回 assistant+tool_calls（finish_reason=tool_calls）→ 宿主执行后以 role:tool + tool_call_id 回填、全量重发 → 模型收尾（finish_reason=stop）。工程四件套：key 走环境变量/.env 不进 git（泄漏即吊销重发）；超时/重试显式收窄 SDK 默认；非流式用于 loop 内部调用、流式（SSE，`data: [DONE]` 终止）只用于面向用户的最终输出；消息四角色 + tool_call_id 配对。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-loop|Agent Loop]]：本协议是 Loop 模型调用步骤的载体；`finish_reason` 是 Loop 停止信号多源性的协议层来源。

### Dependencies（依赖项）

- 供应商实现（OpenAI / DeepSeek / 其他 OpenAI 兼容端点）；DeepSeek 另提供 Anthropic 格式兼容线 `https://api.deepseek.com/anthropic`。

### Distinctions（区分）

- 与 Anthropic Messages API 的区别（信源 §3.5）：端点 `/v1/messages`、system 为单独参数、工具结果以 user 消息内 `tool_result` 内容块回传、`max_tokens` 必填——「神似形不似」。

## Evolution（演进）

- 2026-10-29 — 新建，信源为知乎《Agent》系列第 6 篇（字段定义与默认值经作者对照官方 API Reference/README/源码核验，真实端点调用未实测）。

- 2026-10-29 — 新增信源 `raw/sources/ai/2026-10-28-agent-model-selection-reasoning.md`（知乎《Agent》系列第 4 篇）。把第四条协议约束（思考模式带 tools 必须完整回传 `reasoning_content`）展开为完整工程规则：DeepSeek 官方页原文"即使该轮未实际调工具也要回传"；思维链按输出价计费、`usage.completion_tokens_details.reasoning_tokens` 单列；思考档 `max_tokens` 默认上限放大到 64K/128K。由此新建概念页 [[thinking-mode|思考模式与模型路由]]。

## Open Questions（开放问题）

- Responses API 与 Chat Completions 的能力差（如中途插入 tool call 的支持）待专门信源补充。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-llm-call-patterns.md`
- Source: `raw/sources/ai/2026-10-28-agent-model-selection-reasoning.md`（协议约束展开：reasoning_content 回传官方规则、reasoning_tokens 计费单列、思考档 max_tokens 默认值）

## Related Knowledge（相关知识）

- [[agent-llm-call-patterns|Agent - 调用 LLM 的三种姿势（6）（信源页）]]
