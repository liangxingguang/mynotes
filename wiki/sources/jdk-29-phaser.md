---
id: wiki-source-jdk-29-phaser
type: source
title: Phaser——比CyclicBarrier更灵活的同步屏障
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
  - raw/sources/misc/2026-10-27-jdk-29-phaser.md
related:
  - wiki/concepts/phaser-internals.md
  - wiki/concepts/countdownlatch-internals.md
  - wiki/concepts/cyclicbarrier-internals.md
  - wiki/sources/jdk-source-reading-album.md
---
# Phaser——比CyclicBarrier更灵活的同步屏障

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码系列第 34 篇：讲 JDK 7 引入的 Phaser——CountDownLatch 与 CyclicBarrier 的"完全体"（可重用 + 参与方动态增减 + 分层 + 分阶段 + 有终止状态）。核心剖析其用一个 `volatile long` state 的位布局（unarrived/parties/phase/终止位）编码全部状态、一次 CAS 完成"到达检查 + 阶段推进"的无锁设计，以及树形分层（Tiering）如何分散大规模 CAS 竞争；附 arrive 三变体方法速览、分阶段考试与动态增减两个完整示例，及与 CountDownLatch/CyclicBarrier 的九维对比表。

## Key Facts（关键事实）

- 定位：Phaser 是可重用、支持动态注册参与方的同步屏障，JDK 7 引入，`java.util.concurrent` 包下，不实现任何接口。
- 核心概念：party（参与方，可 register 动态添加）、phase（从 0 递增的阶段号，全到齐自动 +1）、arrive（到达）、advance（推进）、termination（终止后所有等待方法立即返回）。
- 状态编码：一个 64 位 `volatile long state` 存全部状态——低 16 位 unarrived、中间 16 位 parties、bit 32 起 32 位 phase、bit 63 终止位；PARTIES_SHIFT=16、PHASE_SHIFT=32、MAX_PARTIES=0xffff（65535）。
- 关键设计：全程 CAS 无锁（无 synchronized/ReentrantLock）；一次 CAS 原子完成"unarrived -1 + 判断最后到达 + phase 推进"；终止位复用 state 最高位，不需额外字段。
- arriveAndAwaitAdvance 流程：CAS 减 unarrived → 非最后到达则 internalAwaitAdvance 自旋等待；最后到达者通知父 Phaser（若有）、重置 unarrived=parties、phase+1、调 onAdvance 钩子，onAdvance 返回 true 则置终止位并唤醒所有等待线程。
- arrive 三变体：arrive() 不等待；arriveAndAwaitAdvance() 等到齐（等价 CyclicBarrier.await）；arriveAndDeregister() 到达并注销（party 数 -1）。
- 分层（Tiering）：子 Phaser 各自管理一组线程，到齐后以单个 party 身份向父报告；把集中式 CAS 竞争分散到各子节点，应对数万线程的缓存一致性开销。
- 默认终止行为：onAdvance 默认实现 `return registeredParties == 0;`——所有方 deregister 后自动终止。
- 单层上限 65535 个 party（`new Phaser(65536)` 抛 IllegalStateException）；超过须分层。
- arriveAndAwaitAdvance 不响应中断；可中断需拆成 arrive() + awaitAdvanceInterruptibly(phase)。
- 与 ForkJoinPool 协作：等待的 worker 线程不纯自旋，会转去执行其他排队任务。
- 性能建议（信源给出）：<8 线程用单层；8–64 可用注意竞争；64–1000+ CAS 竞争可能成瓶颈，分层显著提升吞吐。
- 九维对比表（信源给出）：Phaser 是唯一同时支持可重用 + 参与方可变 + 分层 + 分阶段 + 可控终止 + 取消/退出的；最大参与方单层 65535，CountDownLatch/CyclicBarrier 无限制。

## Important Claims（重要论断）

### "把状态编码进一个变量，用 CAS 统一操作"是 Phaser 最值得学的设计理念
作者认为这种无锁思路在 JUC 中反复出现（AtomicInteger、LongAdder、AQS），而 Phaser 把它发挥到极致——所有状态在一个 long 里，一次 CAS 原子完成"到达检查 + 阶段推进"（信源观点）。

### 选型结论
一次性等待用 CountDownLatch；固定 N 周期同步用 CyclicBarrier；多阶段或动态增减用 Phaser；超大规模（>64000 线程）用分层 Phaser（信源观点）。

## Concepts Introduced（引入的概念）

- [[phaser-internals|Phaser 分阶段同步屏障设计（位编码 state + 树形分层）]]

## Entities Mentioned（提及的实体）

- 公众号「Java解忧杂货铺」（单一自媒体信源，暂不立实体页）

## Implications（影响／启示）

- 分层思想（把全局竞争点拆成树形局部竞争点）可迁移到任何高竞争计数/屏障场景，与 LongAdder 的 Cell 分散思路同源（解读）。
- 系列导航信息：本文是系列第 34 篇，下一篇预告为 Exchanger（信源事实）。

## Limitations（局限）

- 单一公众号信源；arriveAndAwaitAdvance 的源码为作者简化版（原文自述"实际源码涉及树形结构和终止状态处理，更复杂"）；state 位布局注明"JDK 不同版本略有差异"。

## Related Knowledge（相关知识）

- [[countdownlatch-internals|CountDownLatch 门闩设计（AQS 共享模式）]]、[[cyclicbarrier-internals|CyclicBarrier 循环屏障设计（Generation 换代）]]（对比与选型对象）
- [[jdk-source-reading-album|JDK 源码阅读合集（系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-29-phaser.md`
