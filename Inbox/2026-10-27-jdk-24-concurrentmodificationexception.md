---
id: 2026-10-27-jdk-24-concurrentmodificationexception
title: 深扒 ConcurrentModificationException：Java 集合中最常见的运行时异常，你真的搞懂了吗？
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484642&idx=1&sn=1a9e72c7d4757109a31e738106eef7e8&chksm=fe6ca5b8c91b2caeb57ebecd829c52ff2705c90daa6e971dbee19bca33681cbf2b2da6dfa943#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-24-concurrentmodificationexception.md
wiki_status: pending
---

# 深扒 ConcurrentModificationException：Java 集合中最常见的运行时异常，你真的搞懂了吗？

> CME 最高频的场景其实是单线程 foreach 里直接 remove，而非多线程。文章剖析 ArrayList 迭代器的 fail-fast 检测机制（modCount vs expectedModCount 一个 int 比较），对比 fail-fast 与 fail-safe 设计哲学，并给出迭代器 remove、removeIf、CopyOnWriteArrayList 三种正确删除姿势及 subList 陷阱。

## 核心要点

- 检测机制极简：集合每次结构性修改 modCount++，迭代器持有创建时的 expectedModCount 快照，next()/remove() 前比较不等即抛 CME
- 迭代器自己的 remove() 会重置 expectedModCount，所以安全；foreach 里直接调 list.remove() 必炸
- HashMap 等所有 java.util 集合都是 fail-fast；j.u.c 包（CopyOnWriteArrayList、ConcurrentHashMap）走 fail-safe 弱一致，迭代读快照不检测
- 正确删除三法：Iterator.remove()、Java 8 的 removeIf()、多线程用 CopyOnWriteArrayList
- subList 是原集合视图并同步校验 modCount，改原集合后 subList 立即失效
- fail-fast 只是 best-effort 不保证 100% 检测，JDK 文档明确说明

## 正文

正文约 11600 字符，完整整理稿见附件 [[Assets/2026/10/jdk-24-concurrentmodificationexception.md]]。附件含 ArrayList$Itr 与 HashMap 迭代器源码、fail-fast/fail-safe 对比表及 6 个踩坑与避坑示例代码。

## 来源

[深扒 ConcurrentModificationException：Java 集合中最常见的运行时异常，你真的搞懂了吗？](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484642&idx=1&sn=1a9e72c7d4757109a31e738106eef7e8&chksm=fe6ca5b8c91b2caeb57ebecd829c52ff2705c90daa6e971dbee19bca33681cbf2b2da6dfa943#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-24-concurrentmodificationexception.md]]（抓取正文整理稿）
