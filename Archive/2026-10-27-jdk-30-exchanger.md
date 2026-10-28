---
id: 2026-10-27-jdk-30-exchanger
title: Exchanger：一个被严重低估的线程间数据交换神器
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484730&idx=3&sn=9807133d2825642ffaefbbaa0b640a9f&chksm=fe6ca460c91b2d767c5084e644b1d6721320854646ca77865d257d1f1f09e45ce05dd57df4d6#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-30-exchanger.md
wiki_status: ingested
---

# Exchanger：一个被严重低估的线程间数据交换神器

> Exchanger 让两个线程在汇合点双向交换数据，API 仅两个 exchange 方法，内部却集中了 CAS、动态自旋、park/unpark、缓存行填充等并发技巧。文章剖析其从单槽（Slot）到多槽 Arena 的渐进式扩容设计、防伪共享的 @Contended 填充，以及按 CPU 核数与 hash 值调整的自旋策略。

## 核心要点

- 核心语义：两个线程在汇合点互换数据，先到者把自己放入 Slot 等待，后到者取走并唤醒对方，是 JUC 唯一双向交换数据的工具
- 单槽竞争失败时升级为 Arena 多槽数组，按线程 hash 分散配对压力，属渐进式扩容
- Node 用 @Contended、Slot 手动填充 long 字段，强制独占缓存行解决伪共享
- 自旋次数按 CPU 核数与 hash 动态计算（单核不自旋直接 park），自旋耗尽才阻塞
- 线程数须成对，奇数个必有一个永久阻塞；生产环境务必用带超时的 exchange 版本
- 适用：遗传算法基因交叉、双 buffer 流水线、两线程对账；一对多/多对多请用 BlockingQueue 或 Disruptor

## 正文

正文约 9000 字符，完整整理稿见附件 [[Assets/2026/10/jdk-30-exchanger.md]]。附件含 Slot/Node/Arena 核心源码、slotExchange 与 arenaExchange 算法剖析、两个完整示例（基本交换、流水线 buffer 交换）及与 SynchronousQueue/BlockingQueue 等工具的对比表。

## 来源

[Exchanger：一个被严重低估的线程间数据交换神器](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484730&idx=3&sn=9807133d2825642ffaefbbaa0b640a9f&chksm=fe6ca460c91b2d767c5084e644b1d6721320854646ca77865d257d1f1f09e45ce05dd57df4d6#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-30-exchanger.md]]（抓取正文整理稿）
