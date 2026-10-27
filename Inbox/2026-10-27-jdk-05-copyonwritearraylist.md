---
id: 2026-10-27-jdk-05-copyonwritearraylist
title: JDK源码阅读(4)：CopyOnWriteArrayList——最"懒"的线程安全集合，读多写少场景的王者
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483923&idx=1&sn=140dce437a9e4c5c0c6a0970502ad90f&chksm=fe6ca349c91b2a5f4d56a5a8281c206a06d493905c212354c648037f41b29919e7594bb783dd#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-05-copyonwritearraylist.md
wiki_status: pending
---

# JDK源码阅读(4)：CopyOnWriteArrayList——最"懒"的线程安全集合，读多写少场景的王者

> CopyOnWriteArrayList 用"写入时复制"实现线程安全：读完全无锁，直接读 volatile 数组；写操作加锁后复制新数组、修改副本、替换引用，每次写 O(n)。迭代器持有创建时的数组快照，永不抛 ConcurrentModificationException 但可能读到旧数据。适合监听器列表、黑白名单等读多写极少场景。

## 核心要点

- 底层只有一个 volatile Object[] array，volatile 保证数组引用替换的可见性，读写天然隔离
- add 四步：synchronized 加锁 → Arrays.copyOf 复制（O(n)）→ 改副本 → setArray 替换引用
- get 仅一行 volatile read + 数组下标，读性能与 ArrayList 几乎一致
- addIfAbsent 采用"乐观无锁检查 + 锁后二次确认"，减少锁竞争
- COWIterator 持快照迭代，永不抛 CME；代价是读不到迭代期间的新增，不适合强一致场景
- 写频繁或数据量大时内存与耗时都吃不消；Spring 的监听器列表是其典型应用

## 正文

正文约 5934 字符，完整整理稿见附件 [[Assets/2026/10/jdk-05-copyonwritearraylist.md]]。附件含 add/addIfAbsent/remove/COWIterator 核心源码注释、与 ArrayList/Vector 对比表及适用场景清单。

## 来源

[JDK源码阅读(4)：CopyOnWriteArrayList——最"懒"的线程安全集合，读多写少场景的王者](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483923&idx=1&sn=140dce437a9e4c5c0c6a0970502ad90f&chksm=fe6ca349c91b2a5f4d56a5a8281c206a06d493905c212354c648037f41b29919e7594bb783dd#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-05-copyonwritearraylist.md]]（抓取正文整理稿）
