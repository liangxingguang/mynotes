---
id: 2026-11-03-harvard-cs2680-agent-to-gpu
title: 哈佛新课 CS2680：从 Agent 一路拆到 GPU
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/wRhw_hgSVCTR7YBXRp8eqw
source_type: article
platform: 微信公众号
created: 2026-11-03
category: 学习
tags: [课程, AI]
asset_ref: Assets/2026-11-03/weixin-article-wrhh.md
wiki_status: pending
---

# 哈佛新课 CS2680：从 Agent 一路拆到 GPU

> 摘要：哈佛 2026 秋季新课 CS2680《Modern AI Systems: Agents and System Optimizations》由 Juncheng Yang 主讲，围绕同一个 Agent 系统从应用层 Agent Loop 一路拆到推理服务与 GPU；5 个递进作业（Mads 系列）+ 期末项目，附 Agent/AI Infra 论文地图式阅读清单，课程主页资源值得收藏。

## 核心要点

1. 课程定位：只跟一个 Agent 系统走，从应用层 Agent Loop 拆到推理服务和 GPU
2. 第一部分 LLM 与 Agent：Claude Code 原理、多 Agent 协作、上下文管理与工具设计、记忆与可靠性、Agent 评测、成本性能权衡
3. 第二部分系统层：批处理与调度、KV Cache 与前缀复用、路由与负载均衡、剪枝与量化、speculative decoding、GPU 与 kernel
4. 5 个作业围绕同一系统 Mads：Lens（观察）→ Loop（搭 Agent Loop）→ Opt（token 性价比）→ Serve（GPU 部署开源模型）→ Stack（端到端优化）
5. 无考试，期末项目；加分项：每提交一个"当前 AI 解决不了的问题"加 2 分
6. 嘉宾来自 Snowflake、Meta；阅读清单从 ReAct/MemGPT 到 vLLM/SGLang/EAGLE/GPTQ/AWQ，堪称 Agent + AI Infra 论文地图
7. 门槛不低：CS61 + 研究生级系统课，熟悉 Python/PyTorch；80 人已满，旁听无算力
8. 课程主页（cs2680.seas.harvard.edu）的大纲、幻灯片、阅读清单对非哈佛用户也有收藏价值

## 正文

哈佛今年秋季开设 CS2680《Modern AI Systems: Agents and System Optimizations》，由 Juncheng Yang 主讲，哈佛 MaDSys（Measurement and Design of Systems）研究组支持。设计思路：从头到尾只跟着一个 Agent 系统走，从应用层的 Agent Loop 一路往下，拆到推理服务和 GPU。

**课程结构**：
- 第一部分（LLM 与 Agent）：先学会用 Claude Code，理解其工作原理与多 Agent 协作；再讲上下文管理与工具设计、多 Agent 架构、记忆与可靠性、Agent 评测，以及成本与性能权衡。
- 第二部分（支撑 Agent 的系统）：批处理与调度、KV Cache 与前缀复用、路由与负载均衡、剪枝与量化、speculative decoding，最后落到 GPU 和 kernel。

**作业设计（5 个作业均围绕同一系统，统称 Mads：Modern Agent Design and Systems）**：
1. Mads-Lens：观察一个 Agent 怎么干活
2. Mads-Loop：自己搭出 Agent Loop
3. Mads-Opt：让每个 token 都物有所值
4. Mads-Serve：接管推理引擎，在课程提供的 GPU 上自己部署开源权重模型
5. Mads-Stack：对整条技术栈做端到端优化

作业之外有期末项目，没有考试。加分项：每提交一个「当前 AI 解决不了的问题」加 2 分。授课嘉宾来自 Snowflake 和 Meta；阅读清单从 ReAct、MemGPT 到 vLLM、SGLang、EAGLE、GPTQ、AWQ，基本可当作 Agent 和 AI Infra 的论文地图。

**门槛提醒**：先修要求 CS61 + 至少一门研究生级系统课，默认熟悉 Python 和 PyTorch；课程不教完作业所需的全部知识，拿 A 需课后大量自学与实验。名额 80 人已满；可旁听但无算力分配。

课程主页：https://cs2680.seas.harvard.edu/（大纲、幻灯片、阅读清单可公开收藏）

## 来源

[哈佛新课 CS2680：从 Agent 一路拆到 GPU - 微信公众号](https://mp.weixin.qq.com/s/wRhw_hgSVCTR7YBXRp8eqw)

## 附件

[[Assets/2026-11-03/weixin-article-wrhh.md]]（抓取正文）
