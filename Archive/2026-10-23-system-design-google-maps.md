---
id: 2026-10-23-system-design-google-maps
title: 系统设计面试（第二卷）第03章：谷歌地图
source: GitBook《系统设计面试：内幕指南 第二卷》中文译版
source_url: https://learning-guide.gitbook.io/system-design-interview/xi-tong-she-ji-mian-shi-nei-mu-zhi-nan-di-er-juan/chapter-03-google-maps
source_type: 文章
platform: GitBook
created: 2026-10-23
category: 学习
tags:
  - 分布式系统
  - 工程实践
  - 课程
asset_ref: Assets/2026/10/system-design-google-maps.md
wiki_status: ingested
---

# 系统设计面试（第二卷）第03章：谷歌地图

> 10 亿 DAU 简化版谷歌地图设计：聚焦位置更新、导航（含 ETA）、地图渲染三大特性。核心机制——geohash 网格瓦片化（地图瓦片预计算 + CDN 分发、路由瓦片分层承载 A* 寻路）、位置更新客户端批量上报（15s/批，峰值 100 万 QPS 写 Cassandra + Kafka 分发）、自适应 ETA 用分层路由瓦片快速筛出受交通影响的活跃用户。

## 核心要点

- **地图 101**：Web 墨卡托投影；geohash 递归网格编码；地图瓦片（PNG 图像，21 级缩放，全集约 100PB 存储）与路由瓦片（道路图二进制，分层三级细节）分两类
- **估算**：位置更新每秒上报→300 万 QPS，客户端批量 15s 一批降为 20 万、峰值 100 万 QPS；CDN 每天 6.25PB 地图流量、200 个 POP 分摊
- **位置服务**：Cassandra（写密集、AP 优先），(user_id, timestamp) 分区键+聚类键；位置流同时写 Kafka，供交通更新/路由瓦片处理/个性化/分析消费
- **地图渲染**：预计算静态瓦片 + CDN（动态生成不可缓存、负载大，否决）；矢量瓦片进一步优化带宽与缩放体验；瓦片 URL 客户端算 geohash 或经瓦片服务中介（灵活性权衡）
- **导航服务**：地理编码 → 路线规划器 → 最短路径（A* 变体在路由瓦片图上增量水合相邻瓦片）→ ETA 服务（ML 基于实时+历史交通）→ 排名器（过滤器如避开收费站）
- **自适应 ETA/重路由**：为每活跃用户存路由瓦片链及其各层 super tile，交通事件时按最高层瓦片快速过滤受影响用户；推送协议选 WebSocket（双向，胜过推送通知/长轮询/SSE）

## 正文

详见附件抓取正文（完整章节，含面试官对话、估算推导与章节总结树）。

## 来源

- [第03章：谷歌地图 | 系统设计面试：内幕指南 第二卷](https://learning-guide.gitbook.io/system-design-interview/xi-tong-she-ji-mian-shi-nei-mu-zhi-nan-di-er-juan/chapter-03-google-maps)

## 附件

- [[Assets/2026/10/system-design-google-maps.md]]
