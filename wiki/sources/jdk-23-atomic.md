---
id: wiki-source-jdk-23-atomic
type: source
title: AtomicInteger / AtomicLong / AtomicBoolean —— 无锁并发的基石
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
  - raw/sources/misc/2026-10-27-jdk-23-atomic.md
related:
  - wiki/concepts/atomic-variables-cas.md
  - wiki/concepts/cache-line-and-false-sharing.md
  - wiki/concepts/aqs-internals.md
  - wiki/concepts/concurrenthashmap-internals.md
  - wiki/concepts/futuretask-internals.md
  - wiki/sources/jdk-20-futuretask.md
  - wiki/sources/jdk-source-reading-album.md
---
# AtomicInteger / AtomicLong / AtomicBoolean —— 无锁并发的基石

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列文章，剖析 JUC `java.util.concurrent.atomic` 包的 AtomicInteger / AtomicLong / AtomicBoolean：volatile + CAS 自旋的无锁设计、Unsafe 与 CPU `lock cmpxchg` 指令的硬件落点、ABA 问题与伪共享两大痛点，附计数器、一次性初始化标记、ID 生成器、无锁入队 4 个完整示例及与 synchronized 的对比选型表。

## Key Facts（关键事实）

- 核心公式：**AtomicInteger = volatile（可见性）+ CAS 自旋（原子性）**，缺一不可；volatile 不保证 `value++`（读-改-写三步）的原子性，CAS 把三步合并为一次硬件原子操作。
- CAS 底层：`Unsafe.compareAndSetInt` 路由到 HotSpot 的 `Unsafe_CompareAndSetInt`，x86 上对应 `cmpxchg` 指令，多核时加 `lock` 前缀锁缓存行，硬件级原子、无线程挂起。
- `incrementAndGet` 等方法是 CAS 自旋 for 循环：读当前值 → 算新值 → CAS 失败则重读重试。
- AtomicBoolean 内部用 `volatile int`（1=true/0=false）存储——Unsafe 没有 boolean 版 CAS；AtomicInteger/AtomicLong 继承 Number，三者间无继承关系。
- 32 位 JVM 上 long 的 64 位 CAS 由 HotSpot 用 `cmpxchg8b` 保证原子；64 位 JVM 上 AtomicLong 与 AtomicInteger 性能差异可忽略。
- `lazySet`（putIntRelease）不保证其他线程立即看到新值，适合最终一致场景。
- ABA 问题：值 A→B→A 改一圈回来 CAS 仍成功；链表/栈等引用复用场景需 `AtomicStampedReference` 带版本号；计数器、递增 ID 场景不受影响。
- 伪共享：多个 AtomicLong 落入同一缓存行（64 字节），改一个使其他核整行失效；JDK 8 `@Contended` 解此问题，LongAdder 的 Cell 数组用了它（AtomicLong 本身没加）。
- 性能边界：低/中并发远超 synchronized；万级+线程争抢同一变量时 CAS 空转严重，应改 LongAdder（分段累加最终汇总）。
- 常见误区：「先 get 再判断再操作」非原子，须 CAS 自旋或 `updateAndGet`（JDK 8）；一读多写场景普通 volatile 就够，不必上 Atomic。

## Important Claims（重要论断）

### 理解 AtomicInteger 是理解整个 JUC 的前置知识

ReentrantLock、ConcurrentHashMap、ThreadPoolExecutor 等高级并发工具的状态推进都建立在同一套 CAS 原语上（信源定位）。

### 无锁编程的核心理念：不要阻塞，失败了就再试一次

三个类源码合计不到 500 行，CAS 自旋的 for 循环就是全部秘密（信源总结）。

## Concepts Introduced（引入的概念）

- [[atomic-variables-cas|Atomic 原子类设计（volatile + CAS 自旋）]]

## Entities Mentioned（提及的实体）

- JDK（java.util.concurrent.atomic：AtomicInteger/AtomicLong/AtomicBoolean/AtomicReference/AtomicStampedReference/LongAdder/LongAccumulator；底座：sun.misc.Unsafe、HotSpot intrinsic、x86 lock cmpxchg/cmpxchg8b）

## Implications（影响／启示）

- 印证 [[cache-line-and-false-sharing|CPU 缓存行效应：局部性与伪共享]]：AtomicLong 高并发计数器的伪共享是缓存行效应在 JUC 层的直接实例，@Contended 是 JDK 官方解法之一（解读，四信源互证）。
- 印证 [[futuretask-internals|FutureTask 内部设计]] 与 [[concurrenthashmap-internals|ConcurrentHashMap 并发设计]] 的 CAS 用法：FutureTask 七态推进、CHM 空桶插入都建立在本篇的 volatile+CAS 原语之上（解读）。
- 「读多写极少用 volatile 就够」是 Atomic 选型的反向边界（信源结论）。

## Limitations（局限）

- 单一公众号信源；代码块在采集稿中为单行压缩形态，细节以 raw 收录原文与 JDK 源码为准。
- 「比加锁快一个数量级」等性能表述为定性结论，无基准数据。
- 未指明所基于的 JDK 具体版本；示例 4.4 的无锁入队被信源自己标注为简化版（未处理并发移动 tail 的完整逻辑）。

## Related Knowledge（相关知识）

- [[jdk-20-futuretask|JDK源码剖析——FutureTask（信源页）]]（CAS 状态机的上层应用）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-23-atomic.md`
