---
id: wiki-concept-exploratory-learning
type: concept
title: 探索式学习（知识 DAG）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - concept
  - learning
  - ai
sources:
  - raw/sources/products/2026-10-14-unyra-local-first-ai-learning-app.md
related:
  - wiki/entities/unyra.md
  - wiki/concepts/codemode.md
---
# 探索式学习（知识 DAG）

## Definition（定义）

探索式学习是归一 Unyra 提出的学习组织模型：从一个想弄懂的目标出发，把知识逐层拆成节点，节点之间以依赖边构成 DAG；同一概念可被多个上层节点引用而不重复创建。每个节点带一份教学文档与任意多份笔记，是「能反复打开、原地改写的读物」，而非聊天记录里的一段回答。

## Why It Matters（为什么重要）

- 通用聊天窗口里学习是**线性**的：讲过的内容沉进上下文，几天后翻不回来，也说不清掌握了哪一块。
- 图结构让「学过什么」「卡在哪儿」「下一步该学什么」第一次有了可以翻回去看的地方（信源原话）。
- 学习状态（自评、系统掌握度估计、错误记忆、考试时间线）挂在节点上，导师每次动笔前都读得到。

## Core Characteristics（核心特征）

1. **从目标开始**：输入问题即建根节点；导师自行判断长期学习（铺可点击大纲：探索式/规划式/完整式）还是一次性任务（只写导读文档），依据不足时按一次性任务处理。
2. **选词建节点**：文档中选中陌生概念，菜单四选一——「学习」（建子节点并开讲）/「了解」（划两三句注解）/「注解」（自写 Markdown 批注）/「询问」（就选段提问），数字键 1~4 直接触发。
3. **导师在文档上动笔**：导师先思考再写 JS 交沙箱执行，讲解直接写进教学文档并说明改动理由；教学正文、节点结构、试卷、注解在一段代码里一次编排完。
4. **学没学会被记下来**：自评、系统掌握度、反复犯的错、探针与考试的检验时间线都在节点上；「有效阅读」只计前台 + 主位 + 未静坐超 60 秒 + 看教学文档的时长。

## Structure（结构）

目标（一份共享上下文）→ 节点（DAG，依赖边）→ 每节点：一份教学文档 + 任意多份笔记 + 试卷；概念作为可复用节点被多处引用。导师文中用 `[概念](moji:learn "定位说明")` 布好下一步入口，已创建/未创建以样式区分。

## How It Works（运作方式）

导师 = 一个目标一段对话上下文（切节点不换、前缀缓存不作废）；人格切换走隐藏指令；上下文 70% 自动压缩为交接摘要（原文保留）。讲解经 JS 沙箱落进文档；代码块可被导师「编译」成 JS 在一次性沙箱运行，输出贴回代码块下。

## Relationships（关系）

### Related Concepts（相关概念）

- [[codemode|Codemode（代码模式工具编排）]]：导师「写 JS 经沙箱编排动作」即 Codemode 模式在教学场景的实例。
- [[agent-sandboxing|Agent 沙箱隔离]]：沙箱是导师直接改写文档、运行代码的安全前提。

### Distinctions（区分）

- 与**线性聊天式学习**不同：知识沉淀在可回看的文档与图结构上，而非一次性对话流。
- 与**卡片式记忆工具**（如间隔重复 Anki）不同：考试卷面是一份可反复考的文档而非卡片堆，状态追踪嵌在知识节点上（解读：两者可互补，信源未讨论间隔重复算法）。

## Evolution（演进）

- 2026-10：归一 Unyra（v0.6.x）以 Electron 桌面应用落地该模型，前身数据目录为 moji-notes。

## Open Questions（开放问题）

- 该模型对长期学习效果的实证证据：当前信源未确立（仅项目自述）。
- 知识 DAG 在大规模目标下的维护成本与导师拆解质量：未知。

## Evidence（证据）

- Source: `raw/sources/products/2026-10-14-unyra-local-first-ai-learning-app.md`

## Related Knowledge（相关知识）

- [[unyra|归一 Unyra]]
- [[unyra-local-first-ai-learning-app|信源页：归一 Unyra README]]
