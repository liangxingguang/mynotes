---
id: wiki-concept-atomic-variables-cas
type: concept
title: Atomic 原子类设计（volatile + CAS 自旋）
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
  - raw/sources/misc/2026-10-27-jdk-23-atomic.md
related:
  - wiki/concepts/cache-line-and-false-sharing.md
  - wiki/concepts/aqs-internals.md
  - wiki/concepts/concurrenthashmap-internals.md
  - wiki/concepts/futuretask-internals.md
  - wiki/concepts/countdownlatch-internals.md
---
# Atomic 原子类设计（volatile + CAS 自旋）

## Definition（定义）

JUC `java.util.concurrent.atomic` 包的原子变量类（AtomicInteger/AtomicLong/AtomicBoolean 及 AtomicReference 家族），用 **volatile 字段保证可见性 + Unsafe CAS 自旋保证原子性**实现无锁（lock-free）的单变量原子更新，替代 synchronized 的线程挂起/唤醒开销。

## Why It Matters（为什么重要）

它是整个 JUC 的原语层：ReentrantLock/AQS 的 state 推进、ConcurrentHashMap 的空桶插入、FutureTask 的状态机、CountDownLatch 的计数，全部建立在同一套 CAS 原语上。理解 Atomic 三兄弟 = 理解 JUC 的前置知识。

## Core Characteristics（核心特征）

1. **核心公式**：AtomicInteger = volatile（可见性）+ CAS 自旋（原子性），缺一不可；无线程挂起与上下文切换。
2. **硬件落点**：Unsafe.compareAndSetInt → HotSpot intrinsic → x86 `lock cmpxchg`（锁缓存行），硬件级原子；32 位 JVM 上 long 用 `cmpxchg8b` 保证 64 位 CAS。
3. **自旋循环形态**：读当前值 → 算新值 → CAS 失败重读重试；乐观锁思想，假设冲突很少。
4. **类型实现细节**：AtomicBoolean 用 volatile int（1/0）存储，因 Unsafe 无 boolean 版 CAS；AtomicInteger/Long 继承 Number。
5. **两大痛点**：ABA（值改一圈回来 CAS 照过，引用复用场景需 AtomicStampedReference 带版本号）与伪共享（多个原子变量落同一缓存行互相失效，JDK 8 `@Contended` 可解，LongAdder Cell 已用）。
6. **性能边界**：低/中并发远超 synchronized；万级+线程争抢同一变量 CAS 空转严重，改用 LongAdder 分段累加。
7. **语义分级**：lazySet（putIntRelease）牺牲立即可见性换性能，适合最终一致。

## How It Works（运作方式）

字段声明为 `private volatile int value`；静态块经 `Unsafe.objectFieldOffset` 取字段内存偏移 VALUE；`incrementAndGet` 等方法以 for(;;) 循环执行 `compareAndSetInt(this, VALUE, current, next)`，成功即返回，失败说明他线程已改，重读重试。

## Relationships（关系）

### Related Concepts（相关概念）

- [[aqs-internals|AQS 核心机制]]：AQS 的 volatile state + CAS  acquire 与原子类同源同法。
- [[concurrenthashmap-internals|ConcurrentHashMap 并发设计]]：CAS 空桶插入 + synchronized 桶头，是无锁/细粒度锁混合的上层样本。
- [[futuretask-internals|FutureTask 内部设计]]：七态单向状态机靠 CAS 推进。
- [[countdownlatch-internals|CountDownLatch 门闩设计]]：state 计数 CAS 减一。
- [[cache-line-and-false-sharing|CPU 缓存行效应与伪共享]]：伪共享是原子类在高并发计数场景的性能陷阱，@Contended 是其 JDK 官方对策。

### Distinctions（区分）

- 与 synchronized 的不同：CAS 不挂起线程（乐观、自旋），synchronized 走管程可能挂起（悲观）；竞争低时 CAS 赢，争抢白热化时 CAS 空转浪费 CPU，须降级为分段（LongAdder）或锁。
- 与 volatile 的不同：volatile 只保证可见性，不保证复合操作原子性；「先 get 再判断再操作」必须 CAS 自旋或 updateAndGet。

## Evolution（演进）

- 2026-10-28 — 由 JDK 源码阅读系列（Atomic 三兄弟篇）单信源建立。

## Open Questions（开放问题）

- LongAdder 的分段累加内部设计（Cell 数组、扩容、sum 汇总）为系列下一篇主题，当前信源只给结论未给机制。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-23-atomic.md`（AtomicInteger/AtomicBoolean 核心源码、Unsafe→cmpxchg 链路、ABA 与伪共享、LongAdder 选型阈值、4 个完整示例）

## Related Knowledge（相关知识）

- [[jdk-23-atomic|AtomicInteger / AtomicLong / AtomicBoolean（信源页）]]
- [[jdk-20-futuretask|JDK源码剖析——FutureTask（信源页）]]
