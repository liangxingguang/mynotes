---
id: 2026-10-27-jdk-20-futuretask
title: JDK源码剖析——FutureTask，线程池里那个「能拿到结果」的秘密武器
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484610&idx=1&sn=8afe78d4ba6c2c15f568ef087d75d6d2&chksm=fe6ca598c91b2c8e08f3819db1ca1261c4ad6169305755ae7c65e60b8d8adc3c5891ad53b4ec#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-20-futuretask.md
wiki_status: pending
---

# JDK源码剖析——FutureTask，线程池里那个「能拿到结果」的秘密武器

> 剖析 FutureTask 源码：既是 Runnable 又是 Future，用 200 多行代码实现单向递增状态机 + CAS + Treiber 无锁栈等待队列，支撑线程池 submit 的返回值、取消与等待语义。

## 核心要点

- 七态状态机（NEW→COMPLETING→NORMAL/EXCEPTIONAL，NEW→CANCELLED，NEW→INTERRUPTING→INTERRUPTED），状态单向递增，CAS 安全推进
- run() 通过 CAS 设置 runner 保证任务只执行一次；finally 中清空 runner 防止 cancel(true) 误中断已完成任务
- get() 走 awaitDone：等待线程以 WaitNode 入 Treiber 栈（LIFO），用 LockSupport.park/unpark 阻塞唤醒，COMPLETING 中间态 yield 让出 CPU
- finishCompletion 逐个 unpark 全部等待者并调 done() 钩子；JDK 8 起弃用 AQS 改自维护轻量状态机
- cancel(true) 只是设中断标志，任务不响应中断就停不下来；结果缓存后重复 get() 不再阻塞
- 任务异常存 outcome、状态置 EXCEPTIONAL，get() 时包装为 ExecutionException 抛出，真正原因看 getCause()
- 简单异步任务用 FutureTask 足够；需链式回调、组合编排才上 CompletableFuture

## 正文

正文约 9712 字符，完整整理稿见附件 [[Assets/2026/10/jdk-20-futuretask.md]]。附件含 run/get/awaitDone/finishCompletion 核心源码、状态流转图、与 CompletableFuture 对比及四种使用场景示例。

## 来源

[JDK源码剖析——FutureTask，线程池里那个「能拿到结果」的秘密武器](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484610&idx=1&sn=8afe78d4ba6c2c15f568ef087d75d6d2&chksm=fe6ca598c91b2c8e08f3819db1ca1261c4ad6169305755ae7c65e60b8d8adc3c5891ad53b4ec#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-20-futuretask.md]]（抓取正文整理稿）
