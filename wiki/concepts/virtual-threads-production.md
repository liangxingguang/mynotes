---
id: wiki-concept-virtual-threads-production
type: concept
title: 虚拟线程生产实践
status: active
created: 2026-10-23
updated: 2026-10-24
confidence: high
tags:
  - concept
  - java
  - jvm
  - 虚拟线程
sources:
  - raw/sources/architecture/2026-10-23-jdk21-migration-huolala.md
related:
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/concepts/reactive-tracing-context.md
  - wiki/concepts/scopedvalue.md
---
# 虚拟线程生产实践

## Definition（定义）

虚拟线程（Virtual Threads，JDK 21 转正）是由 JVM 调度的轻量级线程：阻塞在 HTTP/JDBC/Redis/RPC 等 IO 上时从载体平台线程卸下，载体转去执行其他虚拟线程。生产实践指围绕它的一整套工程纪律——场景筛选、上下文传递、钉住规避与观测手段换代，而非简单打开开关。

## Why It Matters（为什么重要）

虚拟线程让「大量等待、少量计算」的同步代码不必改写为响应式就能获得高并发，但照搬平台线程时代的假设会踩坑：ThreadLocal 不跨任务传递、synchronized 内阻塞 IO 会钉住载体线程、十万级线程数让 thread dump 失效。不加纪律地全量开启，收益没拿到先引入排障盲区。

## Core Characteristics（核心特征）

1. **先选场景**：适合 IO 等待型同步代码；CPU 密集（加解密、大 JSON 序列化）不会让计算变快；定时任务、XXL-JOB、Kafka 消费等线程由框架自管且并发受任务数/分区数限制的场景收益不大，继续用平台线程。
2. **上下文显式传递**：父线程把任务交给新虚拟线程时 ThreadLocal 不会自动传递（同一条虚拟线程内阻塞 IO、换载体则不需要再封装）；框架 Helper 在提交前包装捕获 Trace（如 SkyWalking）与业务上下文。
3. **钉住（Pinning）规避**：synchronized 内做阻塞 IO 会把虚拟线程钉在载体上；热路径改用 ReentrantLock，上线初期开 `-Djdk.tracePinnedThreads=short` 把关。JDK 24 起 JEP 491 使 synchronized 不再钉住载体。
4. **观测换代**：线程规模到十万级后完整 thread dump 不可用，排障顺序改为 GC 日志 → JFR → 钉住跟踪 → 聚合指标/JSON 线程快照。
5. **限流归位**：IO 并发用 Semaphore 或连接池限流，不必为限流配很小的平台线程池。

## How It Works（运作方式）

- Tomcat 入口：`spring.threads.virtual.enabled=true` 将整个请求切到虚拟线程；开启前确认 Filter/拦截器没有在 synchronized 里做阻塞 IO。请求本身不断 Trace，请求内再拆新虚拟线程才需 Helper。
- 任务提交：原生 `Executors.newVirtualThreadPerTaskExecutor()`（每任务一条 VT、无队列）适合无 Trace 要求的脚本；业务链路走框架 Helper（捕获 Trace + 业务上下文）。
- 动态线程池（DTP）virtualThread=true：只换创建线程方式，ThreadPoolExecutor 的 core/max/队列/拒绝策略仍有效，Worker 全部是虚拟线程；core/max 限制的是 Worker 虚拟线程数而非载体，载体由 JVM 按 CPU 核数提供（默认上限约 max(核数, 256)）。
- 上线对照：① 只切 JDK 未开 VT 时 GC 停顿与容器内存是否更稳；② 开 VT 后 Trace 不断链、钉住次数趋近于零、阻塞 IO 慢请求不回退；③ JFR 录 1~2 分钟对比锁与 IO 热点。

## Relationships（关系）

### Related Concepts（相关概念）

- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]：虚拟线程上线后的验收（GC 停顿、钉住次数、JFR 对比）遵循同一「先证据后参数」闭环。
- [[reactive-tracing-context|响应式环境的全链路 traceId 传递]]：响应式与虚拟线程是打破「一请求一线程」假设的两条路径，前者换载体（Reactor Context），后者保模型但要求跨任务显式传递 ThreadLocal/Trace。
- [[scopedvalue|ScopedValue（作用域值）]]：JDK 25 起 ThreadLocal 请求级上下文的正式替代——Helper 包装 ThreadLocal 是 JDK 21 现状妥协，ScopedValue 是不可变快照 + 结构化继承的正解（含内存账与迁移实战）。

### Distinctions（区分）

- 与响应式编程的区别：虚拟线程保留同步代码写法，靠 JVM 调度获得并发；响应式靠事件循环与回调/流，需要全链路改写。两者解决同一问题的成本结构不同。
- 与平台线程池调优的区别：VT 的并发上限由 Semaphore/连接池等业务限流控制，而非线程池大小；DTP 的 core/max 限的是虚拟线程 Worker 数。

## Evolution（演进）

- 2026-10-23 — 货拉拉 JDK 21 规模化落地：场景筛选、VirtualThreadContextHelper 两种接入（runVirtual / newVirtualThreadExecutor）、DTP virtualThread 开关、钉住跟踪与观测换代；并给出 JEP 491（JDK 24，synchronized 不再钉住）后的演进方向。
- 2026-10-24 — [[scopedvalue|ScopedValue]]（JDK 25 正式，JEP 506）为"请求级上下文"提供 API 级替代：where/run 替换 set/remove，StructuredTaskScope fork 零拷贝继承；本页的 Helper 传上下文纪律在 JDK 25 后可逐步收敛到 ScopedValue。

## Open Questions（开放问题）

- 框架在任务提交处统一接住 Trace 与 ThreadLocal（业务无感）是货拉拉的演进方向，当前信源尚未给出落地细节。
- 载体线程上限 max(核数, 256) 的默认值在不同 JDK 发行版与容器小规格（<1 核）下的行为需各自验证。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-jdk21-migration-huolala.md`

## Related Knowledge（相关知识）

- [[jdk21-migration-huolala|JDK 21 规模化落地实践（信源页）]]
- [[framework-first-migration|框架先行的规模化运行时迁移]]
