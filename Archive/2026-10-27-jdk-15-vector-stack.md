---
id: 2026-10-27-jdk-15-vector-stack
title: Vector & Stack：被遗忘的元老级集合，它们真的该被淘汰了吗？
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484586&idx=1&sn=ac5077b88ccc3ec9e6a1e31997e7054c&chksm=fe6ca5f0c91b2ce6e039a3e6fad75014df9b9cd26bacd3bff020bacd3998e68e47aa184b6ed9#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-15-vector-stack.md
wiki_status: ingested
---

# Vector & Stack：被遗忘的元老级集合，它们真的该被淘汰了吗？

> 剖析 JDK 1.0 元老 Vector 与 Stack 的源码与设计缺陷：Vector 全方法 synchronized 但复合操作仍不安全，Stack 用继承而非组合违反 LSP——理解它们为何被 ArrayList 和 ArrayDeque 取代比使用它们更有价值。

## 核心要点

- Vector 与 ArrayList 同出 AbstractList，差异在所有 public 方法加 synchronized，单线程也付锁开销，慢约 20%~50%
- 方法级锁粒度太粗，"先检查后操作"等复合操作依旧线程不安全，仍需外部加锁，同步显得鸡肋
- 新版 JDK（11+）Vector 扩容已从翻倍改为增加一半，与 ArrayList 趋同
- Stack extends Vector 是公认糟糕设计：违反 LSP，栈可在中间插入/删除，应用组合而非继承
- Vector 的 Enumeration 迭代器不抛 ConcurrentModificationException，属历史遗留
- 官方推荐替代：Vector → ArrayList（或 synchronizedList 包装），Stack → ArrayDeque

## 正文

正文约 10396 字符，完整整理稿见附件 [[Assets/2026/10/jdk-15-vector-stack.md]]。附件含 Vector/Stack 核心源码、多线程"假安全"演示、版本扩容差异及 Vector vs ArrayList、Stack vs ArrayDeque 对比表。

## 来源

[Vector & Stack：被遗忘的元老级集合，它们真的该被淘汰了吗？](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484586&idx=1&sn=ac5077b88ccc3ec9e6a1e31997e7054c&chksm=fe6ca5f0c91b2ce6e039a3e6fad75014df9b9cd26bacd3bff020bacd3998e68e47aa184b6ed9#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-15-vector-stack.md]]（抓取正文整理稿）
