---
id: 2026-10-27-jdk-11-cyclicbarrier
title: JDK源码阅读(12) — CyclicBarrier：循环栅栏，让线程"凑一桌"再出发
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484091&idx=1&sn=f34fe74b9a55040bae8cc137be67d214&chksm=fe6ca3e1c91b2af79d7e5caff79882ec321f9ee80aada71861fbfe21dc5d106feec1492781a7#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-11-cyclicbarrier.md
wiki_status: pending
---

# JDK源码阅读(12) — CyclicBarrier：循环栅栏，让线程"凑一桌"再出发

> 深入剖析 CyclicBarrier 源码：基于 ReentrantLock + Condition 实现的可循环使用的线程屏障，通过 Generation 对象隔离每一轮状态实现"循环"，最后一个到达的线程负责执行 barrierAction 并唤醒所有等待线程。

## 核心要点

- CyclicBarrier 让一组线程相互等待凑齐后一起出发，且屏障可自动重置循环使用，区别于一次性的 CountDownLatch
- 内部用 ReentrantLock + Condition（trip）实现，parties 固定、count 动态递减，count 归零即破障
- Generation（代）机制是循环的核心：每轮 new 一个 Generation，等待线程通过 `g != generation` 判断正常通过，`g.broken` 判断异常
- 最后一个到达的线程（index==0）有特权：不阻塞，执行 barrierAction 后调用 nextGeneration() 唤醒所有人
- 中断、超时或 barrierAction 抛异常会触发 breakBarrier()，所有等待线程收到 BrokenBarrierException，须 reset() 才能复用
- 注意线程池线程数必须不少于 parties，否则永远凑不齐导致死等

## 正文

正文约 10122 字符，完整整理稿见附件 [[Assets/2026/10/jdk-11-cyclicbarrier.md]]。附件含 dowait/nextGeneration/breakBarrier 核心源码、与 CountDownLatch 对比表及并行分阶段计算示例。

## 来源

[JDK源码阅读(12) — CyclicBarrier：循环栅栏，让线程"凑一桌"再出发](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484091&idx=1&sn=f34fe74b9a55040bae8cc137be67d214&chksm=fe6ca3e1c91b2af79d7e5caff79882ec321f9ee80aada71861fbfe21dc5d106feec1492781a7#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-11-cyclicbarrier.md]]（抓取正文整理稿）
