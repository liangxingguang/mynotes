---
id: 2026-10-23-message-system-design-part1
title: 消息系统设计与实现「上篇」：概念与领域建模
source: 简书
source_url: https://www.jianshu.com/p/f4d7827821f1
source_type: 文章
platform: 简书
created: 2026-10-23
category: 技术
tags:
  - 工程实践
  - 分布式系统
asset_ref: Assets/2026/10/message-system-design-part1.md
wiki_status: pending
---

# 消息系统设计与实现「上篇」：概念与领域建模

> 站内消息系统的概念篇：对标简书/知乎提炼出三类消息——公告 Announce、提醒 Remind、私信 Message；提醒句式归纳为「sender 对 targetOwner 的 target 做了 action」四元组（可扩展 targetType）；按类型选择推拉模型（公告/提醒走拉、私信走推）；用「订阅」（target+targetType+action，可按 subscribeReason 扩展动作集）+ 用户级 SubscriptionConfig（含默认配置）决定提醒触达；聚合（多条合并）留待下篇。

## 核心要点

- **消息三分类**：公告（系统→全员）、提醒（系统→个人，文案模板固定带链接）、私信（用户→用户，内容自由）
- **提醒语法四元组**：sender（触发者）/ action（评论、喜欢、关注等有限集合）/ target（作用对象）/ targetOwner（对象所有者），对象类型多样时加 targetType
- **推拉选择**：公告与提醒用拉（存消息表，用户按订阅关系上线拉取入个人队列）；私信用推（发送时直接写入接收者消息队列）
- **订阅模型**：Subscription = target + targetType + action；subscribeReason 区分「喜欢」（订阅更新+评论）与「发布」（只订评论）等不同动作集
- **订阅设置**：SubscriptionConfig 存用户级免打扰偏好，缺省回落到 defaultSubscriptionConfig
- **实体与行为**：五实体 UserNotify/User/Subscription/SubscriptionConfig/Notify；行为含 createNotify、subscribe、updateSubscriptionConfig、pullNotify、getUserNotify、read；聚合与库表设计在下篇

## 正文

详见附件抓取正文（全文已收录）。

## 来源

- [消息系统设计与实现「上篇」- 简书](https://www.jianshu.com/p/f4d7827821f1)

## 附件

- [[Assets/2026/10/message-system-design-part1.md]]
