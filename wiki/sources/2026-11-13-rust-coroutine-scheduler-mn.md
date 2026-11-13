---
id: wiki-source-2026-11-13-rust-coroutine-scheduler-mn
type: source
title: 用 Rust 从零实现协程调度器：M:N 用户态线程是怎么跑的
status: active
created: 2026-11-13
updated: 2026-11-13
confidence: medium
tags: []
sources:
  - raw/sources/architecture/2026-11-13-rust-coroutine-scheduler-mn.md
---
# 用 Rust 从零实现协程调度器：M:N 用户态线程是怎么跑的

## Overview（概览）

微信公众号技术教程：从零用 Rust 实现一个 M:N 协程调度器（M 个协程跑在 N 个 OS 线程上）。以「开一万个 OS 线程内存先爆」为切入点，拆解协程相对线程的成本优势、上下文切换本质（保存寄存器）、POSIX `ucontext` 方案、协程状态与栈管理（guard page + trampoline）、两层队列工作窃取调度器、yield/唤醒机制，并重点剖析阻塞调用与栈大小两大工程难题，最后论证 Rust 生态选择 async/await 无栈协程路线的原因。正文自 Assets 采集稿逐字收录。

## Key Facts（关键事实）

- 线程创建（Linux `clone()`）约 10-30μs、线程切换约 1-5μs（跨核触发缓存失效）；协程创建约 100ns、切换几十到几百纳秒，差距两个数量级。
- 上下文切换的本质是保存/恢复寄存器（rip/rsp/rbp/rax…r15）；用户态可用 POSIX `ucontext`（getcontext/setcontext/makecontext/swapcontext）实现；x86_64 Linux 上 `ucontext_t` 为 968 字节；工业库 may、corosensei 用汇编直接操作寄存器。
- 协程状态枚举四态：Ready/Running/Suspended/Done（信源小节标题写「三种状态」，与四态枚举不一致，见 Limitations）。
- 协程栈由库管理（通常 8KB-64KB，显式分配），线程栈由内核管理（默认 8MB）；栈溢出不 panic、静默写坏相邻内存，工业实现配 guard page（溢出触发 SIGSEGV）。
- 栈底 trampoline 唯一职责：协程结束后把控制权交还调度器；`prepare()` = getcontext + 设栈指针 + makecontext（入口指向 trampoline）。
- 调度器两层：全局就绪队列（新协程）+ 每 worker 本地队列；worker 主循环：本地取 → 全局批量取 32 个（降低锁竞争）→ 偷取 → 运行/yield。
- `swapcontext(oucp, ucp)`：保存当前上下文到 oucp，切换到 ucp；yield = 状态改 Ready 后切回调度器、进就绪队列尾。
- 挂起协程须维护 suspended 表，否则永久丢失（协程泄漏）；唤醒来源两种：另一协程显式唤醒（如 channel 有数据）、IO 就绪（reactor 通知）。
- 阻塞调用是 M:N 最大陷阱：阻塞 API（如 `std::fs::read`）卡住整个 worker 线程上所有协程；三种应对：全异步 API（tokio）、动态扩线程（Go）、显式标记阻塞任务（tokio `spawn_blocking`）。
- Go 用可增长栈（初始 2KB，函数序言插检查，复制新栈并修正所有指向旧栈的指针），难点在指针修正，依赖精确 GC；Rust 无 GC、无运行时栈布局信息，协程库基本只能固定栈。
- Rust 生态选 async/await 无栈协程：编译器把状态机展开为结构体，无独立栈即无栈溢出；代价是自引用结构需 Pin、IO 生态重写。

## Important Claims（重要论断）

### Claim 1：切换协程不需要内核参与，只是换寄存器

> **理解协程的第一个关键认知：切换协程不需要内核参与，只是换寄存器。**（信源原文）

### Claim 2：每个协程栈底必须有 trampoline

> **每个协程栈的底部都必须有一个 trampoline，它的唯一职责是"在协程结束时把控制权交还给调度器"。**（信源原文）

### Claim 3：M:N 调度最大的敌人是用户代码里的阻塞调用

> **M:N 调度最大的敌人不是切换开销，而是"用户代码里的阻塞调用"。** 一个阻塞调用能废掉整个 worker 线程上所有协程。（信源原文）

### Claim 4：Rust 做协程相对 Go 的真实劣势是固定栈

Rust 没有 GC、没有运行时的栈布局信息，所以 Rust 的协程库基本都只能用固定大小的栈；这是 Rust 做协程相对 Go 的一个真实劣势，也是 Rust 生态选 async 而非 goroutine 路线的原因。

## Concepts Introduced（引入的概念）

- [[coroutine-scheduling|协程调度（M:N）]]
- [[rust-concurrency|Rust 并发模型（Send/Sync/async）]]（async/await 无栈协程路线的印证与补充）

## Entities Mentioned（提及的实体）

- tokio（全异步 API 路线与 spawn_blocking）
- Go / goroutine（动态扩线程与可增长栈路线）
- may、corosensei（Rust 汇编级协程库）
- Erlang process、Java 虚拟线程（同为执行流解耦方案，一笔带过）

（以上实体本信源仅提及、未深入，wiki 暂无独立页面）

## Implications（影响／启示）

- 高并发服务自研协程调度的可行性基础：切换不依赖内核，成本可控。
- 协程库的核心 unsafe 区域在 CURRENT 槽位的读写（UnsafeCell + 手写 unsafe），须用 SAFETY 注释固化安全不变量。
- 设计协程运行时时，阻塞隔离（异步化/扩线程/显式标记）与 suspended 表是绕不开的两个工程决策。

## Limitations（局限）

- 性能数字（100ns / 10-30μs 等）为信源陈述，无实测数据，未独立验证。
- 信源小节标题「协程的三种状态」与正文四态枚举（Ready/Running/Suspended/Done）不一致，按四态枚举采信，标题疑为笔误。
- 单一微信公众号信源；同系列提到的「工作窃取」篇与「Future 执行器」篇未在本信源内展开，尚未摄入 wiki。

## Related Knowledge（相关知识）

- [[coroutine-scheduling|协程调度（M:N）]]
- [[rust-concurrency|Rust 并发模型（Send/Sync/async）]]

## Source（信源）

- `raw/sources/architecture/2026-11-13-rust-coroutine-scheduler-mn.md`
