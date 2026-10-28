---
id: wiki-concept-cache-line-and-false-sharing
type: concept
title: CPU 缓存行效应：局部性与伪共享
status: active
created: 2026-10-23
updated: 2026-10-28
confidence: medium
tags:
  - concept
  - performance
  - architecture
  - concurrency
sources:
  - raw/sources/architecture/2026-10-21-linked-list-vs-array-cache.md
  - raw/sources/architecture/2026-10-21-springboot-disruptor-event-bus.md
  - raw/sources/misc/2026-10-27-jdk-02-linkedlist.md
  - raw/sources/misc/2026-10-27-jdk-23-atomic.md
  - raw/sources/misc/2026-10-27-jdk-25-longadder.md
  - raw/sources/misc/2026-10-27-jdk-30-exchanger.md
related:
  - wiki/sources/linked-list-vs-array-cache.md
  - wiki/sources/springboot-disruptor-event-bus.md
  - wiki/sources/kafka-fast-four-mechanisms.md
  - wiki/sources/jdk-02-linkedlist.md
  - wiki/concepts/cpu-funnel-coding.md
  - wiki/concepts/atomic-variables-cas.md
---
# CPU 缓存行效应：局部性与伪共享

## Definition（定义）

CPU 以 64 字节缓存行为最小单位在内存与缓存之间搬运数据，由此产生两类决定性效应：**缓存局部性**——连续内存访问享受硬件预取，使"理论上更慢"的数组击败"理论上更快"的链表；**伪共享（False Sharing）**——两个本不相干的变量落入同一缓存行，一个核的写入使另一个核的整行缓存失效，多核性能反降一个数量级。

## Why It Matters（为什么重要）

大 O 复杂度忽略常数，而缓存行效应正是常数项里最大的那只手：它解释了为什么 O(N) 顺序扫数组能赢 O(1) 指针跳转（[[linked-list-vs-array-cache]]），也解释了为什么高并发计数器、无锁队列的性能瓶颈常常不是锁而是缓存行争抢（Disruptor 信源）。体系结构常识在此压倒算法直觉。

## Core Characteristics（核心特征）

1. 缓存行 64 字节（绝大多数 CPU），是缓存一致性协议（MESI 类）的失效粒度。
2. 局部性红利：顺序访问触发硬件预取，访问延迟从内存级降到缓存级，差一到两个数量级。
3. 伪共享陷阱：多核写同一行内不同变量，互相失效、总线流量暴增，性能下降可达一个数量级。
4. 工程对策 A（利用局部性）：用数组/连续内存替代指针结构；序号到槽位线性映射契合预取器（RingBuffer）。
5. 工程对策 B（消灭伪共享）：缓存行填充——Disruptor 的 `Sequence` 用三层继承在 volatile long 两侧各垫 7 个 long（56 字节）让其独占一行；选"继承填充"而非 `@Contended` 是为零 JVM 参数、零依赖。
6. 对策的代价：填充浪费内存（每个 Sequence 多 112 字节），是典型的空间换时间。

## How It Works（运作方式）

写传播以行为单位：某核修改行内任意字节，一致性协议将该行在其他核的副本标记失效；下次访问须重新从内存/对端缓存拉取整行。伪共享的本质是"逻辑上无共享、物理上共享一行"，填充通过把热点变量隔离到独立行来切断这种物理耦合。（综合两信源表述。）

## Relationships（关系）

### Related Concepts（相关概念）

- [[cpu-funnel-coding|CPU 漏斗（编码级性能模型）]]：字段从大到小声明消除对齐 Padding、数组遍历替代指针集合，正是缓存行效应在编码层的应用。

### Distinctions（区分）

- 局部性是"要靠近"（数据摆放紧凑连续），伪共享是"要远离"（热点写变量互相隔离）——同一缓存行机制的两种相反用法。

## Evolution（演进）

- 2026-10-23 — 由 linked-list-vs-array-cache（局部性侧）与 springboot-disruptor-event-bus（伪共享侧）两个独立信源合并提炼建立；此前缓存行内容散见于两信源页，未立概念页。
- 2026-10-28 — 新增第三信源 jdk-02-linkedlist：JDK 集合层的具体数据点（LinkedList Node 约 32 字节 vs ArrayList 引用 4 字节、分散节点缓存命中低），互证局部性一侧结论。
- 2026-10-28 — 新增第四信源 jdk-23-atomic：伪共享在 JUC 原子类的实例——多个 AtomicLong 落同一缓存行互相失效；JDK 8 `@Contended` 为官方解法，LongAdder 的 Cell 数组已使用（AtomicLong 本身未加）。
- 2026-10-28 — 新增第五信源 jdk-25-longadder：Striped64.Cell 的 `@Contended` 实例细节——对象前后填充 128 字节确保独占缓存行，填充后每 Cell 约 128~256 字节，与 Disruptor 的手工继承填充互为对照。
- 2026-10-28 — 新增第六信源 jdk-30-exchanger：防伪共享"双轨制"实例——Exchanger 的 Node 用 `@Contended` 注解、Slot 手动填充 15 个 long（q0~qe），强制各占独立缓存行。

## Open Questions（开放问题）

- 两信源均为二手技术文章，缺官方数据手册级佐证；"一个数量级"等量级表述未附基准环境。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-21-linked-list-vs-array-cache.md`（局部性：数组胜链表、预取器）
- Source: `raw/sources/architecture/2026-10-21-springboot-disruptor-event-bus.md`（伪共享：Sequence 三层继承填充 56 字节、性能降一个数量级、与 @Contended 的取舍）
- Source: `raw/sources/misc/2026-10-27-jdk-02-linkedlist.md`（局部性在 JDK 集合的实例：Node 32 字节 vs 引用 4 字节约 8 倍内存、节点分散缓存命中低）
- Source: `raw/sources/misc/2026-10-27-jdk-23-atomic.md`（伪共享在 JUC 原子类的实例：AtomicLong 计数器同缓存行失效、@Contended 与 LongAdder Cell）
- Source: `raw/sources/misc/2026-10-27-jdk-25-longadder.md`（Striped64.Cell `@Contended` 前后填充 128 字节独占缓存行；填充后 Cell 约 128~256 字节）
- Source: `raw/sources/misc/2026-10-27-jdk-30-exchanger.md`（Exchanger Node `@Contended` + Slot 手动填充 15 个 long 防伪共享；缓存行 64 字节释义）

## Related Knowledge（相关知识）

- [[linked-list-vs-array-cache|链表已死？（信源页）]]
- [[jdk-02-linkedlist|JDK源码阅读(2) — LinkedList（信源页）]]
- [[jdk-23-atomic|Atomic 三兄弟（信源页）]]
- [[jdk-30-exchanger|Exchanger 线程间数据交换（信源页）]]
- [[springboot-disruptor-event-bus|Disruptor 无锁事件总线（信源页）]]
- [[kafka-fast-four-mechanisms|Kafka 四板斧（信源页）]]（PageCache/顺序写同属"顺着硬件脾气设计"哲学）
- [[cpu-funnel-coding|CPU 漏斗（概念页）]]
- [[atomic-variables-cas|Atomic 原子类设计（概念页）]]
