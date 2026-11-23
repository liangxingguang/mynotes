---
id: 2026-11-23-llm-wiki-knowledge-graph
title: LLM-Wiki：基于知识图谱的本地知识库系统
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/bKHpmZhO-rou0ZE99mUUtg
source_type: 网页
platform: 微信
created: 2026-11-23
category: 技术
tags: [RAG, AI]
asset_ref: Assets/2026-11/weixin-bkhpmzh-rou0ze99muugtg.md
wiki_status: pending
---

# LLM-Wiki：基于知识图谱的本地知识库系统

> RAG 系列第六篇，提出对 RAG 的补充方案 LLM-Wiki：先指出 RAG 三大先天问题（chunk 粒度难控、向量召回语义鸿沟、信息碎片化丢失时序），再给出 LLM-Wiki 架构——用大模型作"知识编译器"把原始资料编译为互相引用的 Wiki（ObsIDian 存储），检索由 Skill 控制、CLI 执行，以图谱遍历方式支撑关联分析与深度推理。

## 核心要点

- **三层定位**：RAG 是基础层（向量相似度、事实快答）、LLM-Wiki 是增强层（知识图谱遍历、关联分析与深度推理）、DeepSearch 是扩展层（多轮搜索+验证、开放域实时查询），三者互补而非互斥。
- **RAG 三大问题**：chunk 切分粒度难控（切碎丢上下文、切大带噪声）；向量召回语义鸿沟（query 是问题、chunk 是陈述，语义空间不一致）；信息碎片化（丢失时序与整体上下文）。滑动窗口、HyDE、重排、上下文扩充都只是补丁。
- **核心架构**：原始资料 → LLM 知识编译器 → Wiki 知识库（Obsidian 存储）→ 对 Wiki 问答；Wiki 的本质是知识间通过 `[[双括号]]` 引用互链成图。非现成开源框架，是概念+AI Coding 实现，考验架构与设计能力。
- **实战（采购合同知识库）**：`agent.md` 作工作规范，LLM 将合同抽取为 JSON 再转 MD；`sources/` 存原件，wiki 页用双括号引用实体/概念，点按跳转形成图谱；Obsidian 仅作存储管理，建索引专门解析双括号。
- **检索设计**：Obsidian CLI 承担复杂检索（避免全量塞入撑爆上下文）；`index.md` 作为检索入口目录，先读目录再定位实体；智能体加载 Skill 执行查询。
- **三 Skill 协作**：Knowledge-Recall（优先级最高，扫 index 命中既有知识直接复用）→ Wiki-Query（未命中时完整检索）→ Knowledge-Capture（回答后沉淀为新文档），越用越聪明、越用越快。
- **选型建议**：文档量大用 RAG，文档量少但需深度问答/总结用 Wiki；复杂整体性问题（如"哪些饭店用了预制菜"）传统 RAG 难解，Wiki 擅长。
- **先天条件与对比**：依赖强基模（文中用 32B，换小模型效果立降）、上下文长度要求高、速度慢；与 GraphRAG 的区别是——LLM-Wiki 用 Wiki 链接模拟图谱（文档型），GraphRAG 用图数据库存图谱（计算型）。

## 正文

见 `[[Assets/2026-11/weixin-bkhpmzh-rou0ze99muugtg]]`（抓取稿，配图原位为 1px 占位符属公众号抓取常态，文字内容完整）。

## 来源

- https://mp.weixin.qq.com/s/bKHpmZhO-rou0ZE99mUUtg

## 附件

[[Assets/2026-11/weixin-bkhpmzh-rou0ze99muugtg.md]]
