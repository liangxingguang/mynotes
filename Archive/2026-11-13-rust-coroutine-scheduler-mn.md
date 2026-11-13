---
id: inbox-2026-11-13-rust-coroutine-scheduler-mn
title: 用 Rust 从零实现协程调度器：M:N 用户态线程是怎么跑的
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/KRAtC_fuYOoWofnb_xLEaQ
source_type: web
platform: 微信公众号
created: 2026-11-13
category: 技术
tags:
  - rust
asset_ref: Assets/2026/11/rust-coroutine-scheduler-mn.md
wiki_status: ingested
---

# 用 Rust 从零实现协程调度器：M:N 用户态线程是怎么跑的

> 从零用 Rust 实现 M:N 协程调度器，拆解协程相对线程的成本优势、上下文切换本质（保存寄存器）、ucontext 方案、协程状态与栈管理、工作窃取调度器、yield/唤醒机制，并重点剖析阻塞调用与栈大小这两大工程难题。

## 核心要点

- 协程相对线程差**两个数量级**：创建约 100ns vs 10-30μs，切换纳秒级 vs 微秒级，根源是把"执行流"从 OS 线程解耦
- 切换本质是**换寄存器**（rip/rsp/rbp 等），用户态用 POSIX `ucontext` 即可实现；工业库（may、corosensei）用汇编直接操作寄存器
- 协程四态 Ready/Running/Suspended/Done；栈由库管理（8KB-64KB），需显式分配并配 **guard page** 防静默溢出（栈溢出不 panic，会写坏相邻内存）
- 栈底 **trampoline** 唯一职责：协程结束后把控制权交还调度器
- 调度器两层：**全局就绪队列 + 每 worker 本地队列**，工作窃取，**批量取 32 个**降低全局锁竞争
- `swapcontext(oucp, ucp)`：保存当前到 oucp，切到 ucp；**yield** 即改状态为 Ready 后切回调度器
- 挂起协程须维护 **suspended 表**，否则永久丢失（协程泄漏）
- **最大陷阱**：阻塞调用会卡住整个 worker 线程上所有协程；三种解法各有取舍——全异步 API（tokio）、动态扩线程（Go）、显式标记阻塞任务（spawn_blocking）
- Rust 无 GC、无运行时栈布局信息，**只能固定栈**，故生态选 **async/await 无栈协程**（代价：Pin + 生态重写 IO）

## 正文

文章以"开一万个 OS 线程内存先爆"为切入点，说明 goroutine/虚拟线程等方案的本质是把执行流从 OS 线程解耦。

**成本对比**：线程创建 10-30μs、切换 1-5μs；协程创建约 100ns、切换几十到几百纳秒。差距来自协程无需内核介入。

**切换本质**：CPU 靠寄存器执行代码，切换执行流就是换寄存器值。POSIX `ucontext`（getcontext/setcontext/makecontext/swapcontext）提供用户态上下文切换，可移植可读但比汇编慢，适合理解调度逻辑。

**协程结构**：四态枚举 + 独立上下文（寄存器快照）+ 独立栈 + 协程函数。栈大小需权衡（64KB→16384 个，4KB→262144 个），栈溢出是协程最危险 bug，靠 guard page 兜底。`prepare()` 用 `getcontext` 初始化、`makecontext` 把入口设为 trampoline；trampoline 执行完协程函数后标记 Done 并 `setcontext` 回调度器。

**调度器**：M 个协程跑在 N 个 OS 线程上，采用工作窃取结构——全局队列放新协程，各 worker 有本地队列。worker 主循环：本地取 → 本地空则从全局批量取 32 个 → 仍空则偷取 → 取到则运行、无则 yield。`run_coroutine` 用 `swapcontext` 保存调度器上下文、跳进协程，协程 yield 或结束再切回。

**yield 与唤醒**：yield 把状态改 Ready 后切回调度器进就绪队列尾；唤醒由其他协程显式触发或 IO 就绪，通过 `suspended` 表找回挂起协程放回全局队列，否则即协程泄漏。

**阻塞调用**（最大陷阱）：协程内调阻塞 API 会卡死整个 worker 线程上的其他协程。三种应对——全异步 API（性能最好但生态重写）、动态扩线程（Go，用户无感但线程数可能失控）、显式标记阻塞任务（tokio spawn_blocking，边界清晰但用户需知晓）。

**栈增长**：Go 用可增长栈，难点在于修正栈上指针（依赖精确 GC）。Rust 无 GC 无栈布局信息，协程库基本只能固定栈，这是 Rust 相对 Go 的真实劣势，也是其生态转向 async/await 无栈协程的原因——编译器展开状态机、无独立栈即无栈溢出，代价是 Pin 与 IO 生态重写。

## 来源

🔗 [用 Rust 从零实现协程调度器：M:N 用户态线程是怎么跑的](https://mp.weixin.qq.com/s/KRAtC_fuYOoWofnb_xLEaQ)

## 附件

[[Assets/2026/11/rust-coroutine-scheduler-mn.md]]
