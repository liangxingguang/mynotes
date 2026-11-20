---
id: wiki-entity-agentscope
type: entity
title: AgentScope
status: active
created: 2026-11-12
updated: 2026-11-20
confidence: high
tags:
  - entity
  - ai-agent
  - framework
sources:
  - raw/sources/ai/2026-11-12-durable-agent-cloud-long-running.md
  - raw/sources/ai/2026-11-20-agentscope-2.md
  - raw/sources/ai/2026-11-20-agentscope-java-source.md
related:
  - wiki/concepts/durable-execution.md
  - wiki/entities/agentcore.md
  - wiki/concepts/agent-service.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/harness-engineering.md
---
# AgentScope

## Overview（概览）

Agent 开发框架。1.x 以 HarnessAgent 持久执行内核为核心，将模型推理、上下文、工具和会话管理组织在一起，通过 Durable 执行内核管理整个运行过程；模型生成、工具调用和业务流程都是持久任务，由任务状态驱动 Agent 循环，进程重启后从已保存的阶段继续。其持久执行协议与具体框架无关，同样适用于其他 Agent 框架。**2.0（2026-05 发布）从"框架"扩展为"框架 + Agent 后端"**：不预设编排、把控制权交给模型，SDK 层给八块积木，并自带多租户、多会话、IM 渠道、RAG、MCP Hub 的 Agent Service，解决"Agent 应用怎么作为服务跑起来"（信源 2026-11-20）。提供 Python 与 Java 两条实现线。

## Identity（身份信息）

- Type（类型）: Agent 开发框架（含持久执行内核 HarnessAgent；2.0 起为"框架 + Agent 后端"）
- Organization（所属组织）: 阿里通义实验室 SysML 团队（pyproject 注明 "SysML team of Alibaba Tongyi Lab）；开源框架
- Role（角色）: Agent 运行时与持久执行内核；2.0 起同时是 Agent 应用后端（Agent Service）
- Status（状态）: 活跃（2026-11 最新 Python v2.0.12；Java 线 2.1.0-SNAPSHOT）
- 项目数据（2026-11-17，信源 2026-11-20）：GitHub stars 36k（快照 36,048）、forks 3.9k、贡献者 233、Apache-2.0；PyPI 月下载约 40.2 万，Agent 框架第一梯队；2024-02 首发 0.0.1，累计 56 个 release；论文 AgentScope（arXiv 2402.14034，2024-02）与 AgentScope 1.0（arXiv 2508.16279，2025-08）

## Important Facts（重要事实）

- **HarnessAgent**：将模型推理、上下文、工具和会话管理组织在一起，通过 Durable 执行内核管理整个运行过程。HarnessAgent 管理模型与工具协作，Session 管理持久状态与提交顺序，任务调度器推进可运行阶段，Storage 保存执行数据。
- **Session 六类对象**：Conversation（对话记录及上下文范围）、Entry（不可变会话记录）、Document（带类型和版本的结构化业务状态）、Task（带阶段/检查点/终态的持久状态机）、Submission（应用提交及处理结果）、Commit（一组关联变化的原子提交）。
- **Task 六态状态机**：pending（已持久创建待运行）/ running（正在执行某阶段）/ waiting（等待指定任务结束）/ sleeping（等待时间点）/ completing（结果已决定、子任务未收尾）/ terminal（已结束）。
- **原子提交协议**：取得 Session 提交顺序 → 事务草稿准备关联变化 → 校验并冻结写集合 → Storage 原子保存 → 采纳已持久化新状态 → 更新视图通知等待者调度后续任务。串行化同一 Session 内的状态提交，模型请求和工具执行在提交事务之外推进。
- **工具恢复两阶段**：call 阶段（解析工具、校验参数、保存最终参数/重放策略/执行意图）与 execute 阶段（意图已保存、结果未确认的恢复入口）。只有调用时与恢复时的工具策略均为 safe 才重放，否则记录 interrupted。
- **自定义任务**：通过注册 Document 和 Task 把工具内部业务阶段纳入持久执行机制；提供 allSettled（等待全部子任务结束汇总）和 failFast（子任务失败时请求其他子任务停止）两种汇合策略。
- **恢复流程**：重新打开同一 Storage → 恢复 Conversation/Entry/Document/Task/Submission → 检查任务类型/版本/阶段处理器 → 启动任务调度器（按状态分别处理 pending/running/waiting/sleeping/completing/terminal）→ 每次状态变化通过同一条原子提交序列。
- **Storage 与唤醒**：Storage 接口原子保存和读取执行记录，存储实现与任务语义分离（本地持久存储或远程后端）；resume() 启动任务调度器，onWake 接收变化、持久安排下一次唤醒。
- **Registry**：注册任务、工具和扩展定义；存储中保存状态、身份和定义版本，重新打开时内核核对任务类型和版本，定义缺失或无法迁移时保留原状态并报告阻塞原因。
- **设计哲学（2.0，信源 2026-11-20）**：不预设编排，把控制权交给越来越强的模型。README 原文："We design for increasingly agentic LLMs. Our approach leverages the models' reasoning and tool use abilities rather than constraining them with strict prompts and opinionated orchestrations." 编排只在必要时出现（Pipeline / TeamPipeline / SOP）。
- **SDK 八积木（2.0，信源 2026-11-20）**：ReAct（结构化输出、中断恢复、批量工具调用）、Toolkit（Python 工具/MCP/skills，内置 shell/文件编辑/搜索/规划）、Model（多 provider）、Context（自动压缩、工具结果卸载、上下文注入）、Event System（统一事件总线）、Permission & HITL（细粒度权限与人工确认）、Middleware（AOP 式可组合钩子）、Memory（Agentic Memory，可切 ReMe/Mem0）、Workspace/Sandbox（隔离执行）。
- **循环三细节（2.0，信源 2026-11-20）**：工具调用批量化（并发执行直接决定吞吐）、实时中断与恢复（交互场景刚需）、上下文由框架统一管理（自动压缩/卸载/注入，不再手写"历史太长怎么办"）。
- **沙箱八后端（2.0，信源 2026-11-20）**：local / Docker / Apple Container / Bubblewrap / E2B / OpenSandbox / Daytona / K8s；同一套 Agent 代码换 backend 即从本机调试切到集群生产，类 JDBC 式抽象。
- **Agent Service（2.0，信源 2026-11-20）**：FastAPI 后端 + 预置 Web UI，提供 Serving（多租户/多会话隔离）、Agent Team（leader-worker 编排）、Channels（飞书/Discord/钉钉/自定义渠道）、RAG Service、MCP & Skill Hub、Resource Sharing、Persistence（SQL/NoSQL）、Scheduling（定时任务/唤醒/后台卸载）。详见 [[agent-service]]。
- **三维裁决（2.0，信源 2026-11-20）**：Loop 强（循环内建结构化输出/中断恢复/并发工具/上下文管理）；Graph 中（有 Pipeline/TeamPipeline/SOP 编排原语，但无通用图引擎，可视化流程需外接）；Harness 强（沙箱/权限/服务化/渠道齐全）。
- **局限与冷水（2.0，信源 2026-11-20，作者未实测）**：迭代太快需锁版本；Agent Service 重、小团队反增负担；生态偏阿里系（DashScope/Qwen 最佳路径）；编排非最强项；评测证据体系偏弱需自接；Python 3.11+ 依赖重；"不预设编排"是双刃剑，高稳定场景仍需 SOP 约束。

## Java 实现（2.1.0-SNAPSHOT，信源 2026-11-20）

AgentScope Java 对应 **2.1.0-SNAPSHOT**（上游提交 `dcb131a`，Java 17 + Project Reactor），源码分析项目见 github.com/liulangjietou/AgentScope-source-analysis。主线：输入进入会话 → 模型决定下一步 → 框架执行工具 → 结果回到上下文 → 产生终态。

- **四职责区域**：core（执行 Agent：消息、运行上下文、ReAct 循环、工具、模型接口、权限、中间件、事件、原生会话日志）；harness（组合工程能力：`HarnessAgent` 内部持有 `ReActAgent delegate`，装配工作区/文件系统/沙箱/技能/子 Agent/上下文预算/会话操作）；extensions（接外部系统：模型、存储、协议、渠道、Spring Boot Starter）；service（管控平台：Gateway、Go Control Plane、Java Dataplane、Scheduler、Dashboard；裸 `ReActAgent` 不需要部署该平台）。
- **ReAct 循环**：`reasoning()` 请求模型、`acting()` 处理工具调用。结束判断要求无工具调用且至少一个非空白文本块（只返回 thinking 不算已回答）；服务端工具全部由厂商执行、结果已随助手消息返回则无需本地再执行。`maxIters` 默认 10，达上限进入 `summarizing()`、不给工具、标记 `MAX_ITERATIONS`。
- **生命周期边界**：`call()` 与 `streamEvents()` 共用 `buildAgentStream()`；`AgentBase` 管排队（`serializeOnKey` 按 userId+sessionId 同实例内同会话串行，不同会话并行）与资源释放（`Mono.usingWhen`）；推理行动循环在 `ReActAgent`；每次调用可变数据集中在 `CallExecution`（持有 AgentState、权限引擎、工具视图、中断信号）。
- **恢复协议**：`doCallInner()` 先查历史中未配对的工具调用——无 pending 则追加输入开始新推理；`ASKING`（停在权限确认）须提交 `ConfirmResult`，确认后直接从 `acting(0)` 继续，避免模型重新生成动作；外部挂起工具须补 `ToolResultBlock`；`enablePendingToolRecovery` 默认关闭，不能借它跳过人工确认。
- **权限双层**：ReAct 权限门判断动作是否放行；Toolkit 执行器管工具查找、激活分组、Schema 与实际执行。直接调用 `Toolkit.callTool()` 不经过外层 ReAct 权限门；直接实现 `AgentTool` 但不继承 `ToolBase` 的工具权限评估直接放行（需框架权限规则须用 `@Tool` 或 `ToolBase`）。
- **人工确认与终态**：工具标记 `ASKING`、发 `RequireUserConfirmEvent`、停止原因 `PERMISSION_ASKING`，下次调用才恢复（ALLOWED 继续 / DENIED 写结果，全部被拒发 `AllToolsDeniedEvent`）；外部工具暂停原因是 `TOOL_SUSPENDED`，两种暂停协议不同，前端不能只一个"继续"按钮；`returnDirect` 需该批工具全部声明直接返回且全部成功才作最终回答（`TOOL_RETURN_DIRECT`）。
- **会话与状态分层**：区分 Msg/AgentState/RuntimeContext/RunControl/Native Session；事件流≠已持久化完整会话；裸 `ReActAgent` 默认 EVENT_LOG 但不自动创建 SessionLogStore；Harness 未配日志后端用 `WorkspaceSessionLogStore`；区分 turn（可暂停恢复的逻辑交互）与 run（实际执行），恢复用新运行身份；工具副作用未确认提交时拒绝重跑（退款/发信/写文件不能由"连接断了"推断）。
- **结束分支**：正常与空结果都保存状态；失败 `saveStateAfterCallFailure()` 存安全状态后抛原异常（保存再失败作 suppressed 附加）；中断修复悬空工具结果发 `INTERRUPTED`；操作符位置决定异常边界。
- **Harness 与结构化输出**：`HarnessAgent.Builder` 装配 Toolkit/工作区/中间件/会话后端后委托内部 ReActAgent；`HarnessContextBuilder` 在最终请求边界统一处理上下文预算（须覆盖系统提示词、消息、动态来源、工具 Schema，超预算报 `ContextBudgetExceededException`）；`VerificationService` 用已持久化动作证据检查验收条件、不为验证重执行动作；结构化输出优先原生 Schema、失败降级 `generate_response` 工具兜底，调用方应检查 `hasStructuredData()`。

## Products / Projects（产品／项目）

- [[agentcore|AgentCore]]（阿里云云托管平台，与 AgentScope 框架层协作）

## Relationships（关系）

- [[durable-execution|持久执行（Durable Execution）]]：AgentScope 的 HarnessAgent 是持久执行内核的实现载体（第 11 信源）
- [[agentcore|AgentCore]]：平台层，AgentScope 框架负责"从哪里继续、怎样继续"，AgentCore 负责"状态保存在哪、由哪个实例继续"

## Timeline（时间线）

- 2024-02 — Python 首发 0.0.1；发表论文 AgentScope（arXiv 2402.14034）。
- 2025-08 — 发表论文 AgentScope 1.0（arXiv 2508.16279）。
- 2026-05 — AgentScope 2.0 发布，从"框架"转向"框架 + Agent 后端"。
- 2026-06 — Agent Team、RAG、Mem0、分布式多租户 RAG service。
- 2026-07 — ReMe 长期记忆、K8s / OpenSandbox / Daytona workspace。
- 2026-08 — Channels（飞书/Discord）、Console、Pipeline、MCP & Skill Hub、钉钉。
- 2026-09 — A2A 协议、Realtime 语音 Agent、TeamPipeline、SOP、模型路由、MiniMax。
- 2026-10 — 语音克隆、WebRTC 实时语音（文本与语音共享会话历史）。
- 2026-11 — Python v2.0.12（2026-11-16）；Java 线 2.1.0-SNAPSHOT（上游提交 dcb131a）。
- 2026-11-12 — 经知乎专栏信源收录，记录 HarnessAgent 持久执行内核的 Session/Task/Commit 设计与工具恢复协议。

## Current Understanding（当前认知）

AgentScope 的 HarnessAgent 提供了一套与框架无关的持久执行协议：Session 统一管理六类持久对象，Task 状态机把调用栈中的进度变成显式阶段，原子 Commit 让记录、文档与任务一起生效。其核心设计原则是"模型和工具调用发生在提交事务之外"——调度器根据已提交状态选择可执行任务，任务处理器运行阶段后再提交结果。该协议同样适用于其他 Agent 框架，是 [[durable-execution|Durable Execution]] 概念的具体实现之一。

2.0 起，AgentScope 的定位从"持久执行内核"扩展为"框架 + Agent 后端"：不预设编排、把控制权交给模型，SDK 层提供八块积木，并通过 Agent Service 把多租户、IM 渠道、RAG、MCP Hub、持久化、调度等 SaaS 通用问题在框架层解决（详见 [[agent-service]]）。Python 与 Java 两条实现线并存：Python 2.0 面向"Agent 应用作为服务跑起来"，Java 2.1.0-SNAPSHOT 以 core/harness/extensions/service 四职责区域组织，把 ReAct 循环、权限双层、恢复协议与会话分层落到具体方法级实现。作者对 2.0 的判断（Loop 强、Graph 中、Harness 强）来自文档/源码/公开数据，未做本地实测（信源 2026-11-20）。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-12-durable-agent-cloud-long-running.md`（HarnessAgent 持久执行内核、Session 六类对象、Task 状态机、原子提交顺序、工具 call/execute 两阶段、自定义任务汇合策略、恢复流程与 Registry）
- Source: `raw/sources/ai/2026-11-20-agentscope-2.md`（2.0：项目数据、设计哲学、SDK 八积木、循环三细节、沙箱八后端、Agent Service、版本节奏、Loop/Graph/Harness 裁决与局限）
- Source: `raw/sources/ai/2026-11-20-agentscope-java-source.md`（Java 2.1.0-SNAPSHOT：四职责区域、ReAct 结束判断/maxIters、生命周期边界、恢复协议、权限双层、人工确认与终态、会话分层、结束分支、Harness 与结构化输出）
