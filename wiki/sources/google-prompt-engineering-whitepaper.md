---
id: wiki-source-google-prompt-engineering-whitepaper
type: source
title: Google 官方提示工程白皮书（Prompt Engineering，宝玉译）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - source
  - ai
  - prompt-engineering
  - google
sources:
  - raw/sources/ai/2026-10-28-google-prompt-engineering-whitepaper.md
related:
  - wiki/concepts/prompt-engineering.md
  - wiki/concepts/thinking-mode.md
  - wiki/concepts/next-token-prediction.md
---
# Google 官方提示工程白皮书（Prompt Engineering，宝玉译）

## Overview（概览）

Google 官方白皮书（Lee Boonstra，2024 年 9 月，宝玉翻译），系统讲解 LLM 输出配置（温度/Top-K/Top-P/令牌长度）与 11 种提示技巧——零样本、少样本、系统/角色/上下文提示、回退、思维链、自我一致性、思维树、ReAct、自动提示工程，并以代码提示四场景和一批最佳实践收尾。是提示工程的入门到进阶教材，覆盖从基础配置到高级推理技术的完整梯度。

## Key Facts（关键事实）

- **输出配置**：温度控制随机性（0=贪婪解码，数学/事实任务用 0；创意任务可试 0.9）；Top-K 限候选数量、Top-P 限累积概率；极端设置会使其他参数失效（温度 0 或 Top-K 1 时其余无效）。推荐起点：温度 0.2 / Top-P 0.95 / Top-K 30。
- **令牌上限是强制截断**，不会让输出更简洁；简洁要靠提示指令本身。
- **技巧梯度**：零样本 → 少样本（一般 3~5 个示例，分类任务要混合类别防过拟合顺序）→ 系统/角色/上下文提示分层控制（定任务/定人设/定情境）→ 回退提示（先抽象原则再具体任务）→ 思维链 CoT（"一步一步思考"，温度设 0，答案放推理之后）→ 自我一致性（多路径采样+多数投票，以成本换鲁棒性）→ 思维树 ToT（分支探索、可回溯）→ ReAct（推理+行动循环，调用外部工具，智能体雏形）→ APE（用 LLM 自动生成并评估提示）。
- **代码提示四场景**：编写、解释、翻译、调试审查；调试时把错误回溯连同代码一起给模型效果最好。
- **最佳实践核心**：提供示例最重要；简洁设计；明确输出要求（长度/风格/焦点）；用指令而非约束（正向描述该做什么）；用变量复用提示；非创意任务用 JSON 等结构化输出抑制幻觉；用表格记录每次提示尝试（名称/目标/模型/温度/Top-K/Top-P/输出），适应模型版本更新持续迭代。

## Important Claims（重要论断）

### Claim 1：提示工程是"设计—优化—评估—调试"的系统过程，不是简单写作

白皮书将"工程"一词用于提示创建，强调它涉及"设计"、"优化"、"评估"和"调试"的系统过程。这不仅仅是写作，更是一个针对需求进行系统性改进的过程，类似于传统工程学科。提示有效性受模型选择、训练数据、配置、措辞、风格语调、结构、上下文等多因素影响。

### Claim 2：输出配置参数相互影响，极端设置会覆盖其他参数

温度、Top-K、Top-P 并非独立运作。温度设为 0 时 Top-K 和 Top-P 变得无关紧要；Top-K 设为 1 时温度和 Top-P 变得无关紧要；Top-P 设为 0 时同理。有效的配置需要全局视角，不能孤立调整单个参数。

### Claim 3：提供示例是最重要的最佳实践

白皮书明确称"提供示例"为"最重要的最佳实践"，因为它充当了强大的教学工具，展示了期望的输出或模式，使模型能够从中学习并调整生成。这与少样本提示的有效性一脉相承。

## Concepts Introduced（引入的概念）

- [[prompt-engineering|提示工程（Prompt Engineering）]]：核心概念页，涵盖输出配置、11 种技巧梯度与最佳实践。

## Entities Mentioned（提及的实体）

- Lee Boonstra（Google，白皮书作者）
- 宝玉（baoyu.io，中文译者）
- Gemini / Vertex AI（Google 模型与平台）
- LangChain（ReAct 示例中使用的框架）

## Implications（影响／启示）

本白皮书是提示工程领域最系统、最完整的入门到进阶教材之一。它的价值在于：(1) 给出了输出配置参数的相互作用规则和推荐起点，减少了试错成本；(2) 将 11 种技巧组织为清晰的梯度（从零样本到 APE），便于按需选用；(3) 强调"提供示例"和"记录提示尝试"的工程纪律，把提示创建从"凭感觉"提升为"可复现、可迭代"的工程实践。对 LLM 应用开发者的日常提示编写有直接指导意义。

## Limitations（局限）

- 白皮书为 Google 官方出品，视角偏向 Gemini/Vertex AI 生态；部分配置行为（如温度与 softmax 的关系）以 Gemini 为例，其他模型可能不同。
- 中文译文为宝玉个人翻译，非 Google 官方中文版，术语可能存在偏差。
- 白皮书发布于 2024 年 9 月，未覆盖此后出现的新技术（如长上下文窗口、多模态提示的深化等）。

## Related Knowledge（相关知识）

- [[prompt-engineering|提示工程（Prompt Engineering）]]（核心概念页）
- [[thinking-mode|Thinking Mode]]（推理模式，与 CoT/ToT/ReAct 的关系）
- [[next-token-prediction|Next-Token Prediction]]（LLM 预测引擎原理，提示工程的基础）
- [[agent-loop|Agent Loop]]（ReAct 是 agent loop 的雏形）

## Source（信源）

- `raw/sources/ai/2026-10-28-google-prompt-engineering-whitepaper.md`
