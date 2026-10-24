---
id: 2026-10-23-vivo-live-im-message-architecture
title: vivo直播系统中IM消息模块的架构实践
source: 52im.net（vivo互联网技术团队·LinDu/Li Guolin）
source_url: http://www.52im.net/thread-3994-1-1.html
source_type: 文章
platform: 52im.net
created: 2026-10-23
category: 技术
tags:
  - 分布式系统
  - 工程实践
asset_ref: Assets/2026/10/vivo-live-im-message-architecture.md
wiki_status: ingested
---

# vivo直播系统中IM消息模块的架构实践

> vivo 秀场直播 IM 模块一年演进总结。核心认知：直播消息与微信类 IM 最大区别是**分优先级**（客户端每秒只能渲染 15~20 条，礼物>公屏、大额>小额、高等级用户>匿名）。推拉结合架构：**短轮询**（2s 间隔 + timestamp 游标，每次只回 10~15 条；存储用 Redis SortedSet 四桶——gift/chat/notify/pk，score=时间戳；日轮询 10+ 亿次，按房间人数动态配置 1.5~2.5s，超高热房间物理隔离 VIP Redis 集群；注意校验过期时间戳防慢查、客户端排重）；**长连接**（HTTP 拿 IP 列表→TCP 接入→鉴权；接入层简洁 + so 插件热更新防重启断连；TCP keepalive + 智能心跳）。分发侧：成员管理固定分片 vs 动态分片取舍、读扩散、批量下发、protobuf 省 43% 字节、**块消息**（1~2s 匀速聚合分发，每秒 10~20 条，超出按优先级丢）。丢弃三策略：低优先级丢弃、老消息丢弃（创建时间间隔过大直接丢）、**增益消息**（后续消息包含前续全量，如 PK 值发 22:10 而非增量 2:0，抗丢包自愈）。

## 核心要点

- **消息分级是直播 IM 区别于社交 IM 的本质**：渲染能力上限决定必须选择性分发
- **SortedSet 选型**：插入/查询低复杂度 + 结构紧凑，按业务类型分四桶 key，附与 List 的时间复杂度对比
- **短轮询调优**：间隔动态配置（配置中心实时下发）、空轮询权衡、过期时间戳慢查防护（后台恢复场景）
- **接入层热更新**：基础连接逻辑入主程序、业务逻辑 so 插件化，发布不重连
- **块消息思想**：以直播间为维度匀速聚合，共用消息头 + 防消息风暴 + 渲染节奏均匀
- **增益消息设计**：状态类消息发全量快照而非增量，天然抗丢包——分布式系统自愈的经典手法
- **演进观**：可演进的 IM 模块，按业务阶段持续升级

## 正文

详见附件抓取正文（全文已收录，含 SortedSet vs List 对比、分片方案取舍与丢弃策略细节）。

## 来源

- [直播系统聊天技术(八)：vivo直播系统中IM消息模块的架构实践 - 52im.net](http://www.52im.net/thread-3994-1-1.html)

## 附件

- [[Assets/2026/10/vivo-live-im-message-architecture.md]]
