---
id: 2026-11-06-weknora-dept-knowledge-base
title: 我用腾讯开源的 WeKnora 搭部门知识库：检索很准，但它只有一半功能
source: 微信公众号 · 硬件AI工坊（作者 hardvis）
source_url: https://mp.weixin.qq.com/s/byg5LP34T5XL8LKe08CxOw
source_type: article
platform: 微信公众号
created: 2026-11-06
category: 技术
tags: [RAG, AI]
asset_ref: Assets/2026-11/weKnora-dept-knowledge-base.md
wiki_status: pending
---

# 我用腾讯开源的 WeKnora 搭部门知识库：检索很准，但它只有一半功能

> 硬件工程师 hardvis 部门知识库实战实录：个人库（Obsidian+AI）不够用、RAG 框架太费劲，选中腾讯开源 WeKnora（3w+ star，微信对话平台技术沉淀），Docker 私有化部署 + fork 二开。跑了才发现：检索那半已经很好，缺的是知识维护那半——没有在线编辑，维护只能"删了重传"。

## 核心要点

1. 现有方案两难：个人库（权限/共享/沉淀对不上团队）；框架（LLM Wiki 式骨架，非软件团队自己攒动量太大）
2. WeKnora 三种能力共用一个库：RAG 查资料、Agent 处理多步任务、Wiki 整理知识；文档解析（PDF/Word/图片/扫描件）、混合检索（关键词+向量+知识图谱、带引用溯源）
3. 硬件场景硬约束：私有化部署——原理图、测试报告不能上公有云
4. 部门知识底座架构：WeKnora 当 HUB 管资料/检索/权限，多子应用（原理图评审 SchematicForge、MIC 音频分析、图像 IQ 对比、测试报告评审）互相贡献与复用经验
5. 两个试点方向：问题分析专题库（固定字段模板 + 积分/排行榜激励录入）；测试报告协同评审（checklist 初筛：覆盖项、标准版本、结构化指标超限）
6. 三条边界：①"没发现异常"≠"通过"，输出待确认清单给人拍板；②定量阈值用确定性规则算，AI 不当计算器；③未经人工确认的结论不进正式知识库
7. 领导之问戳中短板：知识库只能"删了重传"，无在线编辑——检索链路全在前半段，日常维护（改文档、更新结论、下掉过期资料）没入口
8. 核心判断：检索那半已不难（开源+AI 二开，硬件工程师也能落地）；真正难的是"知识怎么被持续维护起来"那半

## 正文

起头是作者做 AI 原理图评审系统时加的"评审经验存取"功能，同事一句"要不要搞部门知识库"引出本篇。两部分叙事：

**上半篇·选型落地**：搜了一圈只有"个人库"和"框架"两类，缺"开箱能用还能改"的中间层。WeKnora 的 Docker 私有化+API+混合检索正中需求。fork 后让同事先能往里放东西（知识共建页）优先于其他。规划以 WeKnora 为 HUB 建成 4 个工具子应用的知识底座，各应用既贡献知识又能复用别人确认过的经验（如原理图评审直接引用已确认的 MIC 电路问题）。

**下半篇·短板**：节前演示，领导问"文档能在线编辑保证最新吗"——不能。WeKnora 重心全在解析/切片/向量化前半段，维护=删+重传，没有编辑入口。作者反思满脑子都是"检索准不准"，没想过"知识进去之后怎么一直活着"。理想形态是 WeKnora + 在线文档拼接。

对本库（raw/wiki 四层模型）的印证：作者踩的"维护入口缺失"正是 wiki-ingest/wiki-lint 与 raw append-only 要解决的问题；"人工确认前不进正式知识库"与本库 pending→ingested 的队列五态一致。

## 来源

- 原文：https://mp.weixin.qq.com/s/byg5LP34T5XL8LKe08CxOw

## 附件

- [[Assets/2026-11/weKnora-dept-knowledge-base.md]]
