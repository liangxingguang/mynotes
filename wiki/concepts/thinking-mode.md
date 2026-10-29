---
id: wiki-concept-thinking-mode
type: concept
title: 思考模式（Thinking Mode）与模型路由
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - concept
  - ai-agent
  - llm-api
sources:
  - raw/sources/ai/2026-10-28-agent-model-selection-reasoning.md
related:
  - wiki/concepts/llm-call-protocol.md
  - wiki/concepts/agent-loop.md
---
# 思考模式（Thinking Mode）与模型路由

## Definition（定义）

思考模式（thinking mode）是模型在输出正式答案（`content`）之前先输出一段思维链（`reasoning_content`，chain-of-thought）的运行档位（DeepSeek 官方文档表述，信源 §1.1 引用核验）。2026 年的 API 形态里，「通用 vs 推理」已不是两个模型名，而是同一模型上的 thinking 开关两态——本概念页把「推理模型」一律理解为「思考模式开启的那一档」。

## Why It Matters（为什么重要）

思考模式不是「更聪明」，是**把速度换成思考量**：难题上更稳，简单任务上又慢又贵。agent loop 里每一轮都开思考会烧穿预算、拖垮时延（思考档一轮可达数十秒）——它是 loop 里 `LLM()` 填什么的核心决策。

## Core Characteristics（核心特征）

1. **两态对比**：非思考档 = 熟练执行者（张口就答，快、省，适合直接问答/格式转换/单次工具调用）；思考档 = 先打草稿的解题者（多步数学/逻辑/复杂规划/需自查任务更稳，慢且贵）。
2. **判定口诀**：先问「答错代价大不大」，再问「解题路径是否多步」；两问皆是才开思考。
3. **两种产品形态并存**（2026 年现状）：DeepSeek 单模型 thinking 开关 + `reasoning_effort`（none/low/high/max，默认 high）；Qwen3 系保持 Instruct（仅非思考）/ Thinking（仅思考）两条独立线。接入时看官方文档确认面对的是哪一种。
4. **官方档位建议**（DeepSeek V4-Pro 更新公告原文）：low 给简单任务、high 给日常 Agent 任务、max 给更复杂场景。

## Structure（结构）

DeepSeek 思考模式的工程约束（信源 §1.4-1.6，2026-10-15 实测官方文档）：

- **思维链回传规则**：带 `tools` 的请求，后续所有请求必须完整回传历史 `reasoning_content` 否则 API 返回 400（即使该轮未实际调工具）；纯对话无需回传。一行 `messages.append(response.choices[0].message)` 天然正确。
- **参数坑**：`temperature` / `presence_penalty` / `frequency_penalty` 静默无效；`top_p` 收窄到 0.95–1.0（非思考固定 1.0）；`max_tokens` 默认非思考 8K / 思考 64K / effort=max 128K。
- **计费**：思维链按输出价计费，`usage.completion_tokens_details.reasoning_tokens` 单列；难题上思维链常达答案的数倍。
- **上下文缓存缓解**：DeepSeek 缓存命中价约为未命中 1/50（flash），每轮全量重发中不变的前缀按命中价计。

## How It Works（运作方式）

**prompt 买半个推理**（信源 §2）：不换模型不加预算，两句 system 指令——「规划前置」（调任何工具前先列：需要哪些信息/按什么顺序调哪些工具/什么情况停止，结构可被程序校验）+「反思收尾」（答复前逐项自查，引用的 ID/名称必须原样来自工具结果）。治通用模型「抢跑」写操作与编造结果两类低级失误；代价是每轮多上百 token，简单任务别穿盔甲。

**三手段是叠加不是三选一**（信源 §2.3）：prompt 指令（零成本，先加）→ thinking 档（难题单独开）→ 显式规划模块 Plan-and-Execute（计划可校验/可重规划，真正复杂任务才上）。

**模型路由（model routing）**（信源 §4.1）：按任务特征（难度/风险/预算/时延）把每次调用分配到不同档位/模型的机制；是 utility-based agent「多目标权衡」在模型层的形态（效用 = 质量×时延×成本加权）。最简形态是一张两行规则表：循环内普通调用→非思考档，首次规划/失败重试→思考档。

## Relationships（关系）

### Related Concepts（相关概念）

- [[llm-call-protocol|OpenAI 兼容 Chat Completions 调用协议]]：reasoning_content 回传规则是该协议四条约束之一在思考模式下的展开。
- [[agent-loop|Agent Loop]]：思考档放大单轮时延与 token 上限，loop 的预算熔断（最大迭代数）更要设；思考期间配事件流广播「正在思考」防黑屏。

### Distinctions（区分）

- **思考档 vs prompt 级规划**：thinking 的草稿是模型自发的、看得到但控制不了结构；规划前置指令产出的计划是你要求的、有固定结构、可被程序校验。
- **模型路由 vs 单次选档**：选档回答「这一调用开多深」，路由是做出来之后按请求特征自动分发（进阶形态用小模型打分分流）。

## Evolution（演进）

- 2026-10-29 — 新建，信源为知乎《Agent》系列第 4 篇。版本考据：DeepSeek 现行仅 `deepseek-flash` / `deepseek-v4-pro` 两款，`deepseek-chat`/`deepseek-reasoner` 已于 2026-07-24 停用——「模型名是易变接口，概念比名字稳定」。

## Open Questions（开放问题）

- 模型路由的完整实现（预算控制、降级链、路由评测）待该系列 P7·20 信源补充。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-model-selection-reasoning.md`

## Related Knowledge（相关知识）

- [[agent-model-selection-reasoning|Agent - 模型选型与推理能力（4）（信源页）]]
