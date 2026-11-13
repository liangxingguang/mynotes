---
id: wiki-concept-coroutine-scheduling
type: concept
title: 协程调度（M:N）
status: active
created: 2026-11-13
updated: 2026-11-13
confidence: medium
tags:
  - concept
  - scheduling
  - rust
sources:
  - raw/sources/architecture/2026-11-13-rust-coroutine-scheduler-mn.md
related:
  - wiki/concepts/rust-concurrency.md
  - wiki/concepts/forkjoinpool-internals.md
  - wiki/concepts/virtual-threads-production.md
---
# 协程调度（M:N）

## Definition（定义）

M:N 协程调度：**M 个协程跑在 N 个操作系统线程上**。协程是与 OS 线程解耦的用户态执行流——创建协程像创建一个对象一样便宜，其创建与切换全部在用户态完成、无需内核介入。相对线程，协程的创建与切换成本低约两个数量级：线程创建（Linux `clone()`）10-30μs、切换 1-5μs；协程创建约 100ns、切换几十到几百纳秒。Go 的 goroutine、Erlang 的 process、Java 的虚拟线程解决的是同一个问题：把「执行流」从操作系统线程里解耦出来。（信源陈述，数字未经独立验证）

## Why It Matters（为什么重要）

- 高并发场景不能靠堆 OS 线程：每个线程默认 8MB 栈，一万个线程即 80GB 虚拟内存，内存先爆。
- 切换协程不需要内核参与，只是换寄存器——用户态用 POSIX `ucontext` 即可实现，这是自研调度器可行的基础。
- M:N 调度最大的工程难题不是切换开销，而是**用户代码里的阻塞调用**：一个阻塞调用能废掉整个 worker 线程上所有协程。
- 栈管理是协程相对线程的关键不同：栈由库显式分配（8KB-64KB），栈溢出是最危险的 bug（不 panic、静默写坏相邻内存）。
- Rust 因无 GC、无运行时栈布局信息而只能固定栈，这直接决定了其生态走向 async/await 无栈协程路线。

## Core Characteristics（核心特征）

1. **成本两个数量级**：协程创建约 100ns（分配几 KB 栈 + 一个结构体）vs 线程创建 10-30μs；协程切换几十到几百纳秒（保存/恢复寄存器）vs 线程切换 1-5μs（跨核还触发缓存失效）。差距根源：协程无需内核介入。
2. **切换本质是换寄存器**：CPU 靠寄存器执行代码（rip=下一条指令地址、rsp=栈指针、rbp=栈帧基址、rax/rbx/rcx/rdx/rsi/rdi/r8-r15 通用寄存器）；「切换执行流」就是换掉这套寄存器的值。POSIX `ucontext`（getcontext/setcontext/makecontext/swapcontext）提供可移植、可读的用户态上下文切换，但每次切换走系统调用/signal mask 处理、比手写汇编慢；工业库（may、corosensei）用汇编直接操作寄存器。
3. **协程四态**：Ready（在队列等调度）/ Running（在某线程上跑）/ Suspended（主动让出等唤醒）/ Done（执行完毕）。信源小节标题写「三种状态」，与四态枚举不一致（按枚举采信，标题疑为笔误）。
4. **协程结构**：`id + status + ctx（寄存器快照，Box<Ucontext>）+ stack（Vec<u8>，显式分配归协程持有）+ f（协程函数）`。
5. **栈管理**：线程栈内核管理默认 8MB；协程栈库管理 8KB-64KB。栈大小权衡（1GB 可用）：64KB→16,384 个、16KB→65,536 个、4KB→262,144 个（基本只能扁平代码）。栈溢出不 panic、静默写坏相邻内存，工业实现配 **guard page**（栈边界放不可访问页，溢出触发 SIGSEGV）。栈底 **trampoline** 唯一职责：协程结束后把控制权交还调度器（协程函数调用栈是空的，不能返回到调用处）。
6. **调度器两层结构**：全局就绪队列（放新协程）+ 每 worker 本地队列（工作窃取）。worker 主循环：本地取 → 本地空则从全局**批量取 32 个**（一次取一批显著降低全局锁竞争）→ 仍空则偷取 → 取到运行、无则 yield。
7. **yield 与唤醒**：yield = 状态改 Ready 后 `swapcontext` 切回调度器、进就绪队列尾；唤醒只能来自两种情形——另一协程显式唤醒（如 channel 有数据）、IO 就绪（reactor 通知）。挂起协程须维护 **suspended 表**，否则永远找不回来（协程泄漏）；线程挂起还在内核任务表里，协程只有自己管。
8. **阻塞调用三大应对**（取舍各异）：全异步 API（epoll/kqueue，tokio 路线，性能最好但生态重写）；动态扩线程（Go，runtime 检测到阻塞 syscall 就新建 OS 线程接管其他协程，用户无感但线程数可能失控）；显式标记阻塞任务（tokio `spawn_blocking`，丢进可无限扩容的专用线程池，边界清晰但用户需知晓哪些阻塞）。
9. **栈增长**：Go 用可增长栈（初始 2KB，函数序言插检查，栈快满时分配新栈复制内容并**修正所有指向旧栈的指针**，难点在指针修正、依赖精确 GC）；Rust 无 GC、无运行时栈布局信息，协程库基本只能固定栈——这是 Rust 相对 Go 的真实劣势，也是生态选 async/await 无栈协程的原因。

## Structure（结构）

信源实现的 M:N 调度器组件（信源第 7 节结论，四块 + 两难点）：

- **上下文层**：`Ucontext`（寄存器快照，x86_64 Linux 上 sizeof=968）+ ucontext/汇编保存恢复寄存器
- **协程层**：`Coroutine { id, status, ctx, stack, f }`；`prepare()` = getcontext → 设栈指针 → makecontext（入口=trampoline）
- **调度层**：`Scheduler { global: Mutex<VecDeque<Coroutine>>, locals: Vec<Mutex<VecDeque<Coroutine>>>, shutdown: AtomicBool }`；每 worker 线程持有自己的调度器上下文（thread_local `SCHEDULER_CTX`）与「正在运行」槽位（`CURRENT`）
- **生命周期层**：suspended 表 + Handle.wake()（挂起协程放回全局队列）

## How It Works（运作方式）

- **初始化**：`prepare()` 用 `getcontext` 初始化上下文，把栈指针指向自分配栈，`makecontext` 把入口设为 `coroutine_entry`（trampoline）；上下文一经 `setcontext`/`swapcontext` 激活即跳入协程。
- **运行**：`run_coroutine` 置 Running → prepare → 放入 `CURRENT` 槽位 → `swapcontext(sched_ctx, coro_ctx)`：保存调度器上下文、跳进协程；协程 yield 或结束后切回，按状态清理（Done）或挂起（Suspended，不能立刻重跑否则忙等）。
- **`swapcontext` 两参数语义**：`swapcontext(oucp, ucp)` = 把「当前」上下文保存到 oucp → 切换到 ucp 继续执行。
- **yield**：`coroutine_yield()` 先把自己的状态改成 Ready，再 `swapcontext(coro_ctx, sched_ctx)` 切回调度器；调度器随后将其放回就绪队列尾。
- **类型系统麻烦**：协程执行期间既要读上下文又要改状态，`RefCell<Option<Coroutine>>` 的借用检查器会拦，实践中 `UnsafeCell` + 手写 unsafe 不可避免——这是所有协程库的**核心 unsafe 区域**，须用 SAFETY 注释固化不变量（协程执行期间 CURRENT 不会被其他线程访问、swapcontext 期间无并发 Rust 读写）。
- **唤醒**：`Handle::wake()` 从 suspended 表按 id 取出协程 → 状态改 Ready → 放回全局队列。
- **阻塞陷阱**：协程内调 `std::fs::read` 等阻塞 API 会阻塞整个 OS 线程，该线程上其他协程全部被卡住。

## Relationships（关系）

### Related Concepts（相关概念）

- [[rust-concurrency|Rust 并发模型（Send/Sync/async）]]：async/await 是 Rust 生态选择的**无栈协程**路线——编译器把状态机展开成结构体、无独立栈即无栈溢出，代价是自引用结构需 Pin、IO 生态重写；与本页的**有栈协程（stackful）**相对。
- [[forkjoinpool-internals|ForkJoinPool 核心设计]]：本页调度器的「全局队列 + 每 worker 本地队列 + 工作窃取」结构与 ForkJoinPool 每线程双端队列工作窃取同源（信源原文：「这正是上一篇工作窃取的结构，只不过队列里装的是协程而不是闭包」）；批量取 32 个对应其降低锁竞争的同一思路。

### Dependencies（依赖项）

- 上下文切换依赖 POSIX `ucontext`（可移植教学方案）或平台汇编（工业方案）。

### Distinctions（区分）

- 与 [[virtual-threads-production|虚拟线程生产实践]]：Java 虚拟线程同样是把执行流从 OS 线程解耦的方案；本信源仅提及「Java 的虚拟线程」作为同思路方案，未覆盖其实现细节，两者机制差异待后续信源补充。
- 与 [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]：OS 线程池调度的是线程任务，无用户态执行流、无寄存器快照与 trampoline 概念。

## Evolution（演进）

- 用户态协程的实现路线分化：有栈协程（ucontext/汇编 + 显式栈，如本信源的 M:N 实现、may、corosensei）vs 无栈协程（async/await，编译器展开状态机）。
- Rust 生态的演进动因：无 GC、无运行时栈布局信息 → 有栈协程只能固定栈（栈溢出风险 + 栈大小两难）→ 生态转向 async/await 无栈协程，代价是 Pin 与 IO 生态重写。

## Open Questions（开放问题）

- 信源性能数字（100ns 创建、几十到几百 ns 切换等）无实测数据，未独立验证。
- 信源提到同系列的「工作窃取」篇与「Future 执行器」篇，尚未摄入 wiki，工作窃取在协程调度与 ForkJoinPool 中的具体差异待补。
- 固定栈大小如何按业务场景（递归深度/大局部变量）选型，信源只给权衡表未给决策方法。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-13-rust-coroutine-scheduler-mn.md`（微信公众号单信源，正文自 Assets 采集稿逐字收录）

## Related Knowledge（相关知识）

- [[rust-concurrency|Rust 并发模型（Send/Sync/async）]]
- [[virtual-threads-production|虚拟线程生产实践]]
- [[forkjoinpool-internals|ForkJoinPool 核心设计（每线程双端队列 + 工作窃取 + join 不空等）]]
- [[2026-11-13-rust-coroutine-scheduler-mn|用 Rust 从零实现协程调度器：M:N 用户态线程是怎么跑的]]
