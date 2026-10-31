---
id: wiki-concept-batch-message-push
type: concept
title: 批量消息推送（百万级短信推送）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - java
  - architecture
  - concurrency
  - reliability
sources:
  - raw/sources/architecture/2026-10-31-batch-push-sharding-threadpool.md
related:
  - wiki/concepts/cursor-sharding.md
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/retry-governance.md
  - wiki/sources/batch-push-sharding-threadpool.md
  - wiki/sources/async-task-system-design.md
---
# 批量消息推送（百万级短信推送）

## Definition（定义）

把消息（短信/推送）批量发送给百万级用户的工程模式：不把全量用户加载进内存、不串行逐条发送，而是以「游标分片流式拉取 + 专用线程池并行发送 + 异步进度追踪 + 失败重试/死信 + 断点续跑 + 任务去重」同时满足内存、性能与可靠性三对矛盾。

## Why It Matters（为什么重要）

批量推送是「全量加载+串行」写法的重灾区：百万条 × 单条耗时即小时级时延，全量对象驻留即 OOM。它同时是异步任务系统（提交/排队/执行/进度/重试/幂等）在 IO 密集型下游（短信服务商）上的具体实例，涉及线程池隔离、限流、断点续跑等可复用机制。

## Core Characteristics（核心特征）

1. 三对矛盾自查框架：内存（全量加载 vs 流式处理）、性能（串行 vs 有界并行）、可靠性（一次失败 vs 失败重试）。任何百万级批处理都可套用此三问。
2. 流式分片：按主键游标逐批拉取（每批 1000 条），任何时刻内存中只有一批数据（依赖 [[cursor-sharding|游标分片]]）。
3. 专用线程池隔离：推送任务不与主业务共享线程池；必须自定义 `ThreadPoolExecutor` + 有界队列，拒绝默认池（详见 [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]] 中 Executors 快捷方法的无界队列/无上限线程缺陷）。
4. 线程数按 IO 密集估算：CPU 核心数 × (1 + 等待时间/计算时间)，且受下游服务商 QPS 上限约束（示例取 10-50，推荐核心数 10-20、队列 1000）。
5. 异步 + 进度可观测：提交即返回 taskId；进度（已处理/总数/成功/失败）存 Redis，每批统一更新一次以降低写次数。
6. 失败分级：单条失败→失败列表稍后重试→超 3 次入死信表由定时任务兜底；整批失败→记录状态与 lastId 支持断点续跑（`resumePush(taskId, lastId)`）。
7. 幂等防重：任务 ID 去重 + 分布式锁防重复点击；任务持久化到库防服务重启丢失。
8. 限流保护下游：Guava `RateLimiter`（示例 100 QPS）+ 指数退避，避免打爆短信服务商。
9. 分批提交：每批处理完单独提交，避免大事务。

## Structure（结构）

```
用户点击“批量推送”
  → 生成 taskId（持久化任务，防重启丢失）
  → 游标分片拉取：WHERE id > lastId LIMIT 1000
  → 专用线程池执行发送（有界队列 + 限流器）
  → 每批统一更新 Redis 进度（已处理/总数/成功/失败）
  → 单条失败重试（3 次指数退避）→ 超限写死信表
  → 整批失败：记录状态，凭 lastId 断点续跑
```

## How It Works（运作方式）

提交侧：生成全局唯一 taskId 并落库 → 立即返回，用户不阻塞。执行侧：以游标方式按 ID 升序逐批拉取用户（避免 `LIMIT offset` 深分页）→ 每批 1000 条交给专用线程池并行发送 → 每批结束后一次性更新 Redis 进度。失败侧：单条失败先记失败列表稍后重试；重试 3 次仍失败写入 `push_dead_letter` 死信表由定时任务人工兜底；整批任务失败时记录最后处理的 lastId，重启后 `resumePush(taskId, lastId)` 从断点继续。防重侧：重复点击/重复提交由 taskId 去重 + 分布式锁拦截。

## Relationships（关系）

### Related Concepts（相关概念）

- [[cursor-sharding|游标分片]]（depends-on：本模式的内存安全的根基）
- [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]（depends-on：专用线程池+有界队列的机制基础）
- [[idempotency-design|幂等设计]]（任务 ID 去重+分布式锁的一般化）
- [[retry-governance|重试治理]]（重试次数/退避/熔断的更系统框架；本模式的重试是其简化版）
- [[local-message-table|本地消息表]]（另一种跨系统可靠投递路线，见区分）

### Distinctions（区分）

- 与 [[write-fanout|写扩散]]/[[read-fanout|读扩散]] 的不同之处：后者是 IM 群消息「一条消息复制到 N 个收件箱」的扇出模型；本模式是「一条任务遍历 N 个用户」的批量推送模型，扇出方向与存储结构都不同。
- 与 [[mysql-bulk-import|MySQL 大批量导入优化]] 的不同之处：同为批量流式处理，但导入的瓶颈在写侧（攒批/少刷盘/先灌后建索引），推送的瓶颈在外部 IO（服务商 QPS 限流），调参逻辑相反（导入要堆并发，推送要限并发）。

## Evolution（演进）

- 单信源（公众号教程，2026-10-31 摄入）：事故复盘 → 矛盾拆解 → 游标分片+线程池方案 → 进阶（限流/续跑/死信）→ 按规模选型。
- 规模分档（信源观点）：≤100 万：游标分片+专用线程池+进度追踪；≥1000 万：加分片+消息队列异步解耦；高实时性：分片+多线程+限流。

## Open Questions（开放问题）

- 推荐参数（分片 1000-5000、核心线程 10-20、队列 1000、重试 3 次）无压测数据支撑，属经验起点——解读：实际取值须按下游 QPS 与单条耗时压测校准。
- 死信表的人工处理流程、多任务并发时的游标隔离（不同 taskId 的 lastId 互不干扰）信源未展开。
- 与 [[retry-governance|重试治理]] 的 Retry Budget/熔断机制如何结合，尚未见多信源讨论。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-batch-push-sharding-threadpool.md`

## Related Knowledge（相关知识）

- [[batch-push-sharding-threadpool|第70篇：批量消息推送优化（信源页）]]
- [[async-task-system-design|异步任务系统怎么设计？从提交、排队、执行到幂等和重试]]
