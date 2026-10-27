---
id: 2026-10-27-jdk-08-treeset-vs-hashset
title: 灵魂拷问：TreeSet 和 HashSet 到底有什么区别？5张图彻底说清楚
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484058&idx=1&sn=5616da78841718a10c3536b2f5d30570&chksm=fe6ca3c0c91b2ad6b844f189ce2519869e75a2e6a3abfe22aa0ae794ff986c0be55711bc49c5#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-08-treeset-vs-hashset.md
wiki_status: pending
---

# 灵魂拷问：TreeSet 和 HashSet 到底有什么区别？5张图彻底说清楚

> TreeSet 本质是 TreeMap 的 key 视图（value 统一为 PRESENT 哑对象），底层红黑树保证有序，增删查 O(log n)；HashSet 底层是 HashMap，O(1) 但无序。实测百万级插入 TreeSet 约慢 11 倍。TreeSet 的杀手锏是有序遍历与 floor/ceiling/subSet 等范围操作。结论：不需要排序用 HashSet，需要排序或范围查询才用 TreeSet。

## 核心要点

- TreeSet = TreeMap + 去重 + 排序，HashSet = HashMap + 去重；两者都不是线程安全
- TreeSet 去重依赖 compareTo()/Comparator 返回 0，与 equals() 无关——最常见踩坑点
- TreeSet 默认不允许 null（compareTo 会 NPE），可用自定义 Comparator 兼容；HashSet 允许一个 null
- 红黑树中序遍历天然升序；subSet/headSet/tailSet 返回视图而非副本，改视图影响原集合
- 实测：插入慢约 11 倍、查询慢约 5 倍，但支持排行榜、IP 段定位等范围查询场景
- 需要并发有序集合时用 ConcurrentSkipListSet（底层跳表）替代

## 正文

正文约 8737 字符，完整整理稿见附件 [[Assets/2026/10/jdk-08-treeset-vs-hashset.md]]。附件含底层结构 ASCII 图解、范围操作 API 示例、性能基准测试代码与结果、排行榜/IP 定位实战案例及面试避坑问答。

## 来源

[灵魂拷问：TreeSet 和 HashSet 到底有什么区别？5张图彻底说清楚](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484058&idx=1&sn=5616da78841718a10c3536b2f5d30570&chksm=fe6ca3c0c91b2ad6b844f189ce2519869e75a2e6a3abfe22aa0ae794ff986c0be55711bc49c5#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-08-treeset-vs-hashset.md]]（抓取正文整理稿）
