---
id: wiki-source-batch-push-sharding-threadpool
type: source
title: 第70篇：批量消息推送优化——百万级推送如何避免内存爆炸（分片 + 线程池 + 异步）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - java
  - architecture
  - concurrency
  - batch-push
sources:
  - raw/sources/architecture/2026-10-31-batch-push-sharding-threadpool.md
related:
  - wiki/concepts/batch-message-push.md
  - wiki/concepts/cursor-sharding.md
---
# 第70篇：批量消息推送优化——百万级推送如何避免内存爆炸（分片 + 线程池 + 异步）

## Overview（概览）

公众号「Java架构实战笔记」消息与任务处理系列第 70 篇。以一次双十一前给 100 万用户推送预售短信导致 10 分钟后 OOM 崩溃的事故为引子，拆解百万级批量推送的三对核心矛盾（内存/性能/可靠性），给出一套 Java 落地方案：游标分片（每批 1000 条）+ 专用线程池（有界队列）+ Redis 进度追踪 + 单条失败重试（3 次后入死信表）+ 任务 ID 去重与断点续跑，附 7 项踩坑清单与按规模选型表。

## Key Facts（关键事实）

- 事故：电商平台双十一前给 100 万用户推送预售短信，点击发送后 10 分钟服务 OOM 崩溃；根因是一次性把全部用户加载进 JVM（数 GB）+ 串行逐条发送（50ms/条 → 13 小时以上）+ 无进度追踪/无失败重试/无并发控制。
- 三对核心矛盾：① 内存：全量加载 vs 流式处理（100 万用户 × 每条 200 字节 ≈ 200MB User 对象，信源此处数字与「数 GB」表述并存，未调和）；② 性能：串行 vs 并行（并行不能无限制，线程过多因上下文切换与资源竞争反而变慢）；③ 可靠性：一次失败 vs 失败重试。
- 分片方式对比：ID 范围（`WHERE id BETWEEN ? AND ?`，自增主键分布均匀）/ 分页（`LIMIT offset, size`，深分页慢）/ 游标（`WHERE id > lastId LIMIT size`，本文采用，性能恒定）/ 哈希（`WHERE MOD(id, N) = ?`，并行互不干扰）。
- 线程池：`ForkJoinPool.commonPool()` 线程少偏 CPU 型、`Executors.newFixedThreadPool()` 无界队列会 OOM、`Executors.newCachedThreadPool()` 线程数无上限，均不可用；必须自定义 `ThreadPoolExecutor` + 有界队列。
- 线程数估算：IO 密集型 = CPU 核心数 × (1 + 等待时间/计算时间)；实际受短信服务商 QPS 限制，一般取 10-50 个线程。
- 异步与进度：提交后台线程池立即返回 taskId；进度存 Redis（已处理数/总数/成功数/失败数），每批处理完统一更新一次以减少 Redis 写。
- 可靠性：单条失败记失败列表稍后重试 → 重试超 3 次写死信表人工处理 → 整批失败记录状态支持断点续跑（记住 lastId，`resumePush(taskId, lastId)`）。
- 进阶优化：分批提交避免大事务；Guava `RateLimiter.create(100)`（100 QPS）限流保护服务商；任务持久化到库防重启丢失；任务 ID 去重 + 分布式锁防重复点击。
- 踩坑清单（7 项）：OOM→游标分片；线程池耗尽→有界队列+合理拒绝策略；服务商限流→限流器+指数退避；进度不更新→每批写 Redis；任务重复执行→taskId 去重+分布式锁；分片查询占满连接池→控制分片大小及时释放连接；异步任务重启丢失→任务落库。
- 规模选型：100 万以内用游标分片+专用线程池+进度追踪；1000 万以上加分片+消息队列异步解耦；实时性高用分片+多线程+限流；服务商 QPS 低用限流器+批量提交。
- 参数推荐：分片大小 1000-5000（按单条耗时调整）、线程池核心数 10-20、队列 1000、重试 3 次（指数退避）、进度每批更新一次。

## Important Claims（重要论断）

### Claim 1：百万级推送的内存矛盾必须靠流式分片解决

「把『全量数据』一次性加载到内存，而不是『流式逐条处理』」是事故的根本原因（信源原文）。本文据此选用游标分片逐批拉取。

### Claim 2：专用线程池 + 有界队列是稳定性保障

「专用线程池 + 有界队列 + 合理拒绝策略是稳定性的保障」（信源原文，总结三句话之二）。理由：默认线程池各有致命边界（无界队列 OOM / 线程数无上限 / 线程太少）。

### Claim 3：进度追踪 + 失败重试 + 死信队列是可靠性三大支柱

（信源原文，总结三句话之三）。进度可观测（Redis）、单条失败可恢复（重试 3 次入死信）、整体失败可续跑（lastId）。

## Concepts Introduced（引入的概念）

- [[batch-message-push|批量消息推送（百万级短信推送）]]
- [[cursor-sharding|游标分片（Keyset Pagination 批扫）]]

## Entities Mentioned（提及的实体）

- [[redis|Redis]]（进度存储）
- [[rocketmq|消息队列]]（1000 万以上规模的异步解耦选项，信源提及未展开）

## Implications（影响／启示）

- 解读：该文的价值不在代码，而在「三对矛盾」的拆解框架——任何百万级批处理（导入、导出、推送、对账）都可套用「内存/性能/可靠性」三问自查。
- 解读：参数推荐（分片 1000-5000、核心线程 10-20、队列 1000、重试 3 次）是经验起点，必须按压测与服务商 QPS 实际校准，不能照抄。

## Limitations（局限）

- 单一信源（公众号教程），属二次/三次性内容；事故数字（100 万用户、50ms/条、数 GB）为作者叙事，未经独立验证。
- 采集时正文抽取器截断了代码块，仅保留章节结构与表格文字；完整代码需回原文链接查看（采集层已在 Inbox 笔记注明）。
- 配套项目 `heyou-batch-message-push/` 为教程示例工程，未提供线上运行数据。
- 「100 万用户 × 200 字节 ≈ 200MB」与前文「数 GB 内存」口径不一致，信源未调和（本文按原样记录，见矛盾标注）。

## Related Knowledge（相关知识）

- [[async-task-system-design|异步任务系统怎么设计？从提交、排队、执行到幂等和重试]]（提交/排队/进度/重试谱系互证）
- [[retry-governance|重试治理]]（重试次数/退避/熔断的更系统框架）
- [[idempotency-design|幂等设计]]（taskId 去重+分布式锁的一般化）
- [[mysql-bulk-import|MySQL 大批量导入优化]]（批量场景的并行分片共性）

## Source（信源）

- `raw/sources/architecture/2026-10-31-batch-push-sharding-threadpool.md`
