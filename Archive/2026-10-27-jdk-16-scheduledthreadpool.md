---
id: 2026-10-27-jdk-16-scheduledthreadpool
title: 深度剖析 ScheduledThreadPoolExecutor——JDK 定时任务调度引擎
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484595&idx=1&sn=877c00f350fe26df19ff7fd04b670b7b&chksm=fe6ca5e9c91b2cffca7cc3391179bca7b4cd4be16f6494dcb5026de4b579477be6c672e6b18f#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-16-scheduledthreadpool.md
wiki_status: ingested
---

# 深度剖析 ScheduledThreadPoolExecutor——JDK 定时任务调度引擎

> 剖析 ScheduledThreadPoolExecutor 源码：在 ThreadPoolExecutor 之上几乎零改动地加入定时调度能力——任务包装为带触发时间的 ScheduledFutureTask，用最小堆 DelayedWorkQueue 排序，周期任务执行完重新设时间入队。

## 核心要点

- 构造固定 maxPoolSize=Integer.MAX_VALUE，workQueue 强制为内部 DelayedWorkQueue（数组实现的最小堆，按触发时间排序）
- take() 采用 Leader-Follower 模式：仅 leader 线程 awaitNanos 等最早到期任务，减少多线程争抢
- fixedRate 与 fixedDelay 的差别只是 period 正/负号：fixedRate 按上次触发时间累加（可能追尾重叠），fixedDelay 按执行完当前时间计算（不重叠）
- 周期任务 run() 中 runAndReset 成功后 setNextRunTime 并 reExecutePeriodic 重新入队
- 经典坑：周期任务未捕获异常会被静默取消且无日志，必须任务体内 try-catch
- DelayedWorkQueue 无界，fixedRate 任务执行慢于周期会堆积并集中补跑（catch up）
- 全面优于 Timer（多线程、纳秒精度、异常不拖垮全局），90% 定时场景够用

## 正文

正文约 11665 字符，完整整理稿见附件 [[Assets/2026/10/jdk-16-scheduledthreadpool.md]]。附件含 DelayedWorkQueue/take/ScheduledFutureTask.run 核心源码、调度流程图、与 Timer 对比及完整示例。

## 来源

[深度剖析 ScheduledThreadPoolExecutor——JDK 定时任务调度引擎](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484595&idx=1&sn=877c00f350fe26df19ff7fd04b670b7b&chksm=fe6ca5e9c91b2cffca7cc3391179bca7b4cd4be16f6494dcb5026de4b579477be6c672e6b18f#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-16-scheduledthreadpool.md]]（抓取正文整理稿）
