---
id: wiki-source-weixin-high-concurrency-qps-rt-thinking
type: source
title: QPS 1 万、RT 100ms，就是 1,000 个请求同时压在你身上
status: active
created: 2026-11-11
updated: 2026-11-11
confidence: medium
tags:
  - source
  - architecture
  - high-concurrency
  - capacity-planning
  - java
sources:
  - raw/sources/architecture/2026-11-11-weixin-high-concurrency-qps-rt-thinking.md
related:
  - wiki/concepts/concurrency-qps-rt.md
  - wiki/sources/stress-test-capacity-planning.md
  - wiki/sources/weixin-seckill-100k-qps.md
---
# QPS 1 万、RT 100ms，就是 1,000 个请求同时压在你身上

## Overview（概览）

微信公众号方法论文章：把"高并发"从背组件变成可回答问题——并发=QPS×RT 的换算、各层天花板量级表、三档 QPS 的代价阶梯、真实 QPS 的存储侧反推方法、"一致性/成本/复杂度只能保住两条"的取舍框架、三个决定架构的边界条件与五个坑。作者以一线生产案例（RT 变长压垮系统、库存扣减选型）讲解，不教组件。

## Key Facts（关键事实）

- **并发 = QPS × RT**：QPS 1 万、RT 100ms = 系统里实时压着 1000 个请求；200 个 Tomcat 线程、RT 100ms 吞吐上限只有 2000 QPS（CPU 可能才 40%）。
- **RT 变长压垮系统案例**：QPS 没涨，下游接口 RT 从 80ms 涨到 400ms，Tomcat 排队线程 0→900，成功率掉到 71%。
- **各层天花板（作者实测）**：4C8G/JDK 21/Spring Boot 3.2 纯 JSON ~5000 QPS、+MySQL 点查 ~900、+Redis 读 ~2500（卡点是 200 Tomcat 线程与 Hikari 20 连接，非 CPU）；Redis 单实例简单命令 8~10 万 QPS、3 主 3 从 Cluster 二十多万（200MB Hash 热点 key 拖垮单分片案例）；MySQL 4C16G/SSD 点查 ~1000、写入 1000~1500 TPS（连接池与行锁先到顶，单表过 5000 万行执行计划抖）。
- **真实 QPS 存储侧反推**：间隔 1 秒两次 `SHOW GLOBAL STATUS` 取 `Questions`/`Com_*` 差值；`Questions` 含存储过程语句略偏大；`Threads_running` 才是"此刻正压在你身上"的请求数。
- **三档 QPS 代价阶梯**：1 万内=配置问题；3 万=读写分离（主库写入、从库延迟是坎）；10 万=热点 key/跨库事务/缓存一致性同时冒出；50 万+=成本曲线比 QPS 更陡；100 万=就近接入多活 + 最终一致 + 100+ 分片（附完整五档组件配置表，见 raw 全文）。
- **库存扣减取舍实例**：DB 行锁事务单 SKU ~1000 TPS 强一致 vs Redis 扣减+MQ 异步落库 ~2 万 TPS（可能超卖，需冻结+对账兜底）；作者按 SKU 热度分流（90% SKU 库存大于 1000 撞不上，10% 热门走强一致）。
- **三个边界条件**：峰值/均值倍数（大促 8~10 倍、秒杀 100 倍→决定要不要削峰）；读写比（10:1 以上堆缓存有效，接近 1:1 转写异步化）；能否接受最终一致（余额不能，库存/积分/流水可以）。
- **五个坑**：并发当 QPS 报、只报均值不报峰值、只扩应用不扩存储、缓存当存储用、所有接口按最高档设计。

## Important Claims（重要论断）

### Claim 1：高并发是三个连续问题，中间件不是答案

高并发只回答三个问题：量有多大、哪一层先到顶（前两个是算术题）、为了扛住愿意放弃什么（取舍题）。Redis/Kafka/分库分表是取舍之后的结果。

### Claim 2：并发数与 QPS 对应两套相反的动作

QPS 高→加机器/削峰；并发高→只能压 RT。"支持 10 万并发"不报 RT 是减分项，追问 RT 就露馅。

### Claim 3：取舍不是技术选型是业务判断

面试官听到"我们用了 Redis 扣库存"，下一句一定是"超卖怎么办"——要的不是有没有用 Redis，是知不知道自己放弃了什么。

## Concepts Introduced（引入的概念）

- [[concurrency-qps-rt|并发与 QPS 换算（并发 = QPS × RT）]]：新立概念页，承载换算公式、各层天花板量级表、三档代价阶梯、三边界条件与五坑。
- 印证 [[architecture-tradeoff-methodology|架构取舍方法论]] 的"一致性按业务容忍度取舍"，并给出"三选二"的可操作实例（库存扣减）。
- 印证 [[stress-test-capacity-planning|压测与容量规划]] 的 Little's Law 并发换算与漏斗容量评估，提供直接算例与各层实测量级。

## Entities Mentioned（提及的实体）

- Tomcat（200 线程上限）、HikariCP（20 连接池）、Redis（单实例 8~10 万 QPS、Cluster、热点 key）、MySQL（点查 ~1000、写入 1000~1500 TPS）、Kafka/MQ（异步落库）、Caffeine（本地缓存）——均为组件层面提及，不立实体页。

## Implications（影响／启示）

- 与 [[weixin-seckill-100k-qps|10 万 QPS 秒杀系统]] 互证：该文的三层漏斗（10 万→2 万→1000，DB 按 1000 TPS 设计）正是本页"真实 QPS 从存储侧反推 + 最先到顶的层决定容量"的 10 万档实现；其 Redis Lua 预扣 + 分桶散热对应本页库存扣减取舍中的"Redis 扣减"路线。
- "看瓶颈先看线程状态和连接池等待数，别盯着 CPU"与 [[java-perf-low-cpu-coding-tips-part1|低 CPU 高性能编码技巧]]、[[thread-pool-sizing|线程池大小估算]] 的"线程在等而非在算"口径一致（解读）。
- "50 万以上成本曲线比 QPS 更陡"与 [[stress-test-capacity-planning|容量规划]] 的"容量取拐点左缘 70~80%"共同指向：超档位扩张的边际成本非线性（解读）。

## Limitations（局限）

- 单二次信源（微信公众号），作者身份未标注，量级数字为其自述实测，无第三方复核。
- 各层天花板数字绑定特定配置（4C8G/JDK 21/Spring Boot 3.2、4C16G SSD MySQL），迁移到其他技术栈须重新压测验证。
- "三档 QPS"表格（1 万/3 万/10 万/50 万/100 万）为经验分档，非严格容量模型；"成本曲线更陡"为定性论断。

## Related Knowledge（相关知识）

- [[concurrency-qps-rt|并发与 QPS 换算（概念页）]]
- [[stress-test-capacity-planning|压测与容量规划（信源页）]]
- [[weixin-seckill-100k-qps|10 万 QPS 秒杀系统（信源页）]]
- [[architecture-tradeoff-methodology|架构取舍方法论（概念页）]]

## Source（信源）

- `raw/sources/architecture/2026-11-11-weixin-high-concurrency-qps-rt-thinking.md`（正文自 `Assets/2026-11/weixin-jqiile-high-concurrency-qps-rt-breakdown.md` 采集稿逐字收录）
