---
id: wiki-source-jdk-25-longadder
type: source
title: JDK源码剖析 —— LongAdder & LongAccumulator，比 AtomicLong 更快的秘密
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - jdk
  - concurrency
sources:
  - raw/sources/misc/2026-10-27-jdk-25-longadder.md
related:
  - wiki/concepts/longadder-internals.md
  - wiki/concepts/atomic-variables-cas.md
  - wiki/concepts/cache-line-and-false-sharing.md
  - wiki/sources/jdk-source-reading-album.md
---
# JDK源码剖析 —— LongAdder & LongAccumulator，比 AtomicLong 更快的秘密

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列的 LongAdder/LongAccumulator 专题。剖析父类 Striped64 的分段累加机制：base 低竞争快速路径、Cell 数组分散 CAS 竞争、@Contended 防伪共享、cellsBusy 自旋锁扩容，并给出三者选型指南。

## Key Facts（关键事实）

- LongAdder/LongAccumulator 均为 JDK 1.8 引入、继承自 package-private 的 `Striped64`；LongAdder 固定加法，LongAccumulator 传 `LongBinaryOperator` + 单位元支持任意二元聚合（如 `Math::max`）。
- Striped64 三个核心字段：`base`（volatile long，无竞争时直接 CAS，等同 AtomicLong）、`cells`（volatile Cell[]，长度必为 2 的幂）、`cellsBusy`（volatile int，0/1 自旋锁，控制 cells 初始化与扩容）。
- `add()` 两段式：先 `casBase`，失败才进 cells 分支按 `getProbe() & m` 定位槽位 CAS；全部失败进 `longAccumulate` 扩容或重哈希 probe。
- Cell 类用 `@Contended` 注解在对象前后填充 128 字节，独占缓存行解决伪共享；扩容翻倍且不超过 CPU 核数，32 核跑满约几十 KB。
- `sum()` = base + 所有 Cell 的遍历累加，是近似值非实时快照；LongAdder 没有 `getAndAdd()`/`addAndGet()` 这类带返回值的方法。
- 扩容流程：槽位空 → 建新 Cell；CAS 失败未满 → 重试换 probe；已满 → 翻倍扩容；多线程并发扩容由 CAS `cellsBusy` 保证只有一个线程操作。
- `sumThenReset()` 读出后清零，适合「每分钟请求数」这类周期性统计。

## Important Claims（重要论断）

### 分段思想：把单点 CAS 竞争分散到多个 Cell

AtomicLong 是「一根独木桥，谁过谁排队」，LongAdder 是「修好几条路，大家分散走，最后汇总」——把单点 CAS 竞争分散成多个独立的 CAS 竞争，高并发写入下吞吐明显更高。

### 选型指南（作者论断）

普通计数器（几百线程以内）用 AtomicLong；高并发写远多于读用 LongAdder；非加法聚合（最大/最小/累乘）用 LongAccumulator；读多写少或需要精确中间值/`addAndGet()` 时必须 AtomicLong。

### 「打散热点」是 JUC 的通用优化哲学

ConcurrentHashMap 1.7 的 Segment 锁分段、LongAdder 的 Cell 数组、ThreadPoolExecutor 的 ctl 单 int 打包，都是「找到真正的热点，然后把它打散」（作者观点，解读性论断）。

## Concepts Introduced（引入的概念）

- [[longadder-internals|LongAdder 分段累加设计（Striped64）]]（本信源为其首信源）

## Entities Mentioned（提及的实体）

- 公众号「Java解忧杂货铺」（单一自媒体信源，不立实体页）

## Implications（影响／启示）

- 面试高频点：LongAdder vs AtomicLong 对比表（引入版本/原理/读写性能/操作集/重置/场景六维度）。
- 编码选型：高并发统计埋点优先 LongAdder + `sumThenReset()` 周期清零（解读）。

## Limitations（局限）

- 单一公众号信源；无基准对比数据（示例仅演示功能，"吞吐量明显低于 LongAdder"为注释断言无实测数字）。
- 源码摘录中的 `longAccumulate()` 只给了逻辑梗概（四步），未逐行展开。

## Related Knowledge（相关知识）

- [[longadder-internals|LongAdder 分段累加设计（Striped64）]]（概念页）
- [[atomic-variables-cas|Atomic 原子类设计（volatile + CAS 自旋）]]（对比基线：低并发等价、高并发分段替代）
- [[cache-line-and-false-sharing|CPU 缓存行效应与伪共享]]（@Contended 128 字节填充的防伪共享实例）
- [[concurrenthashmap-internals|ConcurrentHashMap 并发设计（JDK 8+）]]（同源分段思想）
- [[jdk-source-reading-album|JDK 源码阅读合集]]（本系列索引页）

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-25-longadder.md`
