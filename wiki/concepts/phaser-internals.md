---
id: wiki-concept-phaser-internals
type: concept
title: Phaser 分阶段同步屏障设计（位编码 state + 树形分层）
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
  - raw/sources/misc/2026-10-27-jdk-29-phaser.md
related:
  - wiki/concepts/countdownlatch-internals.md
  - wiki/concepts/cyclicbarrier-internals.md
  - wiki/concepts/atomic-variables-cas.md
  - wiki/concepts/longadder-internals.md
  - wiki/concepts/cache-line-and-false-sharing.md
  - wiki/sources/jdk-29-phaser.md
---
# Phaser 分阶段同步屏障设计（位编码 state + 树形分层）

## Definition（定义）

Phaser（JDK 7 引入）是可重用、支持参与方动态增减的同步屏障：party（参与方）注册后按 phase（阶段）推进——所有 party 到达当前阶段屏障后 phase 自动 +1；支持树形分层与受控终止。它用一个 `volatile long` state 的位布局编码 unarrived/parties/phase/终止位，全程 CAS 无锁。

## Why It Matters（为什么重要）

它覆盖 CountDownLatch（一次性）与 CyclicBarrier（参与方固定）都无法表达的场景：多阶段流水线式同步、参与方中途加入/退出、超大规模（数万线程）屏障。其"单变量位编码 + 一次 CAS 完成复合状态推进"是 JUC 无锁设计的极致样本。

## Core Characteristics（核心特征）

1. 位编码状态：64 位 state = 低 16 位 unarrived + 中 16 位 parties + 32 位 phase + bit 63 终止位；单层上限 65535 party。
2. 全程无锁：无 synchronized/ReentrantLock，靠 CAS 自旋；一次 CAS 原子完成"到达检查 + 阶段推进"，保证多字段一致性。
3. arrive 三变体：arrive() 不等待、arriveAndAwaitAdvance() 等到齐、arriveAndDeregister() 到达并注销——动态增减由此而来。
4. 树形分层（Tiering）：子 Phaser 管一组线程，到齐后作为单个 party 向父报告，把集中式 CAS 竞争分散到子节点。
5. 受控终止：onAdvance(phase, parties) 钩子可覆写；默认实现 `registeredParties == 0` 即终止——全部 deregister 后自动终止。
6. 中断语义：arriveAndAwaitAdvance 不响应中断；可中断须拆成 arrive() + awaitAdvanceInterruptibly(phase)。
7. ForkJoinPool 协作：等待中的 worker 线程转去执行其他排队任务而非纯自旋。

## How It Works（运作方式）

arriveAndAwaitAdvance()：CAS 使 unarrived -1 → 非最后到达者 internalAwaitAdvance 自旋等待阶段推进；最后到达者先向父 Phaser 报告（若有），再构造新 state（unarrived 重置为 parties、phase +1）CAS 提交，调 onAdvance——返回 true 则置终止位并唤醒所有等待线程。

## Relationships（关系）

### Related Concepts（相关概念）

- [[countdownlatch-internals|CountDownLatch 门闩设计]]（alternative-to：一次性、参与方固定的简化场景之选）
- [[cyclicbarrier-internals|CyclicBarrier 循环屏障设计]]（alternative-to：固定参与方周期同步之选；Phaser 是其增强超集）
- [[atomic-variables-cas|Atomic 原子类设计]]（depends-on：位编码 + CAS 的统一操作思路同源）
- [[longadder-internals|LongAdder 分段累加设计]]（related：分层分散竞争与 Cell 分散竞争同思路）
- [[cache-line-and-false-sharing|CPU 缓存行效应：局部性与伪共享]]（depends-on：分层动机正是缓存一致性开销与 CAS 竞争）

### Distinctions（区分）

- 与 CountDownLatch：Latch 一次性、不可重用、参与方固定、无终止控制；Phaser 全具备（信源九维对比表）。
- 与 CyclicBarrier：Barrier 可重用但参与方固定、无分层无分阶段编号、无退出机制；Phaser 支持 register/deregister 动态增减与 onAdvance 每阶段回调。

## Evolution（演进）

单信源（公众号源码解读，系列第 34 篇）。信源注明 state 位布局"JDK 不同版本略有差异，JDK 17+ 优化了布局"。

## Open Questions（开放问题）

- 分层 Phaser 在大规模下的具体吞吐提升数据未给出（信源只给定性建议）。
- arriveAndAwaitAdvance 简化版与真实源码（树形结构 + 终止处理）的差异未展开。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-29-phaser.md`

## Related Knowledge（相关知识）

- [[jdk-29-phaser|Phaser 同步屏障（信源页）]]
