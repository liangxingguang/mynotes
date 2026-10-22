---
id: wiki-entity-system-design-notes
type: entity
title: system-design-notes（GitHub 开源系统设计笔记）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - entity
  - system-design
  - learning-resource
sources:
  - raw/sources/architecture/2026-10-23-github-liquidslr-system-design-notes.md
  - raw/sources/architecture/2026-10-14-system-design-notes-28-cases.md
related:
  - wiki/topics/system-design-core-components.md
---
# system-design-notes（GitHub 开源系统设计笔记）

## Overview（概览）

GitHub 用户 liquidslr 维护的开源笔记仓库，自述为 "Notes of the book System Desgin Interview - An Insider's Guide"（原文如此，含拼写错误），即按 Alex Xu《System Design Interview》两卷书体系整理的系统设计学习笔记。

## Identity（身份信息）

- Type（类型）: 开源学习笔记仓库
- Organization（所属组织）: liquidslr（GitHub 个人账号）
- Role（角色）: 系统设计面试/学习材料
- Status（状态）: 活跃维护（最近提交 2026-08-12）

## Important Facts（重要事实）

- 仓库含 28 个编号章节目录，每个章节对应一个系统设计主题（一手证据：仓库页文件列表，2026-10-23 抓取）
- 章节清单：01 Scaling；02 Back Of the Envelope Estimation；03 System Design Framework；04 Rate Limiter；05 Consistent Hashing；06 Key-Value Store；07 Unique-Id Generator；08 URL Shortener；09 Web Crawler；10 Notification System；11 News Feed System；12 Chat System；13 Search Autocomplete；14 Youtube；15 Google Drive；16 Proximity Service；17 Nearby Friends；18 Google Maps；19 Distributed Message Queue；20 Metrics Monitoring and Alerting System；21 Ad Click Event Aggregation；22 Hotel Reservation System；23 Distributed Email Service；24 S3-like Object Storage；25 Real-time Gaming Leaderboard；26 Payment System；27 Digital Wallet；28 Stock Exchange
- 首次提交 2024-12-24；2025-01 起批量补充各章 Readme；2026 年 4 月密集补齐第 17–28 章（一手证据：仓库提交记录）
- 知乎推荐帖（2026-10-14 采集）称其"快 2 万星"、部分主题附真实工程案例延伸阅读——均为二次信源说法，未独立核实

## Products / Projects（产品／项目）

- 无子项目页面。

## Relationships（关系）

- 内容体系派生自 Alex Xu《System Design Interview》两卷书（未建页）
- 与 [[system-design-core-components|系统设计核心组件]] 主题重叠：限流、一致性哈希、唯一 ID 生成、分布式消息队列、监控告警等组件均有专章

## Timeline（时间线）

- 2024-12-24 — 仓库首次提交
- 2025-01-09 — 批量补充早期章节 Readme
- 2026-04-03 至 2026-04-22 — 陆续补齐第 17–28 章
- 2026-08-12 — 最近一次提交（修正 Scaling 章笔误）
- 2026-10-14 — 知乎想法推荐，称"快 2 万星"

## Current Understanding（当前认知）

一个按经典系统设计面试教材体系组织、近两年持续更新的开源笔记仓库，覆盖从基础概念（扩展性、估算、设计框架）到 25+ 个真实系统设计案例。其章节内容质量、对原书的覆盖度与"真实工程案例延伸阅读"的具体形态，当前信源未确立，需直接阅读各章 Readme 后才能评估。

## Evidence（证据）

- `raw/sources/architecture/2026-10-23-github-liquidslr-system-design-notes.md`（一手：仓库页与提交记录）
- `raw/sources/architecture/2026-10-14-system-design-notes-28-cases.md`（三次：知乎推荐帖）
- 信源页：[[system-design-notes-28-cases|知乎想法：system-design-notes——28 个经典架构案例的开源笔记]]
