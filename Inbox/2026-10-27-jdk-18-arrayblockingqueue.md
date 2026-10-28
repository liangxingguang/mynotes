---
id: 2026-10-27-jdk-18-arrayblockingqueue
title: JDK源码阅读系列-ArrayBlockingQueue：用一把锁撑起的数组阻塞队列
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484662&idx=2&sn=d98080fec05ae3d2edc34a3c03864367&chksm=fe6ca5acc91b2cba67457f79883e6bdf9ec1624a4f483249e274ef63a1ebda65d4c5b76a3db9#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-18-arrayblockingqueue.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-28T03:45:30.254Z"
ingest_claim_id: 52680-1793159130254-0
---

# JDK源码阅读系列-ArrayBlockingQueue：用一把锁撑起的数组阻塞队列

> JUC 中最经典的阻塞队列实现：底层是定长循环数组，全部并发控制用一把 ReentrantLock + 两个条件变量（notEmpty/notFull）完成。put/take 对称阻塞、enqueue/dequeue 循环指针，代码干净直白，是理解后续 LinkedBlockingQueue、PriorityBlockingQueue、DelayQueue 的最佳入口。

## 核心要点

- **数据结构**：循环数组 items + takeIndex/putIndex/count；数组结构决定无法分离队头队尾操作，只能单锁设计
- **并发模型**：一把全局锁 + 两个 Condition；put 满时等 notFull、成功后唤 notEmpty，take 完全对称，形成闭环
- **经典模式**：`while` 循环而非 `if` 检查条件，防虚假唤醒；`lockInterruptibly()` 使阻塞可响应中断；`awaitNanos` 返回剩余时间是 JUC 超时等待标准写法
- **细节**：出队后置 null 助 GC；size() 也要加锁保证 happens-before；迭代器弱一致性；drainTo 批量取更高效
- **与 LinkedBlockingQueue 对比**：单锁 vs 双锁、预分配数组（GC 友好）vs 每次 new Node、支持 fair 参数 vs 不支持
- **实践教训**：容量固定，生产长期大于消费会导致 put 全部阻塞甚至死锁；可用 offer 超时 + 降级丢弃兜底；容量建议 ≈ 峰值 QPS × 可容忍延迟 × 1.5

## 正文

正文约 10000 字符，完整整理稿见附件 [[Assets/2026/10/jdk-18-arrayblockingqueue.md]]，含全部核心源码（put/enqueue/take/dequeue/超时 offer）、生产者-消费者完整示例、三种阻塞队列对比表与踩坑经验。

## 来源

[JDK源码阅读系列-ArrayBlockingQueue：用一把锁撑起的数组阻塞队列](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484662&idx=2&sn=d98080fec05ae3d2edc34a3c03864367&chksm=fe6ca5acc91b2cba67457f79883e6bdf9ec1624a4f483249e274ef63a1ebda65d4c5b76a3db9#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-18-arrayblockingqueue.md]]（抓取正文整理稿，browser 级抓取）
