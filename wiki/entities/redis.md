---
id: wiki-entity-redis
type: entity
title: Redis
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - entity
  - redis
  - cache
  - in-memory
sources:
  - raw/sources/architecture/2026-10-28-like-follow-high-concurrency-design.md
  - raw/sources/architecture/2026-10-22-signin-system-distributed-evolution.md
  - raw/sources/architecture/2026-10-21-business-risk-control-redis-lua-annotation.md
related:
  - wiki/sources/like-follow-high-concurrency-design.md
  - wiki/sources/signin-system-distributed-evolution.md
  - wiki/sources/business-risk-control-redis-lua-annotation.md
  - wiki/concepts/interaction-write-path.md
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/longadder-internals.md
  - wiki/concepts/write-fanout.md
  - wiki/entities/kafka.md
---

# Redis

## Overview（概览）

开源内存键值数据库（本库三信源覆盖其互动系统承诺层、签到系统布尔判定、风控计数三类用法）。在互动写路径中承担"承诺层/计数中心"角色：先更缓存立即返回，持久化交给 MQ+DB 异步链路；单线程执行模型既是原子性的来源，也是大 key/热点的天然死穴。

## Identity（身份信息）

- Type（类型）: 内存键值存储 / 数据结构服务器（KV + String/Hash/List/Set/ZSet/Bitmap/HyperLogLog/Geo/Stream 等结构）
- Organization（所属组织）: Redis Ltd（开源，BSD 系许可）
- Role（角色）: 本库定位为「承诺层/缓存加速层」——计数中心、判重集合、排序集合、限流器；**不是事实来源**（真相在 DB 与 MQ）
- Status（状态）: 主流活跃（信源覆盖 Cluster 分片、6.2+ `SMISMEMBER` 等版本特征）

## Important Facts（重要事实）

- **单线程执行模型**：原子的是单条命令，不是业务组合——"判断→写入→计数"三条命令分开执行在并发下计数翻倍；Lua 脚本整体不被打断，是解决组合原子性的正解（单线程执行 Lua + 整体原子，"判重+写入+计数+返回"合成 1 次网络往返）。`MULTI/EXEC` 只是排队执行、拿不到中间返回值做不了分支（幂等判断需两次 RT），不适合需要条件分支的场景。
- **Cluster 分片边界**：一个 key 只会落在一个 slot 上，单 key OPS 上限约 8~10 万；Cluster 能分片数据但拆不了单个 key——爆款内容 10w QPS 全压一个计数 key 即单分片 CPU 打满，须靠计数分桶 + 本地聚合 + Caffeine 绕过。
- **数据结构选型**（互动关系场景）：Set（直观、`SADD` 天然幂等、千万级约 500MB+）vs Bitmap（1000 万 bit 仅 1.25MB、约省 32 倍、`GETBIT` 严格 O(1)、要求 uid 连续或可控）vs Hash（可带时间戳等元信息、大 key 风险）vs ZSet（按时间排序分页、内存更大）。
- **Bitmap 使用纪律**：千万别上来就用——uid 稀疏（雪花 ID）会按最大 uid 撑爆内存；正确姿势是分段 Bitmap（如每段 2^28 位≈32MB 的高位分段路由）/ RoaringBitmap（几 KB 装十万级稀疏）/ 回退 Set。`SETBIT` 返回旧值可直接当幂等标记（省 SISMEMBER+SADD 两步）。
- **大 key 死穴**：`SCARD`/`SMEMBERS` 大 key 读写阻塞单线程好几秒；对策：粉丝集合按 uid 哈希分片（64 片、每片 ≤20w）、`SSCAN` 游标分页、独立计数 key（`HINCRBY` 读总数 O(1) 不受分片影响）、热页只缓存前 100 页。
- **ZSet 时间分页**：`following:{uid}` / `follower:{uid}` 以 member=对方 ID、score=时间戳存双向关系，`ZREVRANGE` 天然按时间倒序分页；关注/取关走 Lua 双向原子同时更新双方列表+计数，规避分布式事务；共同关注 `SINTER` 一次求交集。
- **Pipeline 批量**：列表页 20 条内容循环查 Redis = 20 次 IO（RT 50ms 起步）；`executePipelined` 打包命令 + `SMISMEMBER`（6.2+）一次批量判断，RT 降至 2ms。
- **令牌桶限流器**：分布式令牌桶（Lua GET/DECR）+ 定时补令牌，把下游写入变成恒定可预期 TPS；滑动窗口频控用 ZSET（ZREMRANGEBYSCORE + ZCARD + ZADD + PEXPIRE）实现。
- **降级定位**：Redis 只是加速层，数据真相在 DB 和 MQ；Redis 挂了三级降级（Caffeine 兜读 → 写进队列/MQ 回放重建、页面 999+ → 限流提示），绝不让流量穿透到 DB。
- **工具与运维**：`redis-cli --hotkeys` 热点发现、`MONITOR` 抽样（生产慎用）、JD-hotkey/Sentinel 集群流控；高可用基建主从+哨兵/Cluster 自动切换、`AOF everysec`。
- **其他信源印证**：签到系统按日期+1024 桶分桶 Bitmap 做亿级用户布尔判定（约 12KB/桶/日，须用稠密 `uid_index` 作 offset、绝不用 Snowflake ID 且永不复用）；业务风控用 Redis+Lua 计数规则 + @Detect 注解（Lua 原子执行是规则引擎并发正确性的基座）。

## Products / Projects（产品／项目）

- 生态组件（信源提及）：Redis Cluster（分片）、Sentinel（哨兵）、`redis-cli --hotkeys`/`MONITOR`、JD-hotkey、Caffeine（JVM 本地缓存搭档）、RocketMQ/Kafka（异步落库搭档）。

## Relationships（关系）

- 定位关系：承诺层（加速层）——互动写路径中"先更缓存立即返回"的执行者，事实来源在 [[kafka|Kafka]]（MQ 水库）与 DB（对账基准）。
- 原子性搭档：Lua 脚本（组合原子）与 `MULTI/EXEC`（排队非原子）的取舍见 [[idempotency-design]]。
- 计数搭档：热点计数分桶 + [[longadder-internals|LongAdder]] 本地聚合（Redis 调用降至 1/50）；Redis 不可用时三级降级见 [[interaction-write-path]]。
- 排序场景：ZSet 时间分页支撑 [[write-fanout|写扩散]] 收件箱与关注列表。
- 同族系统：[[signin-system-distributed-evolution|签到系统]]（Bitmap 布尔判定）、[[business-risk-control-redis-lua-annotation|业务风控]]（Redis+Lua 计数规则）共用同一套单线程+Lua 模型。

## Timeline（时间线）

- 信源覆盖版本特征：Cluster 分片（Redis Cluster）、`SMISMEMBER`（6.2+）、`SETBIT`/`ZREVRANGE` 等基础命令（各版本通用）。

## Current Understanding（当前认知）

- 三信源互证一致立场：Redis 的价值在于"快"（内存 + 单线程 + 丰富结构），代价是"单点热点与阻塞"（单 key OPS 上限、大 key 阻塞单线程）与"非持久真相"（只是加速层）。工程纪律：组合原子用 Lua 不用 MULTI/EXEC；热点写分桶+聚合；大 key 分片/Bitmap/SSCAN；真相在 DB/MQ，Redis 挂掉可以重建。置信度中——互动场景证据最重（3.1 万字完整方案），签到/风控为侧面印证。

## Evidence（证据）

- `raw/sources/architecture/2026-10-28-like-follow-high-concurrency-design.md`（互动系统承诺层主信源：Lua 原子、Bitmap/ZSet 选型、分桶、降级）
- `raw/sources/architecture/2026-10-22-signin-system-distributed-evolution.md`（签到系统：分桶 Bitmap 布尔判定、稠密 uid_index）
- `raw/sources/architecture/2026-10-21-business-risk-control-redis-lua-annotation.md`（业务风控：Redis+Lua 计数规则）
