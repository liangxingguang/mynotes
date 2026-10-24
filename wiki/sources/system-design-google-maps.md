---
id: wiki-source-system-design-google-maps
type: source
title: 系统设计面试（第二卷）第03章：谷歌地图
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - source
  - 系统设计
  - 地理空间
  - 分布式系统
sources:
  - raw/sources/architecture/2026-10-23-system-design-google-maps.md
related:
  - wiki/concepts/geohash.md
  - wiki/sources/system-design-proximity-service.md
  - wiki/entities/kafka.md
---
# 系统设计面试（第二卷）第03章：谷歌地图

## Overview（概览）

Alex Xu《系统设计面试：内幕指南》第二卷第 3 章中译（GitBook）：设计 10 亿 DAU 的简化版谷歌地图，聚焦三个特性——用户位置更新、导航服务（含 ETA）、地图渲染。核心机制是 geohash 网格瓦片化贯穿始终：地图瓦片预计算 + CDN 分发，路由瓦片分层承载 A* 寻路，位置更新经客户端批量上报后写 Cassandra 并分流 Kafka。

## Key Facts（关键事实）

- 规模设定：10 亿 DAU（截至 2021 年 3 月的真实数据），每用户每周导航 35 分钟 → 每周 50 亿分钟
- 位置更新：每秒上报 → 300 万 QPS；客户端 15 秒批量上报降为 20 万 QPS，峰值按 5 倍计 100 万 QPS
- 地图瓦片存储：21 个缩放级别、单瓦片约 100KB PNG，最高级 4.4 万亿瓦片 ≈ 440PB，按 90% 自然区域高压缩率折减，全集估算约 100PB
- CDN 流量：每天 6.25PB 地图数据（50 亿分钟 × 1.25MB/分钟），200 个 POP 各分摊每秒数百 MB
- 位置存储选型 Cassandra：写密集 + 位置快速过时 → CAP 中选 AP；键为 (user_id 分区键, timestamp 聚类键)，值是经纬度对
- 位置流同时写 Kafka，供实时交通、路由瓦片处理（检测新路/封路）、个性化与分析等下游消费
- 地图渲染否决动态生成（不可缓存、负载大），选预计算静态瓦片 + CDN；矢量瓦片进一步优化带宽与缩放体验
- 瓦片 URL 两种出法：客户端本地算 geohash（高效但硬编码进各平台客户端）或经地图瓦片服务中介返回 9 个 URL（操作灵活性换一跳）
- 导航链路：地理编码 → 路线规划器 → 最短路径（A* 变体在路由瓦片图上按需水合相邻瓦片、跨层级"进入"高速大瓦片）→ ETA（ML 基于实时+历史交通）→ 排名器（避开收费站等过滤器）
- 路由瓦片分三级细节（本地道路/区域干道/城际高速），离线管道周期性从 TB 级原始道路数据构建，protobuf 序列化后按 geohash 存对象存储
- 自适应 ETA：为每活跃用户存路由瓦片链及其各层 super tile（`user_1, r_1, super(r_1), super(super(r_1)), ...`），交通事件时按最高层瓦片快速过滤受影响用户，替代 O(n×m) 全表扫描
- 服务端推送选型 WebSocket：推送通知有效载荷小（iOS 4096 字节）且不支持 Web；长轮询服务器占用大；SSE 仅单向，输给双向的 WebSocket

## Important Claims（重要论断）

### 瓦片化是地图系统的统一抽象

地图瓦片（PNG 图像）与路由瓦片（道路图二进制）共享同一套 geohash 网格划分：前者解决渲染带宽与缓存，后者把全球道路图切成可增量加载的小图，让 A* 的内存消耗与搜索范围可控。分层（三级细节）让长距离路由在高层粗瓦片上跑、末端落在细瓦片上。

### 位置数据是资产而非负担

周期性位置更新不仅服务导航本身，还反哺实时交通、道路变更检测与个性化——因此设计上双写 Cassandra（查询）与 Kafka（流分发），一次采集多处消费。

### 自适应 ETA 的关键是"按瓦片反查用户"

为每个活跃用户预存其路线经过的瓦片及各级 super tile，交通事件发生时只需比对最高层瓦片即可快速筛掉无关用户——用空间层级换扫描成本。

## Concepts Introduced（引入的概念）

- [[geohash|Geohash（地理哈希）]]

## Entities Mentioned（提及的实体）

- Google Maps（设计对象，10 亿 DAU）
- [[kafka|Apache Kafka]]（位置流分发）
- Cassandra（位置存储）、Redis（地理编码数据）、Amazon S3 + CDN（预计算瓦片）

## Implications（影响／启示）

与 [[system-design-proximity-service|邻近服务]] 同书姊妹章：两章都把 geohash 作为空间一维化的基础工具，本章用在瓦片寻址，彼章用在邻近索引——互证 geohash 是地理空间系统设计的通用零件。批量上报（15s/批）把 QPS 压低一个数量级的思路，与 IM/直播长连接的聚合下行思路相通。

## Limitations（局限）

教学章节，数字均为信封背面估算（如存储折减 80~90% 是人为假设）；ETA 的 ML 模型细节、多站点路线规划明确略过；为译本，非英文原版。

## Related Knowledge（相关知识）

- [[system-design-proximity-service|系统设计面试（第二卷）第01章：邻近服务]]
- [[system-design-notes|system-design-notes]]（同书体系的开源笔记）
- [[system-design-core-components|系统设计核心组件]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-system-design-google-maps.md`
