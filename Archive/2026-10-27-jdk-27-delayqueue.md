---
id: 2026-10-27-jdk-27-delayqueue
title: DelayQueue —— 延迟队列，让任务“迟到”的艺术
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484697&idx=2&sn=8e03c6e70157166bc0d50ca7bb72b8cd&chksm=fe6ca443c91b2d558b2898edeb03386aec35516bf44d3ea388c8abea14dc3717b7da90905bba#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-27-delayqueue.md
wiki_status: ingested
---

# DelayQueue —— 延迟队列，让任务“迟到”的艺术

> DelayQueue 是无界延迟阻塞队列，本质为 PriorityQueue + ReentrantLock + Condition + leader-follower 优化，元素须实现 Delayed 接口，只有到期才能被取走。文章剖析 offer/take 源码与 leader 机制如何避免惊群效应，并给出订单超时取消的完整示例及与 ScheduledThreadPoolExecutor、Timer、时间轮的对比。

## 核心要点

- 元素必须实现 Delayed（getDelay + compareTo），内部用 PriorityQueue 按到期时间排小顶堆，队首永远最早到期
- offer 时仅当新元素成为队首才重置 leader 并 signal，避免无效唤醒
- take 的 leader-follower 模式：leader 用 awaitNanos 精确等待剩余时间，follower 无限 await，每个元素只唤醒 1~2 个线程，消除惊群
- getDelay 必须每次按当前时间动态计算，返回固定值是经典错误；compareTo 排序语义要与之一致
- 无界队列需防 OOM；drainTo 只导出已到期元素；不允许 null
- 典型场景：订单超时取消、缓存过期清理、会话超时管理；周期任务请用 ScheduledThreadPoolExecutor

## 正文

正文约 10200 字符，完整整理稿见附件 [[Assets/2026/10/jdk-27-delayqueue.md]]。附件含 offer/take/poll 核心源码、leader-follower 图解、订单超时取消完整可运行示例及多种延迟方案对比表。

## 来源

[DelayQueue —— 延迟队列，让任务“迟到”的艺术](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484697&idx=2&sn=8e03c6e70157166bc0d50ca7bb72b8cd&chksm=fe6ca443c91b2d558b2898edeb03386aec35516bf44d3ea388c8abea14dc3717b7da90905bba#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-27-delayqueue.md]]（抓取正文整理稿）
