---
id: 2026-10-14-llm-wiki-advanced-four-steps
title: LLM Wiki 知识库搭建深度教程 2·进阶篇一：四步搭建完整的 LLM Wiki 知识库系统
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/HTp72kpUvbylh7hOrwpKbQ
source_type: article
platform: 微信公众号
created: 2026-10-14
category: 技术
tags: [AI, 工程实践]
wiki_status: pending
ingest_attempts: 2
ingest_error: 微信反爬重抓仍不完整：代码块（架构图/目录树/契约与Schema全文）仅渲染首行，jina兜底前次遇验证码，Wayback无快照；需人工补全采集稿
---

# LLM Wiki 知识库搭建深度教程 2·进阶篇一：四步搭建完整的 LLM Wiki 知识库系统

> 系列教程第二篇：把上篇验证用的纯 Markdown Wiki 升级为可持续维护的完整 LLM Wiki 系统。业界已形成共同模式——`raw/` 存不可变原始资料、`wiki/` 存 LLM 编译后的知识、AGENTS.md/Schema 定规则，核心操作为 Ingest、Query、Lint。四原则：Raw 是证据、Wiki 是知识、Schema 是规则、Agent 是执行器。本篇定架构与边界，下篇才用编程工具实操三个工作流。

## 核心要点

1. **第一步 重构项目目录**：新增 `inbox/`——刚丢进来的 PDF、网页、笔记、截图先进 inbox，经 Ingest 确认标准化后才进不可变的 `raw/`，避免"什么都直接扔进 raw"。
2. **Wiki 分类型，防止变成垃圾场**：不让 Agent 把所有内容都总结成单个 md。8 种页面类型——`source`（单份原始资料的知识化摘要，最基础，其他页都在其上编译）、`concept`（稳定概念）、`entity`（人/公司/产品/项目）、`topic`（主题知识面）、`decision`（判断与理由）、`comparison`（系统比较）、`synthesis`（跨来源综合结论）、`timeline`（随时间演变的知识）。
3. **第二步 重写 AGENTS.md（项目"宪法"）**：定义运行契约，最核心的一条是**证据不变量**——Agent 可以持续改 Wiki，但不能修改证据；重要事实必须可追溯到 `raw/` 原始材料，由 Lint 检查这一约束。
4. **第三步 定义统一页面架构**：Schemas 目录下建 Wiki_Page_Schema.md，规定"知识页面长什么样"，不让每种页面自由发挥（契约与 Schema 全文需看原文复制）。
5. **第四步 三套 Agent Workflow，权限边界先固定**：Ingest（读 raw、创建/修改 wiki、改 index/log、可 archive，禁删知识、禁改 raw）、Query（只读 raw/wiki、回答问题、可写 log）、Lint（只读、仅做安全修复、可改 index、归档只能"建议"）；三个 Agent 均**无权修改 raw、无权删除知识**。
6. **方法论要点**：不要让一个 Agent 拥有所有能力，读写、质检职责分离；系统"活起来"靠 Ingest（编译入库）/Query（消费回答）/Lint（防腐检查）三工作流协同。

## 正文

文章是 LLM Wiki 搭建系列的进阶篇一（上篇搭了纯 Markdown Wiki 验证"知识编译+持续积累"是否有效）。

**总体架构**围绕四条边界：raw/ 是不可变证据层，wiki/ 是 LLM 编译产出的知识层，AGENTS.md 与 Schema 是规则层，Agent 只是执行器。

**四步升级**：①重构目录，关键变化是 inbox/ 与 raw/ 分离——inbox 是待处理缓冲区，只有 Ingest 确认标准化后的资料才进入 raw，raw 一旦写入不可变；②重写 AGENTS.md 运行契约，确立"Agent 可改 Wiki 不可改证据"的证据不变量，所有重要事实必须能回溯到 raw 原始材料，违反由 Lint 发现；③在 Schemas/ 下定义 Wiki_Page_Schema.md 统一页面结构；④拆分三个专职 Agent 工作流而非全能 Agent，并先用权限表钉死边界——Ingest 是唯一能创建/修改 wiki 与 index 的角色，Query 只读回答，Lint 只读检测且修改仅限安全修复，删除知识对所有角色禁止，归档权限也只给 Ingest、Lint 只能建议。

本篇以定架构、定契约、定边界为主，具体的目录树、AGENTS.md 条文、Schema 模板原文以代码块给出，需对照原文复制；下篇将用编程工具一步步实操搭建三个 Agent Workflow。

可与海博知识库实践对照阅读：[[2026-10-14-jd-haibo-ai-knowledge-base]]（其中同样引用了 Karpathy 的 LLM Wiki 思路与"知识编译前移到维护期"）。

## 来源

- 微信公众号：[LLM Wiki知识库搭建深度教程——2. 进阶篇一：四步搭建一个完整的 LLM Wiki 知识库系统](https://mp.weixin.qq.com/s/HTp72kpUvbylh7hOrwpKbQ)

## 附件

无
