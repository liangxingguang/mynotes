---
id: 2026-10-23-baidu-live-mcast-message-architecture
title: 百度直播海量用户实时消息系统架构：长连接组播 mcast 实践
source: 52im.net（百度APP消息中台团队）
source_url: http://www.52im.net/thread-3515-1-1.html
source_type: 文章
platform: 52im.net
created: 2026-10-23
category: 技术
tags:
  - 分布式系统
  - 工程实践
asset_ref: Assets/2026/10/baidu-live-mcast-message-architecture.md
wiki_status: ingested
---

# 百度直播海量用户实时消息系统架构：长连接组播 mcast 实践

> 先推演"照搬 IM 群聊"的六个百万级压力点（用户列表/设备/路由/下发/拉取/已读），砍掉拉取与已读后仍剩三个，且峰值资源冗余几十倍、多群组方案有消息不同步与成员不稳问题 → 另辟蹊径：把 groupID 概念下沉到长连接层做组播 mcast。下发变成 1:M×1:N 两级扩散（一致性 hash 选路由实例 → 并发到 M 个长连接实例 → 实例内并发到 N 条连接），用户列表拆分与动态路由查询全部消失。配套优化：秒级聚合打包（+500ms 均延换百倍下发量级）、6.7:1 压缩（单机 15.6Gbps→2.3Gbps）、按优先级分级限速、高优消息立即下发、独立可靠 mcast 通道 + 主播侧推拉结合/短连轮询兜底（礼物触达 99.9%+）。

## 核心要点

- **mcast 模型**：mcastID 全局唯一；连接-组关系维护在长连接实例本地（无独立存储）；路由 mcastRoute 只记"哪些实例持有该组连接"，Join/Leave 峰值 ≤2 万 QPS，比百万低两个数量级
- **容量账**：单实例 25w 长连接下压测 8w QPS 稳定下发（保守按 5w）；100w 下发 20 实例、500w 100 实例、1000w 125 实例；整体下行 QPS = 在线数，容量完全可控
- **峰值聚合**：100 条/秒 × 100w = 1 亿消息/秒 → 每秒聚合成一包，QPS 不变、消息量级百倍；高优消息不聚合立即下发
- **带宽压缩**：万兆网卡被 2K×100×1w 连接打满 → 压缩比 6.7:1（CPU/时延/压缩比平衡调库），全局 1.5Tbps→230Gbps
- **在线保障**：三大运营商 + 香港多接入点、HTTPDNS 多级解析、join 后智能短心跳、断链清除 mcast 成员 + 重连重新 join
- **拓展**：每 mcast 配公共消息信箱（timeline 模型，msgID 范围拉取）支持历史消息；礼物走独立可靠通道（数据流隔离）
- **设计哲学**：允许峰值丢弃与不在线折损，换可控的 QPS/带宽与近零冗余；mcast 机制通用，适用任何"大量在线用户分组推送"场景

## 正文

详见附件抓取正文（全文已收录，含 IM 群聊六压力点推演与性能评估）。

## 来源

- [直播系统聊天技术(四)：百度直播的海量用户实时消息系统架构演进实践 - 52im.net](http://www.52im.net/thread-3515-1-1.html)

## 附件

- [[Assets/2026/10/baidu-live-mcast-message-architecture.md]]
