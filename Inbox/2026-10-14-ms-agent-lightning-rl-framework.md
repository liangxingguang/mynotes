---
id: 2026-10-14-ms-agent-lightning-rl-framework
title: 微软开源 Agent Lightning：3500 行强化学习框架，让 Agent 在真实工具链里自己练级
source: 知乎想法
source_url: https://www.zhihu.com/pin/2083978910019204286
source_type: post
platform: 知乎
created: 2026-10-14
category: 技术
tags: [AI, 工程实践]
wiki_status: pending
---

# 微软开源 Agent Lightning：3500 行强化学习框架，让 Agent 在真实工具链里自己练级

> 知乎想法推荐微软研究院开源的轻量级 RL 框架 Agent Lightning（约 3500 行），专门训练 AI Agent：不在模拟器里"打游戏"，而是让 Agent 直接在真实工具链、代码环境、浏览器中执行，用真实交互数据训练。现有 LangChain/AutoGen/手写 Agent 代码零改动接入，核心仅 Trainer、API Gateway、Rollout Controller 三组件；官方 Coding Agent 案例用 6K 样本训练 Qwen3.5-9B，SWE-bench Verified 从 41.8% 升到 56.4%（+14.6pp）。

## 核心要点

- **定位**：微软研究院开源的轻量级强化学习框架，用真实环境交互数据训练 Agent，而非模拟环境
- **三个核心组件**：Trainer、API Gateway、Rollout Controller，全框架约 3500 行
- **零改造接入**：LangChain、AutoGen 或手写的现有 Agent 代码无需修改
- **训练效果**：6K 样本训练 Qwen3.5-9B 跑通端到端 Coding Agent 流程，SWE-bench Verified 41.8%→56.4%
- **趋势判断**：Agent 训练正从"造更好的模拟器"转向"在真实世界里训练"

## 正文

知乎想法转载/推荐，原文为知乎专栏长文（知乎反爬未抓取，数字与说法均来自该想法，未独立核实，落地前建议查阅项目仓库核对 SWE-bench 数据）。

## 来源

- 知乎想法：https://www.zhihu.com/pin/2083978910019204286
- 关联专栏原文：https://zhuanlan.zhihu.com/p/2083976916214740856

## 附件

无
