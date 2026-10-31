---
id: 2026-10-28-like-follow-high-concurrency-design
title: 高并发点赞/关注系统：从打挂数据库到 18w 写峰值
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/K33QsP6ohLbBLQsEbzyZgA
source_type: link
platform: wechat
created: 2026-10-28
category: 技术
tags: [Redis, 工程实践, 分布式系统]
asset_ref: Assets/2026/10/like-follow-high-concurrency-design.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-31T01:28:45.728Z"
ingest_claim_id: 45808-1793410125728-0
---

# 高并发点赞/关注系统：从打挂数据库到 18w 写峰值

> 高并发互动系统完整方案：业务画像（写多读更多、强依赖去重、容忍最终一致）→ 同步直写三个死穴 → V1~V4 架构演进 → Lua 原子/分桶破热点/MQ 攒批削峰/对账降级全链路。主线三句话：把集中的写打散、把高频的写合并、把不重要的一致性后置。

## 核心要点

- **设计总纲**：缓存扛读、异步削写、原子幂等、最终一致。高并发不是"让 DB 更快"，是"让 DB 少干活"；先更缓存立即返回，DB 异步落库。
- **三个死穴**：DB 热点行锁（`cnt+1` 串行排队，QPS 过 500 堆积）、Redis 单 key 热点（单 slot 上限 8~10w OPS）、幂等缺失（先查后改竞态，计数翻倍）。
- **Lua 原子脚本**：判重 + 写入 + 计数 + 返回合成 1 次 RT；`MULTI/EXEC` 做不了分支逻辑必须 Lua；返回值 1/0/-1 直接区分生效/幂等/错误。
- **选型陷阱**：Set 直观但千万级占 500MB+，Bitmap 仅 1.25MB（省 99.7%）——但雪花 uid 稀疏会按最大 ID 撑爆，须分段 Bitmap/RoaringBitmap 或回退 Set。
- **热点三板斧**：计数分桶（16~100 片均摊写）→ `LongAdder` 本地聚合每秒 flush（Redis 调用降到 1/50，失败须回滚 buffer）→ Caffeine 3s TTL 扛读。
- **落库三层压缩**：攒批（100 条/50ms）→ 最终态合并（同 user+target 只落最后态）→ 计数合并成一次 `INCRBY`；唯一索引 `ON DUPLICATE KEY UPDATE` 幂等，令牌桶控落库流速；**DB 绝不做 `cnt+1` 热点行更新**。
- **关注专场**：双向 ZSet 按时间分页、Lua 双向原子规避分布式事务、大 V 粉丝按 uid 哈希 64 分片（≥10w 才分）、Feed 推拉结合（大 V 必须拉模式防写扩散风暴）。
- **一致性兜底**：计数是派生数据可从 DB 重建——增量对账以 DB 为基准回写 Redis；Redis 挂了三级降级（本地缓存 → MQ 回放 → 限流提示）。
- **效果**：QPS 8k→12w+，P99 320ms→42ms，DB TPS 8000→600，单集群写峰值 18w。

## 正文

见 [[Assets/2026/10/like-follow-high-concurrency-design.md]]（全文约 3.1 万字，含 Lua 脚本/攒批消费者/滑动窗口频控等完整代码与 18 条难点全景表）。

## 来源

- [别再上来就堆 Redis！点赞系统从打挂数据库到 18w 写峰值，我把这套方案讲透了](https://mp.weixin.qq.com/s/K33QsP6ohLbBLQsEbzyZgA)

## 附件

- [[Assets/2026/10/like-follow-high-concurrency-design.md]]
