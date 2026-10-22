---
id: wiki-source-llm-from-scratch-primer
type: source
title: 三万字长文：大语言模型从零入门
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - ai
  - llm
  - 教程
sources:
  - raw/sources/ai/2026-10-14-llm-from-scratch-primer.md
---
# 三万字长文：大语言模型从零入门

## Overview（概览）

面向零基础读者的 LLM 系统教程（作者 flyflywang，微信公众号，全文近 3 万字、44 篇参考文献），以「预测下一个 token」一条主线串起信息论、神经网络、Transformer、后训练与模型局限，只用加减乘除和对数并配手算例子。核心结论：把预测下一个 token 做到极致就是在通过图灵测试；模型的能力与幻觉等局限同源于这一目标。

## Key Facts（关键事实）

- 语言模型定义：给定前文、输出下一个 token 概率分布的程序；逐 token 自回归生成，已写出的 token 不可撤回。
- 信息量 I(x)=−log₂p(x)；交叉熵 H(p,q)=−Σp(x)log₂q(x) 永不低于熵，是训练损失函数；自然语言交叉熵存在不可约下限约 1.69 nat ≈ 2.4 bit/token（Chinchilla 拟合）。
- 香农 1951 年估算英文每字符熵 0.6～1.3 bit；模型在真实文本上的交叉熵是语言熵的上界。
- GPT-3：96 层、d=12288、每层约 12d² 参数（注意力 4d² + 前馈 8d²），合计约 1746 亿，与公布的 1750 亿基本一致；训练计算量 ≈6ND ≈ 3.14×10²³。
- 规模定律（Kaplan 2020）：单项扩大 10 倍，交叉熵约剩 84%（参数）/80%（数据）/89%（算力最优分配）；Chinchilla：每参数约配 20 训练 token，700 亿参数+1.4 万亿 token 超过 2800 亿的 Gopher；Llama 3 8B 读了约 15 万亿 token。
- 后训练：InstructGPT SFT 仅用约 1.3 万条提示；LIMA 用 1000 条示范让 650 亿基座获得不错对话能力；标注员更偏好 13 亿参数的 InstructGPT 而非 1750 亿的 GPT-3。
- DeepSeek-R1-Zero：纯可验证奖励强化学习，AIME 2024 正确率 15.6%→71.0%，自发涌现检查与回溯行为。
- 幻觉研究：训练数据中 20% 只出现一次的事实，基座模型预期至少约 20% 答错（Kalai et al. 2025）。

## Important Claims（重要论断）

### Claim 1：极致的下一 token 预测 = 通过图灵测试

模型从海量人类文字学「人接下来会写什么」，分布与人一致时文字不可分辨；要预测得准就必须掌握知识、推理与常识——「预测」这个简单目标逼着模型学会文字背后的东西。

### Claim 2：压缩与泛化同源

发现可复用规律同时带来压缩能力（最小描述长度）与解决新题的能力；判断学会与否要看没见过的文本（验证集），而非训练分数。

### Claim 3：能力与局限同根

幻觉的四个根源全部由「预测下一个 token」推出：目标是「像」不是「真」、零散事实无规律可压缩、评测奖励猜测、写出的字收不回；越具体的人名/数字/引用越易错。

### Claim 4：后训练与规模同等重要

就「好不好用」而言，后训练可能和模型规模一样重要（13 亿 InstructGPT 受偏好于 1750 亿 GPT-3）。

## Concepts Introduced（引入的概念）

- [[next-token-prediction|下一 token 预测]]

## Entities Mentioned（提及的实体）

- GPT-3 / InstructGPT（OpenAI）、DeepSeek-R1 / R1-Zero（DeepSeek）、Llama 3（Meta）、Chinchilla / Gopher（DeepMind）、AlphaGo Zero——均为文中引用对象，本库暂无独立实体页。

## Implications（影响／启示）

- 为库中 Agent 主题提供底层地基：工具调用、联网、代码执行都是「模型写结构化文本→外部执行→结果拼回上下文」的同一路数，[[agent-loop|Agent Loop]] 是这个循环的工程化。
- 采样（Top-k/Top-p/温度）只能模型概率内选择，救不回错误的概率表——工程上控幻觉要靠提供资料、允许说不知道、多方核实，而非调采样参数。

## Limitations（局限）

- 教学性二次信源：数字均转引自一手论文（文后附 44 篇参考文献），个别转述可能简化；「压缩即智能」被作者自己标注为「有启发的研究视角，而非已证明的定理」。
- 三个开放问题无定论：当前架构是否最优、能否脱离人类语言数据获得智能、大模型有无自我意识。

## Related Knowledge（相关知识）

- [[next-token-prediction|下一 token 预测]]
- [[agent-loop|Agent Loop]]
- [[learn-pi-agent-01-llm-to-agent|Learn Pi Agent 01｜大模型如何一步步变成 Agent]]

## Source（信源）

- `raw/sources/ai/2026-10-14-llm-from-scratch-primer.md`
