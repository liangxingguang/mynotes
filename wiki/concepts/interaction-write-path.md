---
id: wiki-concept-interaction-write-path
type: concept
title: 互动数据写路径治理（Interaction Write Path Governance）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - high-concurrency
  - architecture
  - social-system
sources:
  - raw/sources/architecture/2026-10-28-like-follow-high-concurrency-design.md
related:
  - wiki/entities/redis.md
  - wiki/sources/like-follow-high-concurrency-design.md
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/write-fanout.md
  - wiki/concepts/longadder-internals.md
  - wiki/concepts/consumer-lag-governance.md
---

# 互动数据写路径治理（Interaction Write Path Governance）

## Definition（定义）

点赞/关注/签到等社交互动类数据（写多读更多、强依赖去重、容忍最终一致）的写路径设计方法论：**缓存扛读、异步削写、原子幂等、最终一致**。核心命题是"高并发不是让 DB 更快，而是让 DB 少干活"——先更缓存立即返回，DB 异步落库；主线三句话：把集中的写打散、把高频的写合并、把不重要的一致性后置。

## Why It Matters（为什么重要）

互动系统同步直写有三个死穴：DB 热点行锁（`cnt+1` 串行排队，QPS 过 500 即堆积）、Redis 单 key 热点（单 slot OPS 上限约 8~10 万）、幂等缺失（先查后改竞态，计数翻倍类超卖）。直接表现为"打挂数据库"。正确姿势是把写路径拆成"承诺层（Redis）+ 水库（MQ）+ 闸门（消费者）+ 补账会计（对账）"，让每层各司其职。

## Core Characteristics（核心特征）

1. **先更缓存，立即返回**：用户对自己操作的即时性要求最高——Lua 原子更新 Redis 后立即返回成功，持久化交给异步链路；DB 只吃它吃得下的量。
2. **三死穴定位**：热点行锁 / 单 key 热点 / 幂等缺失是写路径的三个天然瓶颈，任何方案先过这三关。
3. **V1~V4 演进阶梯**：直写 DB → Redis 扛读 → Lua 原子 + MQ 异步落库（生产级雏形）→ 分桶破热点 + 本地聚合 + 多级降级。演进每步解决前一版的隐患（大 key、消息丢失、热点单点）。
4. **热点写三板斧**：计数分桶（16~100 片摊开写压力）→ 本地聚合（LongAdder 每秒 flush 合并，Redis 调用降至 1/50）→ Caffeine 本地缓存扛读（3s TTL 拦 90%+ 重复读）。
5. **落库三层压缩**：攒批（100 条/50ms 兜底）→ 最终态合并（同 user+target 只落最后态，写量砍半）→ 计数合并（按 contentId 分组一次 INCRBY）。10w QPS 压成 600 TPS。
6. **计数是派生数据，DB 才是事实来源**：DB 主表绝不做 `cnt = cnt + 1` 热点行更新；计数以 Redis 为准、分钟级快照回写、增量对账以 DB 为基准校正 Redis。
7. **降级不穿透**：Redis 挂了三级降级（本地缓存兜读 → 队列回放重建/999+ 近似 → 限流提示），绝不让流量穿透到 DB 打挂库；操作状态不丢（MQ 持久化）。

## Structure（结构）

写路径五步（信源主线）：

1. 网关限流 + 参数校验 + 布隆过滤器粗筛（挡 90% 无效请求）；
2. Lua 脚本原子更新 Redis 计数与关系状态（判重+写入+计数+返回合成 1 次 RT）；
3. 立即返回成功，用户侧秒级可见；
4. 异步把操作消息投到 MQ（分区键=targetId 保序、Tag 分流、只有真实生效的操作才投递）；
5. 消费端攒批 + 最终态合并 + 计数合并，幂等批量写入 MySQL。

各层职责记忆法：**Redis 是"承诺层"，MQ 是"水库"，消费者是"闸门"，对账是"补账会计"**。

配套三件套：热点治理（分桶/聚合/缓存/热点探测/独立热点集群）、落库控制（令牌桶控流速、唯一索引幂等、死信/WAL）、一致性兜底（增量对账、三级降级、异常推演）。

## How It Works（运作方式）

1. **判定业务画像**：量级（总量 vs 瞬时热点）、一致性（能否最终一致）、读写比（读是否远多于写）三问对齐设计；点赞（计数可飘、状态不能错）与关注（双向关系、按时间分页）结构不同。
2. **破三死穴**：热点行锁→Redis 计数+MQ 异步（DB 不自增）；单 key 热点→分桶+本地聚合；幂等缺失→Lua 原子判重 + DB 唯一索引双保险。
3. **热点治理三板斧**：分桶（写随机选片读求和）→ 本地聚合（LongAdder `sumThenReset` 定时 flush，失败回滚 buffer）→ Caffeine 3s TTL 读缓存；热点发现用 `redis-cli --hotkeys`/滑动窗口 top N/Sentinel，极端情况迁独立热点集群。
4. **削峰落库**：生产端 Tag 分流 + 分区键保序；消费端只入队不阻塞（队列满=过载信号）、攒批 flush、最终态合并、批量 UPSERT；令牌桶把 DB 写入变成恒定 TPS。
5. **兜底收口**：增量对账（近 1 小时有变更对象、分片并行、抽样校验、以 DB 为基准回写）；Redis 故障三级降级；防刷五层（前端防抖/网关限流/Sentinel 热点限流/滑动窗口频控/风控黑名单）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[redis]]（承诺层/计数中心：Lua 原子、Bitmap、ZSet、分桶计数、SCARD 大 key 阻塞、降级）
- [[idempotency-design]]（幂等设计：Lua 返回值 1/0/-1、SETBIT 旧值当幂等标记、唯一索引 UPSERT 双保险）
- [[write-fanout]]（写扩散：Feed 小 V 推/大 V 拉阈值、写扩散风暴）
- [[longadder-internals]]（LongAdder 分段累加：本地聚合 flush 用法、sumThenReset 取走+清零原子、flush 失败回滚）
- [[consumer-lag-governance]]（Kafka 消费积压治理：同族的"扩分区+批量+异步化+慢消息"方法论，跨 MQ）

### Dependencies（依赖项）

- Lua 原子能力（[[redis]] 单线程执行）
- MQ 异步通道（RocketMQ/Kafka：分区键保序、Tag 分流）
- DB 唯一索引（幂等最后一道防线）

### Distinctions（区分）

- 与**强一致事务方案**：互动计数明确放弃强一致（秒级延迟 + 对账），只保"用户自己操作立即可见"——强一致诉求只落在用户侧状态（读多写少，直接读从库/缓存）。
- 与 [[consumer-lag-governance]]：本概念面向写路径削峰落库，Lag 治理面向消费端积压；两者在"批量/异步/幂等"构件上同构，但对象不同（互动写 vs 通用消费组）。

## Evolution（演进）

- 2026-10-31 — 新建，信源为微信公众号《别再上来就堆 Redis！点赞系统从打挂数据库到 18w 写峰值》（约 3.1 万字完整方案，含 Lua/Java/SQL 代码与 18 条难点全景表；作者称亿级用户社交项目线上落地 2 年、单集群写峰值 18w QPS，自报数据置信度中）。

## Open Questions（开放问题）

- 各经验参数（分片数 16/64/100、粉丝阈值 1w/10w、攒批 100 条/50ms）的推导依据未给出；不同业务量级的调参空间待补充。
- 多机房强一致仅一句带过（单机房主写+就近读+异步同步），双活/多活冲突的完整方案未见。
- 与 [[signin-system-distributed-evolution|签到系统]] 信源的 Bitmap/异步投递构件同构，两套系统合流为"互动类系统通用方法论"待后续信源补充。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-like-follow-high-concurrency-design.md`（微信公众号，约 3.1 万字；采集稿 `Assets/2026/10/like-follow-high-concurrency-design.md`）

## Related Knowledge（相关知识）

- [[like-follow-high-concurrency-design|别再上来就堆 Redis！点赞系统从打挂数据库到 18w 写峰值（信源页）]]
- [[redis|Redis（实体）]]
- [[idempotency-design|幂等设计]]
- [[write-fanout|写扩散]]
- [[longadder-internals|LongAdder 分段累加]]
- [[signin-system-distributed-evolution|签到系统分布式演进]]
