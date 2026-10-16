---
id: 2026-10-16-knowledge-base-tech-evolution
title: 一文搞懂知识库的技术演进：从关键词检索、向量 RAG 到 GraphRAG、LLM Wiki、本体论与 Agent
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/p5DFqPrvMkf8y6kpiGmBKw
source_type: article
platform: mp.weixin.qq.com
created: 2026-10-16
category: 技术
tags: [AI, 工程实践]
asset_ref: Assets/2026/10/knowledge-base-tech-evolution.md
wiki_status: pending
---

# 一文搞懂知识库的技术演进：从关键词检索、向量 RAG 到 GraphRAG、LLM Wiki、本体论与 Agent

> 文章梳理知识库技术的能力地图（非线性替代关系）：关键词检索匹配词面、向量检索匹配语义、RAG 把检索结果交给模型作答、混合检索+重排优化召回、知识图谱/GraphRAG 沿实体关系查找、LLM Wiki 持续编译可复用知识页面、本体论统一跨系统业务概念、Agent 在权限与规则约束下调工具执行流程。强调各技术解决不同问题、生产中常并行组合，选型应从问题类型出发，并盯住来源可追溯、权限、版本冲突与执行校验。

## 核心要点

- **能力地图而非升级路线**：每层解决不同问题——找词、找语义、生成答案、沿关系推理、沉淀知识、统一概念、执行操作，生产系统按需组合。
- **RAG 的失败多在链路**：解析/切分/召回/排序/上下文构造任一环节都可能出错，未必是模型不会答。
- **GraphRAG 受限于图谱质量**：边名（如"负责"）不自动等于业务含义；微软实现含实体抽取、社区摘要与 Local/Global Search。
- **LLM Wiki 是知识编译**：原始来源不可变、模型维护互链页面（Karpathy 模式），带来溯源、更新、冲突裁定等新问题，可与 RAG 并用。
- **本体论定义"概念该如何理解"，知识图谱记录"具体事实"**：仅在跨系统语义冲突收益足够时引入。
- **Agent 要求可验证**：执行操作比回答问题更需要权限、审计、来源与执行前校验。
- **选型三问**：知识以什么形式存在？要完成搜索/问答/推理/执行哪类任务？结果如何验证与治理？

## 正文

完整正文见采集态原件（含九阶段能力对照表与四类典型组合架构）：[[Assets/2026/10/knowledge-base-tech-evolution.md]]

## 来源

- [一文搞懂知识库的技术演进 · 微信公众号](https://mp.weixin.qq.com/s/p5DFqPrvMkf8y6kpiGmBKw)

## 附件

- [[Assets/2026/10/knowledge-base-tech-evolution.md]]（web-fetch 抓取正文，10,260 字符，fetch_level=browser）
