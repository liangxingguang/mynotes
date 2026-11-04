---
id: wiki-concept-agent-long-term-memory
type: concept
title: Agent 长期记忆
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: medium
tags:
  - concept
  - ai-agent
  - memory
sources:
  - raw/sources/ai/2026-11-04-zhihu-column-agent-long-term-memory.md
related:
  - wiki/concepts/context-management.md
  - wiki/concepts/agent-as-memory.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/harness-engineering.md
  - wiki/sources/zhihu-column-agent-long-term-memory.md
---
# Agent 长期记忆

## Definition（定义）

Agent 长期记忆（Long-term Memory）指跨 Session 保留、可按需检索的 Agent 记忆能力——与 [[context-management|上下文管理]] 只管单会话内（in-context）的窗口预算相对。它不是把历史聊天记录全量携带，而是把历史**转为结构化记忆后重新检索**：记忆在会话开始前被召回注入，在每轮结束后被写入。

## Why It Matters（为什么重要）

- **上下文窗口有边界**：全量历史进 Prompt 带来成本、噪音、重点淹没、记忆失维护四个问题；跨 Session 的"遗忘"使 Agent 无法累积用户偏好与项目背景。
- **Agent 的差异化能力**："养马"（Agent 越用越聪明）背后是记忆与学习机制——没有长期记忆，Agent 每次都是初次见面。
- **记忆是上下文而非指令**：注入的记忆不得获得高于当前指令的权限，只影响"模型知道什么"，不改变"模型该做什么"的指挥链（作者主张）。

## Core Characteristics（核心特征）

1. **记忆三分类**：语义记忆（事实/偏好）、情景记忆（过往对话）、程序性记忆（操作流程，宜封装为 Skill）。
2. **跨 Session 生命周期**：召回发生在会话开始前（before_agent_start），存储发生在每轮结束后（turn_end）；与单会话内的裁剪/压缩/隔离三手段互补。
3. **后端可替换**：Agent 通过统一接口（retain/recall）访问记忆，不绑定具体后端，换后端只需实现接口。
4. **结构化提取而非原文堆叠**：记忆库以"原始文档 + 提取的事实单元 + 实体 + 事实间关系"组织，检索时按语义召回相关事实而非回放全文。
5. **异常不阻断主流程**：记忆服务的读写失败只记录错误，不影响对话主循环。

## Structure（结构）

Hermes 四层能力模型（信源析出，各层互补不互替）：

| 层 | 名称 | 职责 | 实现示例 |
|---|---|---|---|
| L1 | 精简长期记忆 | 项目背景、用户偏好等高价值摘要，会话开始时加载 | MEMORY.md / USER.md（须保持精简否则 Token 开销大） |
| L2 | Session Search | 全文检索原始历史对话——"找回发生过什么" | SQLite + FTS5 |
| L3 | Memory Provider | 需要语义召回、跨设备共享、独立扩容时委托外部后端——"记住什么" | Hindsight（Vectorize 开源） |
| L4 | Skills | 程序性记忆——"遇到某类任务怎么做"，需维护验证 | Skill 资产 |

MemoryProvider 接口（ZeroAgent 定义）：`retain(content)` 写入、`recall(query)` 检索；Agent 核心不感知记忆存储位置。

## How It Works（运作方式）

ZeroAgent 接入路径（信源完整描述）：定义 MemoryProvider 接口 → HindsightMemoryProvider 封装 Hindsight Client → registerMemoryExtension 注册两个扩展点：

1. **before_agent_start**：按用户输入 recall 相关记忆，注入 `systemPromptOptions.sections['long_term_memory']`；
2. **turn_end**：retain 本轮对话——**只存用户输入 + Assistant 最终回复**，工具调用与空内容不存（控制记忆体量、避免噪声入库）。

记忆服务异常经 reportMemoryError 统一处理，不中断主流程。

Hindsight 的内部组织：核心操作 Retain（提取保存）/ Recall（检索）/ Reflect（综合推理）；存储上 documents 存原始内容、memory_units 是从原文提取的独立事实、entities 是事实涉及的人物/组织/概念、memory_links 连接相关事实。Entity 是"谁或什么"，Memory Unit 是"关于它的事实"，二者关联才构成完整事实。

## Relationships（关系）

### Related Concepts（相关概念）

- [[context-management|上下文管理]]：in-context 记忆层（窗口预算、裁剪/压缩/隔离）；本概念是其跨 Session 对应物，两层互补——会话内管"窗口放得下什么"，长期记忆管"窗口外存什么、回来时找回什么"。
- [[agent-as-memory|Agent as Memory]]：另一条路线——把短期记忆职责交给主 Agent 的协调过程（用户单点对接），长期记忆仍文件化；本概念走"结构化记忆库 + 统一接口"路线，两条路线可并用（作者主张长期记忆文件化、短期记忆走主 Agent）。
- [[agent-loop|Agent Loop]]：记忆读写挂在 Loop 的扩展点上（会话前/轮次后），是 Loop 生命周期的标准挂载位。
- [[harness-engineering|Harness Engineering]]：记忆能力属于 harness 的"上下文与记忆"观察面；扩展点机制是 harness 给第三方能力的标准接入方式。

### Distinctions（区分）

- 与"全量历史进 Prompt"的不同：长期记忆是结构化提取 + 按需检索，不是携带原文；与"Session Search 全文检索"（L2）的不同：Memory 管"记住什么"（结构化记忆），Session Search 管"找回发生过什么"（原始日志检索）。

## Evolution（演进）

- 2026-11-05 — 由知乎「从零构建 Agent」系列第 12 篇单信源建立（Hermes 四层模型析出、MemoryProvider 接口、Hindsight 存储结构、ZeroAgent 扩展点接入）。Hermes 模型为作者转述分析、未引官方文档核验，confidence=medium。

## Open Questions（开放问题）

- 召回质量（准确率/延迟）无实测数据：信源仅给出定性示例（跨会话正确回忆 Frank）。
- 记忆的遗忘/更新/纠错策略（冲突事实如何裁决、过期记忆如何降权）：信源未讨论。
- 多用户/多租户下的记忆隔离与权限：信源未讨论。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-04-zhihu-column-agent-long-term-memory.md`（Hermes 四层模型、记忆三分类、MemoryProvider 接口、before_agent_start/turn_end 扩展点、Hindsight documents/memory_units/entities/memory_links、ZeroAgent chapter12 源码）

## Related Knowledge（相关知识）

- [[zhihu-column-agent-long-term-memory|从零构建Agent(十二)：长期Memory管理（信源页）]]
- [[context-management|上下文管理（概念页）]]
- [[agent-as-memory|Agent as Memory（概念页）]]
