---
id: wiki-concept-concurrency-qps-rt
type: concept
title: 并发与 QPS 换算（并发 = QPS × RT）
status: active
created: 2026-11-11
updated: 2026-11-11
confidence: medium
tags:
  - concept
  - architecture
  - capacity-planning
  - concurrency
sources:
  - raw/sources/architecture/2026-11-11-weixin-high-concurrency-qps-rt-thinking.md
related:
  - wiki/concepts/architecture-tradeoff-methodology.md
  - wiki/sources/stress-test-capacity-planning.md
  - wiki/sources/weixin-seckill-100k-qps.md
  - wiki/concepts/thread-pool-sizing.md
  - wiki/concepts/cap-theorem.md
---
# 并发与 QPS 换算（并发 = QPS × RT）

## Definition（定义）

并发（concurrency）是**此刻有多少请求压在系统里**的快照数，QPS 是**每秒新进来多少**的速率，两者之间差一个 RT（响应时间），换算只有一行：**并发 = QPS × RT**（Little's Law）。

算例：QPS 1 万、RT 100ms → 系统里实时压着 1000 个请求。反算更吓人：200 个 Tomcat 线程、RT 100ms → 吞吐上限只有 2000 QPS——此时 CPU 可能才 40%，慢的不是计算，是线程都在等下游。

## Why It Matters（为什么重要）

这两个数对应**两套完全相反的动作**（信源论断）：

- **QPS 高**：可以加机器、可以削峰，把请求挪到别的时间点；
- **并发高**：只能压 RT——每个请求占着一条线程在等，加机器只是多摆几把椅子，人还是卡在门口。

搞错对象，扩容永远扩不到点子上。作者的一线案例：QPS 一点没涨，下游接口 RT 从 80ms 涨到 400ms，Tomcat 排队线程从 0 爬到 900，成功率掉到 71%——流量没杀死系统，延迟自己把自己压死了（RT 变长直接压低吞吐上限，重试再把这个洞捅大一圈）。

高并发要回答的三个连续问题：**量有多大（算术题）、哪一层先到顶（算术题）、为了扛住愿意放弃什么（取舍题）**；中间件是取舍之后的结果，不是答案本身。

## Core Characteristics（核心特征）

1. **并发是快照，QPS 是速率，中间差 RT**：报"支持 10 万并发"而不报 RT 是面试减分项——并发数必须绑定 RT 才有意义。
2. **吞吐上限 = 并发路数 ÷ RT**：线程/连接数是分母，RT 是乘数；RT 变长直接压低吞吐上限，且被重试放大。
3. **系统只会在最薄那层断**：某一层先到顶，"等"沿调用链往上游传，表现为"全站都慢"；要找最薄的那块板，不是平均值。
4. **各层天花板量级（作者实测，JDK 21 / Spring Boot 3.2 栈）**：应用层 4C8G 纯 JSON ~5000 QPS、加一次 MySQL 点查掉到 ~900、加一次 Redis 读 ~2500，三次 CPU 都没满，卡的是 200 个 Tomcat 线程和 Hikari 20 条连接；Redis 单实例简单命令 8~10 万 QPS、3 主 3从 Cluster 二十多万，但热点 key 落在单分片上几万 QPS 就能打满该分片（实例：200MB 的 Hash 拖住整个集群）；MySQL 4C16G/SSD 点查 ~1000、写入 1000~1500 TPS，先到顶的是连接池和行锁而非 IO，单表过 5000 万行后执行计划开始抖。
5. **三档 QPS 的代价阶梯**：数字本身不构成方案，要看每一档要多付什么（详见下表）。
6. **真实 QPS 从存储侧反推**：`SHOW GLOBAL STATUS` 间隔 1 秒采两次，`Questions` 差值 = 这一秒真实 QPS（含重试、定时任务、没走缓存的请求）；`Questions` 把存储过程内部语句也算进去略偏大，更准用 `Com_*` 之和；`Threads_running` 是"此刻正压在你身上"的请求数，比 QPS 更能反映排队。与网关统计对不上的差额就是没想到的那部分流量。
7. **取舍框架：一致性、成本、复杂度只能保住两条**：库存扣减实例——DB 行锁事务单 SKU ~1000 TPS 强一致代码简单 vs Redis 扣减 + MQ 异步落库 ~2 万 TPS 但可能超卖、需冻结 + 对账兜底；作者按 SKU 热度分流（90% SKU 库存大于 1000 撞不上，10% 热门单独走强一致链路）。这不是技术选型，是业务判断。
8. **三个边界条件决定架构走向**（同一 10 万 QPS，边界不同架构完全不同）：
   - **峰值/均值倍数**：大促 8~10 倍、秒杀瞬时 100 倍——决定要不要削峰，而不是买几台机器；
   - **读写比**：10:1 以上堆缓存有效；接近 1:1 时命中率再高也挡不住写压力，该做的是写异步化；
   - **能否接受最终一致**：余额不能，库存/积分/流水可以——这条线划在哪里，架构上限就在哪里。
9. **五个坑**：① 把并发数当 QPS 报；② 只报均值不报峰值；③ 只扩应用不扩存储（应用加 10 台、Hikari 还是 20 条连接，DB 照样被压死）；④ 缓存当存储用（写多读少硬上缓存，全是一致性问题）；⑤ 所有接口按最高档设计（日均 3000 QPS 的后台按 10 万做分库分表，成本翻倍收益为零）。

## 三档 QPS 代价阶梯（信源表格，承重数据）

| 峰值 QPS | 应用层 | 缓存 | 存储 | 异步/削峰 | 最先到顶 |
|---|---|---|---|---|---|
| 1 万以下 | 2~4 台 4C8G | 本地 Caffeine + Redis 单实例 | 单库，单表 < 5000 万行 | 可有可无 | 慢 SQL、连接池 |
| 3 万 | 8~12 台，网关限流 | Redis 主从 + 两级缓存 | 1 主 2 从读写分离 | 写链路削峰 | 主库写入、从库延迟 |
| 10 万 | 20~30 台 | Cluster 3 主 3 从 | 8 库 32 表 | 必须，核心链路异步 | 热点 key、跨库事务 |
| 50 万 | 按用户维度单元化 | 多副本，本地命中率 >95% | 分片 + 读写分离 | 全链路异步 | 跨单元调用、带宽 |
| 100 万 | 就近接入、多活 | 多级 + CDN / 静态化 | 100+ 分片，最终一致 | 异步 + 批处理 | 成本、运维复杂度 |

解读：1 万以内是配置问题（改慢 SQL、调连接池）；3 万前后动读写分离；10 万时热点 key、跨库事务、缓存一致性同时冒出，复杂度跳一个台阶；50 万往上成本曲线比 QPS 曲线更陡（扛到百万的单元化运维投入是 3 万时代的数倍）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[thread-pool-sizing|线程池大小估算]]：本页"吞吐上限 = 并发路数 ÷ RT"是线程数估算的上游约束——线程配得再对，RT 被下游拖长，吞吐上限照样塌。
- [[architecture-tradeoff-methodology|架构取舍方法论]]：本页"三选二"取舍框架（一致性/成本/复杂度）与"先定约束再选型"是同一方法论的高并发实例。
- [[cap-theorem|CAP 定理与最终一致性取舍]]：库存扣减案例中"余额不能最终一致、库存/积分/流水可以"的分界线，是 CAP 取舍在业务侧的落地判据。

### Dependencies（依赖项）

- [[stress-test-capacity-planning|压测与容量规划（信源页）]]：峰值 QPS 估算、拐点水位、机器数公式与本页换算共同构成容量规划闭环；该页已用 Little's Law 做并发换算（DB 并发≈5），本页提供直接算例与各层量级表。
- [[weixin-seckill-100k-qps|10 万 QPS 秒杀系统（信源页）]]：漏斗容量评估（10 万→2 万→1000，DB 按 1000 TPS 设计）与本页"真实 QPS 从存储侧反推"互证；其 Redis Lua 预扣正是本页库存扣减取舍的 10 万 QPS 档实现。

### Distinctions（区分）

- 与**组件清单式高并发回答**（"Redis 缓存、Kafka 削峰、分库分表"背一遍）不同：本页主张先算并发、定位最先到顶的层、再定取舍，组件是结论不是答案。
- 与**均值口径的容量汇报**不同：大促峰值是均值 10 倍，均值没有意义。

## Evolution（演进）

- 2026-11-11：由单一信源（微信公众号《QPS 1 万、RT 100ms，就是 1,000 个请求同时压在你身上》，作者自述一线生产案例）建立。confidence: medium——单二次信源、作者身份未标注；量级数字为其特定配置（4C8G/JDK 21/Spring Boot 3.2）下的实测，迁移到其他技术栈须重新压测。

## Open Questions（开放问题）

- 各层天花板量级（5000/900/2500、8~10 万、1000~1500 TPS）为特定配置实测，无第三方复核；不同技术栈（虚拟线程、Netty 直连、云原生配置）下的对应量级未知。
- "50 万以上成本曲线比 QPS 更陡"为定性论断，无量化成本模型支撑。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-11-weixin-high-concurrency-qps-rt-thinking.md`（并发=QPS×RT 换算与 2000 QPS 反算、RT 80→400ms 排队线程 0→900 案例、各层实测量级表、三档 QPS 代价阶梯表、SHOW GLOBAL STATUS 反推真实 QPS、库存扣减 1000 vs 2 万 TPS 取舍、三边界条件、五坑）

## Related Knowledge（相关知识）

- [[weixin-high-concurrency-qps-rt-thinking|QPS 1 万、RT 100ms，就是 1,000 个请求同时压在你身上（信源页）]]
- [[architecture-tradeoff-methodology|架构取舍方法论（概念页）]]
- [[stress-test-capacity-planning|压测与容量规划（信源页）]]
- [[weixin-seckill-100k-qps|10 万 QPS 秒杀系统（信源页）]]
