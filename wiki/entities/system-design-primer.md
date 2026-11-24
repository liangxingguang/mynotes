---
id: wiki-entity-system-design-primer
type: entity
title: system-design-primer（donnemartin）
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - entity
  - system-design
  - learning-resource
sources:
  - raw/sources/architecture/2026-11-24-system-design-primer-interview.md
related:
  - wiki/sources/2026-11-24-system-design-primer-interview.md
  - wiki/entities/system-design-notes.md
  - wiki/entities/cs-systems-design.md
  - wiki/entities/systemdesign-io.md
---
# system-design-primer（donnemartin）

## Overview（概览）

GitHub 开源系统设计面试指南，作者 Donne Martin（软件工程负责人），用 Markdown 写成，配手绘架构图与 Anki 闪卡，是 GitHub 上最受欢迎的教育类项目之一。项目 2017 年创建，收到数百位社区贡献者 PR，被翻译为 16 种语言，发文时 274,986 星。当前认知基于单一微信公众号推介文，未对仓库做一手核验（置信度中）。

## Identity（身份信息）

- Type（类型）: 开源项目 / 学习资源（系统设计面试指南）
- Organization（所属组织）: Donne Martin 个人项目（社区共建，数百位贡献者 PR）
- Role（角色）: 系统设计面试备考教程——知识体系 + 面试题解答 + 闪卡记忆
- Status（状态）: 活跃；文章称最后实质性代码推送在 2024 年 8 月，此后更新趋缓

## Important Facts（重要事实）

- 仓库：github.com/donnemartin/system-design-primer；简体中文版为 README-zh-Hans.md
- 实现语言：Python（OOP 练习以 Jupyter Notebook 形式提供）
- 许可证：开源免费（文章转述）
- 发文时星数：274,986（正文另以约数「27.5 万」表述；未标注统计时间戳）
- 语言版本：英语、日语、简体中文、繁体中文等 16 种
- 内容构成：系统设计知识体系（14 个主题，每主题含原理、优缺点与延伸阅读）＋ 八道经典面试题完整解答 ＋ 六道 OOP 设计题 ＋ 三套 Anki 闪卡牌组 ＋ 三档学习路线 ＋ 真实大厂架构参考（Twitter/Netflix/Instagram/WhatsApp/Uber 及各厂工程博客）
- 核心原则：Everything is a trade-off（一切皆是权衡）
- 答题方法论：四步法——明确用例、约束和假设 → 创建高层设计 → 设计核心组件 → 扩展设计
- 姐妹项目：interactive-coding-challenges（编程面试挑战，50+ 题含 Anki 闪卡）
- 创建者其他项目：data-science-ipython-notebooks（数据科学 IPython 笔记本合集）；aws-cli 早期贡献者
- 文章列举的局限：无视频讲解；OOP 部分 under development；2024 年 8 月后更新趋缓、部分链接可能失效；覆盖广但深度有限；偏面试导向

## Products / Projects（产品／项目）

- 系统设计知识体系：14 主题（性能与扩展性、延迟与吞吐、CAP、一致性/可用性模式、DNS、CDN、负载均衡、反向代理、应用层、数据库、NoSQL、缓存、异步、通信协议、安全）
- 八道经典面试题解答（含架构图与代码）：Pastebin/Bit.ly、Twitter 时间线/搜索、网页爬虫、Mint.com、社交网络图、搜索引擎 KV 存储、Amazon 销售排行榜、百万用户级 AWS 系统
- 六道 OOP 设计题（Python/Jupyter）：HashMap、LRU 缓存、呼叫中心、扑克牌、停车场、聊天服务器
- 三套 Anki 闪卡牌组：System Design / System Design Exercises / OO Design
- 三档学习路线：短期 1-2 周（广度优先）／中期 1-2 月（广度+部分深度）／长期 3 月+（广度+深度）

## Relationships（关系）

- [[system-design-notes]]（同类系统设计学习资源：按 Alex Xu 两卷书整理的 28 章开源笔记，文本笔记形式）
- [[cs-systems-design]]（同类计算机系统知识学习资源，交互式站点形式，定位「重学」不适合初学者）
- [[systemdesign-io]]（同类架构问题集，面试准备定位，50+ 架构设计问题）
- [[system-design-core-components|系统设计核心组件]]（主题页：系统设计核心组件与权衡，覆盖本文涉及的 CAP/缓存/负载均衡等主题）
- 信源页：[[2026-11-24-system-design-primer-interview|这个GitHub项目，让百万工程师通过了系统设计面试（信源页）]]

## Timeline（时间线）

- 2017 — 项目创建（文章转述）
- 2024-08 — 最后实质性代码推送；此后更新趋缓，部分链接可能失效（文章转述）
- 2026-11-24 — 微信公众号文章推介，本实体页据此收录（采集日）

## Current Understanding（当前认知）

system-design-primer 是系统设计面试领域最具影响力的免费开源学习资源之一，以 Markdown 教程＋架构图＋Anki 闪卡的形式提供完整知识地图与八道经典面试题的四步法解答，发文时 274,986 星、16 种语言。其定位是「地图」而非完整教材——告诉学习者需要学什么，深度内容需自行延伸。当前全部认知来自单一微信公众号推介文，星数、内容构成与更新状态均未经 GitHub 仓库一手核验，使用前建议以仓库 README 实际状态为准（置信度中）。

## Evidence（证据）

- `raw/sources/architecture/2026-11-24-system-design-primer-interview.md`
