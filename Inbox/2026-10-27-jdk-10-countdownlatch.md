---
id: 2026-10-27-jdk-10-countdownlatch
title: JDK源码阅读(11) CountDownLatch 门闩的等待与唤醒
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484070&idx=1&sn=e936e788fc9df36fde5efc693a278b52&chksm=fe6ca3fcc91b2aea64a082ad107f5b67e1b8e559e4bd6f2c5c17ef12240d51553802116d69ce#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-10-countdownlatch.md
wiki_status: pending
---

# JDK源码阅读(11) CountDownLatch 门闩的等待与唤醒

> CountDownLatch 让一个或多个线程等待其他线程完成，底层基于 AQS 共享模式：构造时把 count 设为 state，await() 调 acquireSharedInterruptibly，state≠0 时线程封装成共享节点入 CLH 队列阻塞；countDown() 通过 CAS 把 state 减 1，减到 0 时 doReleaseShared 唤醒所有等待线程。计数不可重置，区别于可重用的 CyclicBarrier。

## 核心要点

- 内部类 Sync 继承 AQS：state 即计数器；tryAcquireShared 在 state==0 时返回 1 放行，否则 -1 入队等待
- tryReleaseShared 用自旋 + CAS 减 state，减到 0 返回 true 触发 doReleaseShared 广播唤醒全部等待线程
- await(timeout, unit) 带超时版本等不到返回 false；getCount() 只是快照值
- countDown() 必须放 finally，否则异常导致永不归零、等待线程死等
- 一次性用品：计数到 0 不可重置；CyclicBarrier 可 reset 且是线程互相等待到达屏障
- 典型场景：主线程等待多个 worker 完成汇总、多线程就绪后统一起跑

## 正文

正文约 5800 字符，完整整理稿见附件 [[Assets/2026/10/jdk-10-countdownlatch.md]]。附件含 Sync/await/countDown 源码逐行注释、线程池配合的完整示例、与 CyclicBarrier 对比表及常见坑清单。

## 来源

[JDK源码阅读(11) CountDownLatch 门闩的等待与唤醒](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484070&idx=1&sn=e936e788fc9df36fde5efc693a278b52&chksm=fe6ca3fcc91b2aea64a082ad107f5b67e1b8e559e4bd6f2c5c17ef12240d51553802116d69ce#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-10-countdownlatch.md]]（抓取正文整理稿）
