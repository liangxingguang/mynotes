---
id: wiki-source-like-follow-high-concurrency-design
type: source
title: 别再上来就堆 Redis！点赞系统从打挂数据库到 18w 写峰值（信源页）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - source
  - architecture
  - redis
  - high-concurrency
  - social-system
sources:
  - raw/sources/architecture/2026-10-28-like-follow-high-concurrency-design.md
related:
  - wiki/concepts/interaction-write-path.md
  - wiki/entities/redis.md
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/write-fanout.md
  - wiki/concepts/longadder-internals.md
  - wiki/sources/signin-system-distributed-evolution.md
---

# 别再上来就堆 Redis！点赞系统从打挂数据库到 18w 写峰值（信源页）

## Overview（概览）

微信公众号技术文章（约 3.1 万字，含完整 Lua/Java/SQL 代码与 18 条难点全景表），以点赞/关注互动系统为案例给出高并发写路径完整方案。主线三句话：**把集中的写打散、把高频的写合并、把不重要的一致性后置**；设计总纲：缓存扛读、异步削写、原子幂等、最终一致。覆盖业务画像（写多读更多、强依赖去重、容忍最终一致）、同步直写三死穴、V1~V4 架构演进、Lua 原子脚本、热点 Key 三板斧、MQ 攒批落库、Redis 故障三级降级、关注专场（双向关系/大 V 分片/Feed 推拉）、防刷与对账。作者称方案在亿级用户社交项目真实落地 2 年，单集群写峰值 18w QPS。

## Key Facts（关键事实）

- 业务画像：写轻量、热点瞬时数万 QPS；读 QPS 是写 5~10 倍；一致性上"自己的操作秒级可见"必须保、全局计数可飘；幂等是全链路命门；可靠性"不能丢不能重"。压测指标：写峰值 5k~5w+ QPS、读峰值 10w+、目标写 <100ms、读 <20ms。
- 点赞 vs 关注差异：点赞=计数 String + 状态 Set/Bitmap（计数可秒级延迟、状态不能错）；关注=双向 ZSet/Set（列表按时间排序分页）。
- 同步直写三死穴：①DB 热点行锁（`UPDATE cnt = cnt + 1` InnoDB 行锁串行，TPS 撑死几千，QPS 过 500 即堆积）②Redis 单 key 热点（Cluster 单 key 单 slot，单 key OPS 上限约 8~10 万）③幂等缺失（"判断→插入→计数"三步分开，并发下计数翻倍，类超卖）。
- 架构演进 V1~V4：V1 直写 MySQL（QPS 过 500 堆积）→ V2 Redis 扛读（隐患：大 key、消息丢）→ V3 Lua 原子 + MQ 异步落库 + 唯一索引兜底（生产级雏形）→ V4 分桶破热点 + 本地聚合 + Caffeine + 热点探测 + 完整降级预案。
- 层职责记忆法：**Redis 是"承诺层"，MQ 是"水库"，消费者是"闸门"，对账是"补账会计"**。写路径五步：限流+布隆粗筛 → Lua 原子更新 → 立即返回成功 → 异步投 MQ → 幂等批量落库。**先更缓存而非先写 DB**。
- 关系存储选型：Set（直观、`SADD` 天然幂等、千万级约 500MB+）vs Bitmap（1000 万 bit 仅 1.25MB、`GETBIT` 严格 O(1)、要求 uid 连续）vs Hash（可带元信息、大 key 风险）vs ZSet（按时间排序分页、内存更大）。**千万别上来就用 Bitmap**：uid 稀疏（雪花 ID）会按最大 uid 撑爆——分段 Bitmap/RoaringBitmap 或回退 Set。
- 计数细节：关注数/粉丝数放独立计数 key（`HINCRBY follow:cnt:fans:{uid}`），别用 `SCARD`（大 key 阻塞单线程、分片后只拿单片数量）。
- Lua 原子：Redis 单线程执行 Lua 整体不被打断；"判重+写入+计数+返回"合成 1 次网络往返；`MULTI/EXEC` 只是排队执行、拿不到中间返回值做不了分支（幂等判断需两次 RT）故弃用。返回值设计：`1` 真实生效 / `0` 重复（幂等拦截）/ `-1` 参数错误；取消先判存在防负数；冷数据 7 天过期由 DB 兜底重建。
- 热点三板斧：①计数分桶（拆 16~100 片，写随机选片、读 MGET 求和，或 Lua 内 `HINCRBY` 分 field）②本地聚合（LongAdder 无锁累加 + 每秒 `sumThenReset` flush 合并一次 INCRBY + **flush 失败回滚 buffer**，Redis 网络调用降至约 1/50）③Caffeine 3s TTL 本地缓存扛读（拦掉 90%+ 重复读）。热点发现：`redis-cli --hotkeys`、自研滑动窗口 top N、JD-hotkey/Sentinel；极端情况迁独立热点集群、本地队列 50ms 批量发。
- 落库三层压缩：攒批（100 条或 50ms 兜底 flush）→ 最终态合并（窗口内按 (userId,targetId) 聚合只落最后态，写量砍半）→ 计数合并（按 contentId 分组求和一次 `INCRBY`/批量 UPSERT）。10w QPS 压成 600 TPS。
- 幂等双层：DB 唯一索引 `(user_id, target_id)` + `ON DUPLICATE KEY UPDATE`/`INSERT IGNORE`（重复消息冲突跳过）+ 消费前 Redis `SETNX` 消费标记 24h + 批内按消息 ID 去重。**DB 主表绝不做 `cnt = cnt + 1` 热点行更新**——计数以 Redis 为准、分钟级快照回写、对账校正；分片表解决不了单条内容的行热点。
- 令牌桶控落库流速：MQ 蓄住洪峰但消费者一股脑拉出来写库=洪峰换地方砸；Redis 分布式令牌桶（Lua DECR）把 DB 写入变成恒定可预期 TPS。
- 读端：Pipeline 批量查（`SMISMEMBER` 一次批量判断，RT 50ms→2ms 消 N+1）；多级缓存读链路 Caffeine 3s → Bitmap `GETBIT` O(1) → DB；缓存三防（穿透=布隆+空值缓存短 TTL / 击穿=互斥回源/逻辑过期/热点预加载 / 雪崩=TTL 随机值+多级降级）。
- 关注专场：双向 ZSet（`ZREVRANGE` 按时间倒序分页，关注/取关走 Lua 双向原子同时更新双方列表+计数，规避分布式事务）；大 V 粉丝 ≥10w 才分片（按粉丝 uid 哈希 64 片、`SSCAN` 游标遍历、独立计数、只缓存前 100 页热数据）；共同关注 `SINTER`。
- Feed 扩散：小 V（粉丝 <1w）写扩散推收件箱；大 V（≥10w）读扩散拉；活跃大 V 推拉结合（只推在线粉丝）。踩坑：1000w 粉丝一次写扩散=1000w 次写、MQ 瞬间堆积百万；阈值做成配置动态调。
- 一致性兜底：计数是派生数据可从 DB 重建（事实来源是 DB 关系表）；增量对账（只比近 1 小时有变更对象、分片并行、抽样校验）以 DB 为基准回写 Redis；Redis 挂了三级降级（Caffeine 兜读 → 写进本地队列/MQ 回放重建、页面 999+ → 限流提示，**绝不让流量穿透到 DB**）；操作状态不丢（MQ 持久化）。
- 防刷五层：前端防抖 → 网关按用户/内容维度令牌桶 → Sentinel 热点参数限流 → 滑动窗口频控（同一用户对同一内容 5 秒最多 3 次，ZSET 实现）→ 风控黑名单。
- 效果数据（JMeter 单热点 10w QPS 压测）：接口 QPS 8000→120000+（15 倍）、P99 320ms→42ms（平均 1~3ms）、DB 写入 TPS 8000→600（13 倍下降是功劳）、单对象写峰值 ~8w→100w+（12 倍）、Redis 网络调用 1/请求→1/50、判重存储 500MB→1.25MB（99.7%↓）、一致性强一致→秒级最终一致（不一致率 <0.001%）；线上亿级用户社交项目稳定 2 年、单集群写峰值 18w QPS、平均 RT <2ms、单日十亿级点赞。
- 面试方法论：量化需求 → 定位瓶颈 → 分层拆解 → 关键代码 → 一致性兜底 → 降级预案 → 监控验证。

## Important Claims（重要论断）

1. **高并发设计不是"让数据库更快"，而是"让数据库少干活"**——缓存扛读、异步削写、原子幂等、最终一致，DB 只吃它吃得下的量。
2. **Redis 是"承诺层"，MQ 是"水库"，消费者是"闸门"，对账是"补账会计"**——先更缓存立即返回，持久化交给异步链路。
3. **先更缓存还是先写 DB？答案是先更缓存**——用户对自己操作的即时性要求最高。
4. **DB 主表不做 `cnt = cnt + 1` 热点行更新**——计数以 Redis 为准，分钟级快照回写 + 对账校正；分片表能解决总 TPS，解决不了单条内容的行热点。
5. **千万别上来就用 Bitmap**——uid 稀疏（雪花 ID）会按最大 uid 撑爆内存，须分段/RoaringBitmap 或回退 Set。
6. **幂等关键不在消费端"判重"，在唯一索引**——`ON DUPLICATE KEY UPDATE`/`INSERT IGNORE` 让 MQ 怎么重投都无副作用；Lua 判重 + DB 唯一索引双保险。
7. **计数是派生数据，可以从 DB 重建**；真正强一致的只有"我到底点没点赞"的用户侧状态——Redis 只是加速层，数据真相在 DB 和 MQ 里。
8. **大 V 必须拉（读扩散）**——一口气给 1000w 粉丝写扩散 = MQ 瞬间堆积百万，大 V 走拉模式从根上避免。
9. **MQ 发送失败不回滚缓存**——进重试队列，用户体验和最终不丢都要；flush 失败必须回滚 buffer（很多方案在这里悄悄丢数据）。

## Concepts Introduced（引入的概念）

- 互动数据写路径治理（业务画像/三死穴/V1~V4 演进/写路径五步/先更缓存原则/对账降级）→ [[interaction-write-path]]
- Redis 承诺层用法（Lua 原子、Bitmap/ZSet/分桶、SCARD 阻塞、降级）→ [[redis]]
- 幂等设计案例补充（Lua 返回值 1/0/-1、SETBIT 旧值当幂等标记、唯一索引 UPSERT）→ [[idempotency-design]]
- Feed 推拉结合与大 V 拉模式（写扩散风暴）→ [[write-fanout]]
- LongAdder 本地聚合 flush 用法（sumThenReset 原子取走+回滚）→ [[longadder-internals]]

## Entities（实体）

- [[redis|Redis]]（承诺层/计数中心：Lua 原子、Bitmap、ZSet、分桶计数、三级降级）

## Implications（含义）

- 对高并发互动系统（点赞/关注/签到/收藏同族）：写路径先更缓存、热点计数分桶 + 本地聚合、落库三层压缩 + 唯一索引幂等、对账兜底 + 三级降级，是一套经过线上验证的完整范式。
- 对 Redis 使用：单线程特性决定了"原子的是单条命令而非业务组合"，Lua 是解决组合原子性的正解；大 key 是单线程模型的死穴，须分片/Bitmap/SSCAN。
- 对 Feed 类写扩散：粉丝规模阈值（小 V 推/大 V 拉）必须做成配置，防写扩散风暴。
- 面试方法论：量化需求→定位瓶颈→分层拆解→关键代码→一致性兜底→降级预案→监控验证。

## Limitations（局限）

- 单一信源、微信公众号技术文，作者为方案设计者/实践者第一人称；线上数据（18w 写峰值、稳定 2 年）自报无第三方验证。
- 部分参数（分片数 16/64/100、阈值 1w/10w/100w 粉丝、攒批 100 条/50ms）为经验值，未给出推导依据。
- 未覆盖：多机房强一致方案细节、跨产品通用性（签到系统的 Bitmap 用法可对照 [[signin-system-distributed-evolution|签到系统]] 信源）。

## Related Knowledge（相关知识）

- [[interaction-write-path|互动数据写路径治理]]
- [[redis|Redis（实体）]]
- [[idempotency-design|幂等设计]]
- [[write-fanout|写扩散]]
- [[longadder-internals|LongAdder 分段累加]]
- [[signin-system-distributed-evolution|签到系统分布式演进（同族：分桶 Bitmap + 异步投递 + 幂等）]]

## Source（信源）

- `raw/sources/architecture/2026-10-28-like-follow-high-concurrency-design.md`（微信公众号，约 3.1 万字；采集稿 `Assets/2026/10/like-follow-high-concurrency-design.md`）
