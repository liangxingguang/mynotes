---
id: 2026-10-27-jdk-19-linkedblockingqueue
title: 深度剖析 LinkedBlockingQueue：链表实现的阻塞队列，为什么比 ArrayBlockingQueue 快？
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484674&idx=2&sn=2a4992228ac447520573028b047d17b7&chksm=fe6ca458c91b2d4eead7b2ab5bd34c3a780e802125ac8eb617a730bcedb89946bedf24e4fa26#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-19-linkedblockingqueue.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-28T03:59:59.492Z"
ingest_claim_id: 50020-1793159999492-0
---

# 深度剖析 LinkedBlockingQueue：链表实现的阻塞队列，为什么比 ArrayBlockingQueue 快？

> 逐行剖析 LinkedBlockingQueue 源码：基于单向链表 + 哨兵节点，用 takeLock/putLock 两把锁实现读写分离互不阻塞，配 AtomicInteger 计数与跨锁信号传递，高并发下吞吐量优于单锁的 ArrayBlockingQueue。

## 核心要点

- 灵魂设计是两把锁：putLock 管入队、takeLock 管出队，生产者与消费者互不干扰；count 用 AtomicInteger 保证双锁下原子性
- head 为哨兵节点（item==null），出队时把首元素节点滚动变为新哨兵，省去新建节点
- 生产者 put 后若 count 从 0 变 1 才需唤醒消费者，且须先获取 takeLock 再 signal notEmpty（跨锁信号传递）
- 默认容量 Integer.MAX_VALUE 近乎无界，生产环境必须显式指定容量防 OOM
- remove/contains/toArray/drainTo 需 fullyLock 同时持有两把锁；drainTo 一次锁批量转移，比多次 poll 高效
- 对比 ArrayBlockingQueue：并发越高链表队列吞吐优势越明显，但 Node 对象带来内存与 GC 开销，GC 敏感场景数组队列更稳

## 正文

正文约 10974 字符，完整整理稿见附件 [[Assets/2026/10/jdk-19-linkedblockingqueue.md]]。附件含 put/take/enqueue/dequeue/signalNotEmpty 核心源码、生产者-消费者完整示例及与 ArrayBlockingQueue 选型对比表。

## 来源

[深度剖析 LinkedBlockingQueue：链表实现的阻塞队列，为什么比 ArrayBlockingQueue 快？](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484674&idx=2&sn=2a4992228ac447520573028b047d17b7&chksm=fe6ca458c91b2d4eead7b2ab5bd34c3a780e802125ac8eb617a730bcedb89946bedf24e4fa26#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-19-linkedblockingqueue.md]]（抓取正文整理稿）
