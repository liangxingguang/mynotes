---
id: wiki-concept-game-mail-system
type: concept
title: 游戏邮件系统的分布式设计
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: medium
tags:
  - concept
  - game-server
  - distributed-systems
sources:
  - raw/sources/architecture/2026-10-28-game-mail-system-design.md
related:
  - wiki/concepts/read-fanout.md
  - wiki/concepts/idempotency-design.md
  - wiki/sources/game-mail-system-design.md
---
# 游戏邮件系统的分布式设计

## Definition（定义）

游戏后端核心系统的一组分布式设计决策族：普通邮件**弱时序**（只关注送达不关注顺序）、公共邮件**延迟创建（读裂变）+ 标记法撤回**、跨服可靠性投递 **Seq+Ack**、合服兼容的 DomainEvent 结构，以及"一切领奖皆邮件"的 Channel 抽象。

## Why It Matters（为什么重要）

邮件是大量游戏系统（发奖、补偿、运营活动）的依托底座；其弱时序特性使其成为分布式问题的"低复杂度收容所"——跨服奖励全走邮件可减巨量复杂度。信源称其为"团队学习分布式知识的极佳案例"。

## Core Characteristics（核心特征）

1. **弱时序换简单**：像现实快递只关注送达；允许其它服务器直接写玩家邮件队列，跨服发奖无需复杂协调。
2. **附件用完整 Item 结构**：简化 MailItem 会丢失道具细节，无法支持邮寄特殊属性道具。
3. **独立邮件队列**：邮件写 MongoDB Document 而非玩家 DB，消费时 + 定时拉取（可用 Change Stream）；邮件可只展示最早部分，异步加载成立。
4. **公共邮件读裂变**：不主动全服写入，玩家在线时由 Game 服拉取插入——避免僵尸号无效写，且**延迟执行是撤回的基础**（已发放邮件通常无法撤回）。
5. **标记法撤回**：标记无效而非删除（可逆、避免分布式复杂度、利于溯源）；支持 Tag 或 GUID 撤回。
6. **可靠性 = 重发 + 去重**：Game 服定时拉取可领取公共邮件，本地 HashSet 领取记录去重（一年几十封，记录可不删）。
7. **复杂度克制**：玩家间事件无需时序、单玩家事件多只求成功——通常只需基础可靠性投递，完整时序实现成本巨高。

## Structure（结构）

DomainEvent 关键字段：`procVersion`（每次启服 +1，保证新事件排在旧事件后）、`srcNodeId/destNodeId`（保留合服前原始服务器 ID，确认仍基于原虚拟链路）、`seq`（事件序号，连续时按序确认同 TCP，不连续则携带前一事件 Guid）。

## How It Works（运作方式）

- 合服场景：生产者合并需保留合服前单服事件投递时序；消费者合并时确认信息无法合并，仍按合服前服务器 ID 确认；每个物理节点在逻辑上扮演多个生产/消费者。
- 邮件 Channel 化：每个领奖功能定义或复用 Channel，**领取奖励 = 领取邮件**（奖励已结算为邮件，随时可领）；背包不足时奖励自动进邮箱，避免过于严格的背包空间测试。

## Relationships（关系）

### Related Concepts（相关概念）

- [[read-fanout|读扩散]]：IM 域同构思想——写路径的一次扩散换成读路径的按需拉取；公共邮件读裂变即读扩散在游戏运营邮件上的实例（解读）。
- [[idempotency-design|幂等设计]]：本地领取记录去重即幂等键思路（解读）。

### Distinctions（区分）

- 与 IM 消息系统的不同：邮件弱时序、可撤回、面向领奖结算；IM 强调会话内时序与在线推送。

## Evolution（演进）

行业层面：P2P 邮件因风控（盗号资产转移）、经济调控（拍卖行收税）、技术风险三因消失，现代游戏大多只留系统邮件（DNF 近年亦大量限制）。

## Open Questions（开放问题）

- 合服时跨大区 Center 合并的完整算法：信源只给数据结构与原则。
- 已进入玩家邮箱邮件的撤回体验优化：信源标注"体验糟糕，实践中不常用"。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-game-mail-system-design.md`（含 Mail/PublicMail/DomainEvent/MailComponent 结构定义）

## Related Knowledge（相关知识）

- [[game-mail-system-design|信源：游戏开发：邮件系统的分布式逻辑与特殊用法]]
