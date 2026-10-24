---
id: wiki-source-system-design-proximity-service
type: source
title: 系统设计面试（第二卷）第01章：邻近服务
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - source
  - 系统设计
  - 地理空间
  - LBS
sources:
  - raw/sources/architecture/2026-10-23-system-design-proximity-service.md
related:
  - wiki/concepts/geohash.md
  - wiki/sources/system-design-google-maps.md
---
# 系统设计面试（第二卷）第01章：邻近服务

## Overview（概览）

Alex Xu《系统设计面试：内幕指南》第二卷第 1 章中译（GitBook）：设计 1 亿 DAU、2 亿商家的"附近地点"服务（Yelp 类）。LBS（读多、无状态）与商家服务（写少）分离；全章重心在地理空间索引选型——二维搜索/均匀网格/geohash/四叉树/Google S2 逐一比较，面试建议 geohash（简单）或四叉树（支持 k 近邻、按密度自适应）。

## Key Facts（关键事实）

- 估算：1 亿 DAU × 每日 5 次搜索 ≈ 5000 QPS；读写比极高 → 主从架构、读副本扛读流量；商家变更次日生效（业务协议）
- 地理索引两大族：Hash 类（均匀网格、geohash、笛卡尔层）与 Tree 类（四叉树、Google S2、R 树）；工业界最广用 geohash、四叉树、S2
- geohash：经纬度位交替递归二分、base32 编码；12 级精度，实践取 4~6 级（对应约 5km~500m 网格）；Google 总部长度 6 的 geohash 为 9q9hvu
- geohash 边界问题：紧邻点可能零共享前缀（跨赤道/本初子午线，如 La Roche-Chalais U08 与 Pomerol ezzz 相距 30km）→ 查当前网格 + 8 邻居（常数时间可算）；商家不足时逐位截短 geohash 扩大半径
- 四叉树：内存数据结构（非数据库方案），按"网格内商家 ≤100"递归细分；2 亿商家 ≈ 200 万叶子 + 67 万内部节点 ≈ 1.71GB，构建需数分钟；天然支持 k 近邻与按密度自适应网格
- 四叉树运维影响：启动构建期间不服务流量 → 灰度/蓝绿发布；动态更新需加锁，通常改为集群内滚动重建
- S2：基于希尔伯特曲线把球面映射到 1D，擅长地理围栏与灵活区域覆盖；面试中太复杂不推荐展开
- 地理索引表推荐 (geohash, business_id) 复合键一行一商家（option 2），增删无需锁；整表数据量小（GB 级）可放单机工作集 → 读扩展用副本而非分片
- 缓存键必须归一到 geohash（手机定位漂移使原始坐标不是好键）；缓存 geohash→商家 ID 列表（4/5/6 三个精度，8B×2亿×3 ≈ 5GB Redis）+ business_id→商家详情；夜间作业刷新
- 多区域多可用区部署：就近接入、按人口密度分区、合规（GDPR/CCPA 数据本地化 + DNS 路由）

## Important Claims（重要论断）

### 空间索引的本质是二维降一维

数据库索引只能加速单维查询；geohash/四叉树/S2 的共同思想是把地图切成小区域并建立可快速检索的一维索引，差别在划分是否均匀、是否支持动态密度与 k 近邻。

### 索引数据量比直觉小，别急着分片

2 亿商家的四叉树索引仅约 1.71GB、geohash 索引同量级，整个工作集可放单机内存——读扩展用读副本即可，分片带来的应用层复杂度没有技术理由支撑。这是"先算数据量再谈分片"的典型案例。

### geohash 与四叉树是简单性与表达力的取舍

geohash 免建树、更新免锁、半径查询直接，但网格大小固定；四叉树按商家密度自适应、支持 k 近邻，代价是构建耗时、更新复杂、需处理并发与再平衡。

## Concepts Introduced（引入的概念）

- [[geohash|Geohash（地理哈希）]]

## Entities Mentioned（提及的实体）

- Google S2、PostGIS、Redis GEOHASH（地理空间方案）；Yelp、Google Places（对标产品）

## Implications（影响／启示）

与 [[system-design-google-maps|谷歌地图章]] 互证 geohash 的通用性：本章做邻近索引与缓存键归一，彼章做瓦片寻址。"缓存前先问是否需要缓存"（工作集可放内存、读副本可扩读）的论证顺序值得在缓存设计讨论中复用。

## Limitations（局限）

教学章节；精度-半径映射、四叉树内存估算均为近似值；S2 仅简述优势未展开；为译本。

## Related Knowledge（相关知识）

- [[system-design-google-maps|系统设计面试（第二卷）第03章：谷歌地图]]
- [[system-design-notes|system-design-notes]]（同书体系的开源笔记）
- [[system-design-core-components|系统设计核心组件]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-system-design-proximity-service.md`
