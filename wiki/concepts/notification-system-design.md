---
id: wiki-concept-notification-system-design
type: concept
title: 站内消息系统领域模型
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - concept
  - architecture
  - messaging
sources:
  - raw/sources/architecture/2026-10-23-message-system-design-part1.md
  - raw/sources/architecture/2026-10-23-message-system-design-part2.md
related:
  - wiki/concepts/read-fanout.md
  - wiki/concepts/write-fanout.md
  - wiki/sources/message-system-design-part1.md
  - wiki/sources/message-system-design-part2.md
---
# 站内消息系统领域模型

## Definition（定义）

站内消息（通知）系统的一套领域建模方法：把消息分为公告 Announce / 提醒 Remind / 私信 Message 三类，提醒用「sender 对 targetOwner 的 target 做了 action」四元组结构化，按类型分别选择拉（公告/提醒，订阅驱动）或推（私信，直写接收者队列）的投递方式，并用订阅（Subscription）+ 用户级订阅配置（SubscriptionConfig）控制提醒触达。源自简书 2015 年上下篇设计文章。

## Why It Matters（为什么重要）

站内消息是几乎所有社区/内容产品的标配模块，这套模型给出了从「文案句式反推事件字段」的建模方法与最小可行的库表/服务层结构，是从零设计通知系统时的经典参照；其「公告/提醒走拉、私信走推」的选型正是 [[read-fanout|读扩散]] 与 [[write-fanout|写扩散]] 思想在站内通知场景的实例。

## Core Characteristics（核心特征）

1. **消息三分类**：公告（系统→全员）、提醒（系统→个人，模板文案带链接）、私信（用户→用户，自由内容）；单表 type 枚举承载三类，提醒复用四元组字段，公告/私信只用 content。
2. **提醒四元组**：sender / action（有限枚举，可扩展如 hate、update）/ target / targetOwner；对象类型多样时加 targetType。建模方法是从真实提醒文案归纳句子结构反推字段。
3. **按类选型推拉**：公告与提醒存消息表、用户按订阅关系上线拉取入个人队列（拉）；私信发送时直接写入接收者消息队列（推）。
4. **订阅驱动拉取**：Subscription = target + targetType + action + user；subscribeReason 经 reasonAction 映射展开为动作数组逐条订阅；匹配时要求订阅时间早于提醒创建时间（不补发历史）。
5. **免打扰后置到读路径**：SubscriptionConfig（JSON，动作级开关）在 pullRemind 时过滤，缺省回落 defaultSubscriptionConfig；写路径不感知用户偏好。

## Structure（结构）

四张表：Notify（消息本体，type 1/2/3）→ UserNotify（用户消息队列，isRead 标记，私信即推插入、公告/提醒拉时插入）→ Subscription（订阅）→ SubscriptionConfig（用户级动作开关，JSON）；外加 NotifyConfig 配置文件集中管理 targetType/action 枚举与 reasonAction 映射、默认订阅配置。服务层 NotifyService 提供 createAnnounce/createRemind/createMessage/pullAnnounce/pullRemind/subscribe/cancelSubscription/getSubscriptionConfig/updateSubscriptionConfig/getUserNotify/read。

## How It Works（运作方式）

- **提醒链路**：业务动作后 subscribe（reason→动作数组展开写 Subscription）→ 事件发生时 createRemind 写 Notify → 用户登录等时机 pullRemind（查订阅 → 按四元组+时间序匹配 Notify → SubscriptionConfig 过滤 → 批量生成 UserNotify）→ getUserNotify 展示、read 标记已读。
- **公告链路**：createAnnounce 写 Notify → pullAnnounce 以 UserNotify 中最近一条公告 createdAt 为 lastTime 水位增量拉取。
- **私信链路**：仅 createMessage——写 Notify 同时立即插入接收者 UserNotify。

## Relationships（关系）

### Related Concepts（相关概念）

- [[read-fanout|读扩散（Fan-out on Read）]]：公告/提醒的「存一份、按订阅拉取」即读扩散在站内通知场景的实例。
- [[write-fanout|写扩散（Fan-out on Write）]]：私信的「发送即写接收者队列」即写扩散（1:1 特例）。

### Dependencies（依赖项）

- 无外部系统依赖（信源未涉及 MQ/推送通道，纯库表 + 服务层设计）。

### Distinctions（区分）

- 与 IM 群聊的读写扩散（[[read-fanout]] / [[write-fanout]]）不同：站内通知是异步、非实时场景，推拉选型按「消息类型」而非「群规模」划分；无已读回执、撤回等每成员投递记录的强需求讨论。

## Evolution（演进）

- 2015 原始设计：聚合（知乎式多条相似提醒合并）明确提出但无实现方案；targetType/action 预留业务扩展位。

## Open Questions（开放问题）

- 聚合的具体实现（合并存储 vs 展示层合并）信源未覆盖。
- 拉取模型下 Notify 提醒记录随全站事件无限增长的清理/归档策略未讨论。
- 大规模下 pullRemind 的「订阅 × Notify」匹配查询性能（索引设计）未涉及。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-message-system-design-part1.md`（概念与领域建模：三分类、四元组、推拉选型、订阅与订阅配置、五实体与行为分解）
- Source: `raw/sources/architecture/2026-10-23-message-system-design-part2.md`（实现：四表字段、NotifyConfig、NotifyService 各方法处理逻辑与时序）
- 均为 2015 年个人博客设计文章，无生产规模验证 → confidence: medium

## Related Knowledge（相关知识）

- [[message-system-design-part1|消息系统设计与实现「上篇」：概念与领域建模]]
- [[message-system-design-part2|消息系统设计与实现「下篇」：模型与服务层实现]]
