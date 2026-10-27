---
id: 2026-10-27-jdk-02-linkedlist
title: JDK源码阅读(2) — LinkedList：双向链表，不只是个List
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483854&idx=1&sn=66afc3d3379c0c5252284472d168ee6c&chksm=fe6ca094c91b29824d0934e50d7150a1a09417b5cb1809c5f8db1f2115eea47aea25b568038f#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-02-linkedlist.md
wiki_status: ingested
---

# JDK源码阅读(2) — LinkedList：双向链表，不只是个List

> LinkedList 底层是双向链表，同时实现 List、Deque、Stack 三份职责。头尾插入删除 O(1)，但按索引访问需折半遍历仍是 O(n)。每个节点是带前后指针的 Node 对象，内存开销约为 ArrayList 元素引用的 8 倍。配合 ListIterator 可在遍历中 O(1) 插入删除，适合头尾操作频繁、随机访问少的场景。

## 核心要点

- Node 三字段（prev/item/next）串成双向链表，无扩容概念，头尾增删只改指针 O(1)
- node(index) 按 index < size/2 决定从头还是从尾遍历，但 get(i) 本质仍是 O(n)
- 中间插入"已知节点引用"是 O(1)，"按 index 插入"整体仍 O(n)，遍历是瓶颈
- 实现 Deque 接口可兼作队列/栈（offer/poll/push/pop），一个类顶三个容器
- 大忌：用 for-i 循环 get(i) 遍历 LinkedList 会退化成 O(n²)，必须用迭代器
- 内存：每个 Node 约 32 字节（含对象头与双指针），且节点分散导致 CPU 缓存命中率低，大量数据存储应选 ArrayList

## 正文

正文约 11868 字符，完整整理稿见附件 [[Assets/2026/10/jdk-02-linkedlist.md]]。附件含 Node/linkFirst/linkLast/node() 等核心源码注释、可运行 Demo、与 ArrayList 的多维对比表及适用场景总结。

## 来源

[JDK源码阅读(2) — LinkedList：双向链表，不只是个List](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483854&idx=1&sn=66afc3d3379c0c5252284472d168ee6c&chksm=fe6ca094c91b29824d0934e50d7150a1a09417b5cb1809c5f8db1f2115eea47aea25b568038f#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-02-linkedlist.md]]（抓取正文整理稿）
