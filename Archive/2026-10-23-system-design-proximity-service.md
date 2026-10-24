---
id: 2026-10-23-system-design-proximity-service
title: 系统设计面试（第二卷）第01章：邻近服务
source: GitBook《系统设计面试：内幕指南 第二卷》中文译版
source_url: https://learning-guide.gitbook.io/system-design-interview/xi-tong-she-ji-mian-shi-nei-mu-zhi-nan-di-er-juan/chapter-01-proximity-service
source_type: 文章
platform: GitBook
created: 2026-10-23
category: 学习
tags:
  - 分布式系统
  - 工程实践
  - 课程
asset_ref: Assets/2026/10/system-design-proximity-service.md
wiki_status: ingested
---

# 系统设计面试（第二卷）第01章：邻近服务

> 1 亿 DAU、2 亿商家的"附近地点"服务设计：LBS（读多无状态）+ 商家服务（写少）分离。核心是地理空间索引选型——二维搜索/均匀网格/geohash/四叉树/S2 逐一比较，推荐 geohash（简单）或四叉树（支持 k 近邻）；geohash 需处理边界问题（赤道/本初子午线两侧无共享前缀 → 加 8 邻居网格；前缀相似≠邻近）与商家不足（截短 geohash 扩大半径）。索引数据量小（四叉树全量约 1.71GB），读副本优于分片；缓存键用 geohash 而非原始经纬度。

## 核心要点

- **估算**：1 亿 DAU × 每日 5 次搜索 ≈ 5000 QPS；读写比极高 → 主从架构，读副本扛读流量
- **地理索引对比**：均匀网格问题在商家分布不均；geohash 递归细分、base32 编码，精度 4~6 级对应 500m~5km 半径；四叉树内存结构（200 万叶子 + 67 万内部节点 ≈ 1.71GB），按商家数（如 100/网格）自适应细分，天然支持 k 近邻；S2 基于希尔伯特曲线，地理围栏/区域覆盖更精细但面试中太复杂
- **geohash 边界问题**：紧邻点可能无共享前缀（跨赤道/本初子午线）→ 查当前网格 + 8 邻居（常数时间算出）；商家不足时逐位截短 geohash 扩大搜索范围
- **索引表设计**：推荐（geohash, business_id）复合键一行一商家（option 2），增删无需锁；数据量小可整表放单机工作集，读扩展用副本而非分片
- **缓存**：缓存键必须归一到 geohash（手机定位有漂移，原始坐标不是好键）；缓存 geohash→商家 ID 列表（3 个精度约 5GB Redis）+ business_id→商家详情；新商家次日生效 → 夜间作业刷缓存
- **部署**：多区域多可用区（就近接入、密度分区、隐私合规如 GDPR/CCPA）；四叉树启动构建需数分钟 → 灰度/蓝绿发布

## 正文

详见附件抓取正文（完整章节，含面试官对话、geohash/四叉树伪代码与内存估算推导）。

## 来源

- [第01章：邻近服务 | 系统设计面试：内幕指南 第二卷](https://learning-guide.gitbook.io/system-design-interview/xi-tong-she-ji-mian-shi-nei-mu-zhi-nan-di-er-juan/chapter-01-proximity-service)

## 附件

- [[Assets/2026/10/system-design-proximity-service.md]]
