---
id: wiki-concept-next-token-prediction
type: concept
title: 下一 token 预测（Next-Token Prediction）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - concept
  - llm
sources:
  - raw/sources/ai/2026-10-14-llm-from-scratch-primer.md
related:
  - wiki/concepts/agent-loop.md
---
# 下一 token 预测（Next-Token Prediction）

## Definition（定义）

语言模型是一个「给定前文、输出下一个 token 概率分布」的程序；生成时从分布中选一个 token 接到前文，再预测下一个，循环往复（自回归生成）。训练与推理的一切——损失函数、架构、能力边界与局限——都围绕这一个目标展开。

## Why It Matters（为什么重要）

这是理解 LLM 的统一框架：

- **能力来源**：要预测得准，模型被迫掌握文字背后的知识、推理、常识与意图；把预测做到极致，其文字与人不可分辨，即通过图灵测试。
- **训练目标**：交叉熵 H(p,q) 衡量模型分布与真实分布的差距，永不低于语言自身的熵；训练就是在海量文本上降低交叉熵。
- **局限根源**：幻觉、迎合、不可撤回等主要局限都能从这一目标推出（见 Distinctions）。

## Core Characteristics（核心特征）

1. **逐 token 自回归**：每次只预测一个 token，自己的输出成为下一步输入；已写出的 token 不可撤回，早期错误只能圆场。
2. **交叉熵即损失**：在真实文本每个位置取 −log₂q(真实 token) 的平均，无需知道真实概率；Softmax+交叉熵的梯度恰为「预测概率 − 答案」——实际出现的 token 被上拉，其余被下压。
3. **损失有不可约下限**：自然语言的熵（Chinchilla 拟合约 1.69 nat ≈ 2.4 bit/token）；交叉熵随参数/数据/算力按幂律逼近该下限（单项 ×10，损失约剩 80%–89%）。
4. **压缩与泛化同源**：找到可复用规律同时获得压缩能力与新样本泛化能力；判断是否学会要看未见过文本上的表现。
5. **采样只在模型概率内选择**：贪心/Top-k/Top-p/温度只决定怎么挑，概率表本身错了救不回来。

## Structure（结构）

从概率表到聊天助手的训练管线（后训练四步）：

1. **预训练**：数万亿 token 普通文本 → 基座模型，只会续写；
2. **监督微调（SFT）**：带特殊标记的「指令+优质回答」示范，只对助手部分算损失；质量 > 数量（InstructGPT 约 1.3 万条、LIMA 仅 1000 条）；
3. **偏好对齐（RLHF / DPO）**：RLHF = 收集比较 → 训奖励模型 → 强化学习，须约束奖励投机；DPO 跳过奖励模型直接用偏好对；
4. **推理强化学习**：数学/代码等可自动判对错的任务只给对错奖励（DeepSeek-R1-Zero：AIME 2024 正确率 15.6%→71.0%，自发涌现长思考）。

## How It Works（运作方式）

- **前向**：token 编号 → 嵌入向量 → N 个 Transformer 块（注意力按 QKV 有选择地收集前文 + 前馈网络各自加工，Pre-Norm + 残差）→ 最后位置向量映射为各 token 分数 → Softmax 得概率分布。
- **训练**：因果掩码让一段文本的每个位置同时预测自己的下一个 token 且互不偷看，一段 1000 token 文本一次提供约 1000 道训练题；梯度下降 + 反向传播在海量文本上降交叉熵；所有句子共用一套参数，只有对大量句子都有用的内部计算方式才被保留强化。
- **生成控制**：温度 = 分数除以 T 再 Softmax（低温保守、高温多样）；Top-p 按累计概率动态截断长尾；遇结束 token 或长度上限停止。
- **扩展边界**：工具调用/联网/代码执行都是同一套路——模型写结构化调用文本 → 停下 → 外部执行 → 结果拼回上下文；图片切块编码成 token 与文本同列。对模型而言一切皆 token。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-loop|Agent Loop]]：把「模型写工具调用 → 外部执行 → 结果拼回 → 再预测」的多轮循环工程化，正是本概念在 Agent 场景的延伸（信源：「平时说的 Agent，就是让这个循环自动跑很多轮」）。

### Dependencies（依赖项）

- Transformer 架构（注意力 + 前馈 + 残差 + 归一化）——当前主流实现载体，本库暂无独立页面。
- token 化与嵌入表——文本与模型之间的接口；token 化也是数字母、算术出错的根源。

### Distinctions（区分）

- 与 n-gram 统计语言模型的不同：统计表只会死记、没见过的前文无法处理；神经网络经嵌入空间把规律迁移到没见过的前文。
- 「像」与「真」的区分（幻觉四根源）：① 训练目标是像人写的文本而非事实为真；② 零散事实无规律可压缩、记不牢（训练数据中 20% 仅出现一次的事实预期至少约 20% 答错）；③ 评测奖励猜测而非承认不知道；④ 写出的 token 不可撤回。

## Evolution（演进）

（当前仅单一教学信源，待后续信源补充。）

## Open Questions（开放问题）

- 当前架构是最优的吗？（人脑无反向传播、儿童到十几岁接触词不到 1 亿个 vs 模型读十几万亿 token）
- 不靠人类语言数据能达到同样智力吗？（AlphaGo Zero 式自我对弈在语言领域由谁当裁判？）
- 大模型有自我意识吗？（信源留作读者思考，无定论）

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-llm-from-scratch-primer.md`（教学性二次信源，关键数字均标注一手论文出处：Kaplan 2020 规模定律、Hoffmann 2022 Chinchilla、Ouyang 2022 InstructGPT、Zhou 2023 LIMA、DeepSeek-AI 2025 R1、Kalai et al. 2025 幻觉）

## Related Knowledge（相关知识）

- [[llm-from-scratch-primer|三万字长文：大语言模型从零入门]]
- [[learn-pi-agent-01-llm-to-agent|Learn Pi Agent 01｜大模型如何一步步变成 Agent]]
