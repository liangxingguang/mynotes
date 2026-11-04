---
id: 2026-11-04-agent-long-term-memory
title: 从零构建Agent(十二)：长期Memory管理
source: 知乎专栏（从零构建Agent系列）
source_url: https://zhuanlan.zhihu.com/p/2100962312010065146
source_type: article
platform: 知乎
created: 2026-11-04
category: 技术
tags: [AI, Agent]
asset_ref: Assets/2026-11-04/zhihu-column-agent-long-term-memory.md
wiki_status: pending
---

# 从零构建Agent(十二)：长期Memory管理

> 摘要："从零构建 Agent"系列第 12 篇。分析 Hermes 的长期记忆设计（四层能力模型），为 ZeroAgent 定义统一的 MemoryProvider 接口（retain/recall），经 Extension 的 before_agent_start / turn_end 扩展点接入 Hindsight 作为默认后端，实现跨 Session 长期记忆，并解析 Hindsight 的 documents/memory_units/entities/memory_links 结构化存储原理。

## 核心要点

1. 上下文窗口 ≠ 长期记忆：长期记忆须跨 Session 保留并可检索；全量历史进 Prompt 会带来成本、噪音、重点淹没、记忆失维护四个问题
2. 记忆三分类：语义（事实/偏好）、情景（过往对话）、程序性（操作流程，宜封装为 Skill）；记忆是上下文而非指令，不得获得高于当前指令的权限
3. Hermes 四层模型：L1 MEMORY.md/USER.md 精简长期记忆；L2 SQLite+FTS5 检索历史对话；L3 外部 Memory Provider；L4 Skills 程序性记忆——各层互补不互替
4. MemoryProvider 接口：retain(content)/recall(query)，Agent 不绑定具体后端，换后端只需实现接口
5. ZeroAgent 接入：before_agent_start 召回记忆注入 long_term_memory Prompt 段；turn_end 仅存用户输入+Assistant 最终回复（工具调用/空内容不存）；记忆异常不中断主流程
6. Hindsight（Vectorize 开源）：Retain/Recall/Reflect 三操作；内部以 documents（原文）、memory_units（提取的事实）、entities（实体）、memory_links（关系）组织记忆
7. 跨 Session 记忆本质：不是记住聊天记录，而是把历史转为结构化记忆后重新检索（Frank 跨会话被正确回忆的示例）
8. 完整源码见 github.com/significantfrank/ZeroAgent chapter12

## 正文

作者长期关注 Agent 的差异化能力——"养马"（Agent 越用越聪明）背后是记忆与学习机制。本文先析 Hermes 的记忆设计，再基于上一篇的 Extension 为 ZeroAgent 实现通用 Memory Provider，并以 Hindsight 实现跨 Session 长期记忆。

Hermes 四层能力模型：
- Layer 1 MEMORY.md / USER.md：精简持久记忆（项目背景、用户偏好），Session 开始时加载；须保持精简否则 Token 开销大
- Layer 2 Session Search：SQLite + FTS5 全文检索原始历史对话；Memory 管"记住什么"，Session Search 管"找回发生过什么"
- Layer 3 Memory Provider：需要语义召回、跨设备共享、独立扩容时委托外部后端（Hindsight）；统一接口 retain/recall
- Layer 4 Skills：程序性记忆，描述"遇到某类任务怎么做"，需维护验证，是 Hermes 变聪明的关键

Hindsight 原理：核心操作 Retain（提取保存记忆）、Recall（检索相关记忆）、Reflect（综合推理）。内部概念：documents 存原始内容；memory_units 是从原文提取的独立事实；entities 是事实涉及的人物/组织/概念；memory_links 连接相关事实。Entity 是"谁或什么"，Memory Unit 是"关于它的事实"，二者关联才构成完整事实。

ZeroAgent 实现：定义 MemoryProvider 接口，HindsightMemoryProvider 封装 Hindsight Client；registerMemoryExtension 注册两个扩展点——before_agent_start 时按用户输入 recall 并注入 systemPromptOptions.sections['long_term_memory']；turn_end 时 retain 本轮对话。记忆服务异常经 reportMemoryError 统一处理，不中断主流程。

## 来源

[从零构建Agent(十二)：长期Memory管理 - 知乎专栏](https://zhuanlan.zhihu.com/p/2100962312010065146)

## 附件

[[Assets/2026-11-04/zhihu-column-agent-long-term-memory.md]]（抓取正文）
