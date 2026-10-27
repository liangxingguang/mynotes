---
id: 2026-10-27-jdk-25-longadder
title: JDK源码剖析 —— LongAdder & LongAccumulator，比 AtomicLong 更快的秘密
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484651&idx=2&sn=4e31336ceac1387fe177b8ea131b40b9&chksm=fe6ca5b1c91b2ca79b3d4d0e948236c928930e3c4fb61a9bbe8fa17b44a30ea811f35dbe3fd7#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-25-longadder.md
wiki_status: pending
---

# JDK源码剖析 —— LongAdder & LongAccumulator，比 AtomicLong 更快的秘密

> LongAdder 是 AtomicLong 的高并发替代品，核心思想是把单点 CAS 竞争分散到 Cell 数组上（分段思想），最后 sum() 汇总；LongAccumulator 是其通用版，支持自定义二元运算。文章剖析父类 Striped64 的源码：base 低竞争快速路径、Cell 数组扩容、@Contended 防伪共享、cellsBusy 自旋锁，并给出选型指南。

## 核心要点

- 分段思想：无竞争时 CAS 更新 base（等同 AtomicLong），有竞争时按线程 probe 哈希分散到不同 Cell 上各自 CAS
- Cell 用 @Contended 注解填充 128 字节，确保独占缓存行，解决伪共享
- cells 扩容翻倍且不超过 CPU 核数，由 cellsBusy 的 CAS 自旋锁保证只有一个线程初始化/扩容
- sum() 只是 base + 所有 Cell 的近似值，非实时快照；LongAdder 没有 getAndAdd/addAndGet 这类带返回值的方法
- LongAccumulator 传入 LongBinaryOperator + 单位元，可实现取最大值、累乘等任意聚合
- 选型：普通计数用 AtomicLong，高并发写多读少用 LongAdder，非加法聚合用 LongAccumulator；周期性统计用 sumThenReset()

## 正文

正文约 9700 字符，完整整理稿见附件 [[Assets/2026/10/jdk-25-longadder.md]]。附件含 Striped64/LongAdder/LongAccumulator 核心源码、数据结构示意图、扩容流程、PV 统计示例及三者对比表。

## 来源

[JDK源码剖析 —— LongAdder & LongAccumulator，比 AtomicLong 更快的秘密](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484651&idx=2&sn=4e31336ceac1387fe177b8ea131b40b9&chksm=fe6ca5b1c91b2ca79b3d4d0e948236c928930e3c4fb61a9bbe8fa17b44a30ea811f35dbe3fd7#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-25-longadder.md]]（抓取正文整理稿）
