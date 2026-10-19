---
id: 2026-10-20-completablefuture-async-orchestration
title: CompletableFuture：异步编排的正确写法
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/qr1AojU66kbWv43wsMDghg
source_type: link
platform: 微信
created: 2026-10-20
category: 技术
tags: [工程实践, Java]
asset_ref: Assets/2026/10/completablefuture-async-orchestration.md
wiki_status: pending
---

# CompletableFuture：异步编排的正确写法

> CompletableFuture 三条红线：① 永远显式传自定义线程池，别用 commonPool（为 CPU 密集设计，跑 IO 会被慢下游占满、拖垮所有共用业务）；② 异常必须 exceptionally/handle 接住，否则不调 get() 就静默吞掉；③ 必须加超时（Java 9+ 用 orTimeout，Java 8 用 get(timeout)+cancel）。串行异步用 thenCompose 扁平化，聚合用 allOf/anyOf，别 for 循环串行 get。

## 核心要点

- **默认池陷阱**：supplyAsync 不传池默认走 ForkJoinPool.commonPool（JVM 级共享、并行度=核数-1），IO 任务会把它堵死，"异步优化"变"全员排队"
- **异常吞噬**：CF 链上异常不接就被吞，监控日志全无；末端 exceptionally 降级或 handle 统一处理
- **无超时保护**：下游卡死 future 挂一辈子；Java 9+ orTimeout/completeOnTimeout，Java 8 get(timeout) 后 cancel
- **thenApply vs thenCompose**：thenApply 里返回 CF 会套娃成 CF<CF<T>>，串异步要用 thenCompose 扁平化
- **落地清单**：自定义池 + 接异常 + 加超时 + 按下游 RT 估并发度 + allOf/anyOf 聚合

## 正文

见 [[Assets/2026/10/completablefuture-async-orchestration.md|抓取正文]]。

## 来源

- [CompletableFuture：异步编排的正确写法](https://mp.weixin.qq.com/s/qr1AojU66kbWv43wsMDghg)（微信公众号）

## 附件

- [[Assets/2026/10/completablefuture-async-orchestration.md]]
