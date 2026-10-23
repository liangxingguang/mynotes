---
id: 2026-10-23-message-system-design-part2
title: 消息系统设计与实现「下篇」：模型与服务层实现
source: 简书
source_url: https://www.jianshu.com/p/6bf8166b291c
source_type: 文章
platform: 简书
created: 2026-10-23
category: 技术
tags:
  - 工程实践
  - 分布式系统
asset_ref: Assets/2026/10/message-system-design-part2.md
wiki_status: pending
---

# 消息系统设计与实现「下篇」：模型与服务层实现

> 上篇概念落地为库表与服务：四张表——Notify（消息本体，type 区分公告/提醒/私信，提醒用 target+targetType+action+sender 四元组）、UserNotify（用户消息队列，isRead 标记）、Subscription（订阅：target/targetType/action/user）、SubscriptionConfig（动作级免打扰，JSON，缺省用默认配置）；NotifyConfig 集中管理 targetType/action 枚举与 reasonAction 订阅原因映射；NotifyService 提供创建/拉取/订阅/已读全套方法，私信创建即推入队列，公告与提醒由用户侧按订阅关系 + lastTime 增量拉取。

## 核心要点

- **Notify 表**：单表承载三类消息（type 枚举 1/2/3），提醒复用四元组字段、公告与私信只用 content；targetType/action 可按业务扩展（如 hate、update）
- **UserNotify 两条产生路径**：私信在 createMessage 时立即插入（推）；公告/提醒在用户登录等时机 pull 时批量插入（拉）
- **pullRemind 流程**：查订阅 → 按 (target, targetType, action, 订阅时间早于提醒创建时间) 匹配 Notify → 用 SubscriptionConfig（无则用默认）过滤 → 生成 UserNotify
- **pullAnnounce 增量**：以 UserNotify 中最近一条公告的 lastTime 为水位线拉新公告
- **subscribe 展开**：reason（如 create_product）经 reasonAction 映射成动作数组，逐动作写 Subscription；cancelSubscription 按 user+target+targetType 删除
- **时序**：提醒 = subscribe → createRemind → pullRemind → getUserNotify；公告 = createAnnounce → pullAnnounce；私信仅 createMessage

## 正文

详见附件抓取正文（全文已收录，含各方法处理逻辑与模型字段定义）。

## 来源

- [消息系统设计与实现「下篇」- 简书](https://www.jianshu.com/p/6bf8166b291c)

## 附件

- [[Assets/2026/10/message-system-design-part2.md]]
