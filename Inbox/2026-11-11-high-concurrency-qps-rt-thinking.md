---
id: inbox-20261111-2002
title: QPS 1 万、RT 100ms，就是 1,000 个请求同时压在你身上
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/jQIILE7kauqsudlD2PKM3w
source_type: link
platform: wechat
created: 2026-11-11
category: 技术
tags:
  - java
asset_ref: Assets/2026-11/weixin-jqiile-high-concurrency-qps-rt-breakdown.md
wiki_status: ingesting
ingest_claimed_at: "2026-11-11T15:59:31.785Z"
ingest_claim_id: 27604-1794412771785-0
---

# QPS 1 万、RT 100ms，就是 1,000 个请求同时压在你身上

> 一篇把"高并发"从背组件变成可回答问题的方法论文章：并发=QPS×RT 的换算、各层天花板量级表、三档 QPS 的代价阶梯，以及"为了扛住放弃什么"的取舍框架。

## 核心要点

1. **并发数 ≠ QPS**：并发 = QPS × RT。QPS 1 万、RT 100ms = 系统里实时压着 1000 个请求；200 个 Tomcat 线程、RT 100ms，吞吐上限只有 2000 QPS，CPU 可能才 40%——慢的是线程在等，不是计算
2. **各层天花板**（实测量级）：应用层 4C8G 纯 JSON ~5000 QPS、加 MySQL 点查 ~900、加 Redis 读 ~2500，卡点是 Tomcat 线程和 Hikari 连接而非 CPU；Redis 单实例 8~10 万 QPS 但热点 key 可拖垮整个分片；MySQL 点查 ~1000、写入 1000~1500 TPS，先到顶的是连接池和行锁
3. **真实 QPS 从存储侧反推**：间隔 1 秒两次 `SHOW GLOBAL STATUS` 取 `Questions`/`Com_*` 差值；`Threads_running` 才反映"此刻正压在身上"的排队数
4. **三档代价**：1 万以内是配置问题（慢 SQL/连接池）；3 万要读写分离（主库写入、从库延迟是坎）；10 万热点 key/跨库事务/缓存一致性同时冒出；50 万以上成本曲线比 QPS 更陡
5. **取舍框架**：一致性、成本、复杂度只能保住两条；库存扣减案例——行锁事务 1000 TPS 强一致 vs Redis 扣减+MQ 落库 2 万 TPS 但可能超卖，作者按 SKU 热度分流（90% 撞不上，10% 热门走强一致）
6. **三个边界条件决定架构**：峰值/均值倍数（决定要不要削峰）、读写比（10:1 以上堆缓存才有效）、能否接受最终一致（余额不行，库存/积分/流水可以）
7. **五个坑**：把并发当 QPS 报、只报均值不报峰值、只扩应用不扩存储、缓存当存储用、所有接口按最高档设计

## 正文

详见 [[Assets/2026-11/weixin-jqiile-high-concurrency-qps-rt-breakdown.md]]（全文存档）。

## 来源

[QPS 1 万、RT 100ms，就是 1,000 个请求同时压在你身上](https://mp.weixin.qq.com/s/jQIILE7kauqsudlD2PKM3w)

## 附件

[[Assets/2026-11/weixin-jqiile-high-concurrency-qps-rt-breakdown.md]]
