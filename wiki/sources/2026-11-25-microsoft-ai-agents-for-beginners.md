---
id: wiki-source-2026-11-25-microsoft-ai-agents-for-beginners
type: source
title: 微软开源了一个 AI Agent 学习项目，18 节课从原理讲到实战
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: high
tags:
  - ai
  - agent
  - course
sources:
  - raw/sources/ai/2026-11-25-microsoft-ai-agents-for-beginners.md
related:
  - wiki/concepts/agent-loop.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/context-management.md
  - wiki/concepts/agent-long-term-memory.md
  - wiki/concepts/mcp.md
  - wiki/comparisons/a2a-vs-mcp.md
---
# 微软开源了一个 AI Agent 学习项目，18 节课从原理讲到实战

## Overview（概览）

微信公众号「开源拾遗」栏目对微软 GitHub 开源课程 **AI Agents for Beginners** 的深度解读。该项目截至 2026 年 9 月约 7.6 万 Star，是一套入门课程而非可直接运行的 Agent 应用：18 节课覆盖 Agent 基本概念、设计模式、工具调用、Agentic RAG、多 Agent 协作、MCP/A2A/NLWeb 协议、上下文工程、记忆管理、CUA 与生产部署，每课配文字教程、短视频、Python 代码示例与扩展阅读。正文自 `Assets/2026-11/wechat-puITWgiaibrR2MlhdK_-oA.md` 采集稿逐字收录。本信源以课程大纲为骨架，相关概念已在 Wiki 中有独立概念页，本页只做信源登记与纲领性概述，不重复展开概念。

## Key Facts（关键事实）

- **项目性质**：不是可直接使用的 Agent 应用，而是学习课程；仓库 `github.com/microsoft/ai-agents-for-beginners`，截至 2026-09 约 7.6 万 Star。
- **课程形态**：18 节课，每课含文字教程 + 短视频 + Python 代码示例 + 扩展阅读。
- **Agent 与普通大模型应用的区别**：普通问答把问题与文档一次性交给模型；Agent 任务（如"检查进度→找出延期→查负责人→出报告"）需多步执行、按前一步结果决定下一步，模型参与规划、调用工具、按结果继续、满足条件后结束。
- **是否引入 Agent 的判断**：流程固定、规则明确的业务用确定性工作流更易控；是否引入 Agent 要结合任务复杂度、容错要求与执行成本判断。
- **大纲三段**：基础与模式（1-4）、RAG 与协作（5-9）、完整系统（10-18）。
- **工具调用模式（第 4 课）**：应用提供工具定义，模型决定何时调用与参数，环境执行并返回结果；模型本身不能直接读数据库/调接口/执行本地程序。
- **Agentic RAG（第 5 课）**：模型参与检索决策、可多轮检索，但会增加调用次数与开销，并非所有知识库问答都需要。
- **可信赖 Agent（第 6 课）**：输出质量、执行边界、工具权限、错误处理、人类审核；高风险操作不能因模型认为合理就放行。
- **多 Agent（第 8 课）**：分工、上下文传递、结果合并、错误处理都会影响最终表现，非简单创建角色即可。
- **元认知（第 9 课）**：自我检查可提升质量，但不能替代外部验证与明确完成条件。
- **协议（第 11 课）**：MCP 规范 AI 应用与工具/数据源连接；A2A 关注 Agent 间通信协作；NLWeb 探索自然语言访问网站内容与服务。三者解决不同问题，互补而非同质。
- **上下文工程（第 12 课）**：信息过少不够用、过多扰判断，关键是合适时机提供合适信息。
- **记忆管理（第 13 课）**：区分可靠事实、历史记录与模型推断，避免错误信息长期保留；上下文是当前调用可见信息，记忆是跨步骤/跨轮次/跨会话保留。
- **CUA（第 15 课）**：计算机操作 Agent，界面观察与操作，无 API 时的替代，但界面变化与权限带来风险。
- **保护 Agent（第 18 课）**：明确能访问什么、能执行什么、哪些操作需人工确认。

## Important Claims（重要论断）

### Claim 1：Agent 的门槛不在框架 API，而在工程问题

信源主张：一个能完成实际工作的 Agent，涉及工具接口设计、任务执行流程、上下文管理、异常处理和权限控制等系列工程问题，不只是学会某个框架的 API。框架（如 Microsoft Agent Framework）是实现手段，不是学习 Agent 原理的前提。

### Claim 2：工具调用是 Agent 开发的核心一环

大模型本身不能直接读企业数据库、调内部接口或执行本地程序；需应用提供工具定义，模型决定调用时机与参数，环境执行并返回。这是 Agent 区别于单次模型调用的机制基础。

### Claim 3：可信赖性不能只靠提示词

Agent 获得工具能力后，安全性与可靠性需从输出质量、执行边界、工具权限、错误处理与人类审核多维度保障，高风险操作（删数据、改订单、触发外部操作）不能仅凭模型判断放行。

### Claim 4：协议层互补扩展 Agent 边界

MCP/A2A/NLWeb 解决不同层级问题，帮助 Agent 从封闭应用扩展为能连接不同工具与服务的系统，理解协议是认识 Agent 生态扩展的关键。

## Concepts Introduced（引入的概念）

本信源涉及的概念在 Wiki 中已有独立概念页，按"不重复建概念页"原则，此处仅做映射，不展开：

- **Agent 循环与执行流程** → [[agent-loop]]
- **Agent 工程化（harness）** → [[harness-engineering]]
- **上下文工程** → [[context-management]]
- **Agent 长期记忆** → [[agent-long-term-memory]]
- **MCP 协议** → [[mcp]]；A2A 与 MCP 的关系见 [[a2a-vs-mcp]]
- **Agentic RAG / 多 Agent / 元认知** 等设计模式：信源做了纲领性介绍，暂未单独立概念页，可后续按需从本信源或更专深信源编译。

## Entities Mentioned（涉及实体）

- **Microsoft**：课程出品方，同时提供 Microsoft Agent Framework（第 14 课）。
- **AI Agents for Beginners**：本信源介绍的开源课程项目（`github.com/microsoft/ai-agents-for-beginners`）。
- **MCP（Model Context Protocol）**：AI 应用与工具/数据源连接规范。
- **A2A（Agent2Agent）**：Agent 间通信协作协议。
- **NLWeb**：自然语言访问网站内容与服务的探索方向。
- **CUA（Computer Use Agent）**：通过界面观察与操作计算机的 Agent。

## Implications（启示）

- **学习路径建议**：从工具调用、Agentic RAG、规划模式入手，再逐步深入记忆管理、多 Agent 协作与生产部署——这是信源给出的从大模型应用转向 Agent 工程的递进路线。
- **选型判断前置**：是否引入 Agent 应在任务复杂度、容错要求、执行成本三者权衡后再决定，避免把确定性工作流强行交给 Agent。
- **生产化是独立课题**：原型能运行不等于可投产，稳定性、成本、可观测性、异常恢复、扩展需在设计阶段即纳入，呼应 [[harness-engineering]] 的工程化视角。

## Limitations（局限）

- 本信源是对课程大纲的解读性介绍，未给出每课的技术细节、代码实现或 benchmark 数据，深度内容需回溯课程原始仓库。
- "约 7.6 万 Star"为 2026-09 时点数据，属时效性数据，引用时注意时点。
- 信源未对 MCP/A2A/NLWeb 做协议层技术细节展开，协议机制需结合 [[mcp]] 与 [[a2a-vs-mcp]] 等页面。
- 采集稿为公众号图文正文，无配图（原文未含可文字化图表），正文完整。

## Related Knowledge（相关知识）

- [[agent-loop]]：Agent 循环与多步执行的机制基础，对应本课程的"规划/工具调用"主线。
- [[harness-engineering]]：Agent 工程化的落地框架，对应第 10、16 课生产部署与可扩展性。
- [[context-management]]：对应第 12 课上下文工程。
- [[agent-long-term-memory]]：对应第 13 课记忆管理。
- [[mcp]] / [[a2a-vs-mcp]]：对应第 11 课协议体系。

## Source（信源）

- 原始信源页：`raw/sources/ai/2026-11-25-microsoft-ai-agents-for-beginners.md`
- 采集稿：`Assets/2026-11/wechat-puITWgiaibrR2MlhdK_-oA.md`
- 原文链接：https://mp.weixin.qq.com/s/puITWgiaibrR2MlhdK_-oA
- 项目地址：https://github.com/microsoft/ai-agents-for-beginners
