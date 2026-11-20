---
id: inbox-2026-11-20-agentscope-2
title: 36k star、40 万月下载：AgentScope 2.0 想把 Agent 应用做成一套后端
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/TkqRdyMuhU2Z5LRIkHWFvw
source_type: web
platform: 微信
created: 2026-11-20
category: 技术
tags: [AI, Agent]
asset_ref: Assets/2026-11/wechat-TkqRdyMuhU2Z5LRIkHWFvw.md
wiki_status: pending
---

> **摘要**：AgentScope 2.0（阿里通义 SysML 团队，36k star、40 万月下载）不是"又一个 Agent 框架"，而是"框架 + Agent 后端"：不预设编排、把控制权交给模型，SDK 层给 8 块积木（ReAct/Toolkit/Model/Context/Event/Permission/Middleware/Memory/Workspace），并自带多租户、多会话、IM 渠道、RAG、MCP Hub 的 Agent Service。Loop 强、Graph 中、Harness 厚；适合要做 Agent 应用的团队，不适合单机脚本。

## 核心要点

- **定位**：与 Pydantic AI（框架+评测+可观测）、Spring AI Alibaba（框架+Graph+平台）不同，AgentScope 更偏应用后端——相当于不只给 Spring Boot，还附管理后台、消息通道、权限与部署方案；核心要解决"Agent 应用怎么作为服务跑起来"。
- **设计哲学**：官方立场"为越来越 agentic 的模型设计，利用模型推理与工具使用能力，而非用严格提示词和强预设编排约束它们"——站队"不预设编排"，编排仅在必要时出现（Pipeline / TeamPipeline / SOP）。
- **SDK 八积木**：ReAct（结构化输出、中断恢复、批量顺序/并发工具调用）、Toolkit（Python 工具/MCP/skills，内置 shell/文件编辑/搜索/规划）、Model（多 provider）、Context（自动压缩、工具结果卸载、上下文注入）、Event System、Permission & HITL、Middleware（AOP 式可组合钩子）、Memory（Agentic Memory，可切 ReMe/Mem0）、Workspace/Sandbox。
- **循环三细节**：工具调用批量化（并发执行直接决定吞吐）、实时中断与恢复（交互场景刚需）、上下文由框架统一管理（不再手写"历史太长怎么办"）。
- **沙箱八后端**：local / Docker / Apple Container / Bubblewrap / E2B / OpenSandbox / Daytona / K8s，同一套 Agent 代码换 backend 即从本机调试切到集群生产，类似 JDBC 式抽象。
- **Agent Service**：FastAPI 后端 + 预置 Web UI，提供多租户/多会话隔离、Agent Team（leader-worker 编排）、Channels（飞书/Discord/钉钉/自定义）、RAG Service、MCP & Skill Hub、资源分享、SQL/NoSQL 持久化、定时调度——即 SaaS 通用问题在框架层提前做完。
- **版本节奏**：2026-05 发布 2.0 后每月加一块（Agent Team/RAG→ReMe/K8s→Channels/Pipeline/MCP Hub→A2A/Realtime 语音→语音克隆），从"框架"长成"框架+服务+渠道+语音"。
- **三维裁决**：Loop 强（循环内建工程细节）；Graph 中（有 Pipeline/TeamPipeline/SOP 编排原语，但无通用图引擎，可视化流程需外接）；Harness 强（沙箱/权限/服务化/渠道齐全）。
- **冷水**：迭代太快需锁版本；Agent Service 重、小团队反增负担；生态偏阿里系（DashScope/Qwen 最佳路径）；编排非最强项；评测证据体系偏弱需自接；Python 3.11+ 依赖重；"不预设编排"是双刃剑，高稳定场景仍需 SOP 约束；本文未实测。

## 正文

完整正文见 [[Assets/2026-11/wechat-TkqRdyMuhU2Z5LRIkHWFvw.md]]。文中"值得抄的四个设计"：中间件式扩展（AOP 式钩子）、沙箱抽象成 Workspace（一套 API 覆盖八种后端）、服务化优先（SaaS 通用问题框架层解决）、事件总线做可观测（推理/工具调用/多模态统一事件流，可订阅渲染与回放调试）。适合要上多租户、接 IM、跑沙箱、要现成后端的 Agent 应用团队；单机脚本选 Pydantic AI / OpenAI SDK 更轻。

## 来源

- [36k star、40 万月下载：AgentScope 2.0 想把 Agent 应用做成一套后端](https://mp.weixin.qq.com/s/TkqRdyMuhU2Z5LRIkHWFvw)

## 附件

- [[Assets/2026-11/wechat-TkqRdyMuhU2Z5LRIkHWFvw.md]]
