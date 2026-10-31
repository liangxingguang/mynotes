---
id: wiki-concept-netty-hashed-wheel-timer
type: concept
title: Netty 时间轮定时器（HashedWheelTimer）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - netty
  - timer
  - concurrency
sources:
  - raw/sources/architecture/2026-10-28-netty-source-series-album.md
related:
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/netty-idlestate-heartbeat.md
  - wiki/concepts/delayqueue-internals.md
  - wiki/entities/netty.md
---
# Netty 时间轮定时器（HashedWheelTimer）

## Definition（定义）

`io.netty.util.HashedWheelTimer` 是 Netty 的时间轮定时器：把时间切成固定刻度（`tickDuration`）的环形表盘（`wheel`，长度规范为 2 的幂），任务按 deadline 映射到槽位并用 `remainingRounds` 记录还需转几圈，用"落桶 O(1) + 批量过期"把大量近似超时任务的调度成本摊薄。适合连接超时、请求超时、重试、心跳检测；不适合高精度调度，也不应每连接创建一个实例。

## Why It Matters（为什么重要）

长连接系统的定时压力来自任务数量而非单任务：十万连接各有读空闲检测、几十万请求各有超时。若每次插入都维护严格有序结构，任务增加会线性放大调度成本；时间轮以一个 tick 量级的到期误差换取接近常数时间的插入与批量过期。理解它与 `EventLoop.schedule`（EventLoop 内优先队列）的分工，才能在连接超时管理、心跳、重试等场景正确选型。

## Core Characteristics（核心特征）

1. **钟表面盘模型**：`wheel` 是表盘、`tickDuration` 每格时长、`tick` 当前格数、`remainingRounds` 剩余圈数；`mask = wheel.length - 1`，长度 2 的幂时 `ticks & mask` 等价取模但更直接。
2. **提交与执行分离**：`newTimeout` 只把 `HashedWheelTimeout` 放进 MPSC 队列并递增 `pendingTimeouts`（`maxPendingTimeouts` 容量保护，超限抛 RejectedExecutionException）；Worker 线程串行落桶，避免多业务线程争抢 Bucket 链表。
3. **掩码映射 + 迟到保护**：`remainingRounds = (calculated - tick) / wheel.length`；`Math.max(calculated, tick)` 把已迟到任务放到当前可处理槽位，而非落回历史刻度。
4. **Worker 每 tick 四件事**：`waitForNextTick` → `processCancelledTasks` → `transferTimeoutsToBuckets`（每轮有搬运上限，防提交洪峰拖住时间推进）→ `bucket.expireTimeouts`（已取消移除 / remainingRounds 减一 / deadline 已到执行 / 未到报错保护）。
5. **精度与粒度边界**：任务不会早于 deadline 执行，但可能因 tick 粒度、Worker 调度延迟或慢回调晚执行；O(1) 只指"定位槽位"，同槽任务集中到期会形成尖峰（如百万任务同一秒到期）。
6. **线程归属**：`TimerTask.run(timeout)` 在 Worker 线程执行，慢任务拖迟同一 Timer 上的其他超时——定时器只负责触发，不是耗时业务线程池。
7. **与 EventLoop.schedule 分工**：后者来自 `AbstractScheduledEventExecutor`，用按 deadline 排序的优先队列、由 EventLoop 自己执行，适合与单个 Channel 状态严格串行的少量任务（`IdleStateHandler` 即用它）；时间轮适合跨连接、数量庞大的近似超时。

## Structure（结构）

```text
newTimeout(task, delay)
  -> pendingTimeouts 计数（maxPendingTimeouts 保护）
  -> HashedWheelTimeout 入 MPSC 队列（timesout.add）
Worker 线程
  -> waitForNextTick
  -> processCancelledTasks
  -> transferTimeoutsToBuckets（带搬运上限）
  -> deadline / tickDuration -> stopIndex + remainingRounds
  -> bucket.expireTimeouts（逐桶：取消/减轮/到期执行）
  -> TimerTask.run（Worker 线程）
```

## How It Works（运作方式）

参数权衡：一圈覆盖时间 = `tickDuration × wheelSize`。减小 tickDuration 粒度更细但 Worker 唤醒更频繁；增大 wheelSize 一圈覆盖更久、remainingRounds 更少但数组占用增加。网络超时通常允许几十到几百毫秒误差，先定业务可接受误差，再估典型延时范围与任务量选参数。

工程纪律四条：**共享实例**（进程/组件级一个 Timer，源码对过多实例给资源泄漏警告）、**限制 pending**（maxPendingTimeouts 防异常流量堆内存）、**回调轻量**（超时回调只做 tryFailure 状态竞争，耗时动作 `eventLoop.execute` 切回 EventLoop）、**状态幂等**（正常响应、超时、关闭并发竞争，tryTimeout 最终只能有一个路径完成请求状态）。

取消语义：调用方标记取消并进入 `cancelledTimeouts` 队列，Worker 统一从 Bucket 移除；请求提前完成必须取消对应 Timeout，否则留到目标槽位才被清理。`stop()` 不等于等待所有任务执行：停止后 Worker 退出并返回未处理 Timeout 集合；正确关闭顺序是先停新流量 → 完成/失败在途请求 → 再停时间轮。

pending 堆积六根因（业务生命周期不闭环）：请求成功后未取消超时、重试每轮创建新 Timeout 未取消前一轮、连接断开后任务仍引用 Channel 与上下文、Worker 阻塞过期速度低于创建速度、同一截止时间任务过多形成单桶尖峰、maxPendingTimeouts 未限流。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-eventloop]]：时间轮是独立 Worker 线程模型，与 EventLoop 的定时任务优先队列形成互补分工；超时回调要写回 Channel 时必须经 EventLoop。
- [[netty-idlestate-heartbeat]]：IdleStateHandler 用 EventLoop.schedule 而非时间轮（空闲状态与 Channel 事件需同 EventLoop 传播）；超大连接量下时间轮是替代方案（Dubbo 客户端心跳先例）。
- [[delayqueue-internals]]：时间轮与延迟队列同属"大量延迟任务的结构化调度"家族，取舍口径不同。

### Dependencies（依赖项）

- 无锁 MPSC 队列（提交线程与 Worker 的交接面）；Worker 线程与 wheel 数组。

### Distinctions（区分）

- 与优先队列定时器（如 EventLoop.schedule / Java DelayQueue）的不同：时间轮以 tick 误差换批量过期，大量近似超时成本更稳定；优先队列按 deadline 精确等待但插入删除带对数成本、唤醒频繁。
- 与高精度调度器的不同：微秒级或严格准点场景时间轮不适用，误差 = tickDuration 粒度 + Worker 调度延迟。

## Evolution（演进）

- 2026-10-31：随程序员行一第 23 篇（源码系列）建立——机制主链、参数权衡、与 EventLoop.schedule 分工、四条工程纪律、停止语义与 pending 堆积根因。

## Open Questions（开放问题）

- 作者未给时间轮在海量超时下的实际压测数据（吞吐/延迟分布），"接近常数时间"为定性论断。
- `transferTimeoutsToBuckets` 搬运上限的具体默认值与调优口径，信源未展开。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-netty-source-series-album.md`（第 23 篇，自媒体教程信源；源码为简化注解版，标注 Netty 4.1.135.Final）

## Related Knowledge（相关知识）

- [[netty-source-series-album]]（信源页）
- [[netty]]（实体页）
