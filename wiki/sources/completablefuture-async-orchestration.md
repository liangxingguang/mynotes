---
id: wiki-source-completablefuture-async-orchestration
type: source
title: CompletableFuture：异步编排的正确写法
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - java
  - concurrency
sources:
  - raw/sources/architecture/2026-10-20-completablefuture-async-orchestration.md
related: []
---
# CompletableFuture：异步编排的正确写法

## Overview（概览）

微信公众号 Java 并发系列收官篇：CompletableFuture（CF）用错比不用还惨——默认公共线程池、异常被吞、没有超时三条红线，外加 thenApply/thenCompose 套娃辨析与生产落地清单。

## Key Facts（关键事实）

- 为什么不用 Future：`get()` 阻塞且不能组合，"等 A 和 B 都完再干 C"得自己起线程 join；CF 用 `thenApply/thenCompose/thenCombine/allOf` 把异步任务串成非阻塞 pipeline。
- 红线一·默认线程池：`supplyAsync/runAsync` 不传池默认用 `ForkJoinPool.commonPool()`——JVM 级共享、并行度=CPU 核数减一、为 CPU 密集设计；跑 IO 任务会被慢下游占满，连累所有共用者；正确做法是显式传自定义 `bizExecutor` 与公共池隔离。
- 红线二·异常被吞：链上任一环节抛异常，不接 `exceptionally/handle` 就静默失败，不调 `get()` 永不暴露；与 ThreadPoolExecutor `submit` 吞异常同理。
- 红线三·没有超时：CF 无内置超时，下游卡死 future 永远挂着；Java 8 用 `get(timeout)`+`cancel` 兜底，Java 9+ 用 `orTimeout/completeOnTimeout`。
- 套娃辨析：`thenApply` 里再返回 CF 会得到 `CompletableFuture<CompletableFuture<T>>`；串联两个异步（前者结果喂后者）必须用 `thenCompose` 扁平化。
- 生产清单：显式自定义线程池；异常必须接住；必须带超时；IO 并发度按下游 RT 与容量估算（池打满反而更慢）；多任务汇总用 `allOf/anyOf` 而非 for 循环串行 `get`。

## Important Claims（重要论断）

### Claim 1：CompletableFuture 是声明式 pipeline，但不是免死金牌

默认池、吞异常、没超时，随便中一个就能让"异步优化"变成"线上事故"。

## Concepts Introduced（引入的概念）

- CF 三红线（默认线程池 / 异常被吞 / 无超时）——单信源战术经验，未立概念页

## Entities Mentioned（提及的实体）

（无）

## Implications（影响／启示）

"显式资源 + 显式异常 + 显式超时"三原则同样适用于其他语言的异步编排（Promise/Task），不绑定 Java（解读）。

## Limitations（局限）

- 经验性教程，无基准数据；所述行为均为 JDK 标准语义，可靠但非新知。

## Related Knowledge（相关知识）

（无）

## Source（信源）

- `raw/sources/architecture/2026-10-20-completablefuture-async-orchestration.md`
