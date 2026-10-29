---
id: 2026-10-29-google-prompt-engineering-whitepaper
title: Google 官方提示工程白皮书（Prompt Engineering，宝玉译）
source: IM 附件（飞书）
source_url: IM 附件（原件已归档，译文来源 baoyu.io）
source_type: 文档
platform: 飞书
created: 2026-10-29
category: 学习
tags: [AI, 课程, 工程实践]
asset_ref: Assets/2026/10/9ed65982-d90c-4a44-bf08-403c8e02281d_google_________prompt_engineering____-baoyu.io__1_-pdf.md
wiki_status: pending
---

# Google 官方提示工程白皮书（Prompt Engineering，宝玉译）

> Google 官方白皮书（Lee Boonstra，2024 年 9 月，宝玉翻译），系统讲解 LLM 输出配置（温度/Top-K/Top-P/令牌长度）与 11 种提示技巧——零样本、少样本、系统/角色/上下文提示、回退、思维链、自我一致性、思维树、ReAct、自动提示工程，并以代码提示四场景和一批最佳实践收尾，是提示工程的入门到进阶教材。

## 核心要点

- **输出配置**：温度控制随机性（0=贪婪解码，数学/事实任务用 0；创意任务可试 0.9）；Top-K 限候选数量、Top-P 限累积概率；极端设置会使其他参数失效（温度 0 或 Top-K 1 时其余无效）。推荐起点：温度 0.2 / Top-P 0.95 / Top-K 30
- **令牌上限是强制截断**，不会让输出更简洁；简洁要靠提示指令本身
- **技巧梯度**：零样本 → 少样本（一般 3~5 个示例，分类任务要混合类别防过拟合顺序）→ 系统/角色/上下文提示分层控制（定任务/定人设/定情境）→ 回退提示（先抽象原则再具体任务）→ 思维链 CoT（"一步一步思考"，温度设 0，答案放推理之后）→ 自我一致性（多路径采样+多数投票，以成本换鲁棒性）→ 思维树 ToT（分支探索、可回溯）→ ReAct（推理+行动循环，调用外部工具，智能体雏形）→ APE（用 LLM 自动生成并评估提示）
- **代码提示四场景**：编写、解释、翻译、调试审查；调试时把错误回溯连同代码一起给模型效果最好
- **最佳实践核心**：提供示例最重要；简洁设计；明确输出要求（长度/风格/焦点）；用指令而非约束（正向描述该做什么）；用变量复用提示；非创意任务用 JSON 等结构化输出抑制幻觉；用表格记录每次提示尝试（名称/目标/模型/温度/Top-K/Top-P/输出），适应模型版本更新持续迭代

## 正文

全文约 4.7 万字符，完整转换稿见附件 [[Assets/2026/10/9ed65982-d90c-4a44-bf08-403c8e02281d_google_________prompt_engineering____-baoyu.io__1_-pdf.md]]，含全部示例表格（电影评论分类、披萨订单 JSON、旅行指南角色、游戏关卡回退、Metallica ReAct 等）、Bash/Python 代码示例与提示记录模板。

## 来源

IM 附件（Google 官方白皮书中文译版，译者：宝玉 https://baoyu.io；原始 PDF 出处 gptaiflow.tech）

## 附件

- [[Assets/2026/10/9ed65982-d90c-4a44-bf08-403c8e02281d_google_________prompt_engineering____-baoyu.io__1_-pdf.md]]（PDF 转换稿）
- 原始文档：Assets/2026/10/9ed65982-d90c-4a44-bf08-403c8e02281d_Google_________Prompt_Engineering____-baoyu.io__1_.pdf
