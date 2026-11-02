---
id: wiki-source-weixin-seckill-100k-qps
type: source
title: 从 0 设计 10 万 QPS 秒杀系统：10 万请求进来，只有 1000 个能碰到数据库
status: active
created: 2026-11-02
updated: 2026-11-02
confidence: high
tags:
  - source
  - architecture
  - distributed-systems
  - seckill
  - redis
  - kafka
sources:
  - raw/sources/architecture/2026-11-02-weixin-seckill-100k-qps.md
related:
  - wiki/concepts/idempotency-design.md
  - wiki/sources/stress-test-capacity-planning.md
  - wiki/concepts/redis.md
---
# 从 0 设计 10 万 QPS 秒杀系统：10 万请求进来，只有 1000 个能碰到数据库

## Overview（概览）

秒杀系统容量设计实战：以 1 个爆款 SKU、1000 件库存、下单接口 10 万 QPS 为假设，演示从预约量反推峰值（300 万预约 × 首秒 3%~5% 点击 ≈ 10 万），用三层漏斗把 10 万压到 2 万再压到 1000——DB 只按 1000 TPS 设计，而非按入口 QPS 等比放大。核心方案是 Redis Lua 原子预扣 + 32 库存分桶散热 key + Kafka 削峰落账 + DB 唯一索引兜底幂等。

## Key Facts（关键事实）

- **需求拆解**：10 万 QPS 打在哪一层（只有"下单"接口才需要漏斗）、库存多少、能否少卖、是否严格公平；硬约束仅三条：不超卖、不重复、可降级。
- **漏斗**：前端答题/验证码（50% 通过）→ 网关令牌桶 → Redis 预扣成功最多 1000 次 → Kafka → DB 峰值仅 1000 TPS，被库存总量天然封顶。
- **组件容量**：网关 6 台、秒杀服务 10 台、Redis 3 主 3 从 + 32 桶、Kafka 6 分区、MySQL 1 主 1 从（无需分库分表）；并发≠QPS（Little's Law），DB 并发仅约 5，连接池按并发配。
- **Redis Lua 预扣**：判断+扣减+买家标记同脚本原子返回；两 key 同 hash tag 防 Cluster 跨槽；脚本内不做重逻辑。
- **分桶**：userId 固定映射 32 桶解决热 key，代价是少卖（秒杀场景接受、事后补偿）。
- **落账闭环**：DB 唯一索引 (user_id, sku_id) 是幂等最终防线（Redis 标记会过期丢失）；对账公式 Redis 剩余 + 成功订单 = 初始库存，每 5 分钟跑、差异超阈值告警。
- **避坑**：网关不查 DB、不用 DB 行锁扛扣减、不用单库存 key、降级不回退 DB（快速失败）、不只前端限流。

## Important Claims（重要论断）

- **10 万 QPS 的答案不在"库存怎么扣得快"，而在"怎么让 99% 的请求到不了库存"**——三层漏斗把 10 万压成 2 万、再压成 1000，DB 只做最终账本。
- **DB 要按 1000 TPS 设计，而不是按 2 万设计**：真正到达数据库的写请求，被库存总量天然封顶了；想清楚这一点，机器数量会比"按 QPS 直接等比放大"少一个数量级。
- **先有预约量这个输入，再有 QPS 这个输出**：容量评估不能拍脑袋，通常从预约量倒推；反过来直接给一个 QPS 数字，等于没有需求。
- **异步队列不是内存保护，队列扩容只会让"活对象"更多**（与 GC 故障复盘信源互证：队列只缓冲"小对象+尖峰"，大对象必须从源头掐掉）。

## Concepts Introduced（引入的概念）

- 无新立概念页；本信源印证并深化 [[idempotency-design|幂等设计]] 的三层幂等防御模式（Redis 标记→Kafka→DB 唯一索引），并为 [[stress-test-capacity-planning|压测与容量规划]] 提供漏斗容量评估的具体案例。

## Entities Mentioned（提及的实体）

- Redis（Lua 原子预扣、32 库存分桶、买家标记 SISMEMBER）
- Kafka（6 分区削峰、幂等消费、失败重试）
- MySQL（唯一索引幂等保底、条件更新防超卖、1 主 1 从无需分库分表）
- CDN（静态页不回源、8Gbps）

## Implications（影响／启示）

- 漏斗容量评估法与 [[stress-test-capacity-planning|压测与容量规划]] 的"峰值 QPS ÷ 单机容量 × 冗余系数"公式互证：本例每层组件数均按此公式推导（网关 10万÷2.5万×1.5=6 台），并补上"从预约量倒推 QPS"的需求侧输入方法。
- 三层幂等防御（Redis 标记→Kafka→DB 唯一索引）与 [[idempotency-design|幂等设计]] 的"最终幂等必须由持久化层守住"同构：Redis 标记会过期、会随重启丢失，唯一索引不会。
- "降级不回退 DB"与 [[durable-execution|持久执行]] 的"快速失败优于慢速雪崩"一致：Redis 挂了快速失败返回"系统繁忙"，把 2 万 QPS 放回只有 1000 TPS 的库等于用一次秒杀事故换一次全站事故。

## Limitations（局限）

- 容量数值（10 万 QPS、1000 库存、300 万预约）为单案例假设，随业务规模浮动；公式系数（1.5 余量、单机 2.5 万/3000 QPS）为经验口径。
- 分桶方案接受少卖，不适合严格公平场景（如抽签制秒杀）；三种补偿方式（接受少卖/定时搬桶/本地预分配）各有取舍，文中选第一种。
- 未展开多 SKU 场景（单 SKU 是热 key 问题，多 SKU 是分布问题，两者架构不同）。

## Related Knowledge（相关知识）

- [[idempotency-design|幂等设计]]（三层幂等防御：Redis 标记→Kafka→DB 唯一索引）
- [[stress-test-capacity-planning|压测与容量规划]]（漏斗容量评估、Little's Law 并发换算）
- [[redis|Redis]]（Lua 原子预扣、分桶散热 key）

## Source（信源）

- `raw/sources/architecture/2026-11-02-weixin-seckill-100k-qps.md`
