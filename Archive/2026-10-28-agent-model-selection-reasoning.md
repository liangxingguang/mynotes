---
id: 2026-10-28-agent-model-selection-reasoning
title: Agent - 模型选型与推理能力（4）
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2095469418528651019
source_type: link
platform: zhihu
created: 2026-10-28
category: 技术
tags: [AI, Harness, 工程实践]
asset_ref: Assets/2026/10/agent-model-selection-reasoning.md
wiki_status: ingested
---

# Agent - 模型选型与推理能力（4）

> Agent 系列第 4 篇：agent loop 里的 LLM() 该填什么——"通用 vs 推理"已制度化为同一模型的 thinking 开关，DeepSeek 档位怎么选、带工具的思维链回传规则（不回传直接 400）、提示词买到的"半个推理"，以及国内在线/本地/私有化落地选项。

## 核心要点

- **推理不再是一个模型名**：通用 vs 推理 = 同一模型的 thinking 两态；模型名是易变接口，要收敛到唯一配置点，接供应商前先看官方模型清单与 changelog。
- **判定口诀**：先问"答错代价大不大"，再问"路径是否多步"；两问皆是才开思考——思考模式不是更聪明，是把速度换成思考量。
- **DeepSeek 参数坑**：temperature/penalty 思考模式下静默无效（最阴的 bug）；top_p 收窄到 0.95-1.0；思维链按输出价计费，用 reasoning_tokens 单列监控。
- **思维链回传规则**：带 tools 的请求必须完整回传历史 reasoning_content 否则 400（纯对话则不用传）；一行 `messages.append(msg)` 天然正确。
- **prompt 买半个推理**：规划前置（调工具前先列信息/顺序/停止条件，结构可被程序校验）+ 反思收尾（答复前逐项自查）；通用模型常见毛病是"抢跑"写操作。
- **国内落地**：在线 DeepSeek/通义/智谱 vs 本地 Ollama vs 私有化 vLLM 的取舍与实测对比。
- **伏笔回收**：utility-based ≈ 按效用权衡，模型路由是其模型层对应物（后续篇章落地）。

## 正文

见 [[Assets/2026/10/agent-model-selection-reasoning.md]]（全文约 2 万字符，含参数表、实测脚本与成本对比）。

## 来源

- [Agent - 模型选型与推理能力（4）· 知乎专栏](https://zhuanlan.zhihu.com/p/2095469418528651019)

## 附件

- [[Assets/2026/10/agent-model-selection-reasoning.md]]
