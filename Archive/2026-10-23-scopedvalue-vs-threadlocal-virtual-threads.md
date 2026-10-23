---
id: 2026-10-23-scopedvalue-vs-threadlocal-virtual-threads
title: Java 21 虚拟线程下 ThreadLocal 怎么办？ScopedValue 实战替代方案
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/GBcUYJAqW-mTbhTsOK5KWw
source_type: 文章
platform: 微信公众号
created: 2026-10-23
category: 技术
tags:
  - Java
  - 工程实践
  - spring
asset_ref: Assets/2026/10/scopedvalue-vs-threadlocal-virtual-threads.md
wiki_status: ingested
---

# Java 21 虚拟线程下 ThreadLocal 怎么办？ScopedValue 实战替代方案

> 虚拟线程"百万级、短命、不复用"的模型与 ThreadLocal"每线程一份可变 Map"的假设冲突：百万并发即百万份 Map 副本，内存线性膨胀、young GC churn 抬高。ScopedValue（JDK 25 正式，JEP 506）把模型倒过来——作用域内共享一份不可变快照，同时终结内存膨胀、泄漏和脏值三类问题。实测 10 万并发迁移后 Old Gen 从 2.3GB 降到 0.9GB（-61%）。

## 核心要点

- **冲突本质**：ThreadLocal 池化时代的脏值/残留问题在虚拟线程下消失，但换成百万副本内存膨胀与 GC churn；ScopedValue 每线程开销≈一个指针，快照全局共享
- **三条铁律**：不可变（无 set()，变化靠嵌套作用域重绑定）；作用域生命周期（where/run 结束自动解绑，无需 finally remove）；结构化继承（StructuredTaskScope.fork 子任务零拷贝共享快照）
- **迁移三步**：TraceId 用 where/call 包住 Filter 链；多个散落 ThreadLocal 收敛为一个 record 上下文（RequestCtx）；fan-out 用 StructuredTaskScope 自动继承
- **fail-fast 收益**：@Async/线程池/CompletableFuture 跨线程处，ThreadLocal 静默读脏值，ScopedValue 显式 isBound=false，把隐式错误变显式失败
- **分工边界**：值随请求生随请求死且不变 → ScopedValue；绑定长命线程的 per-thread 缓存/可变状态 → 保留 ThreadLocal；日志 MDC 暂留 ThreadLocal（异步段用 context-propagation）
- **版本**：ScopedValue 21~24 预览（--enable-preview）、25 正式；StructuredTaskScope 截至 25 仍预览（API 已改版为 open()）；收益在内存与正确性，吞吐/P99 持平

## 正文

详见附件抓取正文（含 Filter/record 上下文/StructuredTaskScope 完整代码、压测对比表、迁移五步检查表与决策树）。

## 来源

- [Java 21 虚拟线程下 ThreadLocal 怎么办？ScopedValue 实战替代方案](https://mp.weixin.qq.com/s/GBcUYJAqW-mTbhTsOK5KWw)

## 附件

- [[Assets/2026/10/scopedvalue-vs-threadlocal-virtual-threads.md]]
