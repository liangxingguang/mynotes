---
id: wiki-concept-longadder-internals
type: concept
title: LongAdder 分段累加设计（Striped64）
status: active
created: 2026-10-28
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - java
  - jdk
  - concurrency
sources:
  - raw/sources/misc/2026-10-27-jdk-25-longadder.md
  - raw/sources/architecture/2026-10-28-like-follow-high-concurrency-design.md
related:
  - wiki/concepts/atomic-variables-cas.md
  - wiki/concepts/cache-line-and-false-sharing.md
  - wiki/concepts/concurrenthashmap-internals.md
  - wiki/concepts/interaction-write-path.md
  - wiki/concepts/redis.md
  - wiki/sources/like-follow-high-concurrency-design.md
---
# LongAdder 分段累加设计（Striped64）

## Definition（定义）

LongAdder/LongAccumulator（JDK 1.8，`java.util.concurrent.atomic`）通过父类 Striped64 的「base + Cell 数组」分段结构，把对单个 volatile 变量的 CAS 竞争分散到多个独立槽位，读时汇总（`sum()`），用「可分散的热点」换取高并发写吞吐。

## Why It Matters（为什么重要）

它是 AtomicLong 在高并发写多读少场景的标准替代：万级线程争抢同一 AtomicLong 时 CAS 空转严重，而 LongAdder 把单点竞争打散成多个独立 CAS。该「打散热点」思想在 JUC 中反复出现（ConcurrentHashMap 的桶/segment、ThreadPoolExecutor 的 ctl 打包）。

## Core Characteristics（核心特征）

1. **Striped64 三字段**：`base`（无竞争时直接 CAS，等同 AtomicLong）、`cells`（2 的幂长度 Cell 数组，竞争时分散写入）、`cellsBusy`（CAS 自旋锁，仅控制 cells 初始化/扩容的极短临界区）。
2. **两段式 add()**：先 `casBase`，失败再按线程 `getProbe()` 哈希定位 Cell 做 CAS；全失败进 `longAccumulate()` 扩容或重哈希 probe。
3. **伪共享防护**：Cell 用 `@Contended` 前后填充 128 字节独占缓存行（填充后每 Cell 约 128~256 字节）。
4. **有界扩容**：cells 翻倍扩容且不超过 CPU 核数；多线程并发扩容由 `cellsBusy` CAS 保证单线程操作。
5. **弱一致读**：`sum()` = base + 遍历所有 Cell，扫描期间的并发更新使其成为近似值而非快照；因此 LongAdder 不提供 `getAndAdd()`/`addAndGet()`。
6. **通用化**：LongAccumulator = LongAdder 泛化，传 `LongBinaryOperator` + 单位元（identity），支持取最大、累乘等任意二元聚合。
7. **本地聚合 flush 用法（第 2 信源）**：热点计数器写侧用 LongAdder 承接本地累加，定时任务每秒 `sumThenReset()` 原子取走+清零后合并为一次 Redis `INCRBY`（Hash 分 field）——Redis 网络调用降至约 1/50，把单 key 热点从「每请求一次 RT」压成「每秒每片一次 RT」。**flush 失败必须回滚 buffer**（把本地计数重新 add 回去），否则请求稍后重试会造成计数丢失（很多方案在这里悄悄丢数据）。

## How It Works（运作方式）

写入路径分级降级：无竞争 → base CAS 一步完成；有竞争 → 线程按 probe 值路由到各自 Cell 独立 CAS（互不干扰）；仍冲突 → `longAccumulate` 走四步：槽位空则建新 Cell、未满则重哈希重试、已满则翻倍扩容、并发扩容用 `cellsBusy` 自旋锁仲裁。读取路径反向：`sum()`/`get()` 遍历汇总；`sumThenReset()` 汇总并清零，适配周期性统计。

## Relationships（关系）

### Related Concepts（相关概念）

- [[atomic-variables-cas|Atomic 原子类设计（volatile + CAS 自旋）]]：LongAdder 是其同原语（Unsafe CAS→`lock cmpxchg`）的分段变体；低/中并发两者等价，高并发争抢时 LongAdder 胜出。
- [[cache-line-and-false-sharing|CPU 缓存行效应与伪共享]]：Cell 的 `@Contended` 128 字节填充是伪共享官方对策在 JUC 的典型实例。
- [[concurrenthashmap-internals|ConcurrentHashMap 并发设计（JDK 8+）]]：同源「分段打散热点」思想——CHM 分桶，LongAdder 分 Cell。

### Dependencies（依赖项）

- 依赖 [[atomic-variables-cas|CAS 原语]]（Cell.value 更新走 `UNSAFE.compareAndSwapLong`）与 ThreadLocalRandom 的线程探针（`getProbe()`）。

### Distinctions（区分）

- 与 [[atomic-variables-cas|AtomicLong]] 的不同：AtomicLong 单变量 CAS、读 O(1) 精确、有 `addAndGet()`；LongAdder 分 Cell、读 O(n) 近似、无带返回值的复合操作。写多读少用后者，读多写少/需精确中间值用前者。
- 与 LongAccumulator 的不同：LongAdder 固定加法（identity=0）；LongAccumulator 任意 `LongBinaryOperator` + 自定义单位元。

## Evolution（演进）

- 2026-10-28 — 由 JDK 源码阅读系列（LongAdder & LongAccumulator 篇）单信源建立；回答了 [[atomic-variables-cas]] 此前遗留的「LongAdder 内部机制」开放问题。
- 2026-10-31 — 第 2 信源（点赞/关注系统）补充生产用法：`sumThenReset()` 定时 flush 合并 Redis `INCRBY` 的「本地聚合」模式，及 flush 失败回滚 buffer 的数据安全纪律；说明 LongAdder 在分布式计数热点治理中扮演「Redis 调用节流器」角色。

## Open Questions（开放问题）

- `longAccumulate()` 的完整自旋状态机（probe 重哈希时机、扩容判断条件细节）当前信源只给四步梗概，未逐行展开。
- 高并发下 LongAdder vs AtomicLong 的量化吞吐差距无基准数据支撑（信源仅有定性断言）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-25-longadder.md`（Striped64/LongAdder/LongAccumulator 核心源码摘录、扩容四步流程、@Contended 128 字节填充、PV 统计示例、三者对比表）
- Source: `raw/sources/architecture/2026-10-28-like-follow-high-concurrency-design.md`（HotCounterWriter：LongAdder 每秒 sumThenReset flush 合并 INCRBY、Redis 调用 1/50、flush 失败回滚 buffer）

## Related Knowledge（相关知识）

- [[jdk-25-longadder|JDK源码剖析 —— LongAdder & LongAccumulator（信源页）]]
- [[like-follow-high-concurrency-design|别再上来就堆 Redis！点赞系统从打挂数据库到 18w 写峰值（信源页）]]（LongAdder 本地聚合 flush 生产用法）
