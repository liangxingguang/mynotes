---
id: 2026-10-27-jdk-04-concurrenthashmap
title: JDK源码阅读(3)：ConcurrentHashMap——面试必问的并发HashMap，看完这篇就够了
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483907&idx=1&sn=d8d2ae367a11551d05de46aff6ff3908&chksm=fe6ca359c91b2a4f5f4d0c98fa4d6eeb7c4dca13bd206c655db6dae1aeaefe9f56ea5257f78f#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-04-concurrenthashmap.md
wiki_status: pending
---

# JDK源码阅读(3)：ConcurrentHashMap——面试必问的并发HashMap，看完这篇就够了

> ConcurrentHashMap 是线程安全版 HashMap（JDK 8+ 基于 JDK 21 源码讲解）：读操作全程无锁靠 volatile 保证可见性；写操作空桶用 CAS 插入，哈希冲突时只 synchronized 锁桶的头节点。sizeCtl 一个字段承载三种状态。扩容采用多线程协作：线程申领区间搬运，其他线程看到 ForwardingNode 会主动帮忙。不支持 null key/value，迭代器为弱一致性。

## 核心要点

- 锁粒度演进：HashTable 全表锁 → JDK 5/7 Segment 分段锁 → JDK 8 CAS + synchronized(桶头节点)
- put 流程：table 懒初始化 → 空桶 CAS 无锁插入 → 遇 MOVED 标识 helpTransfer 帮忙扩容 → 冲突时只锁桶头节点遍历插入
- get 全程无锁：table 引用及 Node 的 val/next 均为 volatile 保证可见性，读性能接近 HashMap
- sizeCtl 三态：-1 初始化中，-N 表示 N-1 个线程扩容中，正数为扩容阈值；扩容多线程分工协作
- tabAt/casTabAt 用 Unsafe 直接操作内存，因为 volatile 数组不保证元素级 volatile 语义
- 迭代器弱一致性（不抛 CME 但可能读到旧值）；size() 高并发下为近似值；computeIfAbsent 是缓存场景利器

## 正文

正文约 9122 字符，完整整理稿见附件 [[Assets/2026/10/jdk-04-concurrenthashmap.md]]。附件含 putVal/get/transfer 核心源码注释、与 HashMap/HashTable 对比表、多线程计数与缓存两个实战示例及版本演进史。

## 来源

[JDK源码阅读(3)：ConcurrentHashMap——面试必问的并发HashMap，看完这篇就够了](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483907&idx=1&sn=d8d2ae367a11551d05de46aff6ff3908&chksm=fe6ca359c91b2a4f5f4d0c98fa4d6eeb7c4dca13bd206c655db6dae1aeaefe9f56ea5257f78f#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-04-concurrenthashmap.md]]（抓取正文整理稿）
