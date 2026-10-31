---
id: wiki-concept-prompt-engineering
type: concept
title: 提示工程（Prompt Engineering）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - concept
  - ai
  - llm
sources:
  - raw/sources/ai/2026-10-28-google-prompt-engineering-whitepaper.md
related:
  - wiki/concepts/thinking-mode.md
  - wiki/concepts/next-token-prediction.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/tool-schema-as-prompt.md
  - wiki/concepts/prompt-injection.md
---
# 提示工程（Prompt Engineering）

## Definition（定义）

提示工程是设计高质量提示以引导 LLM 产生准确输出的过程。它涉及反复调试以找到最佳提示、优化提示长度、评估提示的写作风格和结构与任务的关系。提示有效性受模型选择、训练数据、模型配置、措辞选择、风格语调、结构以及上下文等多因素影响，是一个迭代的系统过程——"设计—优化—评估—调试"，类似于传统工程学科。

## Why It Matters（为什么重要）

提示工程是 LLM 应用开发的基础设施技能。LLM 是预测引擎，提示是引导预测方向的唯一输入接口。不恰当的提示可能导致模糊、不准确的响应，阻碍模型提供有意义输出的能力。掌握提示工程不仅涉及提示文本本身，还包括操纵模型的生成参数（温度/Top-K/Top-P），这对于需要特定创造性或确定性水平的任务至关重要。

## Core Characteristics（核心特征）

1. **预测引擎导向**：LLM 接收顺序文本作为输入，基于训练数据预测下一个令牌。提示工程是引导预测方向的过程——提示越清晰，LLM 预测下一个可能文本的效果越好。
2. **输出配置是基础设施**：温度控制随机性（0=贪婪解码，事实/数学任务用 0；创意任务可试 0.9），Top-K 限候选数量，Top-P 限累积概率。三者相互影响，极端设置会覆盖其他参数。推荐起点：温度 0.2 / Top-P 0.95 / Top-K 30。
3. **技巧梯度递进**：零样本 → 少样本（3~5 个示例）→ 系统/角色/上下文分层提示 → 回退提示（先抽象再具体）→ 思维链 CoT（温度设 0，答案放推理后）→ 自我一致性（多路径+多数投票）→ 思维树 ToT（分支探索可回溯）→ ReAct（推理+行动循环）→ APE（LLM 自动生成提示）。复杂度递增，按需选用。
4. **示例是最强教学工具**：提供示例（单样本/少样本）被白皮书称为"最重要的最佳实践"。示例展示期望输出，使模型学习模式并调整生成，充当参考点。
5. **工程纪律**：用表格记录每次提示尝试（名称/目标/模型/温度/Top-K/Top-P/输出），适应模型版本更新持续迭代。提示创建从"凭感觉"提升为"可复现、可迭代"的工程实践。

## Structure（结构）

```
提示工程
├── 输出配置（Output Configuration）
│   ├── 温度（Temperature）：0=贪婪解码 → 高=多样化
│   ├── Top-K：候选令牌数量硬限制（K=1 等同贪婪）
│   ├── Top-P：累积概率质量限制（P=0 等同贪婪）
│   └── 令牌上限（max_tokens）：强制截断，不促进简洁
├── 提示技巧（Prompting Techniques）
│   ├── 基础：零样本 → 少样本（1/3-5 个示例）
│   ├── 分层控制：系统提示（定任务）→ 角色提示（定人设）→ 上下文提示（定情境）
│   ├── 推理增强：回退提示 → 思维链 CoT → 自我一致性 → 思维树 ToT
│   ├── 行动增强：ReAct（推理+行动循环，调用外部工具）
│   └── 自动化：APE（用 LLM 生成并评估提示）
└── 最佳实践（Best Practices）
    ├── 提供示例（最重要）
    ├── 简洁设计
    ├── 明确输出要求（长度/风格/焦点）
    ├── 用指令而非约束（正向描述）
    ├── 结构化输出（JSON）抑制幻觉
    ├── 用变量复用提示
    └── 记录提示尝试（表格）
```

## How It Works（运作方式）

**配置参数相互作用**：温度、Top-K、Top-P 同时可用时，先满足 Top-K 和 Top-P 标准的令牌成为候选，再应用温度采样。温度设为 0 或 Top-K 设为 1 会使其他参数失效——这是全局视角配置的基础规则。

**技巧选用决策**：简单任务用零样本；需要格式引导时用少样本；需要精细控制输出风格时分层叠加系统/角色/上下文提示；复杂推理任务用 CoT（温度设 0）；需要多角度探索时用 ToT；需要调用外部工具时用 ReAct；需要规模化提示生成时用 APE。

**代码提示四场景**：编写（直接描述功能）、解释（给代码让模型分析）、翻译（指定目标语言）、调试审查（把错误回溯连同代码一起给模型效果最好）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[next-token-prediction|Next-Token Prediction]]：LLM 预测引擎原理，是提示工程的基础——理解 LLM 如何预测下一个令牌才能设计有效提示
- [[thinking-mode|Thinking Mode]]：推理模式，与 CoT/ToT/ReAct 有紧密关系——CoT 是 Thinking Mode 在提示层的实现，Thinking Mode 是模型层的支持
- [[agent-loop|Agent Loop]]：ReAct 是 agent loop 的雏形——推理+行动循环是 agent 自主决策的核心模式
- [[tool-schema-as-prompt|Tool Schema as Prompt]]：工具描述变 prompt 是提示工程在 agent 工具调用场景的延伸

### Distinctions（区分）

- 与 [[prompt-injection|Prompt Injection]] 的区分：提示工程是主动设计有效提示的技巧，提示注入是恶意利用提示接口的攻击。两者都涉及提示文本，但目的截然相反。
- 与微调（Fine-tuning）的区分：提示工程不修改模型参数，通过输入侧引导输出；微调修改权重，成本更高但效果更持久。提示工程适用于快速迭代和任务探索，微调适用于稳定大规模部署。
- 与一次性提示词的区分：提示工程是系统化、可记录、可迭代的工程实践，不是一次性"试一个 prompt 看看效果"。

## Evolution（演进）

- 2024-09：Google 发布官方提示工程白皮书，系统整理输出配置与 11 种技巧，成为行业基准参考。
- 2025-2026：随着推理模型（o1/o3 等）普及，部分推理增强技巧（CoT/ToT）从提示层下沉到模型层，提示工程重心转向任务描述、输出格式约束与工具编排。
- 当前：提示工程与 agent harness 工程融合——工具 schema 设计、上下文管理、错误回传策略成为提示工程在 agent 场景的延伸。

## Open Questions（开放问题）

- 推理模型时代，哪些提示技巧仍然有效？CoT 在推理模型上是否多余？
- 长上下文窗口是否改变了少样本提示的最佳示例数量？
- 自动提示工程（APE）与模型自优化（如 DSPy）的边界与融合趋势？

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-google-prompt-engineering-whitepaper.md`（Google 官方白皮书，2024 年 9 月，宝玉译，confidence=high）

## Related Knowledge（相关知识）

- [[google-prompt-engineering-whitepaper|Google 官方提示工程白皮书]]
- [[thinking-mode|Thinking Mode]]
- [[next-token-prediction|Next-Token Prediction]]
- [[agent-loop|Agent Loop]]
- [[tool-schema-as-prompt|Tool Schema as Prompt]]
- [[prompt-injection|Prompt Injection]]
