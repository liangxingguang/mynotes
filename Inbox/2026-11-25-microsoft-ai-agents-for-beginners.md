---
id: 2026-11-25-microsoft-ai-agents-for-beginners
title: 微软开源了一个 AI Agent 学习项目，18 节课从原理讲到实战
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/puITWgiaibrR2MlhdK_-oA
source_type: article
platform: wechat
created: 2026-11-25
category: 技术
tags: [AI, Agent, 自学]
asset_ref: Assets/2026-11/wechat-puITWgiaibrR2MlhdK_-oA.md
wiki_status: ingesting
ingest_claimed_at: "2026-11-25T10:32:06.267Z"
ingest_claim_id: 7292-1795602726267-0
---

# 微软开源了一个 AI Agent 学习项目，18 节课从原理讲到实战

> 摘要：微软在 GitHub 开源的 AI Agents for Beginners 是一套入门课程（截至 2026 年 9 月约 7.6 万 Star），18 节课覆盖 Agent 基本概念、设计模式、工具调用、RAG、多 Agent 协作、MCP、上下文工程、记忆管理与生产部署，每课配文字教程、短视频与 Python 代码示例，为从大模型应用走向 Agent 系统开发提供清晰路径。

## 核心要点

- **项目定位**：不是可直接使用的 Agent 应用，而是课程：18 节课，每课含文字教程、短视频、Python 代码示例与扩展阅读。仓库：github.com/microsoft/ai-agents-for-beginners。
- **Agent 与普通大模型应用的区别**：普通问答把问题+文档一次性交给模型；Agent 任务（如"检查进度→找出延期→查负责人→出报告"）需多步执行、按前一步结果决定下一步。Agent 让模型参与规划、调用工具、按结果继续、满足条件后结束。流程固定、规则明确的业务用确定性工作流更易控，是否引入 Agent 要结合任务复杂度、容错要求与执行成本判断。
- **课程大纲（18 课）**：
  - 基础与模式（1-4）：Agent 简介与适用场景、开发框架选型、Agent 设计模式、**工具调用模式**（应用提供工具定义，模型决定何时调用与参数，环境执行并返回结果）。
  - RAG 与协作（5-9）：**Agentic RAG**（模型参与检索决策，多轮检索，但会增加调用开销）、构建可信赖 Agent（输出质量、执行边界、工具权限、错误处理、人类审核，高风险操作不能因模型认为合理就放行）、规划模式、多 Agent 模式（分工、上下文传递、结果合并、错误处理）、元认知模式（自我检查，但不能替代外部验证）。
  - 完整系统（10-18）：生产环境 Agent（稳定性、成本、可观测性、异常恢复、扩展）、**Agent 协议 MCP/A2A/NLWeb**、上下文工程（信息过少不够用、过多扰判断，关键是合适时机提供合适信息）、记忆管理（区分可靠事实、历史记录与模型推断，避免错误信息长期保留）、Microsoft Agent Framework（框架是手段不是前提）、计算机操作 Agent CUA（界面观察与操作，无 API 时的替代，但界面变化与权限带来风险）、可扩展部署、本地 Agent、保护 Agent（访问与执行边界、人工确认）。
- **小结**：Agent 开发门槛不只是框架 API，还涉及工具接口设计、执行流程、上下文管理、异常处理与权限控制等工程问题；建议从工具调用、RAG、规划模式入手，再逐步深入记忆、多 Agent 与生产部署。

## 正文

见 `[[Assets/2026-11/wechat-puITWgiaibrR2MlhdK_-oA]]`（采集全文）。文章来自"开源拾遗"栏目，先讲 Agent 与普通大模型应用的本质区别与引入判断，再逐课介绍 18 节课的内容与学习价值，最后给出从大模型应用转向 Agent 工程的学习路线建议。

## 来源

- [微软开源了一个 AI Agent 学习项目，18 节课从原理讲到实战](https://mp.weixin.qq.com/s/puITWgiaibrR2MlhdK_-oA)
- 项目地址：https://github.com/microsoft/ai-agents-for-beginners

## 附件

- [[Assets/2026-11/wechat-puITWgiaibrR2MlhdK_-oA]]
