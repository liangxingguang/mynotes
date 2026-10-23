---
id: wiki-source-message-system-design-part2
type: source
title: 消息系统设计与实现「下篇」：模型与服务层实现
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - architecture
  - messaging
sources:
  - raw/sources/architecture/2026-10-23-message-system-design-part2.md
related:
  - wiki/sources/message-system-design-part1.md
  - wiki/concepts/notification-system-design.md
---
# 消息系统设计与实现「下篇」：模型与服务层实现

## Overview（概览）

上篇概念模型的落地篇：四张表的字段设计、NotifyConfig 配置集中管理，以及 NotifyService 服务层各方法的处理逻辑与时序。技术栈特征（模型定义风格）指向 Node.js 系 ORM。

## Key Facts（关键事实）

- **Notify 表**：单表承载三类消息，type 枚举 1=公告/2=提醒/3=私信；提醒用 target+targetType+action+sender 四元组字段，公告与私信只用 content；targetType/action 可按业务扩展（如 hate、update）
- **UserNotify 表**：用户消息队列（user + notify + isRead）；两条产生路径——私信 createMessage 时立即插入（推），公告/提醒在用户 pull 时批量插入（拉）
- **Subscription 表**：target + targetType + action + user；订阅是拉取提醒的前提
- **SubscriptionConfig 表**：action 字段为 JSON 的用户级动作开关，缺省用 defaultSubscriptionConfig（comment/like 默认 true）
- **NotifyConfig 配置文件**：集中管理 targetType 枚举、action 枚举、reasonAction 映射（如 create_product → [comment, like]）、默认订阅配置
- **pullRemind 流程**：查订阅 → 按 (target, targetType, action) 匹配 Notify（订阅时间必须早于提醒创建时间）→ SubscriptionConfig 过滤 → 生成 UserNotify
- **pullAnnounce 增量**：以 UserNotify 中最近一条公告的 createdAt 为 lastTime 水位线拉取新公告
- **subscribe 展开**：reason 经 reasonAction 映射成动作数组，逐动作写 Subscription；cancelSubscription 按 user+target+targetType 删除

## Important Claims（重要论断）

### Claim 1：订阅时间必须早于提醒创建时间才匹配

pullRemind 匹配条件包含 `Subscription.createdAt < Notify.createdAt`，即订阅前的历史提醒不补发——一个重要的语义决策。

## Concepts Introduced（引入的概念）

- [[notification-system-design|站内消息系统领域模型]]

## Entities Mentioned（提及的实体）

- 无新实体

## Implications（影响／启示）

单表三类型 + 四元组可空字段是低成本的站内消息表设计；「拉取时过滤订阅配置」把免打扰判断推迟到读路径，避免写路径为每个用户计算偏好。

## Limitations（局限）

- 2015 年设计文章，无索引设计、分库分表与规模数据
- 拉取模型下提醒的存储量随全站事件增长，文中未讨论清理策略
- 与上篇（[[message-system-design-part1|概念篇]]）为同一系统，需合读

## Related Knowledge（相关知识）

- [[message-system-design-part1|消息系统设计与实现「上篇」：概念与领域建模]]
- [[notification-system-design|站内消息系统领域模型]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-message-system-design-part2.md`
