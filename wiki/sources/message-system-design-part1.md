---
id: wiki-source-message-system-design-part1
type: source
title: 消息系统设计与实现「上篇」：概念与领域建模
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - architecture
  - messaging
sources:
  - raw/sources/architecture/2026-10-23-message-system-design-part1.md
related:
  - wiki/sources/message-system-design-part2.md
  - wiki/concepts/notification-system-design.md
---
# 消息系统设计与实现「上篇」：概念与领域建模

## Overview（概览）

简书博文（2015 年，文末标注更新于 2015/11/15），站内消息系统设计的概念篇：从简书/知乎的产品形态归纳消息分类与领域模型，下篇讲实现。作者自述为团队讨论结果的细化呈现。

## Key Facts（关键事实）

- **消息三分类**：公告 Announce（系统→全员）、提醒 Remind（系统→个人，文案格式固定、对特殊对象带超链接）、私信 Message（用户→用户，有具体内容）
- **提醒句式四元组**：「someone do something in someone's something」= sender（触发者）/ action（评论、喜欢、关注等有限集合）/ target（作用对象）/ targetOwner（对象所有者）；对象类型多样时增加 targetType
- **推拉选型**：公告与提醒用拉（消息存消息表，用户按订阅关系在特定时机拉取入个人消息队列）；私信用推（发送时直接写入接收者消息队列）
- **订阅模型**：Subscription = target + targetType + action；subscribeReason 扩展为动作数组（如「喜欢」对应 [更新，评论]、「发布」对应 [评论]）
- **订阅设置**：SubscriptionConfig 存用户级免打扰偏好，缺省回落到系统 defaultSubscriptionConfig
- **五实体**：UserNotify / User / Subscription / SubscriptionConfig / Notify
- 消息聚合（多条相似提醒合并）当时无实现方案，留待后续（原文明示）

## Important Claims（重要论断）

### Claim 1：公告和提醒适合拉、私信适合推

依据是提醒类需要维护「关注某事物」的订阅列表、按订阅关系拉取；私信有明确接收者、直接入队。属经验性设计判断，非 benchmark 结论。

## Concepts Introduced（引入的概念）

- [[notification-system-design|站内消息系统领域模型]]

## Entities Mentioned（提及的实体）

- 简书、知乎（作为对标产品分析对象）

## Implications（影响／启示）

提醒文案的「四元组」归纳把非结构化文案反推为结构化事件字段，是站内消息系统建模的可复用方法；按消息类型分别选择推/拉，是读写扩散思想在站内通知场景的雏形（见 [[read-fanout|读扩散]] / [[write-fanout|写扩散]]）。

## Limitations（局限）

- 2015 年个人博客设计文章，无生产规模数据支撑
- 聚合（知乎式多条合并）明确未实现
- 与下篇（[[message-system-design-part2|实现篇]]）为同一系统，需合读

## Related Knowledge（相关知识）

- [[message-system-design-part2|消息系统设计与实现「下篇」：模型与服务层实现]]
- [[notification-system-design|站内消息系统领域模型]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-message-system-design-part1.md`
