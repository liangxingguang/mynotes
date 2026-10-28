---
id: 2026-10-28-hot-cold-data-separation-archive
title: 微服务架构落地：大表治理与冷热分离——历史单据到底怎么存？
source: 微信公众号·架构落地笔记
source_url: https://mp.weixin.qq.com/s/pfpZAv_WmdsBn2WVdneY0g
source_type: 文章
platform: 微信公众号
created: 2026-10-28
category: 技术
tags: [MySQL, 分布式系统]
asset_ref: Assets/2026/10/hot-cold-data-separation-archive.md
wiki_status: pending
---

# 大表治理与冷热分离：历史单据到底怎么存？

> 冷热分离不是省磁盘，是给数据库做减负手术。三层存储：热库分库分表（≤500万行）、温库归档 MySQL、冷库 OSS 或 ES/ClickHouse；归档分批软删，严禁长事务大 DELETE。

## 核心要点

- **四大痛点**：Buffer Pool 缓存污染（10ms→500ms）、B+ 树加深多一次 IO、备份/DDL 灾难、合规要求单据留 10~30 年不能 DELETE。
- **划分公式**：冷数据 = 状态已完结/作废/红冲 且 完结超 3 个月；状态维度比时间维度更精准。
- **三层架构**：热 MySQL → 温归档实例（HDD）→ 冷 OSS/Parquet（纯合规）或 ES/ClickHouse（要检索）。
- **归档落地**：凌晨低峰调度，先复制后删除，分批+sleep 限 TPS 防主从延迟；查询侧先热后冷或 ShardingSphere 时间路由。
- **红线**：冷查询加超时+限流；统计报表走数仓 T+1，禁止业务库跨热冷实时聚合。

## 正文

见 [[Assets/2026/10/hot-cold-data-separation-archive.md|抓取正文]]。

## 来源

- [微服务架构落地：大表治理与冷热分离](https://mp.weixin.qq.com/s/pfpZAv_WmdsBn2WVdneY0g)（微信公众号·架构落地笔记）

## 附件

- [[Assets/2026/10/hot-cold-data-separation-archive.md]]
