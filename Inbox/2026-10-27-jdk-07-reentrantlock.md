---
id: 2026-10-27-jdk-07-reentrantlock
title: JDK源码阅读(6)：ReentrantLock——可重入锁，从"管程"本质看AQS的优雅实现
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483954&idx=1&sn=dfa68e8418234148eaa351d7746ae9fc&chksm=fe6ca368c91b2a7e319c39e46f1adba95429c3952305e73d609a4715d624638ef9fc6e28c6d1#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-07-reentrantlock.md
wiki_status: pending
---

# JDK源码阅读(6)：ReentrantLock——可重入锁，从"管程"本质看AQS的优雅实现

> ReentrantLock 基于 AQS 实现：核心是一个 volatile state（0 未锁定，>1 表示重入次数）加 CLH 变体 FIFO 双向等待队列。抢锁失败的线程包装成 Node 入队，通过 CAS + 自旋 + park 阻塞唤醒。公平锁与非公平锁只差一个 hasQueuedPredecessors() 检查。支持可中断、超时获取与多 Condition 精确唤醒。

## 核心要点

- AQS 核心：volatile state + exclusiveOwnerThread + 双向链表等待队列；acquire 模板方法 = tryAcquire + addWaiter + acquireQueued
- 非公平 lock() 先 CAS 抢一次；失败入队后只有前驱是 head 的节点才重试，否则 park 阻塞等待 unpark
- 公平锁 tryAcquire 多一步 hasQueuedPredecessors() 检查，防止插队；性能通常只有非公平的 1/10~1/3
- 可重入即 state 累加，unlock 需把 state 减到 0 才真正释放，重入几次就要 unlock 几次
- unlock 必须在 finally 中调用；tryLock(timeout) 可防死锁做降级
- 多个 Condition 实现生产者/消费者精确唤醒，优于 synchronized 的单一等待集

## 正文

正文约 9232 字符，完整整理稿见附件 [[Assets/2026/10/jdk-07-reentrantlock.md]]。附件含 NonfairSync/FairSync/acquireQueued/release 源码注释、与 synchronized 对比表及计数器、超时锁、有界缓冲区三个实战示例。

## 来源

[JDK源码阅读(6)：ReentrantLock——可重入锁，从"管程"本质看AQS的优雅实现](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483954&idx=1&sn=dfa68e8418234148eaa351d7746ae9fc&chksm=fe6ca368c91b2a7e319c39e46f1adba95429c3952305e73d609a4715d624638ef9fc6e28c6d1#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-07-reentrantlock.md]]（抓取正文整理稿）
