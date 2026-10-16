---
id: 2026-10-13-a2a-multi-agent-langgraph
title: A2A 实战：从零搭建工业级多 Agent 协作系统
source: 技术自由圈（尼恩）
source_url: https://mp.weixin.qq.com/s/6YKXGTJaZSwHDtQqjv9j-A
source_type: article
platform: 微信公众号
created: 2026-10-13
category: 技术
tags: [AI, 工程实践]
wiki_status: ingested
---

# A2A 实战：从零搭建工业级多 Agent 协作系统

> 尼恩《A2A 学习圣经》第 13 章。讲解 Google 于 2025 年 4 月开源的 A2A（Agent-to-Agent）协议：用标准化 Task 工单、任务状态机和 AgentCard 服务发现解决异构 Agent 互联互通问题，并基于 python-a2a + LangChain + LangGraph 从零实现一个"天气 + 票务"多 Agent 旅行规划系统（总控意图路由、异步并发调度、异常容错），最后辨析 A2A 与 MCP 的互补关系：MCP 让单个 AI 接工具变强，A2A 让多个 AI 组队协作。

## 核心要点

- **A2A 解决的痛点**：单体 Agent 能力局限、异构 Agent 消息格式不通、硬编码难维护、任务黑盒无管控
- **五大设计目标**：标准化、互操作性（跨框架/语言）、去中心化对等通信、AgentCard 服务发现、异步优先（支持长任务与人工介入）
- **核心实体**：Agent / AgentCard（工牌）/ AgentSkill / Task（工单）/ Message / Artifact（成果物）/ TaskState / AgentNetwork（通讯录）
- **任务状态机**：SUBMITTED → WORKING → COMPLETED / FAILED；WORKING 可转 INPUT_REQUIRED，补参后重回 WORKING
- **通信流程**：用户请求 → 总控意图识别匹配专家 → 下发标准 Task → 专家执行并回 Artifact → 总控汇总
- **架构**：去中心化 + 星型拓扑，专家 Agent 独立部署、可单独扩容、故障隔离；目录分 common / agents / orchestrator 三层
- **技术栈**：python-a2a 0.2.8、langchain-openai、LangChain Function Calling、LangGraph（多步工作流）、Pydantic 结构化输出、asyncio 并发
- **实战要点**：LLM + Pydantic 做结构化意图路由（弃用关键词匹配）；票务 Agent 用 LangGraph 实现"信息抽取 → 参数校验 → 缺参提示/模拟订票"闭环；启动顺序为先专家后总控
- **A2A vs MCP**：MCP（Anthropic 2024）是 LLM↔工具/数据的纵向底层协议；A2A（Google 2025）是 Agent↔Agent 的横向上层协议，二者互补，生产中组合使用

## 正文

### 一、A2A 协议的价值

传统多 Agent 系统存在四大痛点：单体 AI 只能做固定任务；不同框架（LangChain、自研）写出的 Agent 消息格式、传参、返回各不相同；新增或修改 Agent 要改动核心调度代码；任务执行全程黑盒、无法追溯。

A2A（Agent-to-Agent）是 Google 2025 年 4 月开源的去中心化 Agent 标准化通信协议，不替代大模型、不写业务代码，只统一 Agent 的"工作规范"：如何注册、接单、传消息、执行、回结果、报错与催补参数。

五大设计目标：

1. **标准化**：统一消息封装、任务生命周期状态机、异常与归档规范
2. **互操作性**：屏蔽框架、语言、部署环境差异
3. **去中心化对等通信**：支持点对点直连，总控只编排不垄断执行
4. **可服务发现**：AgentCard 元数据实现技能曝光与动态扩容
5. **异步优先**：原生支持长耗时任务、人工介入、中断续跑

### 二、核心概念与原理

| 术语 | 通俗类比 | 作用 |
|---|---|---|
| Agent | 专职员工 | 干具体活的 AI，对应 A2AServer 子类 |
| AgentCard | 员工工牌 | 名称、技能、访问地址 |
| AgentSkill | 技能标签 | 标记可干的活，供总控派单 |
| Task | 标准化工单 | 带 ID、状态、需求、结果的统一载体 |
| Message | 用户需求 | Task 内的原始提问 |
| Artifact | 工作成果 | 最终结果，统一归档 |
| TaskState | 状态印章 | SUBMITTED / WORKING / INPUT_REQUIRED / COMPLETED / FAILED |
| AgentNetwork | 通讯录 | 总控管理与调度所有 Agent |

标准化通信采用 Orchestrator 编排模式，基于 HTTP/JSON-RPC：用户自然语言请求 → 总控意图识别并经 AgentNetwork 匹配专家 → 封装 Task 异步下发 → 专家更新状态、返回 Artifact → 总控汇总多 Agent 结果。

### 三、系统架构

- **拓扑**：去中心化 + 星型。总控负责意图识别、分发、汇总；专家 Agent 独立部署，模块解耦、支持单点迭代、横向扩容与故障隔离
- **目录分层**：`common/`（LLM 配置、工具函数）、`agents/weather_agent` 与 `agents/ticket_agent`（各含 tools/workflow + server）、`orchestrator/`（intent_detect + core），加 .env 与 requirements.txt
- **技术栈**：python-a2a（封装通信与状态管理）、langchain-openai（兼容 OpenAI/DeepSeek/Ollama）、Function Calling、LangGraph（多步推理编排）、Pydantic OutputParser（约束结构化输出）、asyncio（并发）

### 四、实战落地（旅行规划系统）

依赖锁定：`python-a2a==0.2.8 langchain-openai==0.1.12 langchain-core==0.2.30 langgraph==0.2.15 pydantic==2.10.0 python-dotenv==1.0.1`。

1. **公共模块**：`common/llm.py` 统一初始化 ChatOpenAI（temperature=0、超时 30s，附连通性测试）；`common/utils.py` 清洗"未知/null"等无效输出、空结果兜底；密钥放 .env
2. **天气 Agent**：`@tool` 定义城市天气查询并 `bind_tools` 绑定 LLM，自然语言自动触发工具调用；server 端定义 AgentCard（含 skills 与 examples）、重写 handle_task，结果写入 task.artifacts 并标记 COMPLETED，异常全局兜底标 FAILED；监听 5008 端口
3. **票务 Agent**：LangGraph 建两节点工作流——Pydantic schema 结构化抽取出发地/目的地/时间（提示词禁止编造）→ 校验缺参并提示补充或返回模拟订票成功结果；监听 5009 端口
4. **总控 Agent**：`intent_detect.py` 用 LLM + PydanticOutputParser 输出 `{need_weather, need_ticket}` 布尔意图（出差/旅行隐含订票）；`core.py` 用 AgentNetwork 注册两个专家，build_a2a_task 生成带 uuid 的工单，`asyncio.gather` 并发调用，逐 Agent 异常捕获后结构化汇总
5. **启动与测试**：先起两个专家 server 再起总控；覆盖单一天气、单一订票、复合任务（双 Agent 并行）、残缺参数提示四个场景

### 五、A2A 与 MCP 辨析

一句话：**MCP 让一个 AI 自己变强（对内、单 AI 能力拓展）；A2A 让多个 AI 组队变强（对外、多 AI 协作）**。

| 维度 | MCP（Anthropic 2024） | A2A（Google 2025） |
|---|---|---|
| 定位 | LLM 与工具/数据源的通信协议 | Agent 与 Agent 的协作协议 |
| 通信主体 | LLM → 工具、数据库、文件、API | Agent → Agent（异构智能体） |
| 核心能力 | 工具发现、上下文注入、数据读取 | 任务调度、状态流转、服务发现、结果汇总 |
| 应用层级 | 纵向底层，单 Agent 能力拓展 | 横向上层，多 Agent 集群协作 |
| 典型场景 | 调搜索、读文件、查数据库 | 总控调度多个垂直专家完成复合任务 |

生产组合：单个 Agent 通过 MCP 对接工具强化自身，多个能力完备的 Agent 再通过 A2A 集群协作。

> 注：本文为公众号引流长文（尼恩《A2A 学习圣经》第 13 章），作者称完整版 3 万字以上，公众号版有约 1000 字删节；文末为培训营销内容，未纳入摘要。代码基于 python-a2a 0.2.8 教学版封装，落地前需核对官方 SDK 当前 API。

## 来源

- [人人 学 A2A 架构：第13章 从零搭建工业级多Agent协作系统（实战进阶）](https://mp.weixin.qq.com/s/6YKXGTJaZSwHDtQqjv9j-A)（微信公众号·技术自由圈）

## 附件

无
