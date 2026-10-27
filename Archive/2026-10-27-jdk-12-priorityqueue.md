---
id: 2026-10-27-jdk-12-priorityqueue
title: JDK源码阅读(13) — PriorityQueue：藏在二叉堆里的优先级天堂
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484215&idx=1&sn=d18c2f3a9eddb9adbfe53821649309e1&chksm=fe6ca26dc91b2b7b47da4caef883fb6e1875da49442e02e2c7b40abda3177d815a151428f512#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-12-priorityqueue.md
wiki_status: ingested
---

# JDK源码阅读(13) — PriorityQueue：藏在二叉堆里的优先级天堂

> 拆解 PriorityQueue 源码：底层用数组实现隐式平衡二叉堆，通过上浮（siftUp）和下沉（siftDown）维护堆序，实现插入和出队 O(log n)、取堆顶 O(1)。

## 核心要点

- 底层是 Object[] 数组，父子节点靠下标计算（父 (n-1)>>>1，左子 2n+1），把完全二叉树"压扁"成数组
- 默认小顶堆，支持自定义 Comparator 实现大顶堆；不允许 null，非线程安全（并发用 PriorityBlockingQueue）
- offer 末尾插入后上浮、poll 取堆顶后末元素下沉，均为 O(log n)；peek O(1)
- 扩容分两档：容量 <64 翻倍+2，≥64 扩 50%
- 从集合建堆用 Floyd 算法自底向下 siftDown，O(n) 快于逐个插入的 O(n log n)
- 迭代器不保证有序，需按优先级遍历要循环 poll；入队后修改元素比较字段不会触发重排
- 典型应用：任务调度、Top-K 问题（用大顶堆维持 k 个元素，O(n log k)）

## 正文

正文约 10967 字符，完整整理稿见附件 [[Assets/2026/10/jdk-12-priorityqueue.md]]。附件含 siftUp/siftDown/heapify 核心源码、堆结构图解、与 TreeSet 对比及 Top-K 实战代码。

## 来源

[JDK源码阅读(13) — PriorityQueue：藏在二叉堆里的优先级天堂](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484215&idx=1&sn=d18c2f3a9eddb9adbfe53821649309e1&chksm=fe6ca26dc91b2b7b47da4caef883fb6e1875da49442e02e2c7b40abda3177d815a151428f512#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-12-priorityqueue.md]]（抓取正文整理稿）
