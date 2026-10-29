---
id: 2026-10-28-agent-llm-call-patterns
title: Agent - 调用 LLM 的三种姿势（6）
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2095551564815644272
source_type: link
platform: zhihu
created: 2026-10-28
category: 技术
tags: [AI, Harness, 工程实践]
asset_ref: Assets/2026/10/agent-llm-call-patterns.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-29T10:20:27.968Z"
ingest_claim_id: 50280-1793269227968-0
---

# Agent - 调用 LLM 的三种姿势（6）

> Agent 系列第 6 篇：把"调用 LLM"摊开看全貌——直连 REST / 官方 SDK / agent SDK 三种姿势最终发出同一份 wire JSON，逐字节解剖请求响应，外加三种姿势共享的工程四件套。

## 核心要点

- **三种姿势是同一协议的三层观察高度**：① 直连 REST 是真实协议，② 官方 SDK 是标准包装，③ agent SDK 再包一层 harness（messages 和 loop 都被接管）；看懂①②③皆可解释。
- **请求解剖**：OpenAI 兼容端点 `/chat/completions`；messages 是 agent 的全部状态；tools 只是"说明书"，模型只产出调用意图，执行永远在宿主。
- **响应关键字段**：`finish_reason: tool_calls` 是循环判定的结构化信号；`tool_calls[].id` 是回填配对的身份证；`arguments` 是 JSON 字符串需自行 loads；tool_calls 是数组支持并行调用；`reasoning_content` 带 tools 时必须完整回传否则 400。
- **工程四件套**：API key 走环境变量不进 git；超时与重试显式收窄 SDK 默认值；流式 vs 非流式的选择；消息四角色与 `tool_call_id` 关联机制。
- **实践验证**：裸 HTTP 与 openai SDK 各触发一次 tool call 并排对比，证明"SDK 只是协议的语法糖"。

## 正文

见 [[Assets/2026/10/agent-llm-call-patterns.md]]（全文约 2.8 万字符，含 curl 逐行解剖与对比实验）。

## 来源

- [Agent - 调用 LLM 的三种姿势（6）· 知乎专栏](https://zhuanlan.zhihu.com/p/2095551564815644272)

## 附件

- [[Assets/2026/10/agent-llm-call-patterns.md]]
