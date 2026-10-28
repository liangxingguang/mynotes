---
id: 2026-10-27-jdk-21-collections
title: JDK源码阅读(21)：Collections工具类——被低估的瑞士军刀
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484616&idx=1&sn=248f227750f8d652f0352e21a0b18a62&chksm=fe6ca592c91b2c8447086a98e557b0831246a0a11e8fc1d07a32ee0692cdf9b77506dbda71c1#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-21-collections.md
wiki_status: ingested
---

# JDK源码阅读(21)：Collections工具类——被低估的瑞士军刀

> java.util.Collections 是集合框架的"算法库+工厂车间+安全卫士"，提供排序、洗牌、二分查找等算法操作，以及同步、不可变、类型检查三类包装器。文章基于 OpenJDK 21 源码逐方法剖析其实现与坑点，指出 synchronizedList 迭代需外部加锁、unmodifiableList 只是视图而非真正不可变等经典陷阱。

## 核心要点

- sort() 实际委托 List.sort()：List 转数组后用 TimSort 排序再写回，最好情况 O(n)
- shuffle() 采用 Fisher-Yates 洗牌保证均匀随机；对 LinkedList 先转数组再洗，阈值仅 5 个元素
- binarySearch 用 `(low+high)>>>1` 防溢出，且对非 RandomAccess 列表走迭代器版本
- synchronizedXxx 是装饰器模式，每个方法加 synchronized(mutex)，但迭代器必须在外部手动同步，否则 CME
- unmodifiableXxx 是零拷贝视图，原始集合变了视图也跟着变；真正不可变要用 Java 9 的 List.of()
- emptyList()/singletonList() 返回单例零分配实例；checkedList 可在插入时做运行时类型校验

## 正文

正文约 15800 字符，完整整理稿见附件 [[Assets/2026/10/jdk-21-collections.md]]。附件含核心源码片段、性能复杂度对照表、Collections 与 Arrays 及 Java 9 工厂方法的对比分析和完整示例代码。

## 来源

[JDK源码阅读(21)：Collections工具类——被低估的瑞士军刀](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484616&idx=1&sn=248f227750f8d652f0352e21a0b18a62&chksm=fe6ca592c91b2c8447086a98e557b0831246a0a11e8fc1d07a32ee0692cdf9b77506dbda71c1#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-21-collections.md]]（抓取正文整理稿）
