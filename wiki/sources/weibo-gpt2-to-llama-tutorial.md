---
id: wiki-source-weibo-gpt2-to-llama-tutorial
type: source
title: 从零手写大模型进阶教程：从 GPT-2 到 LLaMA 的 4 个关键零件
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - ai
  - llm
  - tutorial
  - resource
sources:
  - raw/sources/ai/2026-10-22-weibo-gpt2-to-llama-tutorial.md
related:
  - wiki/sources/llm-from-scratch-primer.md
---
# 从零手写大模型进阶教程：从 GPT-2 到 LLaMA 的 4 个关键零件

## Overview（概览）

微博博主「蚁工厂」推荐纳米AI（nano-ai.tech）的免费教程《从 GPT-2 到 LLaMA》：回答"2019 年的 GPT-2 与今天的 LLaMA/Qwen/DeepSeek 到底差在哪"。结论是骨架仍是 Transformer，真正演进的是 4 个关键零件。

## Key Facts（关键事实）

- 教程定位：承接"从零手写 GPT-2"，拆解 GPT-2→LLaMA 的 4 年演进，解释现代开源大模型为何长这样。
- 4 个关键零件：**RMSNorm**（归一化简化）、**SwiGLU**（FFN 升级）、**RoPE**（旋转位置编码）、**GQA**（分组查询注意力）；第 5 篇组装完整 LLaMA。
- 教学法：同一小例子「猫吃鱼」贯穿全部 5 篇，数字小到可手算，配套代码可直接运行。
- 地址：https://nano-ai.tech/series/gpt2-to-llama/ （作者另有"从零手写大模型"前置系列）。

## Important Claims（重要论断）

### Claim 1：GPT-2 到 LLaMA 的演进是 4 个零件的替换，骨架未变

Transformer 骨架不动，演进发生在归一化/FFN/位置编码/注意力四个点上（教程主张，与主流技术共识一致）。

## Concepts Introduced（引入的概念）

（无——RMSNorm/SwiGLU/RoPE/GQA 为业界既有组件，教程推荐文未立新页）

## Entities Mentioned（提及的实体）

- 纳米AI（nano-ai.tech，教程站点，单一信源不立页）、LLaMA/Qwen/DeepSeek（提及）

## Implications（影响／启示）

- "4 个零件"清单可作为阅读现代开源模型代码的导读地图（解读）。

## Limitations（局限）

- 教程推荐文，未核验教程内容质量；链接有效性随时间变化。

## Related Knowledge（相关知识）

- [[llm-from-scratch-primer|三万字大模型从零入门（信源页）]]（前置基础读物）

## Source（信源）

- `raw/sources/ai/2026-10-22-weibo-gpt2-to-llama-tutorial.md`
