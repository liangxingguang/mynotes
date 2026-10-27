---
id: 2026-10-27-jdk-14-threadpoolexecutor
title: ThreadPoolExecutor 源码深度剖析｜Java线程池的核心实现
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484580&idx=1&sn=1615c1c619ede406ce8b10c235e064df&chksm=fe6ca5fec91b2ce86e9c6840fc315c67a1a9a7049b8e3d5060d054a4def6b1329072f3ca800d#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-14-threadpoolexecutor.md
wiki_status: pending
---

# ThreadPoolExecutor 源码深度剖析｜Java线程池的核心实现

> 深入 ThreadPoolExecutor 源码：用一个 AtomicInteger（ctl）高 3 位存状态、低 29 位存线程数的精巧设计，execute 三步流程、Worker 继承 AQS 实现不可重入锁、getTask 控制线程存活，以及四种拒绝策略。

## 核心要点

- ctl 一个 int 打包状态+线程数，CAS 原子更新省一把锁；五态 RUNNING/SHUTDOWN/STOP/TIDYING/TERMINATED 按数值有序可直接比较
- execute 流程：核心线程未满先建 Worker → 满了入队（含 shutdown 二次检查回滚）→ 队列满建非核心线程 → 超 maxPoolSize 走拒绝策略
- Worker 继承 AQS 实现不可重入独占锁，防止 shutdown 中断时打乱正在执行的关键操作
- getTask 用 poll(keepAliveTime) 回收超 corePoolSize 的空闲线程，核心线程用 take() 死等（除非 allowCoreThreadTimeOut）
- 四种拒绝策略：AbortPolicy（默认抛异常）、CallerRunsPolicy（调用者跑，负反馈）、DiscardPolicy、DiscardOldestPolicy
- Executors 快捷方法有无界队列/无限线程的 OOM 风险，生产环境应手动 new ThreadPoolExecutor

## 正文

正文约 13426 字符，完整整理稿见附件 [[Assets/2026/10/jdk-14-threadpoolexecutor.md]]。附件含 ctl/execute/addWorker/runWorker/getTask 核心源码、状态转换图、拒绝策略实现与完整示例。

## 来源

[ThreadPoolExecutor 源码深度剖析｜Java线程池的核心实现](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484580&idx=1&sn=1615c1c619ede406ce8b10c235e064df&chksm=fe6ca5fec91b2ce86e9c6840fc315c67a1a9a7049b8e3d5060d054a4def6b1329072f3ca800d#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-14-threadpoolexecutor.md]]（抓取正文整理稿）
