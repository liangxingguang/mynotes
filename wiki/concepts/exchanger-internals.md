---
id: wiki-concept-exchanger-internals
type: concept
title: Exchanger 双向交换设计（Slot→Arena 渐进扩容 + 动态自旋）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: medium
tags:
  - concept
  - java
  - jdk
  - concurrency
sources:
  - raw/sources/misc/2026-10-27-jdk-30-exchanger.md
related:
  - wiki/concepts/atomic-variables-cas.md
  - wiki/concepts/cache-line-and-false-sharing.md
  - wiki/concepts/synchronousqueue-internals.md
  - wiki/sources/jdk-30-exchanger.md
---
# Exchanger 双向交换设计（Slot→Arena 渐进扩容 + 动态自旋）

## Definition（定义）

Exchanger（`java.util.concurrent.Exchanger<V>`，JDK 1.5 引入）是 JUC 中唯一支持**双向数据交换**的同步工具：两个线程在同一汇合点各自带数据到达，互换后各自离开。API 仅两个 exchange 方法（无限等待版与带超时版），不实现任何接口。

## Why It Matters（为什么重要）

它回答"两个协作线程如何在对等汇合点互换数据而不经中间队列"的问题。同时它是 Doug Lea 并发技巧的浓缩样本：CAS 配对、单槽到 Arena 的渐进扩容、按 CPU 核数与 hash 的动态自旋、@Contended 与手动填充双轨防伪共享——读懂它等于把 JUC 的常用武器库过了一遍。

## Core Characteristics（核心特征）

1. 配对语义：先到线程把自己（ThreadLocal 持有的 Node）CAS 放入 Slot 等待；后到线程 CAS 把 Slot 置空抢配对，取走对方 item、写入对方 match、unpark 对方。
2. 渐进式扩容：无竞争走单槽快速路径（slotExchange）；多线程竞争单槽失败才升级为 Arena 多槽数组（arenaExchange），按线程 hash 把配对压力分散到不同槽位。
3. 防伪共享双轨制：Node 用 `@jdk.internal.vm.annotation.Contended` 注解；Slot（extends AtomicReference\<Object\>）手动填充 15 个 long（q0~qe），强制各占独立缓存行。
4. 动态自旋：SPINS 基准 1024，NCPU > 1 才启用（单核直接 park，自旋纯浪费）；实际次数按 Node.hash 动态计算、步长递减，给配对留时间窗口。
5. 硬约束：仅支持成对交换——奇数线程必有一个永久阻塞；无超时版在对方永不到达时永久卡死，生产环境须用带超时的 exchange。

## How It Works（运作方式）

`exchange(x)`：item 为 null 时替换为 NULL_ITEM 哨兵；arena 为 null 走 slotExchange——slot 空则 CAS 占位并自旋/park 等待 match 被写入，slot 非空则 CAS 抢配对、交换 item/match、unpark 对方后返回对方数据。slotExchange 失败（竞争）则进入 arenaExchange：`j = (i + m) & (a.length - 1)` 计算槽位，逐槽尝试"有人等则配对 / 空槽则占位"，并含按 bound 的降级与扩容逻辑（信源未展开）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[synchronousqueue-internals|SynchronousQueue 直接交接设计]]：同为一对一配对交接、同用 CAS + park/unpark + 先自旋后阻塞；SQ 单向传递，Exchanger 双向交换。
- [[cache-line-and-false-sharing|CPU 缓存行效应与伪共享]]：Node @Contended + Slot 手动填充是伪共享对策在 JDK 内部的又一实例。

### Dependencies（依赖项）

- [[atomic-variables-cas|Atomic 原子类设计（volatile + CAS 自旋）]]：Slot 本质 AtomicReference，配对/占位全靠 CAS 原语。

### Distinctions（区分）

- 与 [[synchronousqueue-internals|SynchronousQueue]]：SQ 是零容量队列、生产者把数据单向交给消费者；Exchanger 无队列语义、两线程对等双向互换。
- 与 BlockingQueue 家族：阻塞队列支持 N 对 M 单向传递且有缓冲；Exchanger 只支持 1 对 1、零缓冲、双向。

## Evolution（演进）

单信源（公众号源码解读，2026-10-28 建立）。

## Open Questions（开放问题）

- Arena 的扩容/降级触发条件与 bound 调整细节，信源以"..."略过，未确立。
- "伪共享可致 50% 性能差距"的量级表述无基准环境佐证。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-30-exchanger.md`（Node/Slot/Arena 结构、slotExchange/arenaExchange 简化源码、SPINS=1024 与 hash 动态自旋、成对约束、五工具对比表、两个完整示例）

## Related Knowledge（相关知识）

- [[jdk-30-exchanger|Exchanger：一个被严重低估的线程间数据交换神器（信源页）]]
