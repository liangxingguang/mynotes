---
id: wiki-source-zhihu-column-agent-long-term-memory
type: source
title: 从零构建Agent(十二)：长期Memory管理
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: medium
tags:
  - source
  - ai
  - agent
  - memory
sources:
  - raw/sources/ai/2026-11-04-zhihu-column-agent-long-term-memory.md
related:
  - wiki/concepts/agent-long-term-memory.md
  - wiki/concepts/context-management.md
  - wiki/concepts/agent-as-memory.md
---
# 从零构建Agent(十二)：长期Memory管理

## Overview（概览）

知乎专栏「从零构建 Agent」系列第 12 篇（作者 significantfrank，ZeroAgent 开源系列）。分析 Hermes 的长期记忆设计（四层能力模型），为 ZeroAgent 定义统一的 MemoryProvider 接口（retain/recall），经 Extension 的 before_agent_start / turn_end 扩展点接入 Hindsight 作为默认后端，实现跨 Session 长期记忆，并解析 Hindsight 的 documents/memory_units/entities/memory_links 结构化存储原理。本系列为「从零构建 Agent」教程（与已收录的《Agent》系列索引为不同专栏），系列前序依赖：第 11 篇 Extension 扩展机制（本文的两个扩展点来自上一篇）。

## Key Facts（关键事实）

- 上下文窗口 ≠ 长期记忆：长期记忆须跨 Session 保留并可检索；全量历史进 Prompt 带来成本、噪音、重点淹没、记忆失维护四个问题。
- 记忆三分类：语义记忆（事实/偏好）、情景记忆（过往对话）、程序性记忆（操作流程，宜封装为 Skill）；记忆是上下文而非指令，不得获得高于当前指令的权限。
- Hermes 四层模型：L1 MEMORY.md/USER.md 精简长期记忆；L2 SQLite+FTS5 Session Search 全文检索历史对话；L3 外部 Memory Provider；L4 Skills 程序性记忆——各层互补不互替。
- MemoryProvider 接口：retain(content)/recall(query) 两个方法；Agent 不绑定具体后端，换后端只需实现接口。
- ZeroAgent 接入：before_agent_start 时按用户输入 recall 并注入 systemPromptOptions.sections['long_term_memory']；turn_end 时仅存用户输入 + Assistant 最终回复（工具调用、空内容不存）；记忆服务异常经 reportMemoryError 统一处理，不中断主流程。
- Hindsight（Vectorize 开源）核心操作：Retain（提取保存记忆）、Recall（检索相关记忆）、Reflect（综合推理）。
- Hindsight 内部概念：documents 存原始内容；memory_units 是从原文提取的独立事实；entities 是事实涉及的人物/组织/概念；memory_links 连接相关事实。Entity 是"谁或什么"，Memory Unit 是"关于它的事实"，二者关联才构成完整事实。
- 跨 Session 记忆本质：不是记住聊天记录，而是把历史转为结构化记忆后重新检索（作者演示 Frank 跨会话被正确回忆的示例）。
- 完整源码：github.com/significantfrank/ZeroAgent chapter12。

## Important Claims（重要论断）

### 记忆是上下文而非指令

记忆的注入不得获得高于当前指令的权限——长期记忆只影响"模型知道什么"，不改变"模型该做什么"的指挥链。（作者主张/解读）

### Memory 管"记住什么"，Session Search 管"找回发生过什么"

Hermes 的 L2（SQLite+FTS5 全文检索原始对话）与 L3（语义召回的外部 Memory Provider）分工明确：一个是原始日志的检索入口，一个是结构化记忆的语义召回，二者互补不互替。

### 全量历史进 Prompt 不可行

成本（每轮全量重发）、噪音（无关历史稀释重点）、重点淹没、记忆失维护（历史太长无法维护）四个问题决定长期记忆必须走"结构化提取 + 按需检索"而非全量携带。与 [[context-management|上下文管理]] 的 token 预算视角同构。

## Concepts Introduced（引入的概念）

- [[agent-long-term-memory|Agent 长期记忆]]

## Entities Mentioned（提及的实体）

- Hermes（Agent 记忆设计参考系，文中析其四层能力模型；不立实体页）
- Hindsight（Vectorize 开源的记忆后端，不立实体页）
- ZeroAgent（作者自研开源 Agent，本系列载体；不立实体页）

## Implications（影响／启示）

- 记忆后端应通过统一接口（retain/recall）接入，Agent 核心不绑定具体实现——换后端（Hindsight → 其他）只改 Provider 实现，是依赖倒置在 Agent 记忆层的应用（解读）。
- 扩展点（before_agent_start/turn_end）是 Harness 给第三方能力的标准挂载位：召回发生在会话开始前、存储发生在轮次结束后，记忆读写天然贴合这两个时机。
- 存储策略的取舍：只存用户输入与最终回复、不存工具调用与空内容——控制记忆体量，避免噪声入库（解读）。

## Limitations（局限）

- 单一自媒体信源（知乎个人专栏），Hermes 四层模型为作者转述分析，未引 Hermes 官方文档原文核验。
- Hindsight 的存储结构（documents/memory_units/entities/memory_links）为作者解析，未附官方 schema 文档对照。
- 性能与召回质量（如 recall 的准确率/延迟）无实测数据，仅给出 Frank 跨会话回忆的定性示例。

## Related Knowledge（相关知识）

- [[agent-long-term-memory|Agent 长期记忆（概念页）]]
- [[context-management|上下文管理（概念页）]]（in-context 记忆层；长期记忆是其跨会话对应物）
- [[agent-as-memory|Agent as Memory（概念页）]]（另一条"记忆职责放哪"的路线）

## Source（信源）

- `raw/sources/ai/2026-11-04-zhihu-column-agent-long-term-memory.md`
