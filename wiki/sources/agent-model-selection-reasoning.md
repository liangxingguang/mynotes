---
id: wiki-source-agent-model-selection-reasoning
type: source
title: Agent - 模型选型与推理能力（4）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - ai-agent
  - llm-api
  - model-selection
sources:
  - raw/sources/ai/2026-10-28-agent-model-selection-reasoning.md
---
# Agent - 模型选型与推理能力（4）

## Overview（概览）

知乎专栏《Agent》系列第 4 篇：回答 agent loop 里的 `LLM()` 该填什么——「通用 vs 推理」在 2026 年已制度化为同一模型的 thinking 开关；DeepSeek thinking/reasoning_effort 档位与参数坑、带工具的思维链回传规则（不回传直接 400）、prompt 级「规划前置 + 反思收尾」买半个推理，以及国内在线（DeepSeek/通义/智谱）/ 本地（Ollama）/ 私有化（vLLM）落地选型。

## Key Facts（关键事实）

- **「推理」不再是独立模型名**：DeepSeek 现行仅 `deepseek-flash`（V4.1-Flash）与 `deepseek-v4-pro`（V4-Pro-0813）两款，均「支持非思考与思考模式（默认）」；`deepseek-chat`/`deepseek-reasoner` 已于 2026-07-24 停用。Qwen3 系则保持 Instruct/Thinking 两条独立线——两种形态并存（§1.2，2026-10-15 实测官方文档）。
- **判定口诀**：先问「答错代价大不大」，再问「路径是否多步」；两问皆是才开思考。官方档位建议：low 给简单任务、high 给日常 Agent 任务、max 给更复杂场景（§1.3-1.5）。
- **参数坑**（思考模式）：`temperature`/`presence_penalty`/`frequency_penalty` 静默无效；`top_p` 收窄到 0.95–1.0（非思考固定 1.0）；`max_tokens` 默认上限非思考 8K / 思考 64K / effort=max 128K（§1.4）。
- **思维链回传规则**：带 `tools` 的请求，后续所有请求必须完整回传历史 `reasoning_content` 否则 400（即使该轮未实际调工具）；不带 tools 的纯对话无需回传。一行 `messages.append(response.choices[0].message)` 天然正确（§1.6，DeepSeek 思考模式页原文）。
- **成本结构**：思维链按输出价计费，`usage.completion_tokens_details.reasoning_tokens` 单列；DeepSeek 缓存命中价约为未命中 1/50（flash）~1/30（pro），上下文缓存大幅缓解「每轮全量重发」的成本焦虑（§4.2）。
- **国内落地**：全部走 OpenAI 兼容，换供应商 = 改 base_url + key + 模型名三个字符串，但「兼容是子集不是全集」（智谱/Ollama 官方均有类似声明），关键路径要回归；开发期推荐「云上旗舰 + 本地基线（Ollama）」双轨，vLLM 留给私有化（§3）。
- **模型路由** = 按任务特征（难度/风险/预算/时延）把每次调用分配到不同档位/模型，是 utility-based agent 在模型层的形态；最简形态是一张两行规则表（§4.1、§4.4）。

## Important Claims（重要论断）

### 思考模式不是更聪明，是把速度换成思考量

思考档先产出长思维链（`reasoning_content`）再作答：难题上质量更稳，但慢且贵；简单高频任务开它纯浪费。agent loop 默认填非思考档，难题类调用单独切思考档。

### prompt 能买「半个推理」

「规划前置（调工具前先列信息/顺序/停止条件）+ 反思收尾（答复前逐项自查，引用必须原样来自工具结果）」两句 system 指令零模型成本治「抢跑」与「编造结果」；但它是提示词级隐性规划，接不住「计划被工具结果推翻」——那要等显式规划模块（Plan-and-Execute）。三手段是叠加关系而非三选一。

### 模型名是易变接口

「模型名 + base_url + key」要收敛到代码里唯一配置点；概念（非思考=快省、思考=慢强）比名字稳定；接任何供应商前先看官方模型清单与 changelog，不要拿博客旧模型名上线。

## Concepts Introduced（引入的概念）

- [[thinking-mode|思考模式（Thinking Mode）与模型路由]]
- [[llm-call-protocol|OpenAI 兼容 Chat Completions 调用协议]]（reasoning_content 回传规则的协议层落点）

## Entities Mentioned（提及的实体）

- DeepSeek（deepseek-flash / deepseek-v4-pro，OpenAI + Anthropic 双兼容端点）
- 阿里云百炼（通义/Qwen）/ 智谱 GLM（glm-5.3 系列）
- Ollama（本地基线，OpenAI 兼容子集）/ vLLM（私有化推理引擎）

## Implications（影响／启示）

给手写 agent 定下三条默认：循环内普通调用走非思考档；system 放规划+反思指令；可验证难题单独切思考档（最小模型路由）。时延是 agent 体感最被低估的变量——思考期间要配事件流广播「正在思考」而非黑屏。

## Limitations（局限）

作者自注「这篇作用不大，可以忽略」（原文如此）；通义一列因页面动态渲染未能逐字核验，标 `<以官方 docs 为准>`；价格与模型清单为 2026-10-15 快照，随官方调整变动；成本粗算为例量级演示非实测。

## Related Knowledge（相关知识）

- [[thinking-mode|思考模式（Thinking Mode）与模型路由]]
- [[llm-call-protocol|OpenAI 兼容 Chat Completions 调用协议]]
- [[agent-loop|Agent Loop]]
- [[agent-loop-context-management|Agent - agent loop 与上下文管理（系列第 3 篇信源页）]]
- [[agent-llm-call-patterns|Agent - 调用 LLM 的三种姿势（系列第 6 篇信源页）]]

## Source（信源）

- `raw/sources/ai/2026-10-28-agent-model-selection-reasoning.md`
