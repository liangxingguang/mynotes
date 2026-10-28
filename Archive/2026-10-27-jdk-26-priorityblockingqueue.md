---
id: 2026-10-27-jdk-26-priorityblockingqueue
title: 深度解析 PriorityBlockingQueue — JUC 里的"插队之王"
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484689&idx=3&sn=25bc6f50f37be1a1d90714dbd0408f6d&chksm=fe6ca44bc91b2d5dfaf508f16fd3d0e89beccedba6a17d4eb875248f4955ff8a29b04d210df9#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-26-priorityblockingqueue.md
wiki_status: ingested
---

# 深度解析 PriorityBlockingQueue — JUC 里的"插队之王"

> PriorityBlockingQueue 是 PriorityQueue 的线程安全无界阻塞版：二叉堆 + 一把 ReentrantLock + 一个 notEmpty Condition。文章剖析其 offer/take 源码、堆的上浮下沉，重点讲解"扩容时先释放主锁、用 CAS 的 allocationSpinLock 抢扩容令牌"的巧妙设计，并梳理迭代器无序、元素优先级不可变等坑。

## 核心要点

- 本质公式：PriorityQueue（小顶堆，数组存储）+ ReentrantLock + Condition = PriorityBlockingQueue，入队出队均 O(log n)
- 无界队列只有 notEmpty 没有 notFull；put 不阻塞直接调 offer，take 在空队列时阻塞
- 扩容设计最精妙：先释放主锁再 CAS 抢 allocationSpinLock，抢不到的线程 yield，避免扩容阻塞读写；小容量 +2、超 64 后 1.5 倍扩
- 迭代器遍历的是数组物理顺序而非优先级顺序，按序消费只能不断 poll()
- 入队元素不能修改影响 compareTo 的属性，否则堆结构错乱；不允许 null
- 因 siftUp/siftDown 涉及多数组元素读写，无法用 CAS 实现，故用全互斥锁；无界不等于不 OOM，需监控队列长度

## 正文

正文约 10600 字符，完整整理稿见附件 [[Assets/2026/10/jdk-26-priorityblockingqueue.md]]。附件含核心字段与 offer/tryGrow/take/上浮下沉源码、3 个示例（自然序、任务调度、阻塞消费）及与其他 BlockingQueue 的对比表。

## 来源

[深度解析 PriorityBlockingQueue — JUC 里的"插队之王"](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484689&idx=3&sn=25bc6f50f37be1a1d90714dbd0408f6d&chksm=fe6ca44bc91b2d5dfaf508f16fd3d0e89beccedba6a17d4eb875248f4955ff8a29b04d210df9#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-26-priorityblockingqueue.md]]（抓取正文整理稿）
