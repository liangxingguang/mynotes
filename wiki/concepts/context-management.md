---
id: wiki-concept-context-management
type: concept
title: 上下文管理（Context Management）
status: active
created: 2026-10-29
updated: 2026-11-05
confidence: high
tags:
  - concept
  - ai-agent
  - context-management
sources:
  - raw/sources/ai/2026-10-28-agent-loop-context-management.md
  - raw/sources/ai/2026-10-28-kiso-minimal-agent-framework.md
  - raw/sources/ai/2026-10-31-agent-harness-essay-ideal-harness.md
  - raw/sources/ai/2026-10-31-llm-integration-engineering-hard-parts.md
  - raw/sources/ai/2026-11-02-namiagent-agent-tutorial.md
  - raw/sources/ai/2026-11-02-superagent-design.md
  - raw/sources/ai/2026-11-02-weixin-superagent-architecture-teardown.md
  - raw/sources/ai/2026-11-04-zhihu-column-agent-long-term-memory.md
  - raw/sources/ai/2026-11-05-multi-agent-control-shift.md
  - raw/sources/ai/2026-11-07-agent-memory-system-design.md
related:
  - wiki/concepts/agent-loop.md
  - wiki/sources/weixin-agent-memory-system-design.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-as-memory.md
  - wiki/concepts/agent-long-term-memory.md
  - wiki/concepts/llm-call-protocol.md
  - wiki/concepts/durable-execution.md
  - wiki/sources/kiso-minimal-agent-framework.md
  - wiki/sources/llm-integration-engineering-hard-parts.md
  - wiki/entities/kiso.md
  - wiki/entities/namiagent.md
  - wiki/sources/namiagent-agent-tutorial.md
  - wiki/sources/superagent-design.md
  - wiki/topics/multi-agent-collaboration-architecture.md
---
# 上下文管理（Context Management）

## Definition（定义）

上下文窗口（context window）是模型一次能处理的最大 token 数（OpenClaw compaction 文档定义原文，信源 §3.1 引用核验）；由于 agent loop 每轮都**全量重发** messages，窗口是一块有预算的内存。上下文管理就是管住 messages 体积的全部工程手段——PMTA 里 M 要素在单会话内（in-context）这一层的实现。

## Why It Matters（为什么重要）

「agent 忘事」不是玄学，是「上下文放不下 / 被裁掉了 / 太贵了」三种现实问题。轮次越多、工具结果越大，预算烧得越快；窗口满了模型立刻失真（早期指令被挤掉）。成本侧每轮按输入 token 计费，不管预算就等于烧钱。

## Core Characteristics（核心特征）

1. **token 预算视角**：messages 每轮全量重发（非增量缓存）；工具结果（命令输出、文件内容）是增长最快的部分——一次读入大文件可烧掉一大截。中文 1 字 ≈ 0.6~2 token，比英文「占地」更大。
2. **忘事的几种病**：跨会话失忆（没写进去，in-context 记忆的天然边界）vs 会话内被挤掉（写进去了但窗口满了）——后者是本概念的主战场，前者靠会话外记忆（P4·11 三层记忆）解决。
3. **第一原则**：不是技巧，是「只留这次任务接下来还能用到的」，其余交给压缩/总结；确定性规则放系统指令/持久文件（如 CLAUDE.md），不依赖对话历史。

## Structure（结构）

三种手段（信源 §3.4，不互斥，成熟 harness 打组合拳）：

| 手段 | 做法 | 优点 | 代价 |
| --- | --- | --- | --- |
| 裁剪（truncation） | 直接丢掉最旧消息 | 零成本、实现五行 | 永久丢失，只适合「旧的确实没用了」 |
| 压缩（compaction） | 旧对话总结成摘要替换原文；或近 N 轮原始 + 更早压缩 | 保留要点、可聚焦 | 有损：细节丢失、摘要可能漏关键约束；多花一次模型调用 |
| 隔离（isolation） | 整块工作交给 subagent（独立窗口） | 主上下文几乎不涨 | 跨窗口只能靠摘要回传；多一次模型成本 |

Claude Code 官方做法分两层（信源 §3.4 引用核验）：先清旧工具输出（裁剪：最大且时效最短），不够再总结对话（压缩），用户请求与关键代码片段优先保留。

投影观与缓存经济学（Kiso 信源，第 2 信源）：把本概念提到"事实层"之上——四层分离：Event Log = Truth（发生过什么）/ Context = Projection（下一轮模型需要看什么）/ Summary = Compressed Projection（有损投影）/ Prompt Cache = Projection 的经济属性（不是 Agent State，只是投影方式在 Provider 侧的成本属性）。压缩 Context ≠ 篡改历史：Event Log 仍存实际发生的事，Runtime 按模型、窗口、任务阶段、成本约束把同一份历史投影成不同形式。缓存经济学给出一个反直觉结论：历史中间删除旧 Tool Result 会让从删除点起的整个 token prefix 失效，可能"为省 3 万旧 token 让 20 万保留 token 重新 prefill"——固定比例触发的 microcompact 因此被撤掉（Primitive 保留但须过 break-even 判断：预估未来调用次数足够覆盖 cache break 损失才动手）；Summary Compaction 则用 Soft/Hard 双阈值 + Raw Tail（详见 Evolution 2026-10-31 条目）。

## How It Works（运作方式）

两条工程铁律（信源 §3.5，均出自 OpenClaw/Claude Code 官方文档）：

1. **工具调用与结果必须成对保留**——裁掉 assistant 的 tool_calls 却留下孤立 tool 结果会把模型搞糊涂（协议上这些消息必须配对，见 [[llm-call-protocol]]）。
2. **磁盘全量、窗口有损**——「The full conversation history stays on disk. Compaction only changes what the model sees on the next turn.」可见性与有损性分离，永远可回查原文。

配套机制：`/compact`（手动压缩，可带聚焦指令——有损所以要让用户指定保什么）、`/context`（先看见开销）；**压缩本身也要有终止条件**——单文件大到「压缩完立刻又满」时 Claude Code 报 thrashing error 而非无限循环。设计规则三条：当前任务必要事实留窗口；确定性规则进持久文件；超大工具结果先在工具端截断/摘要再进窗口。

### Inline & Spill 与链式召回（Super-agent 信源）

Super-agent 信源把上下文窗口当作 Cache 管理，归纳两个注入操作：**Inline**（近期很可能用到的信息直接内联进窗口，省工具调用往返）、**Spill**（超出预算或低频的完整信息留窗口外，仅留引用或摘要供按需读取）。结合局部性思想逐步优化：①从最少信息开始（对象 ID + 摘要）；②逐步 Inline 关联信息（先附紧密关联对象 ID，再附带时空相邻内容如消息前后文、相邻评论）；③超出上限则 Spill（截断并保留续读入口）。

**链式召回（Chain of Recall）**：为 Trigger、Thread、Worker Session 等对象赋予唯一 ID，注入时内联关联对象 ID，构成引用图；每次工具召回的对象本身也遵循 Inline & Spill，返回结果内联下一跳摘要与 ID，模型可从当前事件顺引用关系多跳按需召回上下文。这缓解了 Router 层在长程中丢失先前信息的问题。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-loop|Agent Loop]]：messages 是 Loop 唯一跨轮存活的内部状态，上下文管理管的就是它的体积；压缩防循环是 Loop 终止条件的相邻问题。
- [[harness-engineering|Harness Engineering]]：上下文管理是 harness「上下文与记忆」观察面 / 第八件套的落点。
- [[llm-call-protocol|OpenAI 兼容调用协议]]：成对保留约束的协议层来源（tool_call_id 配对）。

### Distinctions（区分）

- **上下文窗口≠记忆**：跨会话的工作记忆/长期记忆、向量检索与 RAG 是另一层（该系列 P4·11 主题，现由 [[agent-long-term-memory|Agent 长期记忆]] 与 [[agent-memory-system|Agent 记忆系统]] 概念页承载）。
- **压缩 vs 摘要续接**：同族手段，前者会话内替换原文，后者跨会话以「上下文：会话摘要」开场。

## Evolution（演进）

- 2026-10-29 — 新建，信源为知乎《Agent》系列第 3 篇（Claude Code / OpenClaw 官方文档行为均经作者 2026-10-15 实测核验）。
- 2026-10-31 — Kiso 信源（第 2 信源）补上"投影观 + 缓存经济学"：四层分离（Event Log=Truth / Context=Projection / Summary=有损投影 / Cache=投影的经济属性）；撤掉固定比例 microcompact（须过 break-even 判断）；Summary Compaction 双阈值：Soft 400K（进入 Eligible，等自然 phase boundary——刚跑完测试、编辑告一段落——再摘要；作者明示 400K 是质量取舍非成本最优，更早摘要在部分负载下反而更便宜）/ Hard 700K 强制处理 / Raw Tail 100K 原样保留；In-Band Summary（复用当前 session 系统提示词与消息 prefix、只在末尾追加总结指令，保住 Cache 前缀命中）。与第 1 信源"磁盘全量、窗口有损"铁律互证（可见性与有损性分离），并把"压缩时机"从固定比例推进到语义边界 + 经济性判断。

- 2026-10-31 — Harness 随笔（第 3 信源）补上**注入式 token 账**视角：MCP 注入会带入大量工具描述 token（示例：注入 30K，新对话只说"你好"也要付几万）；这部分 token 虽可被 cache 住，但 Agent 是多轮对话、每轮都 cache read——30K × 1000 次 = 30M，社区称 Agent 账单中 Cache read 占比常超 97%（"社区里有人说"，未经核验）；社区称 Claude Desktop 比 CLI 少约 10% 额度，差异来源即 Desktop 注入的额外 MCP token。有效窗口侧：很多模型 256K 之后性能仍显著下降，MCP 占 30K 即少 30K 有效窗口。作者据此主张注入形式选择（MCP 全量 vs Skill/CLI 激活式、不激活不付 token tax）应纳入上下文管理的账本核算，并与 [[claude-skills|Claude Skills]] 的"按需加载"特性互证。

- 2026-11-01 — 面试深挖 84（第 4 信源）补上**预算分配与组装归属**视角：上下文是预算而非容量，至少分六类——系统约定、工具定义、检索资料、历史对话、中间结果、**输出预留**（最常被漏，漏了就会出现回答被截断、结构没闭合）；压缩四招（只留最近若干轮、早期摘要化、稳定内容做前缀、长结果换引用标识）；丢上下文的判据是「对当前决策的边际贡献低于它占据的成本与噪声」；上下文由编排层组装与裁剪（检索/裁剪/排序/引用都在编排层），模型只消费拼好的那一份；不可压缩的结构化事实（用户已确认参数、已生成单据标识）落独立存储而非只留摘要。与 Kiso「投影观」（Context=Projection、Event Log=Truth）互证：编排层即投影的执行者，裁剪权=预算控制权。

- 2026-11-02 — 新增教学实现信源 `raw/sources/ai/2026-11-02-namiagent-agent-tutorial.md`（微博推荐 NamiAgent）。其网页端"右侧看每次发给模型的完整上下文，一圈圈怎么变长"是本概念"每轮全量重发、窗口是一块有预算的内存"的直观可视化演示——把抽象的 token 预算变成可见的逐轮增长，可作为入门教学的演示材料（教程站点本身未经抓取核验）。

- 2026-11-02 — 新增 Super-agent 架构信源 `raw/sources/ai/2026-11-02-superagent-design.md`（DeepSeek Harness 团队）。补上**事件注入的 Inline & Spill 方法**与**链式召回（Chain of Recall）**机制：把上下文窗口当 Cache 管理，Inline 近期高概率用到的信息、Spill 超预算内容留引用；为 Trigger/Thread/Worker 等对象赋唯一 ID 构成引用图，模型顺引用关系多跳按需召回，缓解长程丢失上下文。这是对本概念"裁剪/压缩/隔离"三手段在事件驱动场景下的补充（Inline & Spill 侧重注入时机与引用图召回，与三手段不互斥）。由此新建概念页 [[super-agent]]、[[router-worker-architecture]]、[[event-driven-agent]]、[[watchdog-control-loop]]。

- 2026-11-02 — 新增 Super-agent 原型拆解信源 `raw/sources/ai/2026-11-02-weixin-superagent-architecture-teardown.md`（第 7 信源）。补上**链式召回的实例与动机**：旧版客户端限制留在群聊里，后续修改需沿消息/Thread/Worker 引用找回那条补充；记录留在数据库中还得在需要时读到，否则模型仍按旧条件继续改。与第 6 信源互证：引用图召回是"磁盘全量、窗口有损"铁律在事件驱动场景的延伸——可见性靠引用链按需恢复，有损性靠 Spill 摘要兜底。

- 2026-11-05 — 新增知乎「从零构建 Agent」第 12 篇信源 `raw/sources/ai/2026-11-04-zhihu-column-agent-long-term-memory.md`（第 8 信源）。补上**长期记忆与 in-context 管理的边界**：跨 Session 记忆不是把历史全量带进窗口，而是结构化提取后按需检索（召回注入会话前、写入轮次后），其"全量历史进 Prompt 不可行"四问题（成本/噪音/重点淹没/记忆失维护）从成本侧印证本概念的 token 预算纪律。新建概念页 [[agent-long-term-memory]]。

- 2026-11-05 — 新增得物技术信源 `raw/sources/ai/2026-11-05-multi-agent-control-shift.md`（第 9 信源）。补上**上下文边界设计原则**：多 Agent 切分应按"看见什么／产出什么"（上下文边界 + 信息压缩边界）而非职业标签——代码分析 Agent 把调用关系/错误堆栈/实现细节压缩成核心 Agent 可直接使用的结论，数据探索 Agent 把原始数据/分布/异常蒸馏成少量关键发现，核心 Agent 只接收与当前决策最相关的上下文。这印证并具体化了本概念"隔离"手段（subagent 独立窗口）：隔离的价值在于划清输入边界与压缩责任；"后端 Agent／数据库 Agent"式标签只是"容易被提示词放大的职业想象"（信源论断，未独立核验）。


- 2026-11-07 — 新增微信信源 `raw/sources/ai/2026-11-07-agent-memory-system-design.md`（第 10 信源）。补强**窗口内 vs 会话外**的分层立场：「上下文窗口≠记忆、聊天记录≠记忆」——放大窗口缓解"放不下"不解决信息管理（筛选/组织/检索/更新），跨会话失忆（本概念"忘事的几种病"中的天然边界）由会话外记忆系统（七模块：触发器/短期/长期/记忆管理器/知识库）承接；其检索 10 步的三路并行召回（短期接进度、长期补背景、外部给事实）正是本概念"上下文组装"的内容供给方——融合排序后的素材由编排层投影进窗口，与 [[agent-memory-system]]、Kiso"投影观"（Context=Projection）互证。

## Open Questions（开放问题）

- 三层记忆（工作记忆 Redis / 长期记忆 pgvector）与 RAG 的分界，待该系列第 11 篇信源补充。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-loop-context-management.md`
- Source: `raw/sources/ai/2026-10-28-kiso-minimal-agent-framework.md`（第 2 信源：投影四句式、microcompact 撤除、Soft/Hard/Raw Tail 阈值、In-Band Summary）
- Source: `raw/sources/ai/2026-10-31-agent-harness-essay-ideal-harness.md`（第 3 信源：注入式 token 账——MCP 30K 注入示例、cache read 占比 97%、Desktop 10% 额度差、256K 有效窗口；均为社区说法，confidence 中）
- Source: `raw/sources/ai/2026-10-31-llm-integration-engineering-hard-parts.md`（第 4 信源：预算六类分配与输出预留、压缩四招、编排层组装裁剪、不可压缩结构化事实落独立存储、丢上下文判据）
- Source: `raw/sources/ai/2026-11-02-namiagent-agent-tutorial.md`（教学实现：网页端上下文逐轮可视化演示每轮全量重发）
- Source: `raw/sources/ai/2026-11-02-superagent-design.md`（Inline & Spill 注入方法、链式召回引用图多跳召回）
- Source: `raw/sources/ai/2026-11-02-weixin-superagent-architecture-teardown.md`（第 7 信源：链式召回实例——旧版客户端限制沿引用找回、记录读到否则按旧条件改）
- Source: `raw/sources/ai/2026-11-04-zhihu-column-agent-long-term-memory.md`（第 8 信源：跨 Session 长期记忆为 in-context 管理的会话外对应物；全量历史进 Prompt 四问题）
- Source: `raw/sources/ai/2026-11-05-multi-agent-control-shift.md`（第 9 信源：上下文边界按"看见什么／产出什么"切分，职业标签是提示词放大的想象）
- Source: `raw/sources/ai/2026-11-07-agent-memory-system-design.md`（第 10 信源：「上下文窗口≠记忆、聊天记录≠记忆」五问框架；窗口内管理 vs 会话外记忆的分层；三路召回为上下文组装供给内容）

## Related Knowledge（相关知识）

- [[agent-loop-context-management|Agent - agent loop 与上下文管理（3）（信源页）]]
- [[kiso-minimal-agent-framework|Kiso：极简 Agent 框架（信源页）]]
- [[kiso|Kiso]]
- [[durable-execution|持久执行（Durable Execution）]]
- [[agent-as-memory|Agent as Memory]]
- [[agent-harness-essay-ideal-harness|Agent Harness 随笔：我理想中的 Harness（信源页）]]
- [[llm-integration-engineering-hard-parts|大模型接进业务系统：工程难点在哪（信源页）]]
- [[namiagent|NamiAgent]]（网页端上下文逐轮可视化的教学演示）
- [[namiagent-agent-tutorial|微博推荐：NamiAgent——零基础 AI Agent 本地实战教程（信源页）]]
- [[agent-long-term-memory|Agent 长期记忆]]（跨 Session 对应物，2026-11-05 新建）
- [[weixin-agent-memory-system-design|企业级 Agent 记忆系统设计拆解（信源页）]]
- [[agent-memory-system|Agent 记忆系统（概念页）]]
