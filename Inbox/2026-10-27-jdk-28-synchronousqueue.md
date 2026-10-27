---
id: 2026-10-27-jdk-28-synchronousqueue
title: 深度剖析 SynchronousQueue — 零容量的神奇队列
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484705&idx=2&sn=04702b3898086b5770b4399e97ff53dc&chksm=fe6ca47bc91b2d6de1b5c0408572221426d758e764390f864585669628c832163e1c026030c2#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-28-synchronousqueue.md
wiki_status: pending
---

# 深度剖析 SynchronousQueue — 零容量的神奇队列

> SynchronousQueue 容量恒为 0，不存储任何元素，生产者 put 必须等消费者 take 接手，实现线程间"一手交钱一手交货"的直接交接。文章剖析其双模式实现：非公平 TransferStack（Treiber 栈 + CAS + FULFILLING 配对标记）与公平 TransferQueue，以及先自旋后 park 的等待优化，并解释 newCachedThreadPool 为何选用它。

## 核心要点

- 容量永远为 0、size() 恒返回 0，元素不停留；一个 transfer 方法靠 e 是否为 null 同时实现 put 和 take
- 非公平模式 TransferStack 用无锁 Treiber 栈：同类节点入栈等待、异类节点尝试配对并 unpark 对方、他人配对中则帮忙推进
- 公平模式 TransferQueue 用 FIFO 队列先来先服务；默认非公平因新线程更"热"、缓存命中率高、吞吐更好
- awaitFulfill 先按 CPU 核数自旋再 LockSupport.park，避免配对快时的上下文切换开销
- newCachedThreadPool 用它：corePoolSize=0 + SynchronousQueue 使任务不排队、无空闲线程立即新建线程
- 坑：别用 size()/isEmpty() 判断；offer/poll 非阻塞立即返回；非公平模式下等待线程有饥饿风险

## 正文

正文约 11600 字符，完整整理稿见附件 [[Assets/2026/10/jdk-28-synchronousqueue.md]]。附件含 TransferStack/TransferQueue/awaitFulfill 核心源码、生产者消费者完整示例、Dubbo 应用场景及与 ArrayBlockingQueue/LinkedBlockingQueue 的对比表。

## 来源

[深度剖析 SynchronousQueue — 零容量的神奇队列](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484705&idx=2&sn=04702b3898086b5770b4399e97ff53dc&chksm=fe6ca47bc91b2d6de1b5c0408572221426d758e764390f864585669628c832163e1c026030c2#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-28-synchronousqueue.md]]（抓取正文整理稿）
