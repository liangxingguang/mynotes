---
id: wiki-source-agent-llm-call-patterns
type: source
title: Agent - 调用 LLM 的三种姿势（6）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - ai-agent
  - llm-api
sources:
  - raw/sources/ai/2026-10-28-agent-llm-call-patterns.md
---
# Agent - 调用 LLM 的三种姿势（6）

## Overview（概览）

知乎专栏《Agent》系列第 6 篇：把「调用 LLM」摊开看全貌——直连 REST / 官方 SDK / agent SDK 三种姿势最终发出同一份 wire JSON；逐字节解剖 OpenAI 兼容端点 `/chat/completions` 的请求响应，并给出三种姿势共享的工程四件套（key 管理/超时重试/流式/消息结构）。

## Key Facts（关键事实）

- 三种姿势是同一协议的三层观察高度：① 直连 REST 是真实协议，② 官方 SDK 是标准包装，③ agent SDK 再包一层 harness（messages 和 loop 被接管）；叠层关系而非三套协议（§1、§4）。
- 消息四角色：system / user / assistant（调工具时带 tool_calls、content 为 null）/ tool（带 tool_call_id 配对回填）；每轮全量重发历史（§2.3）。
- `finish_reason` 全集：tool_calls / stop / length / content_filter / insufficient_system_resource / aborted——`tool_calls` 是 agent loop 续轮的结构化判据（§2.2）。
- openai SDK 默认值（README + `_constants.py` 双重核验）：timeout 10 分钟、max_retries 2、重试连接失败/408/409/429/≥500、流式不自动重试；anthropic 包同源（§3.3、§3.5）。
- `stream_options` 必须与 `stream: true` 同设否则 400；`include_usage: true` 时 usage 只在末 chunk（§3.4）。
- Chat Completion API 不支持在历史中间插入模型未生成的 tool call（Anthropic API 与 Responses API 才支持）（§2.3）。
- DeepSeek 提供第二条兼容线：`https://api.deepseek.com/anthropic`（Anthropic 格式 base_url，同一把 key）（§3.5）。

## Important Claims（重要论断）

### SDK 只是协议的语法糖

裸 HTTP 与 openai SDK 各触发同一次 tool call 并排对比：请求体语义完全等价（仅差未设参数不发送的 `stream`）、响应结构零差异——对本地模拟端点实测，真实 DeepSeek 调用字段结构按官方 API Reference 逐字段核验。

### messages 是 agent 的全部状态

tools 只是发给模型的「说明书」，模型只产出调用意图，执行永远在宿主；`tool_calls[].id` 是回填配对的身份证，`arguments` 是 JSON 字符串需自行 `json.loads`。

### 工程四件套纪律

key 只进环境变量/.env 不进 git（进了 git 历史 = 已泄漏，立即吊销重发）；超时显式收窄（agent loop 里 10 分钟默认太宽）、只重试值得重试的（400/401/404 不重试）；agent 场景用非流式、面向用户最终输出才上流式。

## Concepts Introduced（引入的概念）

- [[llm-call-protocol|OpenAI 兼容 Chat Completions 调用协议]]

## Entities Mentioned（提及的实体）

- DeepSeek（OpenAI 兼容端点 `https://api.deepseek.com/chat/completions`；模型 deepseek-flash）
- openai-python / anthropic-sdk-python（官方 SDK，同源代码生成器）
- pydantic-ai / openai-agents（姿势三代表）

## Implications（影响／启示）

确立「学习看协议、日常写 SDK、赶进度用 agent SDK」的分层纪律；`with_raw_response` 是从 SDK 下潜到 wire 层的标准工具；为系列第 7 篇手写最小 agent 备齐协议零件。

## Limitations（局限）

真实 DeepSeek 调用未实测（作者诚实声明，实验对本地模拟端点跑通）；计费字段（prompt_cache_hit_tokens 等）引用系列第 4 篇未展开。

## Related Knowledge（相关知识）

- [[agent-loop|Agent Loop]]（本协议是 Loop 模型调用的载体）

## Source（信源）

- `raw/sources/ai/2026-10-28-agent-llm-call-patterns.md`
