---
id: wiki-concept-geohash
type: concept
title: Geohash（地理哈希）
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - concept
  - 地理空间
  - 索引
sources:
  - raw/sources/architecture/2026-10-23-system-design-proximity-service.md
  - raw/sources/architecture/2026-10-23-system-design-google-maps.md
related:
  - wiki/sources/system-design-proximity-service.md
  - wiki/sources/system-design-google-maps.md
---
# Geohash（地理哈希）

## Definition（定义）

把二维经纬度编码为一维字符串的地理编码方案：沿赤道与本初子午线把地球递归四象限细分，经纬度位交替拼接，通常以 base32 表示；前缀共享越长，网格越近。共分 12 级精度，工程实践常用 4~6 级（约 5km~500m 网格）。

## Why It Matters（为什么重要）

数据库索引只能加速单维查询；geohash 把"附近"问题降维成字符串前缀匹配，是 LBS 邻近索引、地图瓦片寻址、位置缓存键归一的通用零件。Redis、PostGIS 等均有内建支持。

## Core Characteristics（核心特征）

1. 递归网格：每加一位精度，网格四分为一；长度即精度
2. 前缀性质：共享前缀越长越接近（单向保证，逆命题不成立）
3. 编码紧凑：base32 字符串可直接做数据库键、缓存键、URL 路径

## How It Works（运作方式）

- **邻近查询**：按搜索半径选最小覆盖精度 → 算当前 geohash + 8 邻居（常数时间）→ 前缀 LIKE 查询各网格取并集
- **结果不足**：逐位截短 geohash 扩大网格，直到凑够数量
- **索引表**：推荐 (geohash, business_id) 复合键一行一实体，增删免锁
- **缓存键归一**：手机定位有漂移，原始坐标不是好缓存键；同网格内所有点映射到同一 geohash，天然归一

## 边界问题（已知缺陷）

- **边界问题 1**：紧邻点可能零共享前缀（分处赤道/本初子午线两侧，如 La Roche-Chalais U08 与 Pomerol ezzz 相距仅 30km）→ 必须连带查 8 邻居
- **边界问题 2**：共享长前缀的两点也可能分属相邻网格 → 同样由邻居查询兜底
- **网格固定**：精度选定后网格大小固定，不能按密度自适应（需截短逻辑或改用四叉树）

## Relationships（关系）

### Distinctions（区分）

- 与**四叉树**：geohash 免建树、更新免锁、实现简单，但网格大小固定；四叉树按密度自适应、天然支持 k 近邻，代价是内存树构建（2 亿商家 ≈1.71GB、分钟级）与加锁更新
- 与 **Google S2**：S2 基于希尔伯特曲线，区域覆盖可指定级别范围与单元数上限，更精细，适合地理围栏；但复杂度高，面试场景一般不展开
- 与**均匀网格**：均匀网格无视密度造成数据分布严重不均，geohash 递归细分是其直接改良

## Evolution（演进）

《系统设计面试》第二卷两个章节分别示范了两种用法：邻近服务章用 geohash 做商家邻近索引与缓存键（双精度/三精度 Redis 缓存约 5GB）；谷歌地图章用 geohash 做地图瓦片与路由瓦片的寻址键（瓦片 URL、对象存储查找键）。

## Open Questions（开放问题）

- 极点/高纬度处网格变形（Web 墨卡托叠加）的处理，信源未涉及
- 与 H3（六边形层次索引）的对比，当前 Wiki 无信源支撑

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-system-design-proximity-service.md`（索引选型、边界问题、缓存键、复合键表设计）
- Source: `raw/sources/architecture/2026-10-23-system-design-google-maps.md`（瓦片化寻址、瓦片服务）

## Related Knowledge（相关知识）

- [[system-design-proximity-service|系统设计面试（第二卷）第01章：邻近服务]]
- [[system-design-google-maps|系统设计面试（第二卷）第03章：谷歌地图]]
