---
id: 2026-10-27-jdk-17-enummap-enumset
title: JDK源码剖析——EnumMap & EnumSet，用枚举当数组下标，快得离谱！
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484601&idx=1&sn=a52e748a47f2128794b08fc1c0bb7f28&chksm=fe6ca5e3c91b2cf57b14a2051e5cb902624cf12c250dc3e8226cc8259c181d69e07a7da867f9#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-17-enummap-enumset.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-28T01:27:45.447Z"
ingest_claim_id: 63252-1793150865447-0
---

# JDK源码剖析——EnumMap & EnumSet，用枚举当数组下标，快得离谱！

> 剖析 EnumMap 与 EnumSet 源码：专为枚举设计的高性能集合，EnumMap 直接拿 ordinal() 当数组下标实现确定性 O(1)，EnumSet 用一个 long 位向量做位运算级集合操作，性能与内存全面碾压 HashMap/HashSet。

## 核心要点

- EnumMap 内部就是 Object[] vals，put/get 用 key.ordinal() 直接索引，无哈希、无碰撞、无扩容，get 比 HashMap 快 2~3 倍
- null value 用 NULL 占位对象包装以区分"值为 null"和"槽位空"；不允许 null key；迭代按枚举声明顺序
- EnumSet 按枚举数自动选型：≤64 用 RegularEnumSet（单个 long 位向量），>64 用 JumboEnumSet（long 数组）
- 集合运算就是一条位运算指令：并集 `|=`、交集 `&=`、差集 `&= ~`，比 HashSet 逐个哈希快一个数量级
- 两者均非线程安全，需 Collections.synchronized 包装；自定义序列化保证跨 JVM ordinal 兼容
- 适用场景：枚举键状态机/配置映射用 EnumMap，权限标记、枚举过滤、频繁集合运算用 EnumSet

## 正文

正文约 12653 字符，完整整理稿见附件 [[Assets/2026/10/jdk-17-enummap-enumset.md]]。附件含 EnumMap/RegularEnumSet/JumboEnumSet 核心源码、位向量图解、性能对比表及权限标记、百万级过滤实战代码。

## 来源

[JDK源码剖析——EnumMap & EnumSet，用枚举当数组下标，快得离谱！](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484601&idx=1&sn=a52e748a47f2128794b08fc1c0bb7f28&chksm=fe6ca5e3c91b2cf57b14a2051e5cb902624cf12c250dc3e8226cc8259c181d69e07a7da867f9#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-17-enummap-enumset.md]]（抓取正文整理稿）
