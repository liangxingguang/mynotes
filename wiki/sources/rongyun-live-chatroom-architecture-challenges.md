---
id: wiki-source-rongyun-live-chatroom-architecture-challenges
type: source
title: 融云：直播间海量聊天消息的架构设计难点实践
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - source
  - im
  - live-streaming
  - architecture
sources:
  - raw/sources/architecture/2026-10-23-rongyun-live-chatroom-architecture-challenges.md
related:
  - wiki/concepts/live-message-drop-policy.md
  - wiki/concepts/read-fanout.md
  - wiki/entities/rongyun.md
---
# 融云：直播间海量聊天消息的架构设计难点实践

## Overview（概览）

融云技术团队在 52im.net 连载《直播系统聊天技术》第七篇（原题"6000 字干货详解：直播聊天室的无限用户优化"），从高可用、弹性扩缩容、用户管理、消息分发、客户端优化五个角度展开直播聊天室架构，是上篇（[[rongyun-million-online-live-message-distribution|消息分发与丢弃策略]]）的架构全景版。

## Key Facts（关键事实）

- 三层架构：连接层（长连接）/ 存储层（Redis 二级缓存 + 重启备份）/ 业务层（多可用区部署，跨机房容灾）
- 业务层职责分离：聊天室服务管"人"（进出/封禁/上行审核），消息服务管缓存与分发；百万在线房间按 200 台消息服务 × 各 5000 人拆分
- 落点：聊天室按聊天室 ID、用户按用户 ID 做一致性哈希，行为汇聚单节点、内存直读提高缓存命中率
- 平滑扩缩容：Redis 备份状态；扩容按活跃度渐进迁移，分发遍历与拉取路径上自动纠偏落点；销毁前先校验归属防误删 Redis 数据
- 离线判定：聊天室活跃时 30s 未拉取或累计 30 条未拉 → 踢出并同步下线；白名单豁免
- 消息优先级三桶：白名单 > 高 > 低，分桶存储，客户端按序拉取，限速时低优先级先丢
- 客户端：首拉传 0 取最近 50 条、差量拉取、排重上抛、退出清库；Android 渲染五招（MVVM 子线程预处理 / LiveData setValue 优先 / 滑动不刷新 / DiffUtil / 局部刷新）支撑中端机 400 条/秒不卡
- 自定义属性（麦位/角色等必达状态）：全量集合 + 时间戳有序 map 变更记录双存储，通知拉取增量回放

## Important Claims（重要论断）

### 一致性哈希落点是聊天室性能的根基

落点相对固定 → 行为汇聚单节点 → 内存直读不碰第三方缓存 → 响应与分发速度提升。扩缩容的所有复杂度（渐进迁移、路径纠偏、销毁校验）都是为保住这个模型付出的代价。

### 消息控速的核心是取舍，取舍的依据是优先级

直播间同时段海量消息"内容基本相同"，全量分发只会造成卡顿；三桶优先级 + 差异化限速把丢弃集中在低价值消息上。

## Concepts Introduced（引入的概念）

- [[live-message-drop-policy|直播消息丢弃策略]]
- [[read-fanout|读扩散（Fan-out on Read）]]（通知合并 + 拉取形态）

## Entities Mentioned（提及的实体）

- [[rongyun|融云]]

## Implications（影响／启示）

扩缩容不追求"一次性重平衡"，而是把纠偏逻辑埋进正常消息路径（分发遍历时、拉取时），用业务流量自然完成迁移——对强业务性服务的平滑变更很有参考价值。自定义属性的"全量 + 有序变更记录"双存储同样适用于任何需要增量同步的必达状态。

## Limitations（局限）

厂商自述；扩缩容触发阈值、纠偏的一致性窗口（迁移期间消息是否可能漏/重）未展开；400 条/秒客户端数据只给中端机结论、无机型与测试方法。

## Related Knowledge（相关知识）

- [[rongyun-million-online-live-message-distribution|融云：百万人在线的直播间实时聊天消息分发技术实践]]（上篇）
- [[live-streaming-messaging|直播实时消息分发]]（主题）

## Source（信源）

- `raw/sources/architecture/2026-10-23-rongyun-live-chatroom-architecture-challenges.md`
