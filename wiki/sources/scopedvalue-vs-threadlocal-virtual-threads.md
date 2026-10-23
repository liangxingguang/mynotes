---
id: wiki-source-scopedvalue-vs-threadlocal-virtual-threads
type: source
title: Java 21 虚拟线程下 ThreadLocal 怎么办？ScopedValue 实战替代方案
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - source
  - java
  - jvm
  - 虚拟线程
sources:
  - raw/sources/architecture/2026-10-23-scopedvalue-vs-threadlocal-virtual-threads.md
related:
  - wiki/concepts/scopedvalue.md
  - wiki/concepts/virtual-threads-production.md
---
# Java 21 虚拟线程下 ThreadLocal 怎么办？ScopedValue 实战替代方案

## Overview（概览）

微信公众号技术长文：从一次网关服务压测事故（虚拟线程下 10 万并发 Old 区 800MB→2.3GB）切入，论证 ThreadLocal 的"每线程一份可变 Map"内存模型与虚拟线程"百万级短命线程"冲突，给出 ScopedValue 的三段迁移实战（TraceId 透传、record 请求上下文、StructuredTaskScope 继承）与压测对比数据。

## Key Facts（关键事实）

- 事故现场：10 万并发 × 3 个 ThreadLocal → ThreadLocalMap retained 1.5GB（MAT，992,317 个 Map 实例），Old Gen 2.3GB，young GC 每 10 分钟 41 次
- 内存账：ThreadLocalMap 骨架 ≈200B+/线程（Entry[16] 数组 128B + 3 Entry 96B）；百万并发仅 Map 骨架 200MB+；ScopedValue 每线程 ≈ 一个 8B 绑定指针
- 迁移后实测（JDK 25、4C8G、10 万并发）：Old Gen 2.3GB→0.9GB（-61%），Map retained 归零，young GC 41→28 次（-32%），吞吐与 P99 持平（±2%）
- ScopedValue 三条铁律：不可变（无 set()，嵌套作用域重绑定）；作用域生命周期（run/call 结束自动解绑）；结构化继承（StructuredTaskScope.fork 零拷贝共享快照）
- 版本：ScopedValue Java 21 预览（JEP 446）→ Java 25 正式（JEP 506）；StructuredTaskScope 截至 25 仍预览（JEP 505，API 改版为 open()）
- 生效边界：@Async/线程池/CompletableFuture/异步 Servlet 处不可见——ThreadLocal 静默脏值 vs ScopedValue fail-fast（isBound=false）
- 分工边界：请求级不可变上下文 → ScopedValue；per-thread 缓存/可变状态 → 保留 ThreadLocal；日志 MDC 暂留 ThreadLocal（异步段用 context-propagation）
- 澄清：虚拟线程 pinning 与 ThreadLocal 无关，JEP 491（JDK 24）已移除 synchronized 导致的 pinning

## Important Claims（重要论断）

### 这不是换个 API，是换了一套内存模型

ThreadLocal 的设计假设是"线程少且长命"；虚拟线程推翻假设后，池化时代的脏值/残留问题消失，换成百万副本内存膨胀与 GC churn。ScopedValue 用"作用域内共享一份不可变快照"同时终结三类问题。

### ScopedValue 没有 set() 是刻意的设计约束

作用域内可变共享状态是脏值、并发 bug 和测试困难的根源；没有 set() 逼你区分"环境信息"（请求内不变）与"业务状态"（可变，显式建模）——很多 ThreadLocal 脏值事故的根因是把业务状态塞进了上下文。

### 收益在内存与正确性，不在吞吐

迁移动机应按规模区分：3 个以下 ThreadLocal、并发不高的小服务收益有限，应侧重 fail-fast 正确性而非内存。

## Concepts Introduced（引入的概念）

- [[scopedvalue|ScopedValue（作用域值）]]

## Entities Mentioned（提及的实体）

- Java 21/25（JDK，JEP 444/446/491/505/506）

## Implications（影响／启示）

与 [[virtual-threads-production|虚拟线程生产实践]]（货拉拉）互补：货拉拉解"上下文跨任务显式传递"（Helper 包装 ThreadLocal/Trace），本文解"ThreadLocal 本身在 VT 下的内存代价"——前者是 JDK 21 现状下的工程妥协，后者是 JDK 25 的正解。日志 MDC 的 ScopedValue 化取决于日志框架原生支持，值得跟进 logback 路线图。

## Limitations（局限）

压测为单一作者场景（网关服务、3 项上下文），数据结构内存为量级估算非精确值；StructuredTaskScope 仍预览，生产落地建议限于非核心链路。

## Related Knowledge（相关知识）

- [[jdk21-migration-huolala|JDK 21 规模化落地实践（货拉拉）]]
- [[reactive-tracing-context|响应式环境的全链路 traceId 传递]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-scopedvalue-vs-threadlocal-virtual-threads.md`
