---
id: wiki-concept-scopedvalue
type: concept
title: ScopedValue（作用域值）
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - concept
  - java
  - jvm
  - 虚拟线程
sources:
  - raw/sources/architecture/2026-10-23-scopedvalue-vs-threadlocal-virtual-threads.md
related:
  - wiki/concepts/virtual-threads-production.md
  - wiki/concepts/reactive-tracing-context.md
---
# ScopedValue（作用域值）

## Definition（定义）

JDK 的作用域内不可变值绑定机制（Java 21 预览 JEP 446 → Java 25 正式 JEP 506）：`ScopedValue.where(K, v).run/call(...)` 在作用域内绑定值，作用域内任意深处可读，作用域结束自动解绑。内存模型从 ThreadLocal 的"每线程一份可变 Map"换成"作用域内共享一份不可变快照"。

## Why It Matters（为什么重要）

ThreadLocal 的设计假设是"线程少且长命"——池化时代成立，虚拟线程（每请求一线程、百万级、短命）把它推翻：10 万并发 × 3 个 ThreadLocal 实测 ThreadLocalMap retained 1.5GB、Old Gen 2.3GB（信源压测）。ScopedValue 同时终结三类问题：内存膨胀（每线程 ≈8B 绑定指针）、泄漏（自动解绑）、脏值（未绑定 fail-fast）。实测迁移后 Old Gen -61%、young GC -32%，吞吐/P99 持平。

## Core Characteristics（核心特征）

1. **不可变**：无 set()；"变化"靠嵌套作用域重绑定（栈式遮蔽，出栈自动还原）。
2. **作用域生命周期**：绑定只存活于 run/call 执行期间，返回或抛异常自动解绑，无需 finally remove。
3. **结构化继承**：StructuredTaskScope.fork 子任务共享同一快照（零拷贝），子任务生命周期 ⊆ 父作用域（结构化并发焊死悬空态）。
4. **fail-fast**：作用域不跨线程——@Async/线程池/CompletableFuture/异步 Servlet 处 isBound()=false 或抛异常；ThreadLocal 在同场景是静默脏值。

## How It Works（运作方式）

- 迁移三步：① TraceId 用 `where(...).call(...)` 包住 Filter 链（doFilter 有受检异常用 call）；② 散落 ThreadLocal 收敛为一个 record 上下文（一次绑定一次解绑、类型安全、测试友好）；③ fan-out 用 StructuredTaskScope 自动继承。
- 版本：21~24 需 `--enable-preview`；25 正式且 API 兼容预览版。StructuredTaskScope 截至 25 仍预览（JEP 505，API 从 ShutdownOnFailure 改版为 open()），建议先在非核心链路试用。
- 分工边界（解读：信源决策树）：值随请求生、随请求死、请求内不变 → ScopedValue；绑定长命线程的 per-thread 缓存/可变状态 → 保留 ThreadLocal；日志 MDC 暂留 ThreadLocal（异步段用 context-propagation），两者是分工而非替代。

## Relationships（关系）

### Related Concepts（相关概念）

- [[virtual-threads-production|虚拟线程生产实践]]：ScopedValue 是虚拟线程上下文传递的"正解"路径（JDK 25）；货拉拉的 Helper 包装 ThreadLocal 是 JDK 21 现状下的工程妥协。
- [[reactive-tracing-context|响应式环境的全链路 traceId 传递]]：Reactor Context 是响应式模型的同构方案——同为"上下文随执行模型走"的显式机制。

### Distinctions（区分）

- 与 ThreadLocal 的区别：内存模型（共享不可变快照 vs 每线程可变 Map）、生命周期（自动解绑 vs 手动 remove）、跨线程语义（fail-fast vs 静默脏值）、子任务继承（零拷贝共享 vs InheritableThreadLocal 逐字段拷贝 + 父子漂移）。
- 与 InheritableThreadLocal 的区别：ITL 拷贝时机在子线程创建瞬间、拷贝后父子各自漂移、无生命周期约束；信源结论：虚拟线程里 ITL 没有存在理由，见到即迁。

## Evolution（演进）

- Java 21（JEP 446 预览）→ Java 25（JEP 506 正式）；StructuredTaskScope 五轮预览后 API 改版（JEP 505）。

## Open Questions（开放问题）

- 日志 MDC 的 ScopedValue 化依赖 logback/log4j2 原生支持，路线图未定（信源建议关注 logback 版本）。
- StructuredTaskScope 转正时间未知；预览 API 后续仍可能改版。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-scopedvalue-vs-threadlocal-virtual-threads.md`（单一技术长文：内存账、三段实战、压测对比、迁移检查表；压测为作者单场景，结构内存为量级估算）

## Related Knowledge（相关知识）

- [[scopedvalue-vs-threadlocal-virtual-threads|ScopedValue 实战替代方案（信源页）]]
- [[jdk21-migration-huolala|JDK 21 规模化落地实践（货拉拉）]]
