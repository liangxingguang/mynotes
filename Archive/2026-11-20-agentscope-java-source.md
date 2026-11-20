---
id: inbox-2026-11-20-agentscope-java-source
title: AgentScope Java 源码图解：从一次调用，看懂 Agent 的运行过程
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/RiyIJHDAzESiCaFXlzNTfA
source_type: web
platform: 微信
created: 2026-11-20
category: 技术
tags: [AI, Agent]
asset_ref: Assets/2026-11/wechat-RiyIJHDAzESiCaFXlzNTfA.md
wiki_status: ingested
---

> **摘要**：AgentScope Java 源码图解指南（对应 2.1.0-SNAPSHOT，Java 17 + Project Reactor，源码分析项目 github.com/liulangjietou/AgentScope-source-analysis）。主线：输入进入会话，模型决定下一步，框架执行工具，结果回到上下文，直到产生终态。ReAct 两动作对应 `reasoning()`（请求模型）与 `acting()`（处理工具调用）；结束判断要求无工具调用且至少一个非空白文本块，`maxIters` 默认 10，达上限进入 `summarizing()` 标记 MAX_ITERATIONS。一次 call 经 AgentBase 生命周期（runInContext→serializeOnKey 同会话串行→runLifecycleBody→executeCallBody）。关键机制：pending 工具恢复（ASKING 确认走 `Msg.METADATA_CONFIRM_RESULTS` 直接从 acting(0) 继续；外部工具补 ToolResultBlock）、权限双层（ReAct 权限门 + Toolkit 执行器，直接调 callTool 不经过权限门）、人工确认跨两次调用（ALLOWED/DENIED，工具级 deny/ask 优先）、会话对象分层（Msg/AgentState/RuntimeContext/RunControl/Native Session）、结束四分支（正常/空结果/失败/中断各有保存路径）、Harness 组装（工作区+上下文预算+VerificationService 用已持久化证据验收）、结构化输出（原生 Schema 或 generate_response 兜底）。

## 核心要点

- **读法主线**：一次 `agent.call(...)` 可能包含多轮模型请求与一批工具执行，返回一条消息也可能意味着在等用户确认或等外部工具提交结果。主线：输入进入会话 → 模型决定下一步 → 框架执行工具 → 结果回到上下文 → 产生终态。
- **ReAct 循环**：`reasoning()` 请求模型、`acting()` 处理工具调用；结束判断需无工具调用且至少一个非空白文本块（只返回 thinking 不算已回答）；服务端工具全部由厂商执行、结果已随助手消息返回则无需本地再执行；`maxIters` 默认 10，达上限进入 `summarizing()` 不给工具、标记 `MAX_ITERATIONS`。
- **模块分工**：core 执行 Agent（消息、上下文、ReAct、工具、权限、中间件）；harness 组合工程能力（HarnessAgent 内部持有 ReActAgent delegate，装配工作区/沙箱/技能/子 Agent/上下文预算）；extensions 接外部系统；service 提供管控平台（裸 ReActAgent 不需要部署平台）。
- **生命周期边界**：`call()` 与 `streamEvents()` 共用 `buildAgentStream()`，`onAgent` 中间件链在公共路径装配；`AgentBase` 管排队（按 userId+sessionId 同实例内同会话串行）、资源释放（Mono.usingWhen）；ReAct 循环在 ReActAgent；每次调用可变数据集中在 `CallExecution`（持有 AgentState、权限引擎、工具视图、中断信号）。
- **恢复协议**：新输入先查历史中未配对的工具调用——无 pending 则追加输入开始新推理；`ASKING`（停在权限确认）须提交 `ConfirmResult`，确认后直接从 `acting(0)` 继续，避免模型重新生成动作；外部挂起工具须补对应 `ToolResultBlock`；`enablePendingToolRecovery` 默认关闭，不能借它跳过人工确认。
- **模型调用**：`reasoning()` 组装消息、工具 Schema、生成选项，经 `ModelRequestPreparer` 处理最终请求（Harness 上下文预算接在这里）；`stream` 返回分片，前端看到文本≠已形成可恢复的完整消息——未完成分片还在当前轮累加器。
- **工具执行**：损坏参数（半截 JSON）转配对 `ERROR` 结果，不替换为 `{}`；两层权限——ReAct 权限门判断动作放行、Toolkit 执行器管查找/激活分组/Schema/实际执行；外部工具返回 `SUSPENDED`；预置参数从模型可见 Schema 排除、执行时覆盖模型输入，但拦截器仍可修改（属可信应用代码）；并发安全工具组成并发段、不安全工具形成串行屏障；直接实现 `AgentTool` 但不继承 `ToolBase` 的工具权限评估直接放行（自定义工具要框架权限规则须用 `@Tool` 或 ToolBase）。
- **人工确认与终态**：工具标记 ASKING、发 `RequireUserConfirmEvent`、停止原因 `PERMISSION_ASKING`，下次调用才恢复（ALLOWED 继续 / DENIED 写结果，全部被拒发 `AllToolsDeniedEvent`）；外部工具暂停原因是 `TOOL_SUSPENDED`——两种暂停协议不同，前端不能只一个"继续"按钮；`returnDirect` 需该批工具全部声明直接返回且全部成功才作为最终回答。
- **会话与状态**：区分 Msg/AgentState/RuntimeContext/RunControl/Native Session——事件流≠已持久化完整会话；裸 ReActAgent 默认 EVENT_LOG 但不自动创建 SessionLogStore；Harness 未配日志后端用 `WorkspaceSessionLogStore`；Native Session 先取 writer lease、读已提交投影恢复；turn（可暂停恢复的逻辑交互）≠ run（实际执行），恢复用新运行身份；工具副作用未确认提交时拒绝重跑（退款/发信/写文件不能由"连接断了"推断）。
- **结束分支**：正常与空结果都保存状态；失败 `saveStateAfterCallFailure()` 存安全状态后抛原异常（保存再失败作 suppressed 附加）；中断修复悬空工具结果发 INTERRUPTED；操作符位置决定异常边界——不能因前面 `onErrorResume` 就以为后面保存失败也被处理。
- **Harness 与结构化输出**：HarnessAgent.Builder 装配 Toolkit/工作区/中间件/会话后端后委托内部 ReActAgent；`HarnessContextBuilder` 在最终请求边界统一处理上下文预算（须覆盖系统提示词、消息、动态来源、工具 Schema，超预算报 `ContextBudgetExceededException`）；`VerificationService` 用已持久化动作证据检查验收条件、不为验证重执行动作；结构化输出优先原生 Schema、失败降级 `generate_response` 工具兜底（不污染共享注册表），调用方应检查 `hasStructuredData()`。

## 正文

完整正文见 [[Assets/2026-11/wechat-RiyIJHDAzESiCaFXlzNTfA.md]]。全文含十章源码分析项目导航（模块地图、消息与状态、ReAct、工具、模型、中间件、Harness、扩展生态等）与按问题索引的阅读路线表（排队/恢复/工具未执行/会话恢复异常等场景对应入口）。源码版本：AgentScope Java 2.1.0-SNAPSHOT（commit dcb131a），指南项目：https://github.com/liulangjietou/AgentScope-source-analysis

## 来源

- [AgentScope Java 源码图解：从一次调用，看懂 Agent 的运行过程](https://mp.weixin.qq.com/s/RiyIJHDAzESiCaFXlzNTfA)

## 附件

- [[Assets/2026-11/wechat-RiyIJHDAzESiCaFXlzNTfA.md]]
