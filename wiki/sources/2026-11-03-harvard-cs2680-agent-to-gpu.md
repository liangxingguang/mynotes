---
id: wiki-source-cs2680-agent-to-gpu
type: source
title: 哈佛新课 CS2680：从 Agent 一路拆到 GPU
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - source
  - ai
  - course
sources:
  - raw/sources/ai/2026-11-03-weixin-cs2680-agent-to-gpu.md
related:
  - wiki/entities/cs2680.md
  - wiki/concepts/agent-loop.md
---
# 哈佛新课 CS2680：从 Agent 一路拆到 GPU

## Overview（概览）

微信公众号文章，介绍哈佛 2026 秋季新课 CS2680《Modern AI Systems: Agents and System Optimizations》（Juncheng Yang 主讲，MaDSys 研究组支持）。设计思路：从头到尾只跟一个 Agent 系统走，从应用层 Agent Loop 一路拆到推理服务和 GPU；5 个递进作业（Mads 系列）+ 期末项目，附 Agent/AI Infra 论文地图式阅读清单。

## Key Facts（关键事实）

- 课程全名：CS2680《Modern AI Systems: Agents and System Optimizations》，2026 秋季开设，主讲 Juncheng Yang，哈佛 MaDSys（Measurement and Design of Systems）研究组支持。
- 第一部分（LLM 与 Agent）：Claude Code 原理、多 Agent 协作、上下文管理与工具设计、多 Agent 架构、记忆与可靠性、Agent 评测、成本与性能权衡。
- 第二部分（支撑 Agent 的系统）：批处理与调度、KV Cache 与前缀复用、路由与负载均衡、剪枝与量化、speculative decoding、GPU 与 kernel。
- 5 个作业围绕同一系统 Mads（Modern Agent Design and Systems）：Lens（观察）→ Loop（搭 Agent Loop）→ Opt（token 性价比）→ Serve（GPU 部署开源权重模型）→ Stack（端到端优化）。
- 无考试，期末项目；加分项：每提交一个"当前 AI 解决不了的问题"加 2 分。
- 授课嘉宾来自 Snowflake、Meta；阅读清单从 ReAct、MemGPT 到 vLLM、SGLang、EAGLE、GPTQ、AWQ。
- 先修要求 CS61 + 至少一门研究生级系统课，默认熟悉 Python/PyTorch；名额 80 人已满，可旁听但无算力分配。
- 课程主页 https://cs2680.seas.harvard.edu/（大纲、幻灯片、阅读清单公开）。

## Important Claims（重要论断）

### Claim 1

一门课从头到尾只跟一个 Agent 系统走，从应用层拆到 GPU，是系统化理解 Agent 全栈的有效教学路径（作者观点，解读）。

## Concepts Introduced（引入的概念）

- [[agent-loop|Agent Loop]]
- [[context-management|上下文管理]]
- [[agent-evaluation|业务 Agent 全生命周期评测]]
- [[speculative-decoding-quality-monitoring|投机采样质量监控]]

## Entities Mentioned（提及的实体）

- [[cs2680|CS2680（哈佛 AI 系统课程）]]
- [[cs329z|CS329Z（斯坦福 AI Agent 课程）]]
- [[learn-harness-engineering-course|Learn Harness Engineering]]

## Implications（影响／启示）

- 对非哈佛用户，课程主页的大纲/幻灯片/阅读清单也值得收藏（作者提示）。
- 阅读清单（ReAct/MemGPT/vLLM/SGLang/EAGLE/GPTQ/AWQ）可当作 Agent + AI Infra 论文地图使用（解读）。

## Limitations（局限）

- 单信源（公众号二手介绍），课程细节以官方主页为准；本文未覆盖作业评分细则与阅读清单全文。

## Related Knowledge（相关知识）

- [[cs329z-chinese-weibo-recommendation|CS329Z 中文翻译稿推荐（信源页）]]
- [[agent-panorama-roadmap|Agent 全景与学习路线地图]]

## Source（信源）

- `raw/sources/ai/2026-11-03-weixin-cs2680-agent-to-gpu.md`
