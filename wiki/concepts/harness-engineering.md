---
id: wiki-concept-harness-engineering
type: concept
title: Harness Engineering（Agent 执行系统工程）
status: active
created: 2026-10-27
updated: 2026-10-31
confidence: high
tags:
  - concept
  - ai-agent
  - harness
sources:
  - raw/sources/ai/2026-10-27-harness-engineering-11-agents-study.md
  - raw/sources/ai/2026-10-28-agent-harness-framework-selection.md
  - raw/sources/ai/2026-10-28-agent-loop-context-management.md
  - raw/sources/ai/2026-10-28-kiso-minimal-agent-framework.md
  - raw/sources/ai/2026-10-28-pi-dsh-agent-complexity.md
related:
  - wiki/concepts/agent-loop.md
  - wiki/concepts/context-management.md
  - wiki/concepts/mcp.md
  - wiki/concepts/agent-sandboxing.md
  - wiki/concepts/agent-evaluation.md
  - wiki/concepts/durable-execution.md
  - wiki/entities/learn-harness-engineering-course.md
  - wiki/entities/kiso.md
  - wiki/decisions/harness-selection-deepagents.md
  - wiki/entities/deepagents.md
  - wiki/sources/kiso-minimal-agent-framework.md
---
# Harness Engineering（Agent 执行系统工程）

## Definition（定义）

Harness Engineering 关心的是：如何让模型在真实的软件环境里持续行动、获得反馈、遵守边界、并把结果交付出来。可用 `Agent ≈ Model + Harness` 理解分工（不是性能公式）：模型提出计划和动作；Harness 组织上下文、调用模型、执行工具、控制权限、维护状态，并向用户报告结果。

## Why It Matters（为什么重要）

同一个模型接入不同 Coding Agent，工作体验差异巨大（持续推进 vs 反复搜索、编译失败后能否定位、长对话中是否忘记约束）。这些差异主要来自模型周围的执行系统而非模型本身。Harness Engineering 是连接模型能力与软件工程的学科：一次工具调用是否可靠、一段历史如何压缩、中断后如何继续、一份修改凭什么被判定为完成，都属于它的设计范围。

## Core Characteristics（核心特征）

七个观察面（划清职责用，不必对应七个独立服务）：

1. **执行循环**：如何推进任务、何时停止、异常与取消处理
2. **模型适配**：不同 API、消息格式、模型能力与缓存机制
3. **工具系统**：动作表达、参数校验、可靠返回
4. **上下文与记忆**：哪些信息进模型、哪些状态长期保存
5. **权限与隔离**：任务允许做什么、执行环境实际能做什么
6. **多 Agent 协调**：分工、并发限制、结果合并与冲突处理
7. **扩展机制**：Skills、Hooks、协议与外部服务接入
8. **复杂度治理**：复杂度何时进入系统、由谁决定——设计时控制（举证责任倒置，默认能力越少行为越易理解）vs 运行时控制（可逆组合，能力可装卸可撤销）；自进化需要"宪法"（验证/回滚/权限/淘汰制度化）

## Structure（结构）

长程任务信息分三层管理：

| 层次 | 内容 | 管理重点 |
|---|---|---|
| 工作上下文 | 当前消息、相关代码、近期结果 | 控制预算，保留决定下一步所需信息 |
| 任务状态 | 目标、约束、决策、进度、待办 | 可查询、可更新、可恢复 |
| 持久知识 | 稳定项目规范、已确认经验 | 记录来源、版本、适用范围、失效条件 |

安全四层职责：请求校验 → 授权决策 → 执行约束 → 审计恢复。第四项是可追踪/纠错能力，不是阻止越权的强制边界。

内核治理（Kiso 信源，第 4 信源）：对"框架退化为中央 Loop 大 Blob"这一自然趋势的反向制动——给核心包设有效代码硬门禁（2,200 行 Tripwire，写作时 2,192 行），每次往内核塞逻辑必须回答"为什么属于内核 / 做错是否改变底层执行语义 / 内核里有没有东西该先移出去"；门禁保护的不是代码量而是**决策所有权**。分层结构：Product Shell（CLI/TUI）→ Composition（组装 Provider/Tool/Extension/Store）→ Agent（创建 Session）→ Session（durable conversation + recovery）→ Run（执行生命周期）→ Kernel Loop（模型↔工具驱动语义）+ Store（持久化判决）。诚实披露：小内核 ≠ 系统可靠性只靠内核，TCB 远大于内核（Store 的 single-writer/CAS/torn-tail、进程间锁、OS、文件系统、工具层 Revision Guard、Provider 协议风险都属信任边界）。

## How It Works（运作方式）

从最小系统走向可靠交付的演进路径（信源第十节）：

1. 先建可靠单 Agent 基线（最小循环+模型适配+必要工具+基本权限/隔离/超时/取消/日志/验收）
2. 用真实失败驱动状态与恢复能力（任务状态、压缩、检查点、恢复核对），不为架构完整提前实现全部模块
3. 基线暴露出检索/工具发现/吞吐问题时再评估混合检索、延迟加载、Skills、多 Agent
4. 评测用 B0~B5 单变量实验隔离组件贡献（固定模型版本、任务集、预算、权限、重试规则）

关键纪律：**记录事件 ≠ 可安全重放事件**——外部写入用幂等键、查询确认或人工处理；不确定是否成功的动作进"结果待核对"状态。压缩摘要不许扭曲事实（"计划测试"不能变成"测试通过"）。

评测纪律（Kiso 信源，第 4 信源）：对照 Benchmark 的价值在于"不是全赢"的结果与失败模式的具体定位——跨文件修改 12:12 打平、隐藏题 22/24 且成本低 32%、长会话反而贵 19%；贵 19% 的根因先用真实 Trace 验证假说（"read_file 200 行太保守"被最长文件仅 132 行当场推翻），再定位到 edit_file 缺 append 原子操作（360 次编辑 26 次失败 vs 对照 3/287）。方法论原则：**工程解释须 Trace 验证，没有支持的解释只是一种故事**；工具拒绝正确 ≠ 接口设计良好——模型持续在同一调用模式上失败说明接口缺少合适原子操作。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-loop|Agent Loop]]：Harness 的"执行循环"观察面即 Loop 层；Loop 是 Harness 的控制核心子集。
- [[mcp|MCP]]：扩展机制面的一部分——连接工具与上下文的协议，但不是完整 Agent 运行时或隔离机制。
- [[agent-sandboxing|Agent 沙箱隔离]]：权限与隔离面的实现手段；审批 ≠ 沙箱（审批决定放行，沙箱限制可达范围）。
- [[agent-evaluation|业务 Agent 全生命周期评测]]：B0~B5 单变量评测是可落地到该评测体系的实验设计方法。

### Dependencies（依赖项）

- 模型 API（消息格式/工具调用约定）、执行环境（沙箱/容器）、持久化（状态与审计记录）。

### Distinctions（区分）

- **Harness vs Framework**：Framework 提供构建 Agent 的抽象，Harness 强调实际执行系统；能力可重叠可组合（LangChain 官方把 Deep Agents 定义为 Agent Harness，用 LangGraph 支持持久执行）。"样本中 0/11 直接用通用框架"推不出"真正的 Harness 都不用框架"。
- **Skills vs MCP vs ACP**：Skills=打包任务说明（本身不授权限）；MCP=连接工具/资源/上下文（非运行时）；ACP（Agent Client Protocol）=规范客户端与 Coding Agent 的交互（非 Agent 间协作协议——后者见 [[a2a-protocol|A2A]]）。
- **极简循环 vs 完整产品**：Mini-SWE-Agent 百行核心达 SWE-bench Verified 74%（项目自报），但真实复杂度来自故障、权限、资源与交互——类似 TCP Echo Server vs 生产服务。

## Evolution（演进）

- 2026-10-27 — 新建，信源为《Harness Engineering》论文（11 系统源码研究）的架构解读文章。wiki 此前已有 Harness 产品实例（[[aibox|AiBox]]、[[ep-harness|EP-Harness]]、[[deepseek-harness|DeepSeek Harness]]）与课程实体（[[learn-harness-engineering-course|Learn Harness Engineering]]），本页补上概念层定义。

- 2026-10-29 — 新增组装视角信源 `raw/sources/ai/2026-10-28-agent-loop-context-management.md`（知乎《Agent》系列第 3 篇）。其 harness 六件套（messages 数组、工具注册、模型配置、循环控制与终止条件、上下文管理、事件流）与本页观察面互补：第 3 篇把"上下文与记忆"观察面展开成 [[context-management|上下文管理]] 独立概念页（裁剪/压缩/隔离三手段、两条铁律），并以 Claude Code 官方分层裁剪行为（先清旧工具输出、再总结对话）为该观察面提供落地实例。

- 2026-10-29 — 新增选型信源 `raw/sources/ai/2026-10-28-agent-harness-framework-selection.md`（知乎《Agent》系列第 5 篇）。其"harness 八件套"（loop+终止、工具注册、权限/HITL、持久化、上下文管理、子 agent、MCP、可观测）与本页七个观察面互证且更偏交付清单；"harness 即插件"的 Claude Code 三层图（运行时/插件能力/用户输入）与 2026-10-29 新增第 3 篇的"harness 六件套"（messages、工具、模型配置、循环控制、上下文管理、事件流）互补印证——八件套偏交付清单、六件套偏组装视角，共同收敛到本页观察面。`Model + Harness = Agent` 与 `Agent ≈ Model + Harness` 表述一致；选型结论落成决策页 [[harness-selection-deepagents|Harness 选型决策：首选 deepagents]] 与实体页 [[deepagents|deepagents]]。

- 2026-10-31 — 新增 Kiso 信源 `raw/sources/ai/2026-10-28-kiso-minimal-agent-framework.md`（第 4 信源）。补上两块此前缺失的维度：①**内核治理**——2,200 行核心包硬门禁（Tripwire）保护"决策所有权"、分层结构（Product Shell→Composition→Agent→Session→Run→Kernel Loop+Store）、TCB 诚实披露（小内核≠可靠性只靠内核）；②**评测纪律**——对照 Benchmark 的诚实报告（不是全赢）与"Trace 先于解释"的方法论。其"Event Log 即真相、其余皆投影""执行者与裁判者分离"与本页"审计恢复"观察面及 [[durable-execution|持久执行]] 概念互为支撑。

- 2026-10-31 — 新增 Pi 与 DSH 复杂度之争信源 `raw/sources/ai/2026-10-28-pi-dsh-agent-complexity.md`（第 5 信源）。补上**复杂度治理**维度（第 8 观察面）：Pi 的"举证责任倒置"（默认 4 工具、三重成本门槛）与 DSH 的"可逆组合"（Cordis 插件架构、运行时自我改装）代表两种工程理性——前者要求复杂度先证明价值，后者要求复杂度可隔离可撤销。两者不互相替代：Pi 适合边界稳定/可观察性优先，DSH 适合能力组合多变/多 Agent 共存。自进化需要"宪法"四问（资源访问/有效性验证/回滚能力/转正资格），否则自我扩展自动生成技术债。

## Open Questions（开放问题）

- 论文原始统计口径与当前产品能力的时差（快照为历史版本）？
- 平台化（Codex app-server 模式）下 Skills/Hooks/会话/权限语义跨宿主无损迁移的边界？

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-27-harness-engineering-11-agents-study.md`
- Source: `raw/sources/ai/2026-10-28-agent-harness-framework-selection.md`（印证：harness 八件套 vs 七观察面；选型决策树）
- Source: `raw/sources/ai/2026-10-28-agent-loop-context-management.md`（组装视角：harness 六件套；Claude Code 上下文分层裁剪实例）
- Source: `raw/sources/ai/2026-10-28-kiso-minimal-agent-framework.md`（第 4 信源：内核门禁与决策所有权、TCB 诚实披露、评测纪律与 Trace 验证）
- Source: `raw/sources/ai/2026-10-28-pi-dsh-agent-complexity.md`（第 5 信源：复杂度治理——设计时 vs 运行时控制、可逆组合、自进化宪法）

## Related Knowledge（相关知识）

- [[harness-engineering-11-agents-study|从 11 款 Agent 的源码研究，看懂 Harness Engineering（信源页）]]
- [[learn-harness-engineering-course|Learn Harness Engineering 课程]]
- [[aibox|AiBox]]、[[ep-harness|EP-Harness]]、[[deepseek-harness|DeepSeek Harness]]
- [[harness-selection-deepagents|Harness 选型决策：首选 deepagents]]
- [[deepagents|deepagents]]
- [[kiso|Kiso]]、[[kiso-minimal-agent-framework|Kiso：极简 Agent 框架（信源页）]]
- [[durable-execution|持久执行（Durable Execution）]]
- [[pi-dsh-agent-complexity|复杂度归谁：Pi 与 DSH 把 Agent 带向了两种未来（信源页）]]
