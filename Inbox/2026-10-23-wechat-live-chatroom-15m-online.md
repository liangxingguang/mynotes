---
id: 2026-10-23-wechat-live-chatroom-15m-online
title: 微信直播聊天室单房间1500万在线的消息架构演进之路
source: 52im.net（微信后台团队·kellyliang）
source_url: http://www.52im.net/thread-3376-1-1.html
source_type: 文章
platform: 52im.net
created: 2026-10-23
category: 技术
tags:
  - 分布式系统
  - 工程实践
asset_ref: Assets/2026/10/wechat-live-chatroom-15m-online.md
wiki_status: pending
---

# 微信直播聊天室单房间1500万在线的消息架构演进之路

> "把 13 亿人拉个群"的工程回答。1.0：读扩散（一人同时只在一个聊天室）+ longpolling（不用 WebSocket 三理由：推会丢需拉兜底、在线列表难维护、短连客户端简单）+ 无状态 cache recvsvr（通知异步拉取 + 1s 兜底轮询 + 读写表原子切换无锁读 + sect 化扩容）。2.0 解四痛点：重要信令按优先级标记、cache 内分 normal/important 双 seq 优先收（零丢失且不加 KV 访问）；在线统计改"拆 key + 读写分离 + 异步聚合落盘"（心跳只写内存、分 shard 对应 KV key、异步合并全量列表、双指针无锁查询）；历史在线用 HyperLogLog（≤1w 双写 tablekv 精确、>1w HLL 估算 >95% 准）；大房间提前加白走 vip sect 流量隔离；1500w 在线 longpolling 达 9 亿请求/分钟 → proxy 层 hold 请求柔性降频（按在线数定收取间隔 + 丢 notify），400w 压测请求量降 58%。

## 核心要点

- **读扩散选型**：直播聊天室与微信群聊差异大（弱关系、单房间超大、一人一间），写扩散早已证不可行
- **无状态 cache 五件套**：实时通知→异步拉取、1s 兜底轮询防通知失效兼启动自恢复、读写表分离原子切换无锁读、sect 化分摊扩容
- **优先级消息信道**：根因是 recvsvr 只留 2000 条导致重要信令被刷掉；不另建列表（KV 翻倍）而是打标记 + cache 内分表 + important seq 先收
- **分布式在线统计**：弃共享内存主备（复杂+热点）与裸 tablekv（9000w/min 心跳穿透、冗余）→ 拆 key + 内存心跳 + 异步聚合落盘 + 原子切换
- **HyperLogLog**：伯努利过程 + 分桶调和平均，12KB 存 64 位级基数；小基数 tablekv 精确计数、大基数 HLL，定期 merge 在线列表防丢
- **柔性控流**：longpolling 拒绝请求反而滚雪球（回包即发新请求）→ 利用 proxy hold 特性按在线数分级hold/丢 notify，体验换成本

## 正文

详见附件抓取正文（全文已收录，含 HLL 算法推导与各方案优缺点对比）。

## 来源

- [直播系统聊天技术(三)：微信直播聊天室单房间1500万在线的消息架构演进之路 - 52im.net](http://www.52im.net/thread-3376-1-1.html)

## 附件

- [[Assets/2026/10/wechat-live-chatroom-15m-online.md]]
